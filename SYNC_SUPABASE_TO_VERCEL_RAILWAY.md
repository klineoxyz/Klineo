# Sync Supabase to Vercel & Railway — Step-by-Step Guide

**Complete guide to connect Supabase to your frontend (Vercel) and backend (Railway)**

---

## Prerequisites

- ✅ Supabase project created
- ✅ Database schema run (`supabase-schema-fixed.sql`)
- ✅ Vercel project connected (frontend)
- ✅ Railway project connected (backend)

---

## Step 1: Get Supabase Credentials

### 1.1 Open Supabase Dashboard

1. **Go to:** https://supabase.com/dashboard
2. **Select your project** (or create one if needed)
3. **Click:** **Project Settings** (gear icon, bottom left)
4. **Click:** **API** (in left sidebar)

### 1.2 Copy Credentials

You'll see three important values:

| What to Copy | Where It Is | Use For |
|--------------|-------------|---------|
| **Project URL** | Top of page: `https://xxx.supabase.co` | Both Vercel & Railway |
| **anon public** key | Under "Project API keys" → `anon` → `public` | **Vercel only** |
| **service_role** key | Under "Project API keys" → `service_role` → `secret` | **Railway only** |

**⚠️ Important:**
- **anon key** = Safe for frontend (respects RLS)
- **service_role key** = Backend only (bypasses RLS, powerful)

