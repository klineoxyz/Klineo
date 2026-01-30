# Railway Setup Guide — KLINEO Backend

**Step-by-step: deploy the backend to Railway and connect Supabase**

---

## What You'll Do

1. Create a Railway project and deploy the backend
2. Set **Root Directory** to `backend-skeleton` (this repo)
3. Add environment variables (Supabase + frontend URL)
4. Get the Railway URL and add it to Vercel
5. Redeploy frontend and verify

---

## Prerequisites

- [ ] Railway account: https://railway.app (sign up with GitHub)
- [ ] Supabase **Project URL** and **service_role** key (see Step 2)
- [ ] Your Vercel frontend URL (e.g. `https://your-app.vercel.app`)

---

## Step 1: Get Supabase service_role Key

**You already have anon/publishable key. The backend needs the service_role key.**

1. **Go to:** https://supabase.com/dashboard
2. **Select** your project (same as before)
3. **Project Settings** (gear) → **API**
4. Under **Project API keys**, find **service_role** → **secret**
5. **Reveal** (eye icon) and **copy** the full key
6. **Save it** somewhere safe — you'll add it to Railway only

**Important:** Use **service_role**, not anon. Never put service_role in frontend or Vercel.

---

## Step 2: Create Railway Project

### 2.1 Open Railway

1. **Go to:** https://railway.app/dashboard
2. **Log in** (GitHub is easiest)

### 2.2 New Project from Repo

1. **Click:** **"New Project"**
2. **Choose:** **"Deploy from GitHub repo"**
3. **Select** your `klineoxyz/Klineo` repo (or connect GitHub if needed)
4. **Select** the **main** branch
5. **Click** **"Add variables"** or **"Deploy"** — we'll add env vars next

### 2.3 Set Root Directory (Monorepo)

Your backend lives in `backend-skeleton/`. Railway must use that folder.

1. **Click** your new service (the one that was created)
2. **Settings** tab (or **⚙️**)
3. **Build** section → **Root Directory**
4. **Set:** `backend-skeleton`
5. **Save**

---

## Step 3: Add Environment Variables

### 3.1 Open Variables

1. **Click** your service
2. **Variables** tab (or **Settings** → **Variables**)

### 3.2 Add These Variables

Click **"+ New Variable"** (or **"Add variable"**) for each:

| Variable | Value | Notes |
|----------|-------|--------|
| `SUPABASE_URL` | `https://oyfeadnxwuazidfbjjfo.supabase.co` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | *(paste service_role key)* | From Supabase → API → service_role |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Your Vercel frontend URL (for CORS) |
| `ENABLE_MANUAL_PAYMENTS` | `true` | Enables joining fee + package payment intents (Payments screen). See [docs/ENABLE_MANUAL_PAYMENTS.md](docs/ENABLE_MANUAL_PAYMENTS.md). |
| `NODE_ENV` | `production` | Optional |

**FRONTEND_URL examples:**
- `https://klineo.vercel.app`
- Or your custom Vercel domain

### 3.3 Save

Railway will **redeploy** automatically when you add/change variables.

---

## Step 4: Deploy and Get Backend URL

### 4.1 Deploy

1. If you haven’t deployed yet: **Deploy** from the project page
2. Wait for **Build** → **Active** (green)

### 4.2 Get Public URL

1. **Settings** → **Networking** (or **"Generate domain"**)
2. **Generate Domain** (or **Add public networking**)
3. **Copy** the URL, e.g. `https://your-service.up.railway.app`

**This is your backend API URL.** Use it in Vercel as `VITE_API_BASE_URL`.

---

## Step 5: Add Backend URL to Vercel

1. **Vercel** → your project → **Settings** → **Environment Variables**
2. **Add** (or **Edit**):
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://your-service.up.railway.app` (your Railway URL)
3. **Environments:** Production, Preview, Development
4. **Save**
5. **Deployments** → **Redeploy** latest

---

## Step 6: Update Local .env.local

In `c:\Users\Muaz\Desktop\KLINEO\.env.local`:

```bash
VITE_API_BASE_URL=https://your-service.up.railway.app
```

*(Keep your other vars as they are.)*

---

## Step 7: Verify

### 7.1 Health check

```bash
curl https://your-service.up.railway.app/health
```

**Expected:**
```json
{"status":"ok","timestamp":"...","service":"klineo-backend","version":"1.0.0","environment":"production"}
```

### 7.2 Auth endpoint (no token)

```bash
curl https://your-service.up.railway.app/api/auth/me
```

**Expected:** `{"error":"No token provided"}` (status 401)

### 7.3 Frontend

1. Open your Vercel app
2. **F12** → Console
3. No errors about missing `VITE_API_BASE_URL` or Supabase

---

## Troubleshooting

### Build fails: "Cannot find module"

- **Root Directory** must be `backend-skeleton`
- Ensure `package.json` and `src/` are inside `backend-skeleton/`

### "Supabase not configured" / 503 on /api/auth/me

- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Railway **Variables**
- Use **service_role** key, not anon
- Redeploy after changing variables

### CORS errors from frontend

- Set `FRONTEND_URL` in Railway to your **exact** Vercel URL (including `https://`)
- No trailing slash
- Redeploy backend after changing

### Health works but /api/auth/me crashes

- Confirm Supabase vars are set
- Check Railway **Deploy** logs for errors

---

## Quick Reference

### Railway Variables

```
SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

### Vercel (after Railway)

```
VITE_API_BASE_URL=https://your-service.up.railway.app
```

### Backend layout

```
backend-skeleton/
├── package.json     # build + start
├── src/
│   ├── index.ts
│   ├── middleware/auth.ts
│   └── routes/
│       ├── health.ts
│       └── auth-with-supabase.ts
└── .env.example
```

---

## Checklist

- [ ] Railway project created from GitHub
- [ ] Root Directory = `backend-skeleton`
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` added in Railway
- [ ] `FRONTEND_URL` = your Vercel URL
- [ ] Public domain generated, URL copied
- [ ] `VITE_API_BASE_URL` set in Vercel to Railway URL
- [ ] Vercel redeployed
- [ ] `/health` returns OK
- [ ] `/api/auth/me` returns 401 without token

---

## Next Steps

- Wire frontend to call `VITE_API_BASE_URL` (e.g. `/api/auth/me`) with Supabase JWT
- Use `ACTION_PLAN.md` / `MVP_ROADMAP.md` for auth flow details
