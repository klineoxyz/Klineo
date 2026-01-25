# KLINEO MVP Action Plan

**Your goal:** Stop Railway from building frontend, finish MVP, connect Supabase, start onboarding users

---

## 🎯 What You Have Now

✅ **Frontend:** Complete UI (Vite + React)  
✅ **Security fixes:** Applied (dev bypass, isAdmin, etc.)  
✅ **Vercel:** Ready to deploy frontend  
❌ **Backend:** Not created yet  
❌ **Supabase:** Not connected yet  

---

## 📋 Action Plan (Do These in Order)

### **TODAY (1-2 hours)**

#### 1. Stop Railway Building Frontend (2 min)

**Via Railway Dashboard:**
1. Go to https://railway.app/dashboard
2. Find service building `KLINEO` repo
3. **Settings** → **Disconnect Repository** or **Delete Service**

**Result:** Railway stops building this frontend. This repo = Vercel only.

---

#### 2. Create Backend Repo (10 min)

**Option A: New Repo (Recommended)**

```bash
# Create new directory
mkdir klineo-backend
cd klineo-backend
git init

# Copy files from backend-skeleton/ folder in KLINEO repo
# Or manually create (see MVP_ROADMAP.md)
```

**Files to create:**
- Copy from `backend-skeleton/` folder (already created for you)
- Or follow `MVP_ROADMAP.md` Step 2

**Push to GitHub:**
```bash
git add .
git commit -m "Initial backend setup"
git remote add origin https://github.com/your-username/klineo-backend.git
git push -u origin main
```

---

#### 3. Deploy Backend to Railway (10 min)

1. **Railway Dashboard** → **New Project** → **Deploy from GitHub**
2. **Select `klineo-backend` repo** (NOT the frontend KLINEO repo)
3. **Railway auto-detects** Node.js
4. **Add environment variable:**
   - `FRONTEND_URL` = `https://klineo.vercel.app` (or your Vercel URL)
5. **Deploy**
6. **Test:** `curl https://your-backend.railway.app/health`

**Result:** Backend running on Railway, health check works.

---

#### 4. Create Supabase Project (5 min)

1. **https://supabase.com** → **New Project**
2. **Name:** `klineo`
3. **Database Password:** Save securely
4. **Region:** Choose closest
5. **Wait** for setup (~2 minutes)

**Get credentials:**
- **Project Settings** → **API**
- Copy: `Project URL`, `anon public` key, `service_role` key

---

#### 5. Set Up Supabase Database (10 min)

1. **Supabase Dashboard** → **SQL Editor** → **New Query**
2. **Copy & paste** entire contents of `supabase-schema.sql`
3. **Run** the SQL
4. **Verify:** Table Editor → `user_profiles` table exists

**Result:** Database schema ready, RLS enabled, auto-profile creation.

---

#### 6. Connect Supabase to Backend (15 min)

1. **In backend repo:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Copy middleware:**
   - Copy `backend-skeleton/src/middleware/auth.ts` to your backend
   - Copy `backend-skeleton/src/routes/auth-with-supabase.ts` → `src/routes/auth.ts`

3. **Update `src/index.ts`:**
   ```typescript
   import { authRouter } from './routes/auth.js';
   // ... rest of code
   ```

