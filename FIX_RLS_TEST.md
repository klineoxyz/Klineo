# Fix: RLS Self-Test Still Failing

## Problem
The RLS self-test is still showing:
```
"error": "Supabase anon client not configured"
```

## Solution: Restart Backend Server

The `SUPABASE_ANON_KEY` is already in your `.env` file, but the backend server needs to be restarted to load it.

### Steps:

1. **Stop the current backend server**
   - In the terminal where backend is running, press `Ctrl+C`

2. **Restart the backend server**
   ```powershell
   cd c:\Users\Muaz\Desktop\KLINEO\backend-skeleton
   npm run dev
   ```

3. **Wait for server to start**
   You should see:
   ```
   Server running on port 3000
   ```

4. **Run smoke tests again**
   - Go to Smoke Test page in your browser
   - Click "Run All Tests"
   - The "GET /api/self-test/rls" test should now show **PASS** ✅

---

## Verify It's Working

After restarting, check the backend logs. You should see the server start without errors.

Then run the smoke test again - all 15 tests should pass!

---

## Why This Happened

- `dotenv.config()` loads environment variables when the server **starts**
- We added `SUPABASE_ANON_KEY` to `.env` while the server was already running
- The server needs to be restarted to load the new variable

---

## For Production (Railway)

Don't forget to add `SUPABASE_ANON_KEY` to Railway environment variables:

1. Go to Railway Dashboard → Your backend service → Variables
2. Add: `SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W`
3. Railway will automatically restart the service
