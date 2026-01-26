# Railway Domain Clarification

## Your Setup

**Custom Domain**: `www.klineo.xyz` (configured in Railway)

**Important**: Railway provides **TWO** domains:
1. **Custom Domain**: `www.klineo.xyz` (if configured)
2. **Railway Default Domain**: `[service-name]-[id].up.railway.app` (always available)

---

## Which URL to Use for Backend?

### Option 1: Railway Default Domain (Recommended for API)

Railway **always** generates a default domain, even if you have a custom domain.

**To find it**:
1. Go to Railway Dashboard → Your backend service
2. Click **"Settings"** tab
3. Scroll to **"Networking"** section
4. Look for **"Public Domain"** or **"Default Domain"**
5. It will look like: `klineo-backend-abc123.up.railway.app`

**Your backend health check**:
```
https://[railway-default-domain].railway.app/health
```

**Example**:
```
https://klineo-backend-a413.up.railway.app/health
```

---

### Option 2: Custom Domain (If Configured for Backend)

If you configured `www.klineo.xyz` to point to your **backend**:
```
https://www.klineo.xyz/health
```

**BUT**: This is usually not recommended because:
- `www.klineo.xyz` should be your **frontend** (Vercel)
- Backend should use a subdomain like `api.klineo.xyz` or Railway's default domain

---

## Recommended Setup

### Frontend (Vercel)
- **Domain**: `www.klineo.xyz` or `klineo.xyz`
- **Purpose**: User-facing website

### Backend (Railway)
- **Domain**: Railway default domain (e.g., `klineo-backend-xxx.up.railway.app`)
- **OR**: Custom subdomain like `api.klineo.xyz` (if you set it up)
- **Purpose**: API endpoints

---

## How to Find Your Railway Backend URL

### Method 1: Railway Dashboard

1. **Go to Railway**:
   - https://railway.app/dashboard
   - Click on your backend service

2. **Check Settings → Networking**:
   - Look for **"Public Domain"**
   - This is your Railway-generated domain
   - Format: `[service-name]-[random-id].up.railway.app`

3. **Test it**:
   ```bash
   curl https://[railway-domain].railway.app/health
   ```

### Method 2: Railway Service Overview

1. On your service page
2. Look at the top or sidebar
3. You'll see the domain listed
4. It might show both custom and default domains

---

## What to Use in Vercel

For `VITE_API_BASE_URL` in Vercel, use:

**Option A** (Recommended): Railway default domain
```
VITE_API_BASE_URL=https://klineo-backend-xxx.up.railway.app
```

**Option B**: Custom API subdomain (if you set it up)
```
VITE_API_BASE_URL=https://api.klineo.xyz
```

**NOT**: `https://www.klineo.xyz` (that's your frontend!)

---

## Quick Test

Once you find your Railway backend domain:

```bash
# Test health endpoint
curl https://[your-railway-domain].railway.app/health

# Should return:
# {"status":"ok","service":"klineo-api",...}
```

---

## Summary

- **Frontend**: `www.klineo.xyz` (Vercel)
- **Backend**: Railway default domain (e.g., `klineo-backend-xxx.up.railway.app`)
- **Health Check**: `https://[railway-domain].railway.app/health`

**Action**: Check Railway dashboard → Settings → Networking to find your Railway default domain!
