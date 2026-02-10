# Master Trader Application Email – Step-by-Step Setup

When someone submits the **Become a Master Trader** form, the backend sends a copy of the application to **klineoxyz@gmail.com** (or another address you set). This guide shows how to set that up.

---

## Where to add the API key: Railway vs Vercel

| Where | What runs there | Add RESEND vars? |
|-------|------------------|-------------------|
| **Railway** | Your **backend API** (Node/Express) | **Yes** – add `RESEND_API_KEY`, and optionally `EMAIL_FROM` and `MASTER_TRADER_COPY_TO_EMAIL` here. |
| **Vercel** | Your **frontend** (Vite/React) | **No** – the frontend never sends this email; only the backend does. |

So: **add the Resend-related env vars only in Railway** (where your backend is deployed). You do **not** add them in Vercel.

---

## Step 1: Create a Resend account and get an API key

1. Go to **[resend.com](https://resend.com)** and sign up (or log in).
2. In the dashboard, open **API Keys** (in the sidebar or under **Developers**).
3. Click **Create API Key**.
4. Give it a name (e.g. `KLINEO Master Trader`), leave permissions as default (or “Sending access”).
5. Copy the key. It starts with `re_` (e.g. `re_123abc...`).  
   - **Important:** Resend shows the key only once. Save it somewhere safe; you’ll paste it in Railway in Step 3.

---

## Step 2: Decide the “From” address (optional but recommended for production)

- **Quick test:** You can skip this. The code uses `KLINEO <onboarding@resend.dev>` if you don’t set `EMAIL_FROM`. Resend allows this in development; it may be limited in production.
- **Production:** Use your own domain:
  1. In Resend: **Domains** → **Add Domain** → enter your domain (e.g. `yourdomain.com`).
  2. Add the DNS records Resend shows (MX, TXT, etc.) at your DNS provider.
  3. After the domain is verified, use an address like:  
     `KLINEO <notifications@yourdomain.com>`  
     Set that in Railway as `EMAIL_FROM` (Step 3).

---

## Step 3: Add environment variables in Railway

1. Open **[railway.app](https://railway.app)** and log in.
2. Open the **project** that runs your KLINEO **backend** (API).
3. Click the **backend service** (the one that runs the Node/Express server).
4. Go to the **Variables** tab (or **Settings** → **Variables**).
5. Add these variables:

| Variable | Value | Required? |
|----------|--------|-----------|
| `RESEND_API_KEY` | Your key from Step 1 (e.g. `re_xxxx...`) | **Yes** |
| `EMAIL_FROM` | e.g. `KLINEO <notifications@yourdomain.com>` or leave unset to use Resend’s test sender | No |
| `MASTER_TRADER_COPY_TO_EMAIL` | e.g. `klineoxyz@gmail.com` (default is already this) | No |

Example:

- `RESEND_API_KEY` = `re_AbCdEf123456...`
- `EMAIL_FROM` = `KLINEO <notifications@klineo.xyz>` (only if you verified a domain)
- `MASTER_TRADER_COPY_TO_EMAIL` = `klineoxyz@gmail.com` (optional; this is the default)

6. Save. Railway will redeploy the service with the new variables (or trigger a redeploy).

---

## Step 4: Local development (optional)

If you run the backend locally and want the same email to work:

1. In your project, go to the **backend** folder: `backend-skeleton`.
2. Copy `.env.example` to `.env` if you don’t have a `.env` yet.
3. In `backend-skeleton/.env`, add:

   ```env
   RESEND_API_KEY=re_xxxx
   # Optional:
   # EMAIL_FROM=KLINEO <notifications@yourdomain.com>
   # MASTER_TRADER_COPY_TO_EMAIL=klineoxyz@gmail.com
   ```

4. Restart the backend (e.g. `npm run dev` or `pnpm run dev` in `backend-skeleton`).

---

## Step 5: Test it

1. Open your app (production or local).
2. Go to **Become a Master Trader** and submit the form with test data.
3. Check **klineoxyz@gmail.com** (or the address in `MASTER_TRADER_COPY_TO_EMAIL`):
   - You should get an email with subject like: `[KLINEO] Master Trader application: <Name>`.
   - Body should contain all form fields and a link to the trading history screenshot (if one was uploaded).

If no email arrives:

- Check **Railway** logs for the backend; you may see `[email] RESEND_API_KEY not set` or a Resend error.
- In **Resend** dashboard, check **Logs** or **Emails** for failed sends or bounces.
- Confirm the recipient address is correct and that Resend is not blocking the “from” domain.

---

## Quick reference

| Goal | Where | What to set |
|------|--------|-------------|
| Production (backend on Railway) | **Railway** → backend service → Variables | `RESEND_API_KEY` (required), optionally `EMAIL_FROM`, `MASTER_TRADER_COPY_TO_EMAIL` |
| Local backend | `backend-skeleton/.env` | Same variables |
| Frontend (Vercel) | Vercel | Nothing for this feature |

After this, every new Master Trader application will send a full copy (including the trading history screenshot link) to **klineoxyz@gmail.com** (or your chosen address).
