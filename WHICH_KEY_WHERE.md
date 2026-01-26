# Which Supabase Key Goes Where?

## Quick Answer

### 🔴 Secret Key (Service Role) → Backend Only
- **Location**: `backend-skeleton/.env`
- **Variable**: `SUPABASE_SERVICE_ROLE_KEY`
- **Use**: Railway backend (server-side only)
- **Why**: Needs elevated privileges to bypass RLS for admin operations

### 🟢 Publishable Key (Anon) → Frontend Only
- **Location**: Root `.env.local`
- **Variable**: `VITE_SUPABASE_ANON_KEY`
- **Use**: Vercel frontend (client-side)
- **Why**: Safe for browser, respects RLS policies

---

## Detailed Breakdown

### 1. Backend (`backend-skeleton/.env`)

**You need**: **Secret Key** (Service Role)

**From Supabase Dashboard**:
- Go to: Settings → API → **Secret keys** section
- Copy the **"default"** secret key
- This is your `service_role` key

**Why Service Role?**
- Backend needs to bypass RLS for admin operations
- Can read/write all data (with proper code checks)
- Must NEVER be exposed to frontend
- Used for: admin endpoints, user role changes, audit logs

**Current status**: 
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # ← Replace this!
```

---

### 2. Frontend (Root `.env.local`)

**You need**: **Publishable Key** (Anon)

**From Supabase Dashboard**:
- Go to: Settings → API → **Publishable key** section
- Copy the **"default"** publishable key
- This is your `anon` key

**Why Publishable?**
- Safe to use in browser
- Respects Row Level Security (RLS)
- Users can only access their own data
- Used for: auth, user profile reads (via RLS), public data

**Current status**:
```env
VITE_SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W  # ← Already set!
```

---

## Visual Guide

```
Supabase Dashboard → Settings → API

┌─────────────────────────────────────┐
│  Publishable key                    │
│  ✅ Safe for browser                 │
│  → Copy this → Frontend (.env.local)│
│  → VITE_SUPABASE_ANON_KEY           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Secret keys                        │
│  ⚠️ Server-side only                │
│  → Copy this → Backend (.env)      │
│  → SUPABASE_SERVICE_ROLE_KEY       │
└─────────────────────────────────────┘
```

---

## Security Rules

### ✅ DO:
- ✅ Use **Secret key** in backend only
- ✅ Use **Publishable key** in frontend only
- ✅ Keep Secret key in `.env` (not committed to Git)
- ✅ Set Secret key in Railway env vars for production

### ❌ DON'T:
- ❌ Never put Secret key in frontend code
- ❌ Never commit Secret key to GitHub
- ❌ Never expose Secret key in API responses
- ❌ Never use Secret key in browser

---

## Current Setup Status

### Backend (`backend-skeleton/.env`)
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # ⚠️ NEEDS UPDATE
```
**Action**: Copy **Secret key** from Supabase → Replace `your-service-role-key-here`

### Frontend (`.env.local`)
```env
VITE_SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W  # ✅ Already set
```
**Status**: ✅ Already configured!

---

## How to Get Your Keys

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard/project/oyfeadnxwuazidfbjjfo/settings/api

2. **For Backend (Secret Key)**:
   - Scroll to **"Secret keys"** section
   - Click **"default"** key
   - Click copy icon
   - Paste into `backend-skeleton/.env` as `SUPABASE_SERVICE_ROLE_KEY`

3. **For Frontend (Publishable Key)**:
   - Scroll to **"Publishable key"** section
   - Click copy icon
   - Paste into root `.env.local` as `VITE_SUPABASE_ANON_KEY`
   - ✅ Already done!

---

## Summary

| Location | Key Type | Variable Name | Status |
|----------|----------|---------------|--------|
| Backend `.env` | **Secret** (Service Role) | `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Needs update |
| Frontend `.env.local` | **Publishable** (Anon) | `VITE_SUPABASE_ANON_KEY` | ✅ Already set |

**Action Required**: Update `backend-skeleton/.env` with your **Secret key** from Supabase!
