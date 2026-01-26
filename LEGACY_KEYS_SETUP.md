# Supabase Legacy Keys Setup Guide

## ✅ You're Using Legacy Keys - That's Perfect!

Based on your screenshot, you're on the **"Legacy anon, service_role API keys"** tab. These keys work exactly the same way!

---

## Which Key Goes Where

### 1. **"anon public" Key** → Frontend

**Location**: Root `.env.local`  
**Variable**: `VITE_SUPABASE_ANON_KEY`

**From your screenshot**:
- Copy the **"anon public"** key (the one that says "safe to use in a browser")
- This is already set in your `.env.local` ✅

**Current status**:
```env
VITE_SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W  # ✅ Already set
```

---

### 2. **"service_role secret" Key** → Backend

**Location**: `backend-skeleton/.env`  
**Variable**: `SUPABASE_SERVICE_ROLE_KEY`

**From your screenshot**:
- Click **"Reveal"** button next to **"service_role secret"** key
- Copy the revealed key
- Paste it into `backend-skeleton/.env`

**Current status**:
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # ⚠️ NEEDS UPDATE
```

**Action Required**:
1. Click "Reveal" on the "service_role secret" key
2. Copy the key
3. Open `backend-skeleton/.env`
4. Replace `your-service-role-key-here` with the copied key
5. Save the file

---

## Visual Guide from Your Screenshot

```
┌─────────────────────────────────────────┐
│ Legacy anon, service_role API keys      │
├─────────────────────────────────────────┤
│                                         │
│  anon public                            │
│  [key field] [Copy]                     │
│  ✅ Safe for browser                    │
│  → Frontend (.env.local)               │
│  → VITE_SUPABASE_ANON_KEY              │
│                                         │
│  service_role secret                     │
│  [key field] [Reveal] ← Click this!    │
│  ⚠️ Never share publicly                │
│  → Backend (.env)                      │
│  → SUPABASE_SERVICE_ROLE_KEY           │
│                                         │
└─────────────────────────────────────────┘
```

---

## Step-by-Step Instructions

### Step 1: Get the service_role Key

1. In Supabase Dashboard → Settings → API
2. Click the **"Legacy anon, service_role API keys"** tab (you're already here)
3. Find **"service_role secret"** section
4. Click the **"Reveal"** button
5. Copy the revealed key (it will be a long string starting with `eyJ...`)

### Step 2: Update Backend .env

1. Open `backend-skeleton/.env` in your editor
2. Find this line:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
3. Replace `your-service-role-key-here` with the key you copied
4. Save the file

### Step 3: Verify

Your `backend-skeleton/.env` should look like:
```env
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ← Your actual key
ADMIN_EMAILS=mmxinthi@gmail.com
```

---

## Security Reminders

### ✅ DO:
- ✅ Use **anon public** key in frontend only
- ✅ Use **service_role secret** key in backend only
- ✅ Keep service_role key in `.env` (not committed to Git)
- ✅ Click "Reveal" only when you need to copy it

### ❌ DON'T:
- ❌ Never put service_role key in frontend
- ❌ Never commit service_role key to GitHub
- ❌ Never share service_role key publicly
- ❌ Never expose service_role key in API responses

---

## Summary

| Key Type | Location | Variable | Status |
|----------|----------|----------|--------|
| **anon public** | Frontend `.env.local` | `VITE_SUPABASE_ANON_KEY` | ✅ Already set |
| **service_role secret** | Backend `.env` | `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ **Needs update** |

**Next Step**: Click "Reveal" on the service_role key, copy it, and paste into `backend-skeleton/.env`!

---

## Note About Legacy Keys

Supabase is transitioning to new "Publishable and Secret API keys", but the legacy keys work perfectly fine. You can continue using them. If you want to migrate later, you can, but it's not required for MVP launch.
