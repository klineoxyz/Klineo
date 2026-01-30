# Strategy Runner

Unified strategy runner for KLINEO: **strategy_runs** (Futures Go Live config) + **strategy_events** (immutable log) are the source of truth. Runner infrastructure (locks, risk state, tick audit) executes **strategy_runs** on schedule: candles → RSI → signal → real orders via Binance/Bybit Futures when enabled.

## How the scheduler works

1. **In-process (Railway)**  
   When `ENABLE_STRATEGY_RUNNER=true`, the backend starts a `setInterval` every `RUNNER_TICK_INTERVAL_SEC` seconds (default 10). Each tick calls `runDueStrategies(now)`. Only one tick runs at a time (single-flight guard).

2. **External cron (recommended for production)**  
   Call `POST /api/runner/cron` with either:
   - **x-cron-secret** header (value = `RUNNER_CRON_SECRET`) — no JWT required; use for Railway Cron or external cron.
   - **Authorization: Bearer <admin JWT>** — for manual/testing.

3. **Due check**  
   For each **active** row in `strategy_runs`, the runner:
   - Aligns to **timeframe boundary** (1m / 5m / 15m / 1h) with a ±5s grace window.
   - Skips if **last_run_at** is within the interval (cooldown).
   - **Locks** the strategy_run (2 min TTL) via `strategy_locks`.
   - **Risk gate**: if user is paused (daily loss, consecutive losses, max trades, cooldown) in `strategy_risk_state`, the run is recorded as `blocked`.
   - Loads connection, decrypts credentials, runs **real engine** (candles → RSI → signal → place order via Binance/Bybit Futures adapter).
   - Logs to **strategy_tick_runs** (one row per tick) and **strategy_events** (signal/order_submit/order_fill/risk_block/error).
   - Kill switch on connection blocks orders before adapter calls. After 3 consecutive adapter errors, strategy is auto-paused.

## Env vars (Railway / backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_STRATEGY_RUNNER` | `false` | Set `true` to enable in-process scheduler and runner endpoints. |
| `RUNNER_CRON_SECRET` | — | Optional. If set, `POST /api/runner/cron` accepts `x-cron-secret` header (no JWT). Use for Railway Cron. Never log or return. |
| `RUNNER_TICK_INTERVAL_SEC` | `10` | Interval (seconds) between scheduler ticks. |
| `DAILY_MAX_LOSS_USDT` | `50` | Daily realized PnL cap (pause user when ≤ -this). |
| `MAX_TRADES_PER_DAY` | `20` | Max trades per user per day (block when reached). |
| `MAX_CONSECUTIVE_LOSSES` | `3` | Consecutive losses before pause. |
| `COOLDOWN_AFTER_TRADE_SEC` | `30` | Min seconds between trades. |
| `PAUSE_DURATION_MIN` | `1440` | Pause duration in minutes (e.g. 24h). |
| `ENABLE_RUNNER_ADMIN_ENDPOINTS` | `false` | Set `true` to allow `POST /api/runner/simulate-trade-result` (testing risk gates). |

## Runner endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/runner/cron` | **x-cron-secret** (if `RUNNER_CRON_SECRET` set) **or** admin JWT | Run all due strategy_runs. Returns `{ summary, ranAt }`. |
| `POST` | `/api/runner/execute-tick` | Admin JWT | Run one tick. Body: `{ "strategyRunId": "uuid" }`. |
| `GET`  | `/api/runner/status` | Admin JWT | Counts: active strategy_runs, last tick run, blocked users. |
| `POST` | `/api/runner/simulate-trade-result` | Admin JWT | **(Only if `ENABLE_RUNNER_ADMIN_ENDPOINTS=true`)** Body: `{ "userId", "pnlDeltaUsdt" }`. |

**Strategy config**: Use **/api/strategies** (strategy_runs). There is no separate runner strategies CRUD; Terminal Strategy tab lists strategy_runs.

## Database (unified)

- **strategy_runs** — Live strategy config (from Strategy Backtest “Go Live”): exchange_connection_id, symbol, timeframe, direction, leverage, TP/SL, order_size_pct, **last_run_at**, status.
- **strategy_events** — Immutable log (signal, order_submit, order_fill, risk_block, error); payload sanitized (no secrets).
- **strategy_tick_runs** — Runner audit: one row per tick (strategy_run_id, scheduled_at, status, signal, latency_ms).
- **strategy_risk_state** — Per user per day (realized_pnl_usdt, trades_count, consecutive_losses, is_paused, etc.).
- **strategy_locks** — Distributed lock per strategy_run (strategy_run_id, locked_until, lock_owner).

## Build and local commands (Windows PowerShell)

- **Backend (backend-skeleton)**  
  `cd backend-skeleton; npm ci; npm run build`

- **Frontend (repo root)**  
  `cd ..; pnpm i; pnpm run build`

