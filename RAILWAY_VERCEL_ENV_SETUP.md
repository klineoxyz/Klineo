# Railway & Vercel Environment Variables Setup

## ✅ Security Check: Your Keys Are Protected!

### 1. GitHub Protection ✅

**Verified**: Your `.env` file is **NOT** tracked by Git.

**Proof**:
- `backend-skeleton/.env` is in `.gitignore`
- Git will ignore it completely
- It will **NEVER** be committed or pushed to GitHub

**Test it yourself**:
```bash
cd backend-skeleton
git status
# .env should NOT appear in the list
```

### 2. Frontend Protection ✅

**Verified**: Frontend **CANNOT** access backend `.env` files.

**Why**:
- Frontend runs separately (different process)
- Frontend only sees root `.env.local` (which has `VITE_*` vars only)
- Backend `.env` is server-side only
- No code paths expose service role key to frontend

**Your frontend only has**:
- `VITE_SUPABASE_ANON_KEY` (safe for browser)
- **NO** `SUPABASE_SERVICE_ROLE_KEY` ✅

---

## 🚂 Railway (Backend) - Environment Variables

### ✅ YES - You MUST add the service role key to Railway!

**Why**: Railway runs your backend in production. It needs the env vars.

### Required Environment Variables for Railway:

```
FRONTEND_URL=https://klineo.xyz
NODE_ENV=production
SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your key)
ADMIN_EMAILS=mmxinthi@gmail.com
```

### How to Add to Railway:

1. **Go to Railway Dashboard**:
   - https://railway.app/dashboard
   - Select your KLINEO backend service

2. **Open Environment Variables**:
   - Click on your service
   - Go to **"Variables"** tab
   - Click **"New Variable"**

3. **Add Each Variable**:
   - `FRONTEND_URL` = `https://klineo.xyz`
   - `NODE_ENV` = `production`
   - `SUPABASE_URL` = `https://oyfeadnxwuazidfbjjfo.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (paste your full key)
   - `ADMIN_EMAILS` = `mmxinthi@gmail.com`

4. **Save and Redeploy**:
   - Railway will automatically redeploy when you add env vars
   - Check deployment logs to verify it starts correctly

---

## ▲ Vercel (Frontend) - Environment Variables

### ❌ NO - Do NOT add service role key to Vercel!

**Why**: Frontend should NEVER have the service role key. It's backend-only.

### Required Environment Variables for Vercel:

```
VITE_API_BASE_URL=https://your-railway-backend-url.railway.app
VITE_SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W
```

**Note**: Only `VITE_*` variables. **NO** `SUPABASE_SERVICE_ROLE_KEY`!

### How to Add to Vercel:

1. **Go to Vercel Dashboard**:
   - https://vercel.com/dashboard
   - Select your KLINEO project

2. **Open Settings → Environment Variables**:
   - Click on your project
   - Go to **Settings** → **Environment Variables**

3. **Add Variables** (Production environment):
   - `VITE_API_BASE_URL` = `https://your-railway-backend-url.railway.app`
   - `VITE_SUPABASE_URL` = `https://oyfeadnxwuazidfbjjfo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W`

4. **Redeploy**:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on latest deployment
   - Or push to GitHub (auto-deploy)

---

## 🔒 Security Summary

### What Goes Where:

| Variable | Local `.env` | Railway | Vercel | GitHub |
|----------|--------------|---------|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | ✅ Yes | ❌ **NO** | ❌ Never |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | ❌ No | ✅ Yes | ❌ Never |
| `FRONTEND_URL` | ✅ Yes | ✅ Yes | ❌ No | ❌ Never |
| `VITE_API_BASE_URL` | ✅ Yes | ❌ No | ✅ Yes | ❌ Never |

### Security Rules:

✅ **DO**:
- ✅ Add service role key to Railway (backend)
- ✅ Add anon key to Vercel (frontend)
- ✅ Keep `.env` files local only
- ✅ Use platform env vars for production

❌ **DON'T**:
- ❌ Never add service role key to Vercel
- ❌ Never commit `.env` files to Git
- ❌ Never expose service role key in frontend code
- ❌ Never share service role key publicly

---

## 📋 Quick Checklist

### Railway (Backend) Setup:
- [ ] Add `FRONTEND_URL=https://klineo.xyz`
- [ ] Add `NODE_ENV=production`
- [ ] Add `SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY=eyJ...` (your full key)
- [ ] Add `ADMIN_EMAILS=mmxinthi@gmail.com`
- [ ] Verify deployment succeeds

### Vercel (Frontend) Setup:
- [ ] Add `VITE_API_BASE_URL=https://your-railway-url.railway.app`
- [ ] Add `VITE_SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co`
- [ ] Add `VITE_SUPABASE_ANON_KEY=sb_publishable_...`
- [ ] **DO NOT** add `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Redeploy frontend

---

## 🎯 Summary

**Railway (Backend)**: ✅ **YES** - Add service role key  
**Vercel (Frontend)**: ❌ **NO** - Never add service role key  
**GitHub**: ❌ **NO** - `.env` files are ignored  
**Frontend Code**: ❌ **NO** - Service role key never exposed

**Your service role key is secure!** 🔒
