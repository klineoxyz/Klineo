# KLINEO Launch Readiness — Final Checklist & Runbook

**Purpose:** Production readiness verification and a concrete 30-minute launch test. No feature creep; correctness, safety, and user onboarding success only.

---

## A) Production Checklist

### 1. Environment Variables (names only — never commit values)

**Railway (Backend)**  
Set in Railway Dashboard → Your backend service → Variables.

| Variable | Required | Notes |
|----------|----------|--------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | From Supabase → API → service_role |
| `SUPABASE_ANON_KEY` | Recommended | For RLS/self-test; optional for core API |
| `FRONTEND_URL` | Yes | Vercel frontend URL (for CORS) |
| `ENCRYPTION_KEY` | Yes | 32-byte hex; `openssl rand -hex 32` |
| `ADMIN_EMAILS` | Recommended | Comma-separated admin emails |
| `NODE_ENV` | Yes | `production` |
| `ENABLE_MANUAL_PAYMENTS` | Optional | `true` to enable Payments / payment intents |
| `ENABLE_STRATEGY_RUNNER` | Optional | `true` to enable strategy cron |
| `RUNNER_CRON_SECRET` | If runner enabled | Strong random string; never log or expose |
| `RUNNER_TICK_INTERVAL_SEC` | Optional | Default 30; 5–300 |
| `DAILY_MAX_LOSS_USDT` | Optional | Risk limit; default 50 |
| `MAX_TRADES_PER_DAY` | Optional | Default 20 |
| `MAX_CONSECUTIVE_LOSSES` | Optional | Default 3 |
| `COOLDOWN_AFTER_TRADE_SEC` | Optional | Default 30 |
| `PAUSE_DURATION_MIN` | Optional | Default 1440 |
| `RUNNER_LOCK_OWNER` | Optional | Default `klineo-runner` |

**Vercel (Frontend)**  
Set in Vercel → Project → Settings → Environment Variables.

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | Yes | Same Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Anon (publishable) key only |
| `VITE_API_BASE_URL` | Yes | Railway backend URL (e.g. `https://xxx.up.railway.app`) |
| `VITE_ENABLE_SMOKE_TEST_PAGE` | Optional | `true` to show Smoke Test for admins in prod |
| `VITE_ENABLE_EXCHANGE_SMOKE_TESTS` | Optional | `true` to run exchange/futures smoke tests |
| `VITE_ENABLE_RUNNER_CRON_TEST` | Optional | `true` to test cron-secret in Smoke Test |

---

### 2. Critical UI Entry Points (must exist and work)

- **Terminal:** “Futures Trading” Quick Actions card at top; Strategy tab with strategies list, events log, Manual Futures Order panel (USDT sizing), Kill switch.
- **Settings:** “Connect Exchange” wizard access; connection cards; Futures ON/OFF; Manage Futures.
- **Strategy Backtest:** “Go Live (Futures)” gated by connection + Futures enabled.
- **Admin:** Users/roles, Traders, Discount Coupons, Payment Intents (Manual Safe), Audit Logs.

---

### 3. Backend Hardening (verified)

- **Auth:** `verifySupabaseJWT` on protected routes; `requireAdmin` on admin routes.
- **Cron:** `POST /api/runner/cron` accepts `x-cron-secret` (matches `RUNNER_CRON_SECRET`) OR admin JWT; secret never logged or returned.
- **Futures order:** Connection belongs to user; `futures_enabled` true; `kill_switch` OFF; symbol whitelist; leverage/notional limits; 409 (Futures OFF) / 423 (Kill switch) with clear messages.
- **Exchange connections:** API responses never include `encrypted_config` or raw secrets; only metadata (id, exchange, label, status, etc.).

---

### 4. Database & Migrations

