-- DCA production: state_meta for reconciliation/ingestion, trades idempotency.

-- 1) state_meta JSONB on dca_bot_state (last_ingested_trade_time, last_ingested_trade_id, last_reconciled_at, status_reason, tp_order_link_id)
ALTER TABLE public.dca_bot_state
  ADD COLUMN IF NOT EXISTS state_meta JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.dca_bot_state.state_meta IS 'Extended state: last_ingested_trade_time (ms), last_ingested_trade_id, last_reconciled_at (iso), status_reason, tp_order_link_id (Bybit)';

-- 2) trades: exchange_trade_id for idempotent upsert (Binance trade id / Bybit execId)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS exchange_trade_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_user_exchange_trade_id
  ON public.trades (user_id, exchange, exchange_trade_id)
  WHERE exchange IS NOT NULL AND exchange_trade_id IS NOT NULL;

COMMENT ON COLUMN public.trades.exchange_trade_id IS 'Exchange trade/exec id for idempotent ingestion (Binance id, Bybit execId)';

-- 3) DCA runner: atomic claim of due bots under advisory lock (prevents double tick across instances)
-- Lock key 9876543210987654 = DCA runner global lock. Transaction-level: released on commit.
CREATE OR REPLACE FUNCTION public.claim_due_dca_bots(p_limit int DEFAULT 10, p_interval_sec int DEFAULT 15)
RETURNS SETOF public.dca_bots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT pg_try_advisory_xact_lock(9876543210987654) THEN
    RETURN; -- another instance holds the lock; skip this cycle
  END IF;
  RETURN QUERY
  WITH due AS (
    SELECT id FROM public.dca_bots
    WHERE status = 'running' AND market = 'spot'
      AND (next_tick_at IS NULL OR next_tick_at <= now())
    ORDER BY next_tick_at ASC NULLS FIRST
    LIMIT p_limit
  ),
  updated AS (
    UPDATE public.dca_bots b
    SET next_tick_at = (now() + (p_interval_sec || ' seconds')::interval)::timestamptz,
        last_tick_at = now(),
        updated_at = now()
    FROM due d WHERE b.id = d.id
    RETURNING b.*
  )
  SELECT * FROM updated;
END;
$$;

COMMENT ON FUNCTION public.claim_due_dca_bots IS 'Atomically claim due DCA bots under global advisory lock; returns claimed rows. Call from runner only.';
