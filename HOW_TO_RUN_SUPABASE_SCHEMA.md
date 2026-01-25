# How to Run Supabase Database Schema

**You have 2 options to set up the database:**

---

## Option 1: Via Supabase Dashboard (Easiest - Recommended)

### Step 1: Open Supabase SQL Editor

1. **Go to:** https://supabase.com/dashboard
2. **Select your project** (or create one: **New Project** → Name: `klineo`)
3. **Click:** **SQL Editor** (left sidebar)
4. **Click:** **New Query**

### Step 2: Copy & Run Schema

1. **Open:** `supabase-schema.sql` in this repo
2. **Select all** (Ctrl+A / Cmd+A)
3. **Copy** (Ctrl+C / Cmd+C)
4. **Paste** into Supabase SQL Editor
5. **Click:** **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)

**Expected output:**
```
Success. No rows returned
```

**Verify:**
- Go to **Table Editor** → Check `user_profiles` table exists
- Check **RLS** is enabled (should show badge)

---

## Option 2: Via Supabase CLI (Advanced)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login

```bash
supabase login
```

### Step 3: Link Project

```bash
supabase link --project-ref your-project-ref
```

(Get project ref from Supabase dashboard → Settings → General → Reference ID)

### Step 4: Push Migration

```bash
cd c:\Users\Muaz\Desktop\KLINEO
supabase db push
```

This will run the migration file in `supabase/migrations/20260125000000_initial_schema.sql`

---

## After Running Schema

### Create Admin User

**Step 1: Create User in Supabase Auth**

1. **Supabase Dashboard** → **Authentication** → **Users**
2. **Add User** → **Email:** `mmxinthi@gmail.com`
3. **Set Password** (or send invite email)

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

## What Gets Created

✅ **Table:** `user_profiles`
- Stores user email and role
- Links to `auth.users` via UUID

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

## Troubleshooting

**"relation already exists"**
→ Table already created. Safe to ignore, or drop and recreate if needed.

**"permission denied"**
→ Make sure you're logged in as project owner in Supabase dashboard.

**RLS not enabled?**
→ Go to **Table Editor** → `user_profiles` → **Settings** → **Enable RLS**

**Admin role not setting?**
→ Make sure user exists in `auth.users` first, then run UPDATE query.

---

## Next Steps

After schema is set up:
1. ✅ Get Supabase credentials (Project Settings → API)
2. ✅ Add to backend env vars (Railway)
3. ✅ Add to frontend env vars (Vercel)
4. ✅ Test authentication

**See:** `ACTION_PLAN.md` for complete setup guide.
