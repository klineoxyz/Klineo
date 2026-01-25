# What to Create and Push to Supabase

**Exact steps: run these SQL files in Supabase so the DB matches the UI**

---

## Already in Supabase (from earlier setup)

- **Table:** `public.user_profiles`  
  Columns: `id`, `email`, `role`, `created_at`, `updated_at`  
- **RLS** and **trigger** `handle_new_user` (creates profile on signup)

If you haven’t run the base schema yet, do that first → **`supabase-schema-fixed.sql`**.

---

## Step 1: Base schema (if not done)

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Copy entire **`supabase-schema-fixed.sql`**
3. **Run**
4. Check **Table Editor** → `user_profiles` exists

---

## Step 2: Add UI fields (new)

1. **SQL Editor** → **New Query**
2. Copy entire **`supabase-migration-ui-fields.sql`**
3. **Run**

This adds to `user_profiles`:

| Column           | Type | Notes |
|------------------|------|-------|
| `full_name`      | TEXT | Sign Up, Settings |
| `username`       | TEXT | Settings |
| `timezone`       | TEXT | Default `'UTC'` |
| `referral_wallet`| TEXT | Settings (USDT TRC-20) |

It also updates `handle_new_user` so `full_name` is set from signup metadata when you use:

```ts
supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: fullName } },
});
```

---

## Step 3: Verify

**Table Editor** → `user_profiles` → columns include:

- `full_name`
- `username`
- `timezone`
- `referral_wallet`

Optional check in SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;
```

---

## Step 4: Frontend (after migration)

1. **Sign Up**  
   Call `signUp` with `options: { data: { full_name } }` so `full_name` is stored.

2. **Settings → Profile**  
   - **Load:** `supabase.from('user_profiles').select('full_name, username, timezone, referral_wallet').single()`  
   - **Save:** `supabase.from('user_profiles').update({ full_name, username, timezone, referral_wallet }).eq('id', userId)`

(Use your existing auth/session to get `userId`.)

---

## Summary: what we create and push

| What | File | Action |
|------|------|--------|
| Base schema | `supabase-schema-fixed.sql` | Run if `user_profiles` doesn’t exist |
| UI fields | `supabase-migration-ui-fields.sql` | **Run** to add full_name, username, timezone, referral_wallet |

**Phase 2 (later):** Onboarding, Contact, Newsletter, Master Trader, Checkout → new tables. See **`UI_VS_SUPABASE_AUDIT.md`**.
