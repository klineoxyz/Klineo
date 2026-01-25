# Supabase Credentials — Where to Put Them

**Critical:** Different credentials for frontend vs backend. Never mix them up!

---

## 🔑 Supabase Credentials (Get from Supabase Dashboard)

**Go to:** Supabase Dashboard → **Project Settings** → **API**

You'll see:

1. **Project URL** → `https://your-project.supabase.co`
2. **anon public** key → `eyJhbGc...` (long string, starts with `eyJ`)
3. **service_role** key → `eyJhbGc...` (different long string, also starts with `eyJ`)

---

## ✅ Vercel (Frontend) — What to Add

**Vercel Dashboard** → Your project → **Settings** → **Environment Variables**

### Add These:

| Variable | Value | Source |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (anon key) | Supabase → API → **anon public** key |
| `VITE_API_BASE_URL` | `https://your-backend.railway.app` | Your Railway backend URL |

### ❌ DO NOT Add:

- ❌ `SUPABASE_SERVICE_ROLE_KEY` — **NEVER** in frontend (security risk!)

**Why:** Frontend uses **anon key** which respects RLS policies. Service role bypasses RLS and should only be in backend.

---

## ✅ Railway (Backend) — What to Add

**Railway Dashboard** → Your backend service → **Variables**

### Add These:

| Variable | Value | Source |
|----------|-------|--------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Supabase → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (service_role key) | Supabase → API → **service_role** key |
| `FRONTEND_URL` | `https://klineo.vercel.app` | Your Vercel frontend URL |

### ❌ DO NOT Add:

- ❌ `SUPABASE_ANON_KEY` — Not needed (backend uses service role)

**Why:** Backend uses **service_role key** to bypass RLS when needed (e.g., admin operations, server-side operations).

---

## 🔒 Security Rules

### ✅ Safe (Frontend - Vercel)

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc... (anon key)
```

**Why safe:**
- Anon key respects RLS policies
- Users can only access their own data (via RLS)
- Even if exposed, attackers can't bypass RLS

### ✅ Safe (Backend - Railway)

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc... (service_role key)
```

**Why safe:**
- Backend is server-side only
- Service role key never exposed to users
- Backend can perform admin operations safely

### ❌ DANGEROUS (Never Do This)

```
# Frontend with service_role key
VITE_SUPABASE_SERVICE_ROLE_KEY = ... ❌ NEVER!
```

**Why dangerous:**
- Service role bypasses ALL RLS policies
- Anyone can read/write ANY data
- Complete database access
- **This would be a critical security breach**

---

## 📋 Quick Checklist

### Vercel Environment Variables

- [ ] `VITE_SUPABASE_URL` = Project URL
- [ ] `VITE_SUPABASE_ANON_KEY` = **anon** key (not service_role)
- [ ] `VITE_API_BASE_URL` = Backend Railway URL

### Railway Environment Variables

- [ ] `SUPABASE_URL` = Project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = **service_role** key (not anon)
- [ ] `FRONTEND_URL` = Vercel frontend URL

---

## 🔍 How to Verify

### Frontend (Vercel)

**Check in code:**
```typescript
// src/lib/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Should use anon key, NOT service_role
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Test:** Frontend should only access user's own data (via RLS).

### Backend (Railway)

**Check in code:**
```typescript
// src/middleware/auth.ts
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role, not anon
);
```

**Test:** Backend can verify JWTs and access all data (for admin operations).

---

## 🎯 Summary

| | Vercel (Frontend) | Railway (Backend) |
|---|---|---|
| **Supabase URL** | ✅ Yes (`VITE_SUPABASE_URL`) | ✅ Yes (`SUPABASE_URL`) |
| **Anon Key** | ✅ Yes (`VITE_SUPABASE_ANON_KEY`) | ❌ No (not needed) |
| **Service Role Key** | ❌ **NEVER** | ✅ Yes (`SUPABASE_SERVICE_ROLE_KEY`) |

**Rule of thumb:**
- **Frontend** = Anon key (safe, respects RLS)
- **Backend** = Service role key (powerful, server-side only)

---

## 🚨 If You Accidentally Expose Service Role Key

**If service_role key is in frontend code or Vercel env vars:**

1. **Immediately rotate the key:**
   - Supabase Dashboard → **Project Settings** → **API**
   - **Regenerate** service_role key
   - **Update** Railway env var with new key

2. **Check for unauthorized access:**
   - Review Supabase logs
   - Check for unexpected data access

3. **Never commit keys to Git:**
   - Check `.gitignore` includes `.env*`
   - Verify no keys in committed files

---

## 📝 Example Setup

### Vercel (Frontend)

```
Environment Variables:
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon)
VITE_API_BASE_URL=https://klineo-backend.railway.app
```

### Railway (Backend)

```
Environment Variables:
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role)
FRONTEND_URL=https://klineo.vercel.app
```

**Note:** Both use the same `SUPABASE_URL`, but different keys (anon vs service_role).

---

**Bottom line:** 
- ✅ **Vercel** gets **anon key** (safe for frontend)
- ✅ **Railway** gets **service_role key** (backend only)
- ❌ **Never** put service_role key in frontend/Vercel
