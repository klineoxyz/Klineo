# Quick Environment Variables Setup

**Fast reference for setting up .env files and syncing to Vercel/Railway**

---

## ✅ .gitignore Status

Your `.gitignore` already includes:
```
.env
.env.*
!.env.example
```

**This means:**
- ✅ `.env.local` will NOT be committed (safe)
- ✅ `.env` will NOT be committed (safe)
- ✅ `.env.example` WILL be committed (template only, no secrets)

---

## 📝 Step 1: Create Local .env Files

### Frontend (.env.local)

**Location:** `c:\Users\Muaz\Desktop\KLINEO\.env.local`

```bash
# Copy example file
copy .env.example .env.local

# Then edit .env.local and fill in your values
```

**Template:**
```bash
VITE_API_BASE_URL=https://your-backend.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_PLAUSIBLE_DOMAIN=klineo.com
VITE_DEV_ADMIN=false
```

### Backend (.env)

**Location:** `klineo-backend\.env`

```bash
# Copy example file
copy .env.example .env

# Then edit .env and fill in your values
```

**Template:**
```bash
PORT=3000
NODE_ENV=development
FRONTEND_URL=https://klineo.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

## 🚀 Step 2: Add to Vercel (Frontend)

1. **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. **Add each variable:**
   - `VITE_API_BASE_URL` = Your Railway backend URL
   - `VITE_SUPABASE_URL` = Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase **anon** key
3. **Redeploy**

---

## 🚂 Step 3: Add to Railway (Backend)

1. **Railway Dashboard** → Your backend service → **Variables**
2. **Add each variable:**
   - `SUPABASE_URL` = Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase **service_role** key
   - `FRONTEND_URL` = Your Vercel frontend URL
3. **Auto-redeploys**

---

## 🔑 Where to Get Supabase Keys

1. **Supabase Dashboard** → **Project Settings** → **API**
2. **Copy:**
   - **Project URL** → Use in both Vercel & Railway
   - **anon public** key → Vercel only
   - **service_role** key → Railway only

---

## ✅ Verify .env Files Are NOT in Git

```bash
# Check if .env files are tracked
git status

# Should NOT show:
# - .env.local
# - .env
# - .env.production

# Should show:
# - .env.example (this is safe, no secrets)
```

**If .env files show up:**
```bash
# Remove from Git (but keep local file)
git rm --cached .env.local
git rm --cached .env
git commit -m "Remove .env files from Git"
```

---

## 📋 Complete Checklist

- [ ] `.env.local` created in frontend (not in Git)
- [ ] `.env` created in backend (not in Git)
- [ ] `.env.example` files committed (templates only)
- [ ] Vercel env vars added (anon key only)
- [ ] Railway env vars added (service_role key only)
- [ ] Both services redeployed
- [ ] Tested authentication

---

**Full guide:** See `SYNC_SUPABASE_TO_VERCEL_RAILWAY.md` for detailed steps.
