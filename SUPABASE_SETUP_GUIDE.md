# Supabase Database Setup Guide

**How to run the database schema in Supabase**

---

## Step 1: Access Supabase SQL Editor

1. **Go to your Supabase project:** https://supabase.com/dashboard
2. **Select your project** (or create one if you haven't)
3. **Click:** **SQL Editor** (left sidebar)
4. **Click:** **New Query**

---

## Step 2: Run the Schema

1. **Open** `supabase-schema.sql` in this repo
2. **Copy the entire file** (all 81 lines)
3. **Paste** into Supabase SQL Editor
4. **Click:** **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

**Expected result:**
- ✅ Table `user_profiles` created
- ✅ RLS policies created
- ✅ Trigger created
- ✅ Indexes created

---

## Step 3: Verify Setup

1. **Go to:** **Table Editor** (left sidebar)
2. **Check:** `user_profiles` table exists
3. **Verify:** RLS is enabled (should show "RLS enabled" badge)

---

## Step 4: Create Admin User (After Sign Up)

**Important:** You must create the user in Supabase Auth FIRST, then set admin role.

### Option A: Via Supabase Dashboard

1. **Authentication** → **Users** → **Add User**
2. **Email:** `mmxinthi@gmail.com`
3. **Set password** (or send invite email)
4. **User is created** in `auth.users`

### Option B: Via Sign Up Flow (Recommended)

1. **Use your frontend** sign-up page
2. **Sign up** with `mmxinthi@gmail.com`
3. **User is created** automatically

### Then Set Admin Role

**SQL Editor** → **New Query** → Run:

```sql
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'mmxinthi@gmail.com';
```

**Verify:**
```sql
SELECT id, email, role FROM public.user_profiles WHERE email = 'mmxinthi@gmail.com';
```

Should show: `role = 'admin'`

---

## Step 5: Test RLS Policies

**Test as regular user:**
1. Sign up a test user (not admin)
2. Try to query `user_profiles` via Supabase client
3. Should only see their own profile

**Test as admin:**
1. Login as `mmxinthi@gmail.com`
2. Should be able to see all profiles (via backend with service_role key)

---

## Troubleshooting

**Error: "relation already exists"**
→ Table already created. Safe to ignore or drop and recreate.

**Error: "permission denied"**
→ Make sure you're running as project owner/admin in Supabase dashboard.

**RLS not working?**
→ Check Table Editor → `user_profiles` → Settings → "Enable RLS" is ON.

**Admin role not setting?**
→ Make sure user exists in `auth.users` first, then run UPDATE query.

---

## What the Schema Creates

✅ **`user_profiles` table:**
- Extends `auth.users`
- Stores `email`, `role` (user/admin)
- Auto-creates profile on signup

✅ **RLS Policies:**
- Users can read own profile
- Admins can read all profiles
- Users can update own profile (but not role)

✅ **Auto-Profile Creation:**
- Trigger creates profile when user signs up
- Default role: `'user'`

✅ **Indexes:**
- Fast lookups by email and role

---

## Next Steps

After schema is set up:
1. ✅ Get Supabase credentials (URL, anon key, service_role key)
2. ✅ Add to backend env vars (Railway)
3. ✅ Add to frontend env vars (Vercel)
4. ✅ Test authentication flow

**See:** `ACTION_PLAN.md` Step 6-7 for connecting to backend/frontend.