**Save these somewhere temporarily** (you'll paste them in Steps 3 & 4).

---

## Step 2: Create Local .env Files (Not Committed to Git)

### 2.1 Frontend .env File

**In your KLINEO frontend repo:**

1. **Copy the example file:**
   ```bash
   cd c:\Users\Muaz\Desktop\KLINEO
   copy .env.example .env.local
   ```

2. **Edit `.env.local`** and fill in your values:

   ```bash
   # Backend API URL (get from Railway after deploying)
   VITE_API_BASE_URL=https://your-backend.railway.app

   # Supabase (use ANON key only)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc... (paste anon key here)

   # Analytics (optional)
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   VITE_PLAUSIBLE_DOMAIN=klineo.com

   # Development (local only)
   VITE_DEV_ADMIN=false
   ```

3. **Verify `.env.local` is in `.gitignore`:**
   - Check `.gitignore` includes `.env*`
   - ✅ It should already be there (we added it in security fixes)

### 2.2 Backend .env File

**In your backend repo (`klineo-backend`):**

1. **Copy the example file:**
   ```bash
   cd klineo-backend
   copy .env.example .env
   ```

2. **Edit `.env`** and fill in your values:

   ```bash
   # Server
   PORT=3000
   NODE_ENV=development

   # Frontend URL (for CORS)
   FRONTEND_URL=https://klineo.vercel.app

   # Supabase (use SERVICE_ROLE key)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (paste service_role key here)
   ```

3. **Verify `.env` is in `.gitignore`** (should already be there)

---

## Step 3: Add Environment Variables to Vercel (Frontend)

### 3.1 Open Vercel Dashboard

1. **Go to:** https://vercel.com/dashboard
2. **Select your KLINEO project**
3. **Click:** **Settings** (top navigation)
4. **Click:** **Environment Variables** (left sidebar)

### 3.2 Add Variables

**Click "Add New"** for each variable:

#### Variable 1: Backend API URL

- **Name:** `VITE_API_BASE_URL`
- **Value:** `https://your-backend.railway.app` (your Railway backend URL)
- **Environment:** Select all (Production, Preview, Development)
- **Click:** **Save**

#### Variable 2: Supabase URL

- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://your-project.supabase.co` (from Supabase dashboard)
- **Environment:** Select all
- **Click:** **Save**

#### Variable 3: Supabase Anon Key

- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGc...` (anon public key from Supabase)
- **Environment:** Select all
- **Click:** **Save**

#### Variable 4: Analytics (Optional)

- **Name:** `VITE_GA_MEASUREMENT_ID`
- **Value:** `G-XXXXXXXXXX` (if using Google Analytics)
- **Environment:** Production only
- **Click:** **Save**

### 3.3 Redeploy Frontend

1. **Go to:** **Deployments** tab
2. **Click:** **⋯** (three dots) on latest deployment
3. **Click:** **Redeploy**
4. **Wait** for deployment to complete

**Verify:** Your frontend now has access to Supabase and backend API.

---

## Step 4: Add Environment Variables to Railway (Backend)

### 4.1 Open Railway Dashboard

1. **Go to:** https://railway.app/dashboard
2. **Select your backend service** (not the frontend)
3. **Click:** **Variables** tab (or **Settings** → **Variables**)

### 4.2 Add Variables

**Click "New Variable"** for each:

#### Variable 1: Supabase URL

- **Name:** `SUPABASE_URL`
- **Value:** `https://your-project.supabase.co` (from Supabase dashboard)
- **Click:** **Add**

#### Variable 2: Supabase Service Role Key

- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** `eyJhbGc...` (service_role key from Supabase)
- **Click:** **Add**

**⚠️ Important:** This is the **service_role** key, NOT the anon key!

#### Variable 3: Frontend URL (for CORS)

- **Name:** `FRONTEND_URL`
- **Value:** `https://klineo.vercel.app` (your Vercel frontend URL)
- **Click:** **Add**

#### Variable 4: Port (Optional)

- **Name:** `PORT`
- **Value:** `3000` (Railway auto-sets this, but you can override)
- **Click:** **Add**

### 4.3 Redeploy Backend

1. **Railway will auto-redeploy** when you add variables
2. **Or manually:** Click **Deploy** → **Redeploy**
3. **Wait** for deployment

**Verify:** Check logs for "KLINEO Backend running on port..."

---

## Step 5: Verify Everything Works

### 5.1 Test Backend Health

```bash
curl https://your-backend.railway.app/health
```

**Expected:** `{"status":"ok","service":"klineo-backend",...}`

### 5.2 Test Supabase Connection (Backend)

**In your backend code**, the middleware should now be able to verify Supabase JWTs.

**Test endpoint:**
```bash
# This will fail without a valid JWT, but should not crash
curl https://your-backend.railway.app/api/auth/me
```

**Expected:** `{"error":"No token provided"}` (not a crash)

### 5.3 Test Frontend

1. **Visit:** Your Vercel URL
2. **Open browser console** (F12)
3. **Check for errors:**
   - Should NOT see "Missing Supabase environment variables"
   - Should NOT see "VITE_API_BASE_URL not set"

### 5.4 Test Authentication Flow

1. **Sign up** a test user
2. **Check Supabase:** Authentication → Users → User should appear
3. **Check database:** Table Editor → `user_profiles` → Profile should be created
4. **Login** with test user
5. **Verify:** User can access dashboard

---

## Step 6: Set Admin User

### 6.1 Create Admin in Supabase Auth

1. **Supabase Dashboard** → **Authentication** → **Users**
2. **Add User**
3. **Email:** `mmxinthi@gmail.com`
4. **Set password** (or send invite)

### 6.2 Set Admin Role

**SQL Editor** → **New Query** → Run:

```sql
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'mmxinthi@gmail.com';
```

**Verify:**
```sql
SELECT id, email, role 
FROM public.user_profiles 
WHERE email = 'mmxinthi@gmail.com';
```

Should show: `role = 'admin'`

### 6.3 Test Admin Access

1. **Login** as `mmxinthi@gmail.com` in frontend
2. **Verify:** Admin Panel visible in sidebar
3. **Verify:** Can access admin routes

---

## Troubleshooting

### Vercel: "Missing Supabase environment variables"

**Fix:**
1. Check env vars are added in Vercel dashboard
2. Verify variable names start with `VITE_`
3. Redeploy after adding variables

### Railway: Backend can't connect to Supabase

**Fix:**
1. Check `SUPABASE_URL` is correct (no trailing slash)
2. Check `SUPABASE_SERVICE_ROLE_KEY` is service_role key (not anon)
3. Check Railway logs for connection errors

### Frontend: Can't authenticate

**Fix:**
1. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel
2. Check browser console for errors
3. Verify Supabase project is active

### CORS Errors

**Fix:**
1. Check `FRONTEND_URL` in Railway matches your Vercel URL
2. Check backend CORS config allows your frontend origin

---

## Security Checklist

- [ ] `.env.local` exists locally but NOT committed to Git
- [ ] `.env` in backend exists locally but NOT committed to Git
- [ ] `.gitignore` includes `.env*`
- [ ] Vercel has **anon key** only (not service_role)
- [ ] Railway has **service_role key** only (not anon)
- [ ] No secrets in code or committed files

---

## Quick Reference

### Vercel Environment Variables

```
VITE_API_BASE_URL=https://your-backend.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon key)
```

### Railway Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role key)
FRONTEND_URL=https://klineo.vercel.app
```

---

## Next Steps

After Supabase is connected:
1. ✅ Test authentication (signup/login)
2. ✅ Test admin access (`mmxinthi@gmail.com`)
3. ✅ Build backend API endpoints (traders, copy trading, etc.)
4. ✅ Connect frontend to backend API

**See:** `ACTION_PLAN.md` for complete MVP roadmap.