- All migrations in `supabase/migrations/` are compatible with Supabase Postgres.
- RLS enabled on: `user_profiles`, `user_exchange_connections`, `copy_setups`, `positions`, `orders`, `trades`, `notifications`, `strategy_runs`, `strategy_events`, `strategy_tick_runs`, `strategy_risk_state`, `payment_intents`, `payment_events`, `coupons`, `audit_logs`, and other user/admin tables.
- Users can only access their own data; admin/runner access only where required (admin panels, runner using service role).

---

### 5. Smoke Test Page (production-safe)

- `/#smoke-test` works in production **only** when `VITE_ENABLE_SMOKE_TEST_PAGE=true` **and** user is admin.
- “Run All (Launch)” preset runs: Public (health, traders); Auth (profile, exchange-connections, portfolio/summary, positions, orders, trades, notifications); Runner status + cron; Futures tests **SKIP** unless `VITE_ENABLE_EXCHANGE_SMOKE_TESTS=true`; cron-secret test **SKIP** unless `VITE_ENABLE_RUNNER_CRON_TEST=true`.
- Report copy: JSON with `reportId`, timestamp, pass/fail/skip counts; sanitization removes apiKey/apiSecret/token-like strings from UI and copied report.

---

### 6. Launch Status Endpoint (admin-only)

- `GET /api/launch/status` — admin JWT required.
- Returns safe summary only: `dbOk`, `runnerEnabled`, `cronSecretSet`, `strategiesActive`, `connectionsCount`, `lastTickRunAt`, `recentErrorCount`, `requestId`.
- Never exposes env values, tokens, keys, or user emails.

---

## B) 30-Minute Launch Runbook (step-by-step)

### Pre-requisites

- [ ] Backend deployed (Railway); frontend deployed (Vercel).
- [ ] Env vars set (Railway + Vercel) per section A.
- [ ] All Supabase migrations applied (`supabase db push` or run migrations in Supabase SQL Editor).

---

### Part 1 — Day 0 onboarding test (~15 min)

1. **Create test user**  
   Sign up on the app (e.g. new email). Confirm email if required.

2. **Connect exchange (testnet)**  
   - Settings → Connect Exchange.  
   - Choose Binance or Bybit, **Testnet**, paste testnet API key/secret.  
   - Complete wizard; connection card shows “Connected” / healthy.

3. **Test Futures, enable Futures**  
   - Terminal → Futures Quick Actions → Test Futures (or Settings → Manage Futures → Test).  
   - Enable Futures (leverage/margin/position mode as needed).  
   - Connection card shows Futures ON.

4. **Manual Futures order (small size)**  
   - Terminal → Strategy tab → Manual Futures Order.  
   - Select connection, symbol (e.g. BTCUSDT), side, **Size (USDT)** e.g. 5.  
   - Submit; expect 200 or clear error (e.g. 409 Futures OFF, 423 Kill switch).

5. **Backtest + Go Live**  
   - Strategy Backtest → run a backtest.  
   - “Go Live (Futures)” must be enabled (connection + Futures ON).  
   - Click Go Live, create live strategy; confirm it appears in Terminal → Strategy tab.

6. **Trigger one tick**  
   - Admin: Runner → “Run Cron Now” (or external cron with `x-cron-secret`).  
   - Or wait for next tick interval.  
   - Terminal → Strategy tab → Events log should show new entries (e.g. signal/order_submit).

7. **Kill switch**  
   - Terminal → Strategy tab (or Settings → connection) → turn Kill switch ON.  
   - Try Manual Futures order again → expect 423 “Kill switch enabled.”  
   - Turn Kill switch OFF.

---

### Part 2 — Admin test (~5 min)

1. Log in as **admin** (user in `ADMIN_EMAILS` or role admin in DB).
2. Open **Admin** panel; verify tabs load: Users, Traders, Subscriptions, Revenue & Payments, Referrals, **Payments** (Payment Intents), Platform Settings, Discount Coupons, Runner, Audit Logs.
3. Change a user role (e.g. promote to admin); verify **Audit Logs** shows the action.
4. Optional: `GET /api/launch/status` (with admin Bearer token) — check `dbOk`, `runnerEnabled`, `cronSecretSet`, counts.