Use `;` (not `&&`) in PowerShell for chaining. Ensure Node/npm and pnpm are installed.

## How to test locally

1. Backend env (e.g. `backend-skeleton/.env`):
   - `ENABLE_STRATEGY_RUNNER=true`
   - `RUNNER_CRON_SECRET=<random long string>` (optional; for cron-secret tests)
   - `ENABLE_RUNNER_ADMIN_ENDPOINTS=true` (optional, for simulate)
   - Supabase URL + service role key

2. Migrations (in order):
   - `20260129150000_strategy_runs_and_events.sql` — strategy_runs, strategy_events
   - `20260129160000_strategy_runner.sql` — strategy_tick_runs, strategy_risk_state, strategy_locks (and legacy `strategies` table; runner no longer uses it)
   - `20260129170000_unify_runner_strategy_runs.sql` — last_run_at on strategy_runs; tick_runs/locks reference strategy_runs

3. **As admin** (Bearer token):
   - `GET /api/runner/status` — 200, `activeStrategies` from strategy_runs
   - `POST /api/runner/cron` — 200, `summary: { ran, skipped, blocked, errors }`
   - Terminal → Strategy tab → “Run Cron Now” (admin only)

4. **Cron without JWT** (e.g. Railway Cron):  
   `POST /api/runner/cron` with header `x-cron-secret: <RUNNER_CRON_SECRET>`

5. **Non-admin**: `POST /api/runner/cron` and `GET /api/runner/status` → **403**.

## Production (Railway)

1. Set env:
   - `ENABLE_STRATEGY_RUNNER=true`
   - `RUNNER_CRON_SECRET=<strong random string>` (for Railway Cron; never expose in frontend)
   - `RUNNER_TICK_INTERVAL_SEC=10` (or 30)
   - Risk limits: `DAILY_MAX_LOSS_USDT`, `MAX_TRADES_PER_DAY`, etc.
   - `ENABLE_RUNNER_ADMIN_ENDPOINTS=false`

2. **Railway Cron**: Call `POST /api/runner/cron` every 10–30 seconds with header `x-cron-secret: <RUNNER_CRON_SECRET>`. In-process scheduler and external cron can coexist; locking prevents double execution per strategy_run.

3. Logs: look for `[runner] scheduler enabled (interval Ns)`.

## Smoke test

- **Admin**: `POST /api/runner/cron` and `GET /api/runner/status` → PASS (200 or 503 if disabled).
- **Non-admin**: PASS with “Correctly blocked (non-admin)” (403).
- **Cron-secret**: When `VITE_ENABLE_RUNNER_CRON_TEST=true` and `VITE_RUNNER_CRON_SECRET` is set (test only), “POST /api/runner/cron (cron-secret)” calls cron with `x-cron-secret` and no JWT; expect 200 or 503.

## Security

- Cron: **x-cron-secret** or admin JWT; never return or log secrets.
- Other runner endpoints: admin JWT only.
- CORS: allow only configured origins (e.g. FRONTEND_URL).
- Kill switch blocks orders before adapter calls. Reduce-only for exits; symbol whitelist (e.g. BTCUSDT, ETHUSDT, SOLUSDT); max leverage enforced.

---

## Quick reference: env vars (Railway)

| Env var | Value | Notes |
|---------|--------|--------|
| `ENABLE_STRATEGY_RUNNER` | `true` | Enables scheduler and runner endpoints. |
| `RUNNER_CRON_SECRET` | `<random long string>` | Cron auth without JWT; set for Railway Cron. |
| `RUNNER_TICK_INTERVAL_SEC` | `10` | Seconds between in-process ticks. |
| `DAILY_MAX_LOSS_USDT` | `50` | Daily loss cap. |
| `MAX_TRADES_PER_DAY` | `20` | Max trades per user per day. |
| `MAX_CONSECUTIVE_LOSSES` | `3` | Consecutive losses before pause. |
| `COOLDOWN_AFTER_TRADE_SEC` | `30` | Min seconds between trades. |
| `PAUSE_DURATION_MIN` | `1440` | Pause duration (minutes). |
| `ENABLE_RUNNER_ADMIN_ENDPOINTS` | `false` | Set `true` only for simulate-trade-result testing. |

Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.

## Curl examples

- **Cron (cron-secret)**  
  `curl -X POST https://your-backend/api/runner/cron -H "Content-Type: application/json" -H "x-cron-secret: YOUR_RUNNER_CRON_SECRET"`

- **Cron (admin JWT)**  
  `curl -X POST https://your-backend/api/runner/cron -H "Authorization: Bearer YOUR_ADMIN_JWT" -H "Content-Type: application/json"`

- **Status**  
  `curl https://your-backend/api/runner/status -H "Authorization: Bearer YOUR_ADMIN_JWT"`
