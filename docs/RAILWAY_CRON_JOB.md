# Railway Cron Job — Copy/Paste Definition (KLINEO Runner)

**Backend URL:** `https://klineo-production-1dfe.up.railway.app`  
**Endpoint:** `POST /api/runner/cron`  
**Auth:** Header `x-cron-secret` must equal `RUNNER_CRON_SECRET` (stored **only** in Railway backend env). No JWT when secret matches.

---

## 1) Which Railway Cron Mechanism Applies

**Finding:** This repo has **no** `railway.json`, `railway.toml`, or Railway config-as-code. Railway’s **native cron** runs a **service’s start command** on a schedule; it does **not** support configuring an HTTP POST + custom headers in the UI.

- **Railway “Cron Jobs”** = you set a **Cron Schedule** on a service; Railway runs that service’s **start command** on the schedule. Minimum interval is **5 minutes**. There is no “HTTP request + headers” form.
- **Railway “Scheduled Jobs”** = same as above (cron schedule on a service).
- **railway.json / service config** = not present in this repo.

So you have two practical options:

1. **External cron** (cron-job.org, EasyCron, etc.) that can send POST + custom headers — **recommended**.
2. **Railway native cron** = a **second Railway service** that runs a small script every 5 min; the script calls your backend with `x-cron-secret` from env (see script below).

---

## 2) Copy/Paste Ready — External Cron (Recommended)

Use any cron service that supports **custom headers** (e.g. [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), or your CI’s scheduled workflow).

### Default: every 1 minute

Most external crons do **not** support sub-minute intervals. Use **every 1 minute** as the default.

| Field | Value |
|-------|--------|
| **Schedule** | Every 1 minute: `* * * * *` (cron) or “Every minute” in UI |
| **Method** | `POST` |
| **URL** | `https://klineo-production-1dfe.up.railway.app/api/runner/cron` |
| **Headers** | `Content-Type: application/json`<br>`x-cron-secret: <paste RUNNER_CRON_SECRET from Railway env>` |
| **Body** | `{}` or leave empty |

- **Do not** hardcode the secret in docs or in Vercel. In the external cron UI you paste the value once (or use their “secret”/“variable” field if they have it).
- For **cron-job.org**: Create Cronjob → URL = URL above → Request Method POST → Request Headers: add `Content-Type: application/json` and `x-cron-secret` with value from Railway.

### Conservative: every 5 minutes

| Field | Value |
|-------|--------|
| **Schedule** | Every 5 minutes: `*/5 * * * *` or “Every 5 minutes” |
| **Method** | `POST` |
| **URL** | `https://klineo-production-1dfe.up.railway.app/api/runner/cron` |
| **Headers** | `Content-Type: application/json`<br>`x-cron-secret: <RUNNER_CRON_SECRET from Railway>` |
| **Body** | `{}` or empty |

---

## 3) Copy/Paste Ready — Railway Native Cron (Second Service)

Railway **does not** support sub-minute; minimum interval is **5 minutes**. So “every 30 seconds” is **not** possible with Railway native cron.

Use a **separate Railway service** that runs a one-shot script on a cron schedule. The script reads `RUNNER_CRON_SECRET` and `BACKEND_URL` from env and POSTs to your backend.

### Step 1: Add script in repo

Create `scripts/railway-cron-call.mjs` (see below). It must:

- Read `BACKEND_URL` (default `https://klineo-production-1dfe.up.railway.app`) and `RUNNER_CRON_SECRET` from env.
- `POST` to `{BACKEND_URL}/api/runner/cron` with headers `Content-Type: application/json` and `x-cron-secret: <RUNNER_CRON_SECRET>`.
- Exit 0 on success, non-zero on failure.

### Step 2: Railway service settings

- **Service:** New service “runner-cron” (or reuse a minimal Node service).
- **Build:** No build, or `npm install` only if you use a package.
- **Start command:** `node scripts/railway-cron-call.mjs`
- **Cron Schedule:** `*/5 * * * *` (every 5 minutes)
- **Env vars (in this service):**
  - `BACKEND_URL` = `https://klineo-production-1dfe.up.railway.app`
  - `RUNNER_CRON_SECRET` = same value as in your **backend** service (copy from backend env; never commit).

