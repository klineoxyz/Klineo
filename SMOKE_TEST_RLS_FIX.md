# Fix: RLS Self-Test Still Failing

## Current Status
✅ **14/15 tests passing**  
❌ **1 test failing**: `GET /api/self-test/rls` - "Supabase anon client not configured"

## Root Cause
The `SUPABASE_ANON_KEY` is in your `.env` file, but the backend server needs to be **restarted** to load it.

## Solution: Restart Backend Server

### Step 1: Stop Current Backend
In the terminal where your backend is running:
- Press `Ctrl+C` to stop the server

### Step 2: Restart Backend
```powershell
cd c:\Users\Muaz\Desktop\KLINEO\backend-skeleton
npm run dev
```

### Step 3: Verify Environment Variable Loaded
When the server starts, you should now see:
```
[Config] Environment variables loaded:
  SUPABASE_URL: ✓
  SUPABASE_SERVICE_ROLE_KEY: ✓
  SUPABASE_ANON_KEY: ✓
```

If you see `SUPABASE_ANON_KEY: ✗`, the `.env` file isn't being read correctly.

### Step 4: Run Smoke Tests Again
1. Go to Smoke Test page in your browser
2. Click "Run All Tests"
3. All 15 tests should now pass! ✅

---

## What I Changed

1. **Added debug logging** to `self-test.ts` to show why the anon client fails
2. **Added startup validation** in `index.ts` to log environment variable status
3. **Verified `.env` file** has `SUPABASE_ANON_KEY` set correctly

---

## Expected Result After Restart

**Before restart:**
```json
{
  "name": "GET /api/self-test/rls",
  "status": "FAIL",
  "httpCode": 503,
  "message": "HTTP 503",
  "details": {
    "error": "Service unavailable - configuration missing"
  }
}
```

**After restart:**
```json
{
  "name": "GET /api/self-test/rls",
  "status": "PASS",
  "httpCode": 200,
  "message": "Success",
  "details": {
    "checks": [
      { "name": "auth_sanity", "pass": true },
      { "name": "rls_user_profiles_self_row", "pass": true },
      { "name": "rls_user_profiles_other_row_behavior", "pass": true },
      { "name": "service_role_visibility_expected", "pass": true },
      { "name": "admin_gate", "pass": true }
    ]
  }
}
```

---

## Troubleshooting

### If restart doesn't fix it:

1. **Check `.env` file location:**
   ```powershell
   cd c:\Users\Muaz\Desktop\KLINEO\backend-skeleton
   Get-Content .env | Select-String "SUPABASE_ANON_KEY"
   ```
   Should show: `SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W`

2. **Check backend logs:**
   When server starts, look for:
   ```
   [Config] SUPABASE_ANON_KEY: ✓
   ```
   If it shows `✗`, the `.env` file isn't being read.

3. **Verify dotenv is loading:**
   The backend uses `dotenv.config()` in `src/index.ts` line 19.
   Make sure you're running from `backend-skeleton` directory.

4. **Check for typos:**
   - Variable name must be exactly: `SUPABASE_ANON_KEY`
   - No spaces around the `=`
   - Value should be: `sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W`

---

## For Production (Railway)

Don't forget to add this to Railway environment variables:

1. Go to Railway Dashboard → Your backend service → Variables
2. Add: `SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W`
3. Railway will automatically restart the service

---

## Summary

**Action Required:** Restart your backend server to load the new environment variable.

**Expected Outcome:** All 15 smoke tests will pass after restart.
