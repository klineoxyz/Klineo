# Sync All Database to Supabase

**One file. One run. Full schema in Supabase.**

---

## Push from Cursor (always)

You can **always push the database to Supabase from Cursor** using the terminal.

### 1. One-time setup

1. **Get your DB connection string**  
   Supabase Dashboard → **Project Settings** → **Database** → **Connection string** → **URI**  
   (Use the pooler URI, e.g. `postgresql://postgres.[ref]:[PASSWORD]@...pooler.supabase.com:6543/postgres`)

2. **Add to `.env.local`** (create from `.env.example` if needed):
   ```bash
   SUPABASE_DB_URL=postgresql://postgres.oyfeadnxwuazidfbjjfo:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
   ```
   Replace `YOUR_PASSWORD` with your **database password** (Project Settings → Database).

3. **Install deps** (if you haven’t):
   ```bash
   pnpm install
   ```

### 2. Push from Cursor

Open the **terminal in Cursor** (`` Ctrl+` ``) and run:

```bash
pnpm db:push
```

This runs **`supabase-sync-all.sql`** against your Supabase database. You can run it whenever you change the schema.

---

## What gets synced

| Item | Description |
|------|-------------|
| **user_profiles** | Table: id, email, role, created_at, updated_at, full_name, username, timezone, referral_wallet |
| **RLS** | Users read own profile; admins read all; users update own |
| **Trigger** | `handle_new_user` — auto-create profile on signup, set `full_name` from metadata |
| **Indexes** | email, role, username |

---

## Alternative: Supabase Dashboard (manual)

If `pnpm db:push` fails (e.g. network or env), use the Dashboard:

### 1. Open Supabase

1. Go to **https://supabase.com/dashboard**
2. Open your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### 2. Paste and run

1. Open **`supabase-sync-all.sql`** in your project
2. **Select all** (Ctrl+A) → **Copy** (Ctrl+C)
3. Paste into the SQL Editor
4. Click **Run** (or Ctrl+Enter)

### 3. Verify

- **Table Editor** → **user_profiles**
- Columns: `id`, `email`, `role`, `created_at`, `updated_at`, `full_name`, `username`, `timezone`, `referral_wallet`

---

## Optional: set admin

After creating your user in **Authentication → Users**:

```sql
UPDATE public.user_profiles SET role = 'admin' WHERE email = 'mmxinthi@gmail.com';
```

Run that in a **new query** in the SQL Editor.

---

## Re-running

**`supabase-sync-all.sql`** is safe to run again:

- Uses `IF NOT EXISTS` for table and columns
- Uses `DROP POLICY IF EXISTS` before creating policies
- Uses `CREATE OR REPLACE` for the function
- Uses `DROP TRIGGER IF EXISTS` before creating the trigger
- Uses `IF NOT EXISTS` for indexes

Existing data is preserved. Policies and trigger are replaced with the latest version.

---

## File used

| File | Purpose |
|------|---------|
| **supabase-sync-all.sql** | Single SQL file with full schema — use this to sync |
