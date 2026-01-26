# Which Keys Go to Vercel vs Railway?

## Quick Answer

### 🟢 Vercel (Frontend) - Only Safe Keys
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon (publishable) key
- `VITE_API_BASE_URL` - Your Railway backend URL
- **NO** `ENCRYPTION_KEY` ❌
- **NO** `SUPABASE_SERVICE_ROLE_KEY` ❌
- **NO** secrets or passwords ❌

### 🔴 Railway (Backend) - All Backend Keys
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_ANON_KEY` - Supabase anon key (for RLS testing)
- `ENCRYPTION_KEY` - **YES, ADD THIS!** ✅
- `FRONTEND_URL` - Your Vercel frontend URL
- `ADMIN_EMAILS` - Admin email list (optional)

---

## Detailed Breakdown

### Vercel Environment Variables (Frontend)

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these:**

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `VITE_SUPABASE_URL` | `https://oyfeadnxwuazidfbjjfo.supabase.co` | Supabase Dashboard → API |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W` | Supabase Dashboard → API → anon key |
| `VITE_API_BASE_URL` | `https://klineo-production-1dfe.up.railway.app` | Your Railway backend URL |

**❌ DO NOT ADD:**
- `ENCRYPTION_KEY` - Backend only!
- `SUPABASE_SERVICE_ROLE_KEY` - Backend only!
- Any secrets or passwords

**Why safe:**
- `VITE_*` variables are exposed to browser (that's OK for anon key)
- Anon key respects RLS, can't bypass security
- No secrets in frontend

---

### Railway Environment Variables (Backend)

**Go to:** Railway Dashboard → Your Backend Service → Variables

**Add these:**

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `SUPABASE_URL` | `https://oyfeadnxwuazidfbjjfo.supabase.co` | Supabase Dashboard → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase Dashboard → API → service_role key |
| `SUPABASE_ANON_KEY` | `sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W` | Supabase Dashboard → API → anon key |
| `ENCRYPTION_KEY` | `98b64c6f1a551817dba446fa3956a0db0e935423f660f6cc22982c99f8fa5509` | **From your local .env** ✅ |
| `FRONTEND_URL` | `https://klineo.vercel.app` | Your Vercel frontend URL |
| `ADMIN_EMAILS` | `mmxinthi@gmail.com` | Comma-separated admin emails |
| `NODE_ENV` | `production` | Set to production |

**✅ MUST ADD:**
- `ENCRYPTION_KEY` - **This is new!** Required for Binance integration

**Why needed:**
- Backend needs to encrypt/decrypt exchange API credentials
- Must be the same key as your local `.env` (or generate new one)
- Never exposed to frontend

---

## Step-by-Step: Add ENCRYPTION_KEY to Railway

### Step 1: Go to Railway Dashboard
1. Open: https://railway.app/dashboard
2. Click on your **backend service** (the one running your API)

### Step 2: Open Variables
1. Click on **"Variables"** tab (or "Settings" → "Variables")
2. You'll see a list of existing environment variables

### Step 3: Add ENCRYPTION_KEY
1. Click **"New Variable"** or **"+"** button
2. **Variable Name:** `ENCRYPTION_KEY`
3. **Value:** `98b64c6f1a551817dba446fa3956a0db0e935423f660f6cc22982c99f8fa5509`
4. Click **"Add"** or **"Save"**

### Step 4: Verify
- You should see `ENCRYPTION_KEY` in the list
- Railway will automatically restart your service
- Check logs to verify it loaded: `ENCRYPTION_KEY: ✓`

---

## Complete Environment Variable List

### Vercel (Frontend) - 3 Variables
```env
VITE_SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W
VITE_API_BASE_URL=https://klineo-production-1dfe.up.railway.app
```

### Railway (Backend) - 6 Variables
```env
SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W
ENCRYPTION_KEY=98b64c6f1a551817dba446fa3956a0db0e935423f660f6cc22982c99f8fa5509
FRONTEND_URL=https://klineo.vercel.app
ADMIN_EMAILS=mmxinthi@gmail.com
NODE_ENV=production
```

---

## Security Rules

### ✅ Safe to Put in Vercel (Frontend)
- `VITE_SUPABASE_ANON_KEY` - Publishable, safe for browser
- `VITE_SUPABASE_URL` - Just a URL, no secret
- `VITE_API_BASE_URL` - Just a URL, no secret

### ✅ Safe to Put in Railway (Backend)
- All backend environment variables
- `ENCRYPTION_KEY` - Backend only, never exposed
- `SUPABASE_SERVICE_ROLE_KEY` - Backend only, powerful but safe server-side

### ❌ NEVER Put in Vercel
- `ENCRYPTION_KEY` - Backend only!
- `SUPABASE_SERVICE_ROLE_KEY` - Backend only!
- Any secrets or passwords

### ❌ NEVER Put in Railway
- `VITE_*` variables - Those are frontend-only
- Frontend-specific keys

---

## Quick Checklist

### Vercel Setup
- [ ] `VITE_SUPABASE_URL` added
- [ ] `VITE_SUPABASE_ANON_KEY` added
- [ ] `VITE_API_BASE_URL` added
- [ ] **NO** `ENCRYPTION_KEY` (correct!)
- [ ] **NO** `SUPABASE_SERVICE_ROLE_KEY` (correct!)

### Railway Setup
- [ ] `SUPABASE_URL` added
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added
- [ ] `SUPABASE_ANON_KEY` added
- [ ] `ENCRYPTION_KEY` added ✅ **NEW - ADD THIS!**
- [ ] `FRONTEND_URL` added
- [ ] `ADMIN_EMAILS` added (optional)
- [ ] `NODE_ENV=production` set

---

## Summary

**Vercel (Frontend):**
- Only safe, publishable keys
- No secrets
- No `ENCRYPTION_KEY`

**Railway (Backend):**
- All backend secrets
- **ADD `ENCRYPTION_KEY`** ✅
- Service role key (safe server-side)

**Your local `.env` files:**
- ✅ Protected by `.gitignore`
- ✅ Never committed to GitHub
- ✅ Safe to keep locally

---

## Next Steps

1. **Add `ENCRYPTION_KEY` to Railway** (see steps above)
2. **Verify Vercel has correct frontend variables**
3. **Test in production** - Exchange connections should work
