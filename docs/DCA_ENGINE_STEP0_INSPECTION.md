# Step 0: DCA Engine — Repo Inspection

## Exchange connections and API keys

- **Stored:** `user_exchange_connections` (Supabase). Credentials in `encrypted_config_b64` (TEXT) or legacy `encrypted_config` (BYTEA).
- **Decrypt:** `backend-skeleton/src/lib/crypto.ts` — `decrypt(encryptedData: string): Promise<string>` returns JSON string `{ apiKey, apiSecret }`.
- **Usage:** Routes load connection by `user_id`, then call `decrypt(connection.encrypted_config_b64)`, parse JSON, pass to exchange clients. Example: `exchange-connections.ts` GET /balance, POST /:id/test, futures.ts placeOrder.

## Binance and Bybit clients

- **Binance Spot:** `backend-skeleton/src/lib/binance.ts` — `BinanceCredentials`, `getAccountInfo`, `getOpenOrders`, `getMyTrades`, `testConnection`. **No spot placeOrder in repo.**
- **Binance Futures:** `backend-skeleton/src/lib/binance-futures.ts` — `placeOrder`, `getMarkPrice`, adapters for strategy runner.
- **Bybit Spot:** `backend-skeleton/src/lib/bybit.ts` — `BybitCredentials`, `getWalletBalance`, `getAccountInfo`, `testConnection`. `placeOrder` throws "not implemented".
- **Bybit Futures:** `backend-skeleton/src/lib/bybit-futures.ts` — `placeOrder`, used by futures route and strategy runner.

## Order placement today

- **Futures only:** `backend-skeleton/src/routes/futures.ts` — POST placeOrder uses decrypt + Binance/Bybit futures adapters. Strategy runner uses same adapters for RSI strategy ticks.
- **Spot:** No order placement in codebase. Required for DCA: add Binance spot placeOrder + Bybit spot placeOrder (and ticker/price for spot).

## Cron / worker pattern

- **Strategy runner:** `backend-skeleton/src/lib/strategyRunner.ts` — `runDueStrategies( client, now, options )` runs all due `strategy_runs` (Futures). Uses `strategyLock.ts` (acquire/release), `strategy-engine.ts` (runRsiTick).
- **Cron endpoint:** `backend-skeleton/src/routes/strategies-runner.ts` — `POST /api/runner/cron` protected by `x-cron-secret` (RUNNER_CRON_SECRET) or admin JWT. Calls `handleCronRun` → `runDueStrategies`. Also `POST /api/runner/cron-internal` with query `x_cron_secret`.
- **Scheduler:** `backend-skeleton/src/index.ts` — when `ENABLE_STRATEGY_RUNNER=true`, a setInterval runs `runDueStrategies` every `RUNNER_TICK_INTERVAL_SEC` (no HTTP). No separate Vercel cron config in repo; Railway cron doc says use external cron to hit POST /api/runner/cron.
- **DCA:** No existing DCA cron. Add `POST /api/dca-bots/engine/tick` (DCA_ENGINE_SECRET) and optionally call it from same cron job or a second one.
