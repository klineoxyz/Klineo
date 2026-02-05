# Troubleshooting 502 Bad Gateway & Backend Unreachable

When the Settings page shows **"Failed to fetch"**, **"Backend Connection Disconnected"**, or **CORS errors** in the console, the underlying cause is usually a **502 Bad Gateway** from the Railway backend. This guide helps you diagnose and fix it.

## What's Happening

1. **502 Bad Gateway** – Railway's edge cannot reach your backend service or the backend is not responding in time.
2. **CORS errors** – A side effect: when a preflight (OPTIONS) request returns 502, the response has no CORS headers, so the browser reports: *"No 'Access-Control-Allow-Origin' header is present"*.
3. **Frontend** – The app detects this and shows "Backend unreachable" / "Disconnected from klineo-production-1dfe.up.railway.app".

## Checklist

### 1. Check Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard).
2. Open the project and the **backend service** (`klineo-production-1dfe` or similar).
3. Check:
   - **Deployments** – Is the latest deployment successful (green)? Or failed / building?
   - **Logs** – Do you see `🚀 KLINEO Backend running on 0.0.0.0:xxxx`? Or crashes / errors?
   - **Metrics** – CPU / memory usage. High usage or OOM can cause 502s.

### 2. Verify Environment Variables

In Railway → your backend service → **Variables**:

| Variable | Required | Notes |
|----------|----------|-------|
| `FRONTEND_URL` | ✅ | Must match frontend origin, e.g. `https://www.klineo.xyz` |
| `PORT` | Auto | Railway sets this; do not override |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key |
| `ENCRYPTION_KEY` | ✅ | 32-char hex for exchange credentials |
| `NODE_ENV` | ✅ | `production` for live |
| `ADMIN_EMAILS` | ✅ | Comma-separated admin emails |
| `ENABLE_MANUAL_PAYMENTS` | ✅ | `true` or `false` |
| `ENABLE_STRATEGY_RUNNER` | ✅ | `true` or `false` |

**CORS:** If the frontend is at `https://www.klineo.xyz`, set:

```
FRONTEND_URL=https://www.klineo.xyz
```

The backend allows both `https://www.klineo.xyz` and `https://klineo.xyz` automatically.

### 3. Redeploy

After changing env vars:

1. **Redeploy** the service (Deployments → ⋮ → Redeploy).
2. Wait 1–2 minutes for the build and startup.
3. Test `/health` in the browser or via curl:
   ```bash
   curl https://klineo-production-1dfe.up.railway.app/health
   ```
   Expected: `{"ok":true,"timestamp":"...","version":"..."}`

### 4. Cold Start / Timeout

Railway can scale services to zero. The first request after idle may hit a cold start; if startup takes too long, you may get 502.

- Check **Start Command** – Ensure it starts the Node server correctly (e.g. `node dist/index.js` or `pnpm start`).
- Check **Build Command** – Build must complete successfully.
- If using a free tier, cold starts can be longer; consider keeping the service warm with a cron health check.

### 5. Port & Listen

The backend must listen on `0.0.0.0:PORT` (Railway sets `PORT`). In `backend-skeleton`:

```ts
const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), '0.0.0.0', () => { ... });
```

This is already correct; no change needed unless you altered it.

### 6. Frontend API URL

Ensure the frontend points at the Railway backend:

- Vercel env: `VITE_API_BASE_URL=https://klineo-production-1dfe.up.railway.app`
- Redeploy the frontend after changing this.

## Quick Test

Once the backend is running:

1. Open `https://klineo-production-1dfe.up.railway.app/health` – should return JSON.
2. Open Settings → **Test Connection** – should show "Connection OK".

If `/health` works but API calls (e.g. `/api/auth/me`) still fail with CORS:

- Confirm `FRONTEND_URL` exactly matches the origin (including `https://` and `www` if used).
- Redeploy the backend so it picks up the new env.

## Summary

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| 502 on all requests | Backend down / crash / cold start | Check Railway logs, redeploy, verify startup |
| CORS on preflight | 502 response has no CORS headers | Fix 502 first; then confirm `FRONTEND_URL` |
| "Failed to fetch" | Network / 502 / timeout | Same as above; Settings shows clearer message now |

---

For further help: check Railway status page, support, or backend logs for stack traces.
