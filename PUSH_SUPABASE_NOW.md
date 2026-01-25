# Push to Supabase SQL Database — Do This Now

**Two ways to get your migrations into Supabase**

---

## Option A: Supabase Dashboard (No CLI, most reliable)

Use this if the CLI fails (proxy, password, etc.).

### 1. Open SQL Editor

1. Go to **https://supabase.com/dashboard**
2. Open your project (**oyfeadnxwuazidfbjjfo**)
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### 2. Run base schema (if `user_profiles` doesn’t exist yet)

1. Open **`supabase-schema-fixed.sql`** in your project
2. Copy **all** of it (Ctrl+A, Ctrl+C)
3. Paste into the SQL Editor
4. Click **Run** (or Ctrl+Enter)
5. Confirm: **Table Editor** → `user_profiles` exists

### 3. Run UI-fields migration

1. **New Query** again
2. Open **`supabase-migration-ui-fields.sql`**
3. Copy **all** of it
4. Paste into the SQL Editor
5. Click **Run**

### 4. Verify

- **Table Editor** → **`user_profiles`** → columns include `full_name`, `username`, `timezone`, `referral_wallet`

Done. Your SQL is in Supabase.

---

## Option B: CLI from PowerShell (outside Cursor)

Use this if you want to use `supabase db push`.

### 1. Open PowerShell

- Press **Win+R** → type **powershell** → Enter  
- Or open **Windows Terminal** / **PowerShell**

### 2. Go to project and set DB password

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
$env:SUPABASE_DB_PASSWORD = "YOUR_DATABASE_PASSWORD"
```

**Where to get the password:**  
Supabase Dashboard → **Project Settings** → **Database** → **Database password**  
(Use “Reset database password” if you don’t know it.)

### 3. Turn off proxy (if you see 127.0.0.1 errors)

```powershell
$env:HTTP_PROXY = $null
$env:HTTPS_PROXY = $null
```

### 4. Link (once) then push

```powershell
pnpm supabase:link
```

When prompted, use the same **database password**. Then:

```powershell
pnpm supabase:push
```

### Or use the script

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
.\push-to-supabase.ps1
```

It will ask for your DB password, clear proxy, and run **`pnpm supabase:push`**.

---

## Summary

| Method | Steps |
|--------|--------|
| **A. Dashboard** | SQL Editor → paste **supabase-schema-fixed.sql** → Run → New Query → paste **supabase-migration-ui-fields.sql** → Run |
| **B. CLI** | PowerShell → set `SUPABASE_DB_PASSWORD` → unset proxy → `pnpm supabase:link` → `pnpm supabase:push` |

**Recommended:** Use **Option A** (Dashboard) if the CLI gives proxy or login errors.

---

## Files to use

| File | When |
|------|------|
| **supabase-schema-fixed.sql** | Base schema (tables, RLS, trigger) |
| **supabase-migration-ui-fields.sql** | Adds `full_name`, `username`, `timezone`, `referral_wallet` |
| **push-to-supabase.ps1** | Script for Option B (PowerShell) |
