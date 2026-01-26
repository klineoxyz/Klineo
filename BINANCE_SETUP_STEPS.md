# Binance Integration - Step-by-Step Setup Guide

Follow these steps in order to set up the Binance CEX API integration.

---

## Step 1: Generate Encryption Key ✅ DONE

**Status:** ✅ Already completed! The encryption key has been generated and added to `backend-skeleton/.env`

**Key generated:** `98b64c6f1a551817dba446fa3956a0db0e935423f660f6cc22982c99f8fa5509`

**For Windows users (if you need to regenerate):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 2: Add Encryption Key to Backend ✅ DONE

**Status:** ✅ Already completed! The encryption key has been added to `backend-skeleton/.env`

**Location:** `backend-skeleton/.env` (line 27)
```env
ENCRYPTION_KEY=98b64c6f1a551817dba446fa3956a0db0e935423f660f6cc22982c99f8fa5509
```

---

## Step 3: Run Database Migration

**Where:** Supabase Dashboard or Supabase CLI

### Option A: Supabase Dashboard (Easier)

1. **Go to:** https://supabase.com/dashboard
2. **Select your project**
3. **Click:** "SQL Editor" in the left sidebar
4. **Click:** "New query"
5. **Open the file:** `supabase/migrations/20260127000001_exchange_connections_enhancements.sql`
6. **Copy the entire contents** of that file
7. **Paste into** the SQL Editor
8. **Click:** "Run" (or press Ctrl+Enter)

**Expected result:** 
- Should see "Success. No rows returned" or similar success message

### Option B: Supabase CLI (If you have it set up)

**Where:** Terminal in project root

**What to do:**
```bash
cd supabase
supabase db push
```

---

## Step 4: Restart Backend Server

**Where:** Terminal where backend is running

**What to do:**
1. **Stop the backend:**
   - If running, press `Ctrl+C` in the terminal
   
2. **Start it again:**
   ```bash
   cd backend-skeleton
   npm run dev
   ```

3. **Check the startup logs:**
   You should see:
   ```
   [Config] Environment variables loaded:
     SUPABASE_URL: ✓
     SUPABASE_SERVICE_ROLE_KEY: ✓
     SUPABASE_ANON_KEY: ✓
     ENCRYPTION_KEY: ✓
   ```

**If you see `ENCRYPTION_KEY: ✗`:**
- Go back to Step 2 and verify the key is in `.env`
- Make sure there are no typos
- Restart the backend again

---

## Step 5: Verify Frontend is Running

**Where:** Terminal (separate from backend)

**What to do:**
1. **Check if frontend is running:**
   - Should be on `http://localhost:5173`
   
2. **If not running, start it:**
   ```bash
   cd c:\Users\Muaz\Desktop\KLINEO
   pnpm run dev
   ```

---

## Step 6: Test in Browser

**Where:** Your browser

**What to do:**
1. **Open:** http://localhost:5173
2. **Log in** (if not already logged in)
3. **Navigate to:** Settings (click Settings in sidebar)
4. **Click:** "Exchange API" tab
5. **You should see:**
   - "Exchange Connections (Binance)" heading
   - "Add Connection" button
   - If you have connections, they'll be listed

**If you see errors:**
- Check browser console (F12) for errors
- Check backend terminal for errors
- Verify backend is running on port 3000
- Verify frontend is running on port 5173

---

## Step 7: Get Binance Testnet Keys (For Testing)

**Where:** Binance Spot Testnet website

**What to do:**
1. **Go to:** https://testnet.binance.vision/
2. **Sign in** with GitHub (if not already signed in)
3. **Click:** "Generate HMAC_SHA256 Key" or similar
4. **Copy:**
   - API Key
   - Secret Key
   
**Keep these keys handy** - you'll use them in the next step.

---

## Step 8: Add Test Connection in UI

**Where:** KLINEO Settings → Exchange API tab

**What to do:**
1. **Click:** "Add Connection" button
2. **Fill in the form:**
   - **Label:** "Testnet Account" (or any name)
   - **Environment:** Select "Testnet" from dropdown
   - **API Key:** Paste your testnet API key
   - **API Secret:** Paste your testnet secret key
3. **Click:** "Save Connection"
4. **You should see:**
   - Success toast message
   - Connection appears in the list
   - Status badge shows "Never tested"

---

## Step 9: Test the Connection

**Where:** Same page (Settings → Exchange API)

**What to do:**
1. **Find your connection** in the list
2. **Click:** "Test" button
3. **Wait a few seconds**
4. **You should see:**
   - Success toast: "Connection test passed (XXXms)"
   - Status badge changes to "Connected" (green)
   - "Last tested" timestamp updates

**If test fails:**
- Check the error message
- Verify testnet keys are correct
- Make sure you selected "Testnet" environment
- Check backend logs for details

---

## Step 10: Verify Everything Works

**Where:** Browser and backend terminal

**What to do:**
1. **In browser:**
   - Connection should show "Connected" status
   - Last tested timestamp should be recent
   
2. **In backend terminal:**
   - Should see log: `[request-id] POST /api/exchange-connections/:id/test`
   - No error messages

3. **Try deleting and re-adding:**
   - Click trash icon to delete connection
   - Add it again
   - Test again

---

## Troubleshooting

### Problem: "ENCRYPTION_KEY not set" error

**Solution:**
1. Check `backend-skeleton/.env` has `ENCRYPTION_KEY=...`
2. Make sure no quotes around the key
3. Restart backend server

### Problem: Database migration fails

**Solution:**
1. Check if columns already exist (might have been added manually)
2. Try running just the ALTER TABLE statements
3. Check Supabase logs for specific error

### Problem: Connection test fails

**Solution:**
1. Verify you're using testnet keys with testnet environment
2. Check Binance testnet is accessible
3. Verify API key has "Read" permission enabled
4. Check backend logs for detailed error

### Problem: Frontend shows error

**Solution:**
1. Open browser console (F12)
2. Check for API errors
3. Verify backend is running
4. Check `VITE_API_BASE_URL` in `.env.local`

---

## Quick Checklist

- [ ] Generated encryption key (Step 1)
- [ ] Added `ENCRYPTION_KEY` to `backend-skeleton/.env` (Step 2)
- [ ] Ran database migration (Step 3)
- [ ] Restarted backend server (Step 4)
- [ ] Verified `ENCRYPTION_KEY: ✓` in startup logs (Step 4)
- [ ] Frontend is running (Step 5)
- [ ] Can access Settings → Exchange API tab (Step 6)
- [ ] Got Binance testnet keys (Step 7)
- [ ] Added test connection (Step 8)
- [ ] Connection test passes (Step 9)
- [ ] Everything works end-to-end (Step 10)

---

## Next Steps After Setup

Once everything is working:

1. **Test with production keys** (if you want, but be careful)
2. **Add read-only data endpoints** - Fetch balances, orders, trades
3. **Integrate with Portfolio screen** - Show real account data
4. **Add order placement** - Enable copy trading

---

## Need Help?

- Check `BINANCE_INTEGRATION.md` for detailed documentation
- Check backend terminal logs for errors
- Check browser console (F12) for frontend errors
- Verify all environment variables are set correctly