Railway will run this service every 5 minutes; the script will POST once and exit. **Do not** put `RUNNER_CRON_SECRET` in Vercel or frontend; only in Railway (backend and this cron-runner service).

### Conservative 5-minute variant (Railway native)

Same as above: Cron Schedule **`*/5 * * * *`** is already the minimum interval and is the conservative option.

---

## 4) When to Use 30s vs 1m vs 5m — Strategy Timing

| Interval | Use case | Recommendation |
|----------|----------|----------------|
| **30 seconds** | Very responsive bots; sub-minute timeframes. | Use only if your cron provider supports it (e.g. some paid crons). **Railway native cannot do this** (min 5 min). |
| **1 minute** | 1m candles, fast reaction; balances load and responsiveness. | **Best default for KLINEO MVP** when using external cron (most support 1m). |
| **5 minutes** | 5m/15m/1h strategies; lower load; sufficient for many futures bots. | **Recommended for Railway native cron** (only option). Also good if you want to reduce API/cpu load. |

**KLINEO MVP recommendation:**  
- **External cron:** run **every 1 minute** (`* * * * *`) so 1m strategies can run on time; keep `RUNNER_CRON_SECRET` only in Railway (and in the external cron’s “secret” field).  
- **Railway native cron:** use **every 5 minutes** (`*/5 * * * *`) with the script above; acceptable for 5m/15m/1h strategies.

---

## 5) Fallback — If Cron Provider Cannot Send Custom Headers

If the provider only allows a **URL** (no custom headers), use an **internal** route that accepts the secret in a **query parameter**. This is **less secure** (URLs can be logged); use only when necessary.

### Backend: internal route (optional)

Add a route that accepts the secret in the query string **only** for this path (do not log the query string):

- **URL:** `POST https://klineo-production-1dfe.up.railway.app/api/runner/cron-internal?x_cron_secret=<RUNNER_CRON_SECRET>`
- Same behavior as `/api/runner/cron` but auth via `x_cron_secret` query param.
- Implement: check `req.query.x_cron_secret === process.env.RUNNER_CRON_SECRET` and then run the same handler as `/cron`. Do not log `req.query`.

### Cron definition (fallback — no headers)

| Field | Value |
|-------|--------|
| **Schedule** | Every 1 min or every 5 min (as above) |
| **Method** | `POST` |
| **URL** | `https://klineo-production-1dfe.up.railway.app/api/runner/cron-internal?x_cron_secret=<RUNNER_CRON_SECRET>` |
| **Body** | `{}` or empty |

Replace `<RUNNER_CRON_SECRET>` with the actual value from Railway (paste once in the cron UI). Prefer the **header** method whenever the provider supports it.

---

## 6) Exact Copy/Paste Summary

**Recommended (external cron, every 1 minute):**

```
Schedule:  * * * * *
Method:   POST
URL:      https://klineo-production-1dfe.up.railway.app/api/runner/cron
Headers:  Content-Type: application/json
          x-cron-secret: <paste RUNNER_CRON_SECRET from Railway backend env>
Body:     {}
```

**Conservative (every 5 minutes):**

```
Schedule:  */5 * * * *
Method:   POST
URL:      https://klineo-production-1dfe.up.railway.app/api/runner/cron
Headers:  Content-Type: application/json
          x-cron-secret: <paste RUNNER_CRON_SECRET from Railway backend env>
Body:     {}
```

**Railway native (second service):**  
- Cron Schedule: `*/5 * * * *`  
- Start command: `node scripts/railway-cron-call.mjs`  
- Env: `BACKEND_URL`, `RUNNER_CRON_SECRET` (same value as backend).

---

## Security

- Never commit or log `RUNNER_CRON_SECRET`.
- Do not put `RUNNER_CRON_SECRET` in Vercel/frontend unless for short-lived testing; remove it after.
- Cron must be protected in production (secret or internal route only).
