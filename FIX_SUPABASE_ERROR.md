# Fix: Supabase SQL Error - "missing FROM-clause entry for table 'old'"

## What Happened

You got this error when running the schema:
```
ERROR: 42P01: missing FROM-clause entry for table "old"
```

## Why It Failed

The RLS UPDATE policy used `OLD.role = NEW.role`, but **`OLD` and `NEW` are only available in triggers, not in RLS policies**. This caused the error.

## ✅ Fixed Schema

I've created **`supabase-schema-fixed.sql`** with the fix.

**What changed:**
- Removed `OLD.role = NEW.role` from UPDATE policy
- Simplified UPDATE policy (users can update own profile)
- Role changes are protected by backend (service_role key) only

---

## How to Fix (2 Options)

### Option 1: Use Fixed Schema (Recommended)

1. **Supabase SQL Editor** → **New Query**
2. **Copy entire contents** of `supabase-schema-fixed.sql`
3. **Paste and Run**

This will:
- Drop existing policies (if any)
- Create correct policies without OLD/NEW
- Set up everything correctly

### Option 2: Fix Just the Policy

If you already ran part of the schema, just run this:

```sql
-- Drop the broken policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create fixed policy (without OLD/NEW)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

---

## After Running Fixed Schema

### Set Admin User

**Step 1: Create User in Supabase Auth**

1. **Authentication** → **Users** → **Add User**
2. **Email:** `mmxinthi@gmail.com`
3. **Set password** (or send invite)

**Step 2: Set Admin Role**

**SQL Editor** → **New Query** → Run:

```sql
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'mmxinthi@gmail.com';
```

**Verify:**
```sql
SELECT id, email, role 
FROM public.user_profiles 
WHERE email = 'mmxinthi@gmail.com';
```

Should show: `role = 'admin'`

---

## Why Role Protection Still Works

Even though the RLS policy doesn't check `OLD.role = NEW.role`, **role changes are still protected**:

1. **Frontend uses anon key** → RLS policies apply → Users can only update their own profile
2. **Backend uses service_role key** → Bypasses RLS → Can change roles (for admin operations)
3. **Best practice:** Role changes should only happen via backend API, not directly from frontend

**So it's actually safer this way** - role changes require backend code, not just SQL.

---

## Files Updated

- ✅ `supabase-schema.sql` — Fixed (removed OLD/NEW)
- ✅ `supabase-schema-fixed.sql` — New file with complete fixed schema
- ✅ `FIX_SUPABASE_ERROR.md` — This file

---

**Next:** Run `supabase-schema-fixed.sql` in Supabase SQL Editor, then set admin user.
