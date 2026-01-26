# Binance Integration - EXACT Step-by-Step Guide

This guide tells you EXACTLY where to go and what to do, click by click.

---

## STEP 1: Generate Encryption Key ✅ DONE

**Status:** ✅ Already completed!

**Key generated:** `98b64c6f1a551817dba446fa3956a0db0e935423f660f6cc22982c99f8fa5509`

**For Windows (if you need to regenerate in the future):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## STEP 2: Add Encryption Key to Backend ✅ DONE

**Status:** ✅ Already completed!

**Location:** `backend-skeleton/.env` (line 27)

The encryption key has been automatically added to your `.env` file:
```env
ENCRYPTION_KEY=98b64c6f1a551817dba446fa3956a0db0e935423f660f6cc22982c99f8fa5509
```

**Verify:**
- Open `backend-skeleton/.env` in Cursor
- Scroll to the bottom
- You should see the `ENCRYPTION_KEY` line

---

## STEP 3: Run Database Migration

### Where: Supabase Dashboard (Web Browser)

**Action 1:** Open Supabase Dashboard
- Open your web browser (Chrome, Edge, etc.)
- Go to: `https://supabase.com/dashboard`
- **Log in** if needed

**Action 2:** Select your project
- You should see your project list
- **Click on your KLINEO project** (the one with your database)

**Action 3:** Open SQL Editor
- Look at the **left sidebar** menu
- Find and **click on:** `SQL Editor`
- (It has a database icon next to it)

**Action 4:** Create new query
- You should see a button that says **"New query"** or a `+` button
- **Click on it**

**Action 5:** Get the migration SQL
- Go back to Cursor
- In the file explorer, find: `supabase` folder
- Click to expand it
- Find: `migrations` folder
- Click to expand it
- Find file: `20260127000001_exchange_connections_enhancements.sql`
- **Click on it** to open

**Action 6:** Copy the SQL
- Press `Ctrl+A` to select all
- Press `Ctrl+C` to copy

**Action 7:** Paste into Supabase
- Go back to your browser (Supabase SQL Editor)
- **Click in the big text area** (where you write SQL)
- Press `Ctrl+V` to paste

**Action 8:** Run the migration
- Look for a button that says **"Run"** or **"Execute"**
- **Click on it**
- OR press `Ctrl+Enter`

**What you should see:**
- A success message like: "Success. No rows returned"
- Or: "Success" with a green checkmark

