# Strategy Runner

Production-grade strategy runner for KLINEO: Railway cron-style scheduler, timeframe alignment, risk gates (pause-on-loss, daily max loss, max trades/day, cooldowns), and distributed locking. No real orders yet; scaffolding only.

## How the scheduler works

1. **In-process (Railway)**  
   When `ENABLE_STRATEGY_RUNNER=true`, the backend starts a `setInterval` every `RUNNER_TICK_INTERVAL_SEC` seconds (default 10). Each tick calls `runDueStrategies(now)`. Only one tick runs at a time (mutex).

2. **External cron fallback**  
   You can call `POST /api/runner/cron` (admin only) from an external cron (e.g. Railway cron, Vercel cron). Same behavior as one in-process tick.

3. **Due check**  
   For each active strategy, the runner:
   - Aligns to **timeframe boundary** (1m / 5m / 15m / 1h) with a ±5s grace window.
   - Skips if **last_run_at** is within the interval (cooldown).
   - **Locks** the strategy (2 min TTL) to avoid double execution.
   - **Risk gate**: if user is paused (daily loss, consecutive losses, max trades, cooldown), the run is recorded as `blocked` and no order is placed.
   - **MVP**: records run with `signal='hold'`, `status='ok'`; no real orders.

## Env vars (Railway / backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_STRATEGY_RUNNER` | `false` | Set `true` to enable in-process scheduler and runner endpoints. |
| `RUNNER_TICK_INTERVAL_SEC` | `10` | Interval (seconds) between scheduler ticks. |
| `DAILY_MAX_LOSS_USDT` | `50` | Daily realized PnL cap (pause user when ≤ -this). |
| `MAX_TRADES_PER_DAY` | `20` | Max trades per user per day (block when reached). |
| `MAX_CONSECUTIVE_LOSSES` | `3` | Consecutive losses before pause (e.g. 60 min). |
| `COOLDOWN_AFTER_TRADE_SEC` | `30` | Min seconds between trades (micro-cooldown). |
| `PAUSE_DURATION_MIN` | `1440` | Pause duration in minutes (e.g. 1440 = 24h). |
| `ENABLE_RUNNER_ADMIN_ENDPOINTS` | `false` | Set `true` to allow `POST /api/runner/simulate-trade-result` (testing risk gates). |

## Risk gates

1. **Pause-on-loss**  
   - If `realized_pnl_usdt` for the day ≤ `-DAILY_MAX_LOSS_USDT` → user paused until end of day (or `PAUSE_DURATION_MIN`).  
   - If `consecutive_losses` ≥ `MAX_CONSECUTIVE_LOSSES` → user paused for `PAUSE_DURATION_MIN`.

2. **Daily max trades**  
   If `trades_count` ≥ `MAX_TRADES_PER_DAY` → further ticks that would place orders are **blocked** (run status `blocked`).

3. **Cooldown**  
   After a trade, `last_trade_at` is set; next tick is blocked until `now - last_trade_at >= COOLDOWN_AFTER_TRADE_SEC`.

4. **Strategy-level**  
   If user is paused, strategy tick is **blocked** and run recorded with reason. Strategies are not deleted; admin/user can resume later.

## Runner endpoints (admin only)

All require `Authorization: Bearer <JWT>` and **admin role**.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/runner/execute-tick` | Run one strategy tick. Body: `{ "strategyId": "uuid" }`. |
| `POST` | `/api/runner/cron` | Run all due strategies (same as one scheduler tick). Returns `{ summary: { ran, skipped, blocked, errors }, ranAt }`. |
| `GET`  | `/api/runner/status` | Counts: active strategies, last run time, blocked users. |
| `POST` | `/api/runner/simulate-trade-result` | **(Only if `ENABLE_RUNNER_ADMIN_ENDPOINTS=true`)** Body: `{ "userId", "pnlDeltaUsdt" }`. Updates risk state (for testing). |

## Runner strategies CRUD (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/runner/strategies` | List current user's strategies (runner table). |
| `GET`  | `/api/runner/strategies/:id` | Get one strategy. |
| `POST` | `/api/runner/strategies` | Create strategy. Default timeframe `5m`; `1m` allowed only for admin. |
| `PUT`  | `/api/runner/strategies/:id` | Update strategy (timeframe validation: 1m admin-only). |

## Timeframe policy

- **Default** for new strategies: `5m`.  
- **Allowed**: `1m`, `5m`, `15m`, `1h`.  
- **1m** is feature-gated: only admin can create/update a strategy with `timeframe: '1m'` (to avoid rate limits).  
- **Futures** default min 1m; default recommended `5m`.

## Database (runner)

- **strategies** — Config (user_id, name, exchange, market_type, symbol, timeframe, status, side_mode, leverage, order_size_pct, take_profit_pct, stop_loss_pct, last_run_at).  
- **strategy_tick_runs** — Append-only audit per tick (strategy_id, user_id, scheduled_at, started_at, finished_at, status, reason, signal, latency_ms, meta).  
- **strategy_risk_state** — Per user per day (realized_pnl_usdt, trades_count, consecutive_losses, is_paused, paused_reason, paused_until, last_trade_at).  
- **strategy_locks** — Distributed lock per strategy (locked_until, lock_owner). Backend uses service role to acquire/release.

