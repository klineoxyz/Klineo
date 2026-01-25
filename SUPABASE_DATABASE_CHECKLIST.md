# Supabase Database & SQL — Checklist

**Status of database schema, SQL files, and what the app expects**

---

## ✅ What Exists (Schema & SQL)

### 0. **`supabase-migration-ui-fields.sql`** — Run after base schema

Adds UI-collected fields to `user_profiles`: `full_name`, `username`, `timezone`, `referral_wallet`.  
Updates `handle_new_user` to set `full_name` from signup metadata.  
See **`PUSH_TO_SUPABASE.md`** for when and how to run it.

### 1. **`supabase-schema-fixed.sql`** — Use this one (base)

| Item | Status |
|------|--------|
| `uuid-ossp` extension | ✅ |
| `public.user_profiles` table | ✅ |
| RLS enabled on `user_profiles` | ✅ |
| RLS: "Users can read own profile" | ✅ |
| RLS: "Admins can read all profiles" | ✅ |
| RLS: "Users can update own profile" (no OLD/NEW) | ✅ |
| `handle_new_user()` trigger function | ✅ |
| `on_auth_user_created` trigger | ✅ |
| Indexes: `email`, `role` | ✅ |
| `DROP POLICY IF EXISTS` before create (re-runnable) | ✅ |

**Base columns:** `id`, `email`, `role`, `created_at`, `updated_at`  
**After UI migration:** also `full_name`, `username`, `timezone`, `referral_wallet`  
**Roles:** `user` | `admin`

---

### 2. **`supabase/migrations/20260125000000_initial_schema.sql`**

- ✅ Updated to match `supabase-schema-fixed.sql` (OLD/NEW bug removed).
- Use with `supabase db push` or as reference. For Dashboard, prefer **`supabase-schema-fixed.sql`**.

---

### 3. **`supabase-schema.sql`** (original)

- ⚠️ Contains `DO $$ ... UPDATE ... mmxinthi@gmail.com` — can fail if user not in Auth yet.
- ⚠️ No `DROP POLICY IF EXISTS` — re-run may hit “policy already exists”.
- **Recommendation:** Use **`supabase-schema-fixed.sql`** instead.

---

## ✅ What the App Expects

### Backend (`backend-skeleton`)

- **Table:** `public.user_profiles`
- **Columns used:** `id`, `email`, `role`
- **Usage:** JWT verification → `supabase.from('user_profiles').select('role').eq('id', user.id)`
- **Expectation:** Row exists per user (created by `handle_new_user` trigger).

### Frontend

- Uses Supabase Auth (sign up / sign in).
- No direct `user_profiles` queries in current code; profile comes from backend `/api/auth/me` when wired.

---

## 📋 MVP Scope (Current)

| Table / Feature | In schema? | Used by app? |
|-----------------|------------|--------------|
| `auth.users` (Supabase) | ✅ Built-in | ✅ Auth |
| `public.user_profiles` | ✅ | ✅ Backend auth middleware |
| Traders / copy-trading / subscriptions | ❌ | ❌ Later |

**For current MVP, `user_profiles` + Auth is enough.**

---

## ✅ Have You Finished Database Setup?

### If you **have** run `supabase-schema-fixed.sql` in Supabase:

1. **Supabase Dashboard** → **Table Editor** → `user_profiles` exists.
2. **Authentication** → **Users** → Create test user → **Table Editor** → New row in `user_profiles`.
3. **SQL Editor** → Run:
   ```sql
   UPDATE public.user_profiles SET role = 'admin' WHERE email = 'mmxinthi@gmail.com';
   ```
   (Only after that user exists in Auth.)

Then **database & SQL for current Supabase usage are done.**

---

### If you **have not** run it yet:

1. **Supabase Dashboard** → **SQL Editor** → **New Query**.
2. Copy **entire** `supabase-schema-fixed.sql`.
3. Paste and **Run**.
4. **Table Editor** → confirm `user_profiles`.
5. **Authentication** → **Users** → add user (e.g. `mmxinthi@gmail.com`) → optionally set admin as above.

---

## 🔧 Quick Verify (SQL Editor)

```sql
-- Tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_profiles';

-- RLS
SELECT relname, relrowsecurity FROM pg_class
WHERE relname = 'user_profiles';

-- Trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Expected: one row for table, RLS enabled, trigger exists.

---

## 📁 File Summary

| File | Purpose | Use? |
|------|---------|------|
| `supabase-schema-fixed.sql` | Full, correct schema | ✅ **Use this** (Dashboard or reference) |
| `supabase/migrations/20260125000000_initial_schema.sql` | Migration | ✅ Use with `supabase db push` or keep in sync |
| `supabase-schema.sql` | Original | ⚠️ Prefer fixed version |
| `FIX_SUPABASE_ERROR.md` | Explains OLD/NEW fix | 📖 Reference |
| `HOW_TO_RUN_SUPABASE_SCHEMA.md` | How to run schema | 📖 Reference (use fixed file) |

---

## ✅ Summary

| Question | Answer |
|----------|--------|
| **Schema complete for MVP?** | ✅ Yes. `user_profiles` + RLS + trigger + indexes. |
| **SQL files consistent?** | ✅ Yes. `supabase-schema-fixed` and migration updated; no OLD/NEW. |
| **Backend/frontend match?** | ✅ Backend expects `user_profiles`; frontend uses Auth. |
| **Extra tables needed now?** | ❌ No. Traders / copy-trading / subscriptions come later. |

**You’re done with database and SQL for Supabase** once you’ve run `supabase-schema-fixed.sql` in your project and (optional) set the admin user.
