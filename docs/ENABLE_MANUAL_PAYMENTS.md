# How to Enable Manual Payments (Step by Step)

Manual payments let users pay the **joining fee** and **packages** via USDT (BEP20) to your Treasury Safe. The backend must have `ENABLE_MANUAL_PAYMENTS=true` and the `payment_intents` tables in Supabase.

---

## Step 1: Open Railway

1. Go to **https://railway.app/dashboard**
2. Log in (GitHub is easiest)
3. Click your **KLINEO backend** project (the one that deploys `backend-skeleton`)

---

## Step 2: Open Your Backend Service

1. In the project, click the **service** that runs the API (the one with Root Directory `backend-skeleton`)
2. You should see **Deployments**, **Variables**, **Settings**, etc.

---

## Step 3: Open Variables

1. Click the **Variables** tab (or **Settings** → **Variables**)
2. You’ll see the list of existing variables (e.g. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`)

---

## Step 4: Add the Manual Payments Variable

1. Click **"+ New Variable"** (or **"Add variable"** / **"Raw Editor"**)
2. **Name:**  
   `ENABLE_MANUAL_PAYMENTS`
3. **Value:**  
   `true`  
   (literally the word `true`, no quotes)
4. Save (e.g. **Add** or **Update**)

---

## Step 5: Wait for Redeploy

- Railway usually **redeploys automatically** when you change variables.
- Wait until the latest deployment shows **Success** / **Active** (green).
- If it doesn’t redeploy, use **Deploy** → **Redeploy** from the Deployments tab.

---

## Step 6: Confirm in the App

1. Open your app (e.g. **https://www.klineo.xyz**)
2. Log in
3. Go to **Subscription** and click **Pay joining fee** (or **Pay** on a package)
4. You should be taken to **Payments** and see:
   - **Create payment intent** (joining fee / package)
   - After creating an intent: **Deposit instructions** (amount, Treasury Safe address, then submit tx hash)

If you still see “Manual payments are not enabled”, wait a minute for the new deployment, hard-refresh the page, and try again.

---

## Checklist

- [ ] Railway dashboard opened
- [ ] Backend service (Root Directory `backend-skeleton`) selected
- [ ] **Variables** tab opened
- [ ] `ENABLE_MANUAL_PAYMENTS` = `true` added
- [ ] Redeploy finished (green)
- [ ] App: Subscription → Pay → Payments shows create intent and deposit instructions

---

## Database Requirement

Manual payments use the **payment_intents** (and related) tables in Supabase. If you haven’t run the migrations yet:

1. In Supabase Dashboard → **SQL Editor**, run the migration that creates `payment_intents` (e.g. `20260129130000_manual_payments_safe.sql` from `supabase/migrations/`).
2. Or run all migrations: `supabase db push` (or apply via Supabase Dashboard).

Without these tables, the backend will return 503 “Database unavailable” or 500 when creating intents.

---

## Quick Reference

| Where        | What to set                          |
|-------------|---------------------------------------|
| **Railway** | Variables → `ENABLE_MANUAL_PAYMENTS` = `true` |
| **Supabase**| Migrations applied (e.g. `payment_intents`)   |

After that, the Payments screen and Subscription “Pay” buttons work end-to-end (create intent → deposit instructions → submit tx hash → admin approval).
