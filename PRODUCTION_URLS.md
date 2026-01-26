# KLINEO Production URLs

**Date**: January 26, 2026

---

## ✅ Confirmed URLs

### Backend (Railway)
- **Domain**: `klineo-production-1dfe.up.railway.app`
- **Health Check**: `https://klineo-production-1dfe.up.railway.app/health`
- **API Base**: `https://klineo-production-1dfe.up.railway.app`

### Frontend (Vercel)
- **Domain**: `www.klineo.xyz` (or `klineo.xyz`)

---

## 🔗 Test URLs

### Backend Health Check
```
https://klineo-production-1dfe.up.railway.app/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "klineo-api",
  "timestamp": "2026-01-26T...",
  "environment": "production"
}
```

### Backend API Endpoints
```
https://klineo-production-1dfe.up.railway.app/api/traders
https://klineo-production-1dfe.up.railway.app/api/auth/me
https://klineo-production-1dfe.up.railway.app/api/me/profile
```

---

## ⚙️ Vercel Environment Variables

**Update these in Vercel Dashboard**:

```
VITE_API_BASE_URL=https://klineo-production-1dfe.up.railway.app
VITE_SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W
```

**Action Required**:
1. Go to Vercel Dashboard → Your project
2. Settings → Environment Variables
3. Add/Update `VITE_API_BASE_URL` = `https://klineo-production-1dfe.up.railway.app`
4. Redeploy

---

## 🧪 Quick Test Commands

### Test Backend Health
```bash
curl https://klineo-production-1dfe.up.railway.app/health
```

### Test Traders Endpoint
```bash
curl https://klineo-production-1dfe.up.railway.app/api/traders
```

### Test with Browser
Open in browser:
- Health: https://klineo-production-1dfe.up.railway.app/health
- Traders: https://klineo-production-1dfe.up.railway.app/api/traders

---

## 📋 Deployment Checklist

### Railway (Backend) ✅
- [x] Domain: `klineo-production-1dfe.up.railway.app`
- [x] Environment variables set
- [x] Service role key configured
- [ ] Health check returns 200
- [ ] API endpoints working

### Vercel (Frontend) ⚠️
- [ ] `VITE_API_BASE_URL` = `https://klineo-production-1dfe.up.railway.app`
- [ ] `VITE_SUPABASE_URL` set
- [ ] `VITE_SUPABASE_ANON_KEY` set
- [ ] Redeployed after env var update

---

## 🚀 Next Steps

1. **Test Backend**:
   ```bash
   curl https://klineo-production-1dfe.up.railway.app/health
   ```

2. **Update Vercel**:
   - Add `VITE_API_BASE_URL=https://klineo-production-1dfe.up.railway.app`
   - Redeploy

3. **Test Frontend**:
   - Visit `https://www.klineo.xyz`
   - Check Marketplace loads
   - Check browser console for API calls

---

**Last Updated**: Railway domain confirmed ✅