## How to test locally

1. Set backend env (e.g. `backend-skeleton/.env`):
   - `ENABLE_STRATEGY_RUNNER=true`
   - `ENABLE_RUNNER_ADMIN_ENDPOINTS=true` (optional, for simulate)
   - Supabase URL + service role key

2. Run migrations (includes `supabase/migrations/20260129160000_strategy_runner.sql` — runner tables: strategies, strategy_tick_runs, strategy_risk_state, strategy_locks).

3. **As admin**, with Bearer token:
   - `GET /api/runner/status` — expect 200, `enabled: true`, `activeStrategies`, etc.
   - `POST /api/runner/cron` — expect 200, `summary: { ran, skipped, blocked, errors }`.
   - (Optional) `POST /api/runner/simulate-trade-result` with `{ "userId": "<your-user-uuid>", "pnlDeltaUsdt": -25 }` to trigger pause; then `GET /api/runner/status` to see blocked user.

4. **As non-admin**: `POST /api/runner/cron` and `GET /api/runner/status` should return **403**.

## How to verify in production (Railway)

1. Set env on Railway:
   - `ENABLE_STRATEGY_RUNNER=true`
   - `RUNNER_TICK_INTERVAL_SEC=10` (or desired interval)
   - `DAILY_MAX_LOSS_USDT`, `MAX_TRADES_PER_DAY`, etc. as needed
   - `ENABLE_RUNNER_ADMIN_ENDPOINTS=false` (recommended in prod)

2. Deploy; check logs for `[runner] scheduler enabled (interval 10s)`.

3. Optionally call `POST /api/runner/cron` from an external cron (same auth: admin JWT). In-process scheduler and external cron can coexist; locking prevents double execution per strategy.

## Smoke test steps

- **Admin**: Run smoke tests; expect `POST /api/runner/cron` and `GET /api/runner/status` to **PASS** (200).  
- **Non-admin**: Expect **PASS** with “Correctly blocked (non-admin)” (403).  
- If `VITE_ENABLE_RUNNER_SIM_TESTS=true`, smoke test can include `POST /api/runner/simulate-trade-result` with `pnlDeltaUsdt: -25` (admin only).

## Security

- Runner endpoints (execute-tick, cron, status, simulate) require **admin** (JWT + role).  
- No secrets or tokens in responses.  
- Lock table RLS: admin read; write/delete via service role only.  
- Idempotent: safe under retries; lock prevents overlapping runs per strategy.

---

## Quick reference: env vars (Railway / Vercel backend)

| Env var | Value | Notes |
|---------|--------|--------|
| `ENABLE_STRATEGY_RUNNER` | `true` | Enables in-process scheduler and runner endpoints. |
| `RUNNER_TICK_INTERVAL_SEC` | `10` | Seconds between scheduler ticks. |
| `DAILY_MAX_LOSS_USDT` | `50` | Daily loss cap (pause user). |
| `MAX_TRADES_PER_DAY` | `20` | Max trades per user per day. |
| `MAX_CONSECUTIVE_LOSSES` | `3` | Consecutive losses before pause. |
| `COOLDOWN_AFTER_TRADE_SEC` | `30` | Min seconds between trades. |
| `PAUSE_DURATION_MIN` | `1440` | Pause duration in minutes (e.g. 24h). |
| `ENABLE_RUNNER_ADMIN_ENDPOINTS` | `false` | Set `true` only for testing simulate-trade-result. |

Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set so the runner can read/write strategies and risk state.

## Verify quickly (smoke test steps)

1. **Apply migration**: Run `supabase db push` or apply `20260129160000_strategy_runner.sql`.
2. **Backend env**: Set `ENABLE_STRATEGY_RUNNER=true` (and optionally `ENABLE_RUNNER_ADMIN_ENDPOINTS=true` for simulate).
3. **As admin**: Open Smoke Test page (when `VITE_ENABLE_SMOKE_TEST_PAGE=true`). Run all tests. Expect:
   - **POST /api/runner/cron** → PASS (200 or 503 if runner disabled).
   - **GET /api/runner/status** → PASS (200).
   - **POST /api/runner/simulate-trade-result** → SKIP unless `VITE_ENABLE_RUNNER_SIM_TESTS=true`, else PASS (200) or SKIP (403 if ENABLE_RUNNER_ADMIN_ENDPOINTS=false).
4. **As non-admin**: Expect **POST /api/runner/cron** and **GET /api/runner/status** → PASS with “Correctly blocked (non-admin)” (403).
5. **Manual curl (admin JWT)**:
   - `curl -X POST https://your-backend/api/runner/cron -H "Authorization: Bearer YOUR_ADMIN_JWT" -H "Content-Type: application/json"`
   - `curl https://your-backend/api/runner/status -H "Authorization: Bearer YOUR_ADMIN_JWT"`
