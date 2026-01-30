# Railway Cron — Strategy Runner

Use Railway Cron (or any external cron) to call the runner cron endpoint so due strategy runs execute on schedule. **Keep the cron secret backend-only**; never put it in Vercel or frontend env unless you are explicitly testing (and disable after testing).

## Recommended schedule

- **Every 30 seconds** (recommended): balances responsiveness and rate.
- Alternatives: **10s** (more frequent) or **60s** (less load).

## Exact request

**URL:** `POST https://<railway-url>/api/runner/cron`

**Headers:**

- `Content-Type: application/json`
- `x-cron-secret: <RUNNER_CRON_SECRET>`

**Body:** none (or `{}`).

Do **not** send `Authorization: Bearer ...` when using cron-secret; the backend authorizes via `x-cron-secret` only when `RUNNER_CRON_SECRET` is set.

## Safety notes

- **RUNNER_CRON_SECRET** must be set only on the backend (e.g. Railway). Never commit it or put it in Vercel/frontend env for production.
- If you use `VITE_RUNNER_CRON_SECRET` for Smoke Test, use it only in dev/test and disable or remove after testing.
- If `RUNNER_CRON_SECRET` is not set in production, the endpoint returns **503** when `x-cron-secret` is sent (cron secret mode disabled). Use admin JWT for manual triggers instead.

## Quick validation

### curl (Linux/macOS)

```bash
# Replace RAILWAY_URL and RUNNER_CRON_SECRET with your values
curl -X POST "https://RAILWAY_URL/api/runner/cron" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: RUNNER_CRON_SECRET"
```

Expected: `200` with JSON like `{ "ok": true, "requestId": "...", "summary": { "processed", "ran", "skipped", "blocked", "errored" }, ... }`, or `503` if runner is disabled or cron secret not configured.

### Windows PowerShell

```powershell
# Replace RAILWAY_URL and RUNNER_CRON_SECRET with your values
$url = "https://RAILWAY_URL/api/runner/cron"
$headers = @{
  "Content-Type" = "application/json"
  "x-cron-secret" = "RUNNER_CRON_SECRET"
}
Invoke-RestMethod -Method Post -Uri $url -Headers $headers
```

Or with `Invoke-WebRequest`:

```powershell
Invoke-WebRequest -Method Post -Uri $url -Headers $headers -UseBasicParsing | Select-Object -Expand Content
```

### Check runner status (admin JWT)

```bash
curl "https://RAILWAY_URL/api/runner/status" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

PowerShell:

```powershell
$headers = @{ "Authorization" = "Bearer YOUR_ADMIN_JWT" }
Invoke-RestMethod -Method Get -Uri "https://RAILWAY_URL/api/runner/status" -Headers $headers
```

## Railway Cron setup

1. In Railway: add a **Cron** or use **Cron Job** (if available) with schedule `*/30 * * * * *` (every 30s) or `* * * * *` (every minute) depending on Railway’s cron syntax.
2. Set the request to: Method **POST**, URL `https://<your-app>.up.railway.app/api/runner/cron`, header `x-cron-secret` = value of `RUNNER_CRON_SECRET` from your Railway env.
3. Ensure `ENABLE_STRATEGY_RUNNER=true` and `RUNNER_CRON_SECRET` are set in Railway env.
4. After deploy, run the curl/PowerShell command above once to confirm 200 and `ok: true`.