---

### Part 3 — Smoke Test (Launch preset) (~5 min)

1. Ensure `VITE_ENABLE_SMOKE_TEST_PAGE=true` on Vercel (and redeploy if needed).
2. Log in as admin; open **Smoke Test** (sidebar or Developer section).
3. Click **“Run All (Launch)”**.  
   - Public: Health, GET /api/traders — PASS.  
   - Auth: profile, exchange-connections, portfolio/summary, positions, orders, trades, notifications — PASS (or SKIP if no data).  
   - Runner: GET /api/runner/status, POST /api/runner/cron — PASS or 503 if runner disabled.  
   - Futures tests: SKIP unless `VITE_ENABLE_EXCHANGE_SMOKE_TESTS=true`; cron-secret: SKIP unless `VITE_ENABLE_RUNNER_CRON_TEST=true`.
4. Copy report (JSON); verify no secrets in copied text; check pass/fail/skip counts.

---

### Part 4 — Failure handling (reference)

| Symptom | Likely cause | Action |
|--------|----------------|--------|
| 401 Unauthorized | Session expired or no token | Re-login; check Supabase anon key and backend JWT validation |
| 403 Forbidden | Not admin / wrong role | Check `ADMIN_EMAILS` or `user_profiles.role` |
| CORS errors | Frontend origin not allowed | Ensure `FRONTEND_URL` (and www/non-www) match Vercel domain |
| Testnet balance / permission errors | Exchange testnet keys or permissions | Regenerate testnet keys; enable Futures on exchange |
| 409 “Futures is OFF” | Futures not enabled on connection | Enable Futures in Settings or Terminal |
| 423 “Kill switch enabled” | Kill switch ON | Turn OFF in Terminal or Settings |
| Runner 503 | Runner disabled or cron secret not set | Set `ENABLE_STRATEGY_RUNNER=true`, `RUNNER_CRON_SECRET` on Railway |
| Payment intents 404/503 | Manual payments disabled | Set `ENABLE_MANUAL_PAYMENTS=true` on Railway |

---

## C) Go/No-Go Criteria (before onboarding real users)

- [ ] **Health:** `GET /health` returns 200.
- [ ] **Auth:** Login/signup and `GET /api/auth/me` (and `/api/me/profile`) return 200 with valid session.
- [ ] **Exchange:** At least one testnet connection can be created and tested; list does not expose secrets.
- [ ] **Futures:** Enable Futures and Manual Futures order (or clear 409/423) and symbol/limits enforced.
- [ ] **Strategy:** Backtest runs; Go Live (Futures) gated and creates a run; Runner cron runs and events log updates (or runner intentionally disabled and documented).
- [ ] **Admin:** Admin panel loads; role change is audited; `GET /api/launch/status` returns safe summary (admin only).
- [ ] **Smoke Test:** “Run All (Launch)” completes; report copy has no secrets; pass/fail/skip counts and timestamps present.
- [ ] **No secrets:** No apiKey/apiSecret/token/password in frontend bundle, logs, or API responses.
- [ ] **Migrations:** All production tables and RLS applied; users see only own data; admin/runner access as designed.

---

## D) Build Verification

- Backend: `cd backend-skeleton && npm run build` (or `pnpm run build`) — must succeed.
- Frontend: `pnpm run build` — must succeed.

---

## Summary

- **LAUNCH_READINESS_FINAL.md** = this document (checklist + runbook + failure handling + Go/No-Go).  
- **Runbook** = Part 1 (Day 0 onboarding) + Part 2 (Admin) + Part 3 (Smoke Test Launch preset); ~30 min end-to-end.  
- **Code/API:** Critical flows (Terminal, Settings, Backtest, Admin, Smoke Test, launch status) verified; production hardening and sanitization in place; no feature creep.
