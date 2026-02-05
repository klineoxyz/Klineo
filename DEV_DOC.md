# Futures Auto Trading — Development & Testnet Guide

This document explains how to test **Futures auto trading** (Binance + Bybit) with **testnets** and required API permissions. Spot trading is unchanged.

---

## How to connect API keys safely (Binance and Bybit)

Use the in-app **Settings → Connect Exchange** wizard. Never enable withdrawals for API keys. Use testnet first if you are unsure.

### Permission checklist (same for both exchanges)

- **Enable: Read-only access** (account info)
- **Enable: Spot trading**
- **Enable: Futures trading (USDT perpetual)**
- **Disable: Withdrawals (must be OFF)**
- If you use IP restrictions, add the backend IP (optional)

### Binance

1. **Where to create keys**
   - Production: [Binance API Management](https://www.binance.com/en/my/settings/api-management)
   - Testnet: [Binance Futures Testnet](https://testnet.binancefuture.com) (log in with GitHub; API uses demo-fapi.binance.com; no real funds)

2. **In Binance API form**
   - Enable "Enable Reading" (read-only account info)
   - Enable "Enable Spot & Margin Trading"
   - Enable "Enable Futures" (USD-M)
   - Leave **"Enable Withdrawals"** OFF

3. **Optional**
   - Restrict access to trusted IPs only (then add your backend IP in Binance)

### Bybit

1. **Where to create keys**
   - Production: [Bybit API Management](https://www.bybit.com/app/user/api-management)
   - Testnet: [Bybit Testnet](https://testnet.bybit.com) (USDT Perpetual / linear)

2. **In Bybit API form**
   - Enable "Read" and "Contract" (derivatives) with "Read & Write" for USDT Perpetual
   - Do **not** enable "Withdraw"

3. **Optional**
   - Use IP restriction and add your backend IP in Bybit

### Warnings

- Never enable withdrawals for API keys used with KLINEO.
- Use testnet first if you are unsure.
- Keys are stored encrypted on the backend; the frontend never stores or displays your secret after input.

## Overview

- **Futures** is a new mode, enabled per exchange connection. Users connect Binance or Bybit API keys, optionally enable Futures, then run a strategy from Strategy Backtest via "Go Live".
- All orders go through the **backend**; the frontend never sees API keys or places orders directly.
- **Risk guards**: kill switch, max leverage, max notional, symbol whitelist (BTCUSDT, ETHUSDT, SOLUSDT), isolated margin default. On repeated errors, the strategy is paused.

## Database (Supabase)

- **user_exchange_connections**: extended with `supports_futures`, `futures_enabled`, `futures_tested_at`, `futures_test_status`, `futures_last_error`, `default_leverage`, `max_leverage_allowed`, `margin_mode`, `position_mode`, `max_notional_usdt`, `kill_switch`.
- **strategy_runs**: one row per live strategy (symbol, timeframe, direction, leverage, TP/SL, status: draft | active | paused | stopped).
- **strategy_events**: immutable log of signals and executions (event_type: signal, order_submit, order_fill, error, risk_block). Payload must not contain secrets.

Migrations:

- `supabase/migrations/20260129140000_futures_connection_columns.sql`
- `supabase/migrations/20260129150000_strategy_runs_and_events.sql`

## Backend

- **Adapters**: `backend-skeleton/src/lib/binance-futures.ts`, `bybit-futures.ts` — common interface: `setLeverage`, `setMarginMode`, `setPositionMode`, `getAccountSummary`, `placeOrder`, `getOpenPosition`, `getOpenOrders`, `cancelAll`.
- **Strategy engine**: `backend-skeleton/src/lib/strategy-engine.ts` — RSI Oversold/Overbought (long when RSI < 30, short when RSI > 70); direction long/short/both; TP/SL as bracket.
- **Routes**:
  - `POST /api/exchange-connections/:id/futures/test` — test Futures API (no order).
  - `POST /api/exchange-connections/:id/futures/enable` — set leverage, margin mode, position mode for BTCUSDT; set `futures_enabled` true.
  - `PATCH /api/exchange-connections/:id/kill-switch` — body `{ "enabled": true }` to stop all futures orders for that connection.
  - `POST /api/strategies` — create strategy_run.
  - `GET /api/strategies`, `GET /api/strategies/:id` — list / details + events.
  - `PUT /api/strategies/:id/status` — body `{ "status": "active" | "paused" | "stopped" }`.
  - `POST /api/strategies/:id/execute-tick` — one tick (fetch candles, RSI, place order if signal). Called by scheduler or manually.
  - `POST /api/futures/order` — manual futures market order (MVP). Body: `{ connectionId, symbol, side: "BUY"|"SELL", type: "MARKET", qty? (base), quoteSizeUsdt? }`. Provide either `qty` (base asset) or `quoteSizeUsdt` (USDT size; backend converts via mark price, precision: 5 BTC / 4 ETH / 3 SOL). Symbol whitelist: BTCUSDT, ETHUSDT, SOLUSDT. Enforces `max_notional_usdt` when using `quoteSizeUsdt`. Returns 409 if futures OFF ("Futures is OFF. Enable futures first."), 423 if kill switch ON ("Kill switch enabled."). Never returns secrets.

Request ID is set by existing middleware (`X-Request-ID`).

## Backend environment (Railway)

- **Required:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `NODE_ENV`, `ADMIN_EMAILS`, `ENABLE_MANUAL_PAYMENTS`, `ENABLE_STRATEGY_RUNNER`. If `ENABLE_STRATEGY_RUNNER=true`, also `RUNNER_CRON_SECRET`.
- **SUPABASE_ANON_KEY is frontend-only and must NOT be added to Railway.** Backend uses `SUPABASE_SERVICE_ROLE_KEY` only for all privileged Supabase access.
- No env variable values are logged; no secrets are returned in API responses; no `VITE_*` variables are referenced in backend code.

## Testing with Binance Testnet

1. **Create testnet API keys**
   - Go to [Binance Futures Testnet](https://testnet.binancefuture.com).
   - Log in with GitHub and create API key and secret. No real funds.

2. **Required permissions**
   - Enable **Futures** (USD-M) for the key. Spot-only keys will fail Futures endpoints.

3. **Backend env**
   - When saving the connection, use **environment: testnet**. The backend uses `testnet.binancefuture.com` for Futures when `environment === 'testnet'`.

4. **Flow**
   - In the app: Settings → Add/update connection → choose **Testnet**, paste API Key and Secret → Save → Test (spot). Then **Test Futures** (if available in UI) or call `POST /api/exchange-connections/:id/futures/test`. Then **Enable Futures** (or `POST .../futures/enable` with optional `default_leverage`, `margin_mode`, `position_mode`).
   - Strategy Backtest → Run backtest → **Go Live (Futures)** → pick the testnet connection, set leverage/margin/position/order size → accept risk → Submit. Strategy is created and set to `active`.
   - Terminal → Strategy tab: see Active Strategy, execution log, kill switch. Execute-tick can be triggered by a cron or admin; one tick runs RSI logic and may place an order on testnet.

5. **Assumptions**
   - Binance Futures testnet may have different rate limits or slight endpoint differences; if something fails, check response message and `futures_last_error` on the connection.
   - Server time drift is handled with `recvWindow` (e.g. 10s) in signed requests.

## Testing with Bybit Testnet

1. **Create testnet API keys**
   - Go to [Bybit Testnet](https://testnet.bybit.com/).
   - Create an account and generate API key/secret for the **Unified Trading Account** (or contract). Use **USDT Perpetual (linear)**.

2. **Required permissions**
   - Enable **Contract** (derivatives) and **Read & Write** for the key. Read-only will fail order/leverage endpoints.

3. **Backend env**
   - When saving the connection, use **environment: testnet**. The backend uses `https://api-testnet.bybit.com` for Futures when `environment === 'testnet'`.

4. **Flow**
   - Same as Binance: save connection (testnet) → Test → Test Futures → Enable Futures. Then Go Live from Backtest using that connection. Terminal Strategy tab for status and kill switch.

5. **Assumptions**
   - Bybit v5 `category=linear` for USDT perpetual. Margin mode (ISOLATED_MARGIN / REGULAR_MARGIN) and position mode (one-way vs hedge) are set via their respective endpoints. If an endpoint returns an error, check Bybit v5 docs for exact parameter names.

## Scheduler (execute-tick)

Phase 1 does not include a built-in cron. Options:

- **Manual**: Call `POST /api/strategies/:id/execute-tick` (e.g. from Admin or a "Run tick" button) with the user’s JWT.
- **External cron**: Use a job that obtains a token (e.g. service role or user token) and calls `execute-tick` for each active strategy at the desired interval (e.g. per timeframe: 1m strategy every minute).
- **Backend scheduler**: Add a simple setInterval or node-cron in the backend that, for each active `strategy_run`, calls the same logic as `execute-tick` (without going through HTTP). Document in this file when implemented.

## Safety

- **Kill switch**: When `kill_switch` is true on a connection, no futures order is placed for that connection.
- **Symbol whitelist**: Only BTCUSDT, ETHUSDT, SOLUSDT are allowed for strategy runs.
- **Leverage**: Cannot exceed `max_leverage_allowed` on the connection.
- **Notional**: Estimated notional is capped by `max_notional_usdt`.
- **Errors**: After N consecutive failures (see `MAX_CONSECUTIVE_FAILURES` in strategy-engine), the strategy is set to `paused`. No aggressive retries.
- **Secrets**: strategy_events and API responses store only non-sensitive fields (e.g. orderId, status, code, message). No API keys or secrets in logs or frontend.

## Summary

| Item | Binance Testnet | Bybit Testnet |
|------|-----------------|---------------|
| URL | demo-fapi.binance.com (Futures USDT-M) | api-testnet.bybit.com |
| Product | USD-M Futures | USDT Perpetual (linear) |
| Permissions | Futures enabled | Contract read & write |
| Env in app | `environment: testnet` | `environment: testnet` |

Use testnet for all development and QA; switch to production only when intentionally using real funds.