4. **Railway Dashboard** → **Variables:**
   - `SUPABASE_URL` = (from Supabase)
   - `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase, **service_role** key)

5. **Redeploy** backend

**Result:** Backend verifies Supabase JWTs.

---

#### 7. Connect Frontend to Backend + Supabase (20 min)

1. **Install Supabase client:**
   ```bash
   cd c:\Users\Muaz\Desktop\KLINEO
   pnpm add @supabase/supabase-js
   ```

2. **Create `src/lib/supabase.ts`:**
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
   
   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Missing Supabase environment variables');
   }
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

3. **Create `src/lib/api.ts`:**
   ```typescript
   import { supabase } from './supabase';
   
   const API_BASE = import.meta.env.VITE_API_BASE_URL;
   
   async function apiRequest(endpoint: string, options: RequestInit = {}) {
     const token = (await supabase.auth.getSession()).data.session?.access_token;
     
     const response = await fetch(`${API_BASE}${endpoint}`, {
       ...options,
       headers: {
         'Content-Type': 'application/json',
         ...(token && { Authorization: `Bearer ${token}` }),
         ...options.headers,
       },
     });
   
     if (!response.ok) {
       throw new Error(`API error: ${response.statusText}`);
     }
   
     return response.json();
   }
   
   export const api = {
     auth: {
       me: () => apiRequest('/api/auth/me'),
     },
   };
   ```

4. **Update `src/app/App.tsx`:**
   - Add Supabase auth state listener
   - Fetch user role from backend
   - Use real `isAdmin` from role

5. **Update Login/SignUp pages** to use `supabase.auth.signInWithPassword()` / `signUp()`

6. **Vercel Dashboard** → **Environment Variables:**
   - `VITE_API_BASE_URL` = `https://your-backend.railway.app`
   - `VITE_SUPABASE_URL` = (from Supabase)
   - `VITE_SUPABASE_ANON_KEY` = (from Supabase, **anon** key only)

7. **Redeploy** frontend

**Result:** Frontend authenticates via Supabase, calls backend API.

---

#### 8. Create Admin User (5 min)

1. **Supabase** → **Authentication** → **Users** → **Add User**
2. **Email:** `mmxinthi@gmail.com`
3. **Set password** (or send invite)
4. **SQL Editor:**
   ```sql
   UPDATE public.user_profiles SET role = 'admin' WHERE email = 'mmxinthi@gmail.com';
   ```

**Result:** Admin user created, can access Admin Panel.

---

### **VERIFY MVP WORKS**

1. ✅ **Backend health:** `curl https://your-backend.railway.app/health`
2. ✅ **Frontend loads:** Visit Vercel URL
3. ✅ **Sign up** new user → Profile created in Supabase
4. ✅ **Login** works → JWT verified
5. ✅ **Admin login** (`mmxinthi@gmail.com`) → Admin Panel visible
6. ✅ **Regular user** → Admin Panel NOT visible

---

## 📁 Files Created for You

**Backend skeleton (ready to copy):**
- `backend-skeleton/package.json`
- `backend-skeleton/tsconfig.json`
- `backend-skeleton/src/index.ts`
- `backend-skeleton/src/routes/health.ts`
- `backend-skeleton/src/routes/auth.ts`
- `backend-skeleton/src/middleware/auth.ts` (with Supabase)
- `backend-skeleton/.env.example`
- `backend-skeleton/.gitignore`

**Database schema:**
- `supabase-schema.sql` (ready to run in Supabase SQL Editor)

**Documentation:**
- `MVP_ROADMAP.md` — Complete step-by-step guide
- `QUICK_START_MVP.md` — Quick reference
- `ACTION_PLAN.md` — This file

---

## 🚀 After MVP Works

**Next features to add:**
1. Exchange API key validation (backend)
2. Trader marketplace (real data from backend)
3. Copy trading endpoints (start/stop copy)
4. Real-time positions/orders (WebSocket)

**See:** `MVP_ROADMAP.md` Step 7 for full feature list.

---

## ⚠️ Important Notes

- **Never commit** `.env` files (now in `.gitignore`)
- **Service role key** = Backend only, never frontend
- **Anon key** = Frontend-safe, use in Vercel env vars
- **Admin email** stored in database, not hardcoded
- **Backend enforces** admin access, frontend UI-only

---

## 🆘 Need Help?

**Railway issues:**
- Check Railway logs
- Verify env vars are set
- Test health endpoint

**Supabase issues:**
- Verify project is active
- Check RLS policies enabled
- Test in Supabase dashboard → API

**Frontend issues:**
- Check Vercel env vars
- Verify backend URL correct
- Check browser console

---

**Start with Step 1** and work through each step. Each builds on the previous.

**Estimated time:** 1-2 hours for full MVP setup.