**If you see an error:**
- It might say columns already exist (that's okay if you ran it before)
- Or it might show a specific error - read it and let me know

---

## STEP 4: Restart Backend Server

### Where: Terminal in Cursor

**Action 1:** Check if backend is running
- Look at the bottom of Cursor for a **Terminal** tab
- If you see a terminal with text scrolling, the backend is running
- If not, you need to start it

**Action 2a:** If backend IS running (you see output):
- **Click in the terminal window**
- Press `Ctrl+C` to stop it
- Wait until it stops (you'll see the prompt again)

**Action 2b:** If backend is NOT running:
- Click on **Terminal** tab at bottom
- Or press `` Ctrl + ` `` (backtick key, above Tab)

**Action 3:** Navigate to backend folder
- In the terminal, type: `cd backend-skeleton`
- Press `Enter`

**Action 4:** Start the backend
- Type: `npm run dev`
- Press `Enter`

**Action 5:** Watch the output
- You should see text scrolling
- Look for these lines:
  ```
  [Config] Environment variables loaded:
    SUPABASE_URL: ✓
    SUPABASE_SERVICE_ROLE_KEY: ✓
    SUPABASE_ANON_KEY: ✓
    ENCRYPTION_KEY: ✓
  ```
- And then:
  ```
  🚀 KLINEO Backend running on 0.0.0.0:3000
  ```

**If you see `ENCRYPTION_KEY: ✗`:**
- Go back to Step 2
- Make sure the key is saved in `.env`
- Make sure there are no typos
- Restart again

**Keep this terminal open** - the backend needs to keep running!

---

## STEP 5: Start Frontend (If Not Running)

### Where: Another Terminal Window

**Action 1:** Open a NEW terminal
- In Cursor, click the **`+`** button next to the Terminal tab
- OR go to: Terminal → New Terminal

**Action 2:** Check if frontend is running
- Open browser
- Go to: `http://localhost:5173`
- If the page loads, frontend is running - **skip to Step 6**
- If you see "This site can't be reached", continue below

**Action 3:** Navigate to project root
- In the NEW terminal, type: `cd c:\Users\Muaz\Desktop\KLINEO`
- Press `Enter`

**Action 4:** Start frontend
- Type: `pnpm run dev`
- Press `Enter`

**Action 5:** Wait for it to start
- You should see:
  ```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
  ```

**Action 6:** Open browser
- The browser might open automatically
- If not, manually go to: `http://localhost:5173`

**Keep this terminal open too!**

---

## STEP 6: Navigate to Settings in Browser

### Where: Your Web Browser

**Action 1:** Make sure you're logged in
- If you see a login page, **log in** with your credentials
- If you're already logged in, continue

**Action 2:** Find the Settings menu
- Look at the **left sidebar** in the app
- Find the icon that looks like a **gear/cog** ⚙️
- **Click on "Settings"**

**Action 3:** Click Exchange API tab
- You should see tabs at the top: "Profile", "Security", "Exchange API", "Notifications"
- **Click on "Exchange API"** tab

**What you should see:**
- Heading: "Exchange Connections (Binance)"
- A button: "Add Connection"
- If you have no connections: "No exchange connections yet"

**If you see an error:**
- Check browser console: Press `F12`, look at "Console" tab
- Check if backend is running (Step 4)
- Check if frontend is running (Step 5)

---

## STEP 7: Get Binance Testnet Keys

### Where: Binance Testnet Website

**Action 1:** Open new browser tab
- Press `Ctrl+T` to open a new tab

**Action 2:** Go to Binance Testnet
- Type in address bar: `https://testnet.binance.vision/`
- Press `Enter`

**Action 3:** Sign in
- You'll see a page with "Sign in with GitHub"
- **Click on "Sign in with GitHub"**
- Authorize if prompted
- You'll be redirected back

**Action 4:** Generate API keys
- Look for a button that says **"Generate HMAC_SHA256 Key"** or **"Create API Key"**
- **Click on it**

**Action 5:** Copy your keys
- You'll see:
  - **API Key:** (a long string)
  - **Secret Key:** (another long string)
- **Click the copy button** next to each, or select and copy manually
- **Save these somewhere safe** (notepad, etc.)

**Important:** 
- These are TEST keys - they work with fake money
- Perfect for testing!

---

## STEP 8: Add Connection in KLINEO

### Where: Back in KLINEO Browser Tab

**Action 1:** Click "Add Connection" button
- In the Exchange API tab
- **Click the "Add Connection" button**

**Action 2:** Fill in the form
- **Label field:** Type: `Testnet Account` (or any name you want)
- **Environment dropdown:** Click on it, select **"Testnet"**
- **API Key field:** Paste your testnet API key (from Step 7)
- **API Secret field:** Paste your testnet secret key (from Step 7)

**Action 3:** Save
- **Click the "Save Connection" button**
- Wait a moment

**What you should see:**
- A green success message at the top: "Connection saved"
- The form disappears
- A new card appears showing your connection
- Status badge shows: "Never tested"

**If you see an error:**
- Read the error message
- Check if you pasted the keys correctly
- Make sure you selected "Testnet" environment

---

## STEP 9: Test the Connection

### Where: Same page (Exchange API tab)

**Action 1:** Find your connection
- You should see a card with your connection name
- It shows: "Testnet Account" (or whatever you named it)

**Action 2:** Click Test button
- On the right side of the card, find the **"Test"** button
- **Click on it**

**Action 3:** Wait
- The button will show a spinning icon
- Wait 2-5 seconds

**Action 4:** Check the result
- You should see a green success message: "Connection test passed (XXXms)"
- The status badge should change to: **"Connected"** (green badge)
- "Last tested" timestamp should update

**If test fails:**
- You'll see a red error message
- Check the error text
- Common issues:
  - Wrong keys (make sure you copied both correctly)
  - Wrong environment (must be "Testnet" for testnet keys)
  - Backend not running

---

## STEP 10: Verify Everything Works

### Where: Multiple places

**Action 1:** Check connection status
- In browser, your connection should show:
  - ✅ Green "Connected" badge
  - ✅ Recent "Last tested" timestamp
  - ✅ No error messages

**Action 2:** Check backend terminal
- Go back to Cursor
- Look at the backend terminal (Step 4)
- You should see log entries like:
  ```
  [timestamp] [request-id] POST /api/exchange-connections
  [timestamp] [request-id] POST /api/exchange-connections/:id/test
  ```
- No red error messages

**Action 3:** Try deleting and re-adding
- Click the **trash icon** 🗑️ on your connection
- Confirm deletion
- Click "Add Connection" again
- Add it back
- Test again

**If everything works:**
- ✅ You're done! The integration is working!

---

## TROUBLESHOOTING

### Problem: "ENCRYPTION_KEY not set" in backend logs

**Fix:**
1. Go to Cursor
2. Open `backend-skeleton/.env`
3. Check if `ENCRYPTION_KEY=...` is there
4. Make sure no quotes around the key
5. Save the file (`Ctrl+S`)
6. Restart backend (Step 4)

### Problem: Migration fails in Supabase

**Fix:**
1. Read the error message carefully
2. If it says "column already exists" - that's OK, it means it's already done
3. If other error - copy the error message and let me know

### Problem: Connection test fails

**Fix:**
1. Check you're using testnet keys with testnet environment
2. Verify keys are correct (no extra spaces when pasting)
3. Check backend terminal for detailed error
4. Make sure backend is running

### Problem: Can't see Exchange API tab

**Fix:**
1. Make sure you're logged in
2. Refresh the page (`F5`)
3. Check browser console (`F12`) for errors
4. Make sure frontend is running

---

## QUICK REFERENCE: File Locations

- **Backend .env:** `c:\Users\Muaz\Desktop\KLINEO\backend-skeleton\.env`
- **Migration file:** `c:\Users\Muaz\Desktop\KLINEO\supabase\migrations\20260127000001_exchange_connections_enhancements.sql`
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Binance Testnet:** https://testnet.binance.vision/
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000

---

## CHECKLIST

Go through each step and check off:

- [ ] Step 1: Generated encryption key (64 characters)
- [ ] Step 2: Added `ENCRYPTION_KEY=...` to `backend-skeleton/.env`
- [ ] Step 3: Ran migration in Supabase SQL Editor
- [ ] Step 4: Backend shows `ENCRYPTION_KEY: ✓` in logs
- [ ] Step 5: Frontend running on http://localhost:5173
- [ ] Step 6: Can see Exchange API tab in Settings
- [ ] Step 7: Got testnet keys from Binance
- [ ] Step 8: Added connection successfully
- [ ] Step 9: Connection test passes
- [ ] Step 10: Everything works end-to-end

---

**You're ready to start! Begin with Step 1.**

If you get stuck at any step, tell me which step and what you see, and I'll help!
