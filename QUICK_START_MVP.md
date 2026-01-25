# Quick Start: MVP in 8 Steps

**Goal:** Get KLINEO MVP running with Supabase, ready for users

---

## Step 1: Stop Railway Building Frontend (2 min)

1. **Railway Dashboard:** https://railway.app/dashboard
2. **Find service** building `KLINEO` repo
3. **Settings** → **Disconnect Repository** or **Delete Service**
4. ✅ Railway stops building this frontend

---

## Step 2: Create Backend Repo (5 min)

```bash
# Create new directory
mkdir klineo-backend
cd klineo-backend
git init

# Copy files from backend-skeleton/ folder
# Or create manually (see MVP_ROADMAP.md Step 2)
```

**Files needed:**
- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/routes/health.ts`
- `src/routes/auth.ts`
- `.env.example`
- `.gitignore`

**See:** `backend-skeleton/` folder in this repo for ready-to-use files.

---

## Step 3: Deploy Backend to Railway (10 min)

1. **Push backend to GitHub**
2. **Railway** → **New Project** → **Deploy from GitHub**
3. **Select backend repo**
4. **Add env:** `FRONTEND_URL=https://klineo.vercel.app`
5. **Deploy**
6. **Test:** `curl https://your-backend.railway.app/health`

---

## Step 4: Create Supabase Project (5 min)

1. **https://supabase.com** → **New Project**
2. **Name:** `klineo`
3. **Save password** securely
4. **Wait for setup**

---

## Step 5: Set Up Supabase Database (10 min)

1. **Supabase Dashboard** → **SQL Editor**
2. **Run SQL** from `MVP_ROADMAP.md` Step 3.3
3. **Creates:**
   - `user_profiles` table
   - RLS policies
   - Auto-profile creation trigger

---

## Step 6: Connect Supabase to Backend (15 min)

1. **Install:** `npm install @supabase/supabase-js` in backend
2. **Copy middleware** from `MVP_ROADMAP.md` Step 4.2
3. **Update auth routes** (Step 4.3)
4. **Add env vars to Railway:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Redeploy**

---

## Step 7: Connect Frontend (20 min)

1. **Install:** `pnpm add @supabase/supabase-js` in frontend
2. **Create:** `src/lib/supabase.ts` (see MVP_ROADMAP.md Step 5.2)
3. **Create:** `src/lib/api.ts` (Step 5.3)
4. **Update:** `src/app/App.tsx` (Step 5.4)
5. **Update:** Login/SignUp pages (Step 5.5)
6. **Add env vars to Vercel:**
   - `VITE_API_BASE_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. **Redeploy**

---

## Step 8: Create Admin User (5 min)

1. **Supabase** → **Authentication** → **Add User**
2. **Email:** `mmxinthi@gmail.com`
3. **Set password**
4. **SQL Editor:**
   ```sql
   UPDATE public.user_profiles SET role = 'admin' WHERE email = 'mmxinthi@gmail.com';
   ```

---

## Verify MVP Works

1. ✅ **Backend health:** `curl https://your-backend.railway.app/health`
2. ✅ **Frontend loads:** Visit Vercel URL
3. ✅ **Sign up** new user
4. ✅ **Login** works
5. ✅ **Admin login** (`mmxinthi@gmail.com`) shows Admin Panel
6. ✅ **Regular user** does NOT see Admin Panel

---

## Next: Add Real Features

Once auth works:
- [ ] Exchange API key validation (backend)
- [ ] Trader marketplace (backend data)
- [ ] Copy trading endpoints
- [ ] Real-time positions/orders

**See:** `MVP_ROADMAP.md` for full feature list.

---

## Troubleshooting

**Backend not deploying?**
- Check Railway logs
- Verify `package.json` scripts
- Check env vars are set

**Supabase connection failing?**
- Verify env vars (URL + service_role key)
- Check Supabase project is active
- Test in Supabase dashboard → API

**Frontend auth not working?**
- Check Vercel env vars (anon key, not service_role)
- Verify backend URL is correct
- Check browser console for errors

---

**Total time:** ~1-2 hours for full setup

**Files ready:** Check `backend-skeleton/` folder for copy-paste backend code.
