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

- **DCA_ENGINE_SECRET** (optional): Protects `POST /api/dca-bots/engine/tick`. Use a long random string. If not set, the endpoint always returns 401 (in-process scheduler does not use this).

## Behaviour

- **Poll**: Bots with `status='running'`, `market='spot'`, and `next_tick_at` null or past are processed (up to `limit` per tick).
- **Lock**: Each bot is locked for 60s so two ticks cannot run concurrently.
- **After tick**: `last_tick_at`, `last_tick_status`, `last_tick_error` are set; `next_tick_at` is set to now + 15s; lock is released.
