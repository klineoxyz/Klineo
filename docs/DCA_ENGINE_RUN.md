# DCA Engine — How to Run

The **Spot DCA Grid** execution engine runs only for bots with `market='spot'` and `status='running'`. Futures bots are not executed.

## Local

1. **Apply migrations** (execution tracking + state + orders):
   ```bash
   npx supabase db push
   # or: supabase migration up
   ```

2. **Start the backend** (engine runs in-process with the strategy runner):
   ```bash
   cd backend-skeleton
   npm run dev
   ```
   When `ENABLE_STRATEGY_RUNNER=true`, the same scheduler interval runs both strategy runner and DCA engine (`processRunningDcaBots`). No separate cron needed locally.

3. **Trigger tick via HTTP** (optional):
   ```bash
   curl -X POST http://localhost:3000/api/dca-bots/engine/tick \
     -H "Content-Type: application/json" \
     -H "x-dca-engine-secret: YOUR_DCA_ENGINE_SECRET" \
     -d '{"limit": 10}'
   ```
   Set `DCA_ENGINE_SECRET` in `.env`; if unset, the tick endpoint returns 401.

## Production (e.g. Railway)

1. **Migrations**: Run Supabase migrations so `dca_bots` has execution columns and tables `dca_bot_state`, `dca_bot_orders` exist.

2. **In-process (recommended)**  
   Backend already runs the DCA engine on the same interval as the strategy runner when `ENABLE_STRATEGY_RUNNER=true`. No extra deployment.

3. **External cron (optional)**  
   To trigger the engine from an external cron (e.g. every 15–30s):
   ```bash
   curl -X POST https://your-backend.railway.app/api/dca-bots/engine/tick \
     -H "x-dca-engine-secret: YOUR_DCA_ENGINE_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"limit": 20}'
   ```
   Set `DCA_ENGINE_SECRET` in Railway (and in the cron job) to match.

## Env

- **ENABLE_STRATEGY_RUNNER**: Must be `true` for DCA ticks to run. The in-process scheduler runs `processRunningDcaBots` on the same interval as the strategy runner. If this is `false`, DCA bots will show "Running" but **Last tick**, **DCA Progress** and PnL will stay empty. Set `ENABLE_STRATEGY_RUNNER=true` in production/live.
- **DCA_ENGINE_SECRET** (optional): Protects `POST /api/dca-bots/engine/tick`. Use a long random string. If not set, the endpoint always returns 401 (in-process scheduler does not use this).

## Behaviour

- **Poll**: Bots with `status='running'`, `market='spot'`, and `next_tick_at` null or past are processed (up to `limit` per tick).
- **Lock**: Each bot is locked for 60s so two ticks cannot run concurrently.
- **After tick**: `last_tick_at`, `last_tick_status`, `last_tick_error` are set; `next_tick_at` is set to now + 15s; lock is released.

## How to check why trades are not executing

1. **UI — Last tick column**  
   In **My Bots**, the "Last tick" column shows the last run time and, on failure, **last_tick_error** (e.g. "No exchange connection for binance", "Decrypt failed", "Ticker failed"). If the bot has never been ticked, it shows "No tick yet".

2. **UI — Run tick**  
   For a **running** bot, click **Run tick** in the Actions column. The backend runs one tick immediately and returns success or an error message (toast). Use this to see the exact failure without waiting for the scheduler.

3. **Backend logs**  
   When the in-process scheduler or the tick endpoint runs, each non-ok result is logged with:
   - `[dca-engine] bot=<id> status=blocked error=No exchange connection for binance`
   - `[dca-engine] bot=<id> status=error error=Decrypt failed`
   - etc.  
   Check your server logs (e.g. Railway logs) and search for `[dca-engine]` to see why a bot failed.

4. **Common causes**  
   - **No tick yet** / engine never runs: set `ENABLE_STRATEGY_RUNNER=true` and restart the backend.  
   - **No exchange connection for &lt;exchange&gt;**: user has not connected that exchange (or connection was removed).  
   - **Decrypt failed**: bad or rotated encryption key, or corrupted connection config.  
   - **Ticker failed**: exchange API error (e.g. rate limit, invalid pair, network).
