-- strategy_runs: live strategies launched from Strategy Backtest.
-- strategy_events: immutable log of signals and executions (no secrets).

CREATE TABLE IF NOT EXISTS public.strategy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  exchange_connection_id UUID NOT NULL REFERENCES public.user_exchange_connections(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  market_type TEXT NOT NULL DEFAULT 'futures' CHECK (market_type IN ('futures')),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short', 'both')),
  leverage INT NOT NULL,
  margin_mode TEXT NOT NULL DEFAULT 'isolated' CHECK (margin_mode IN ('isolated', 'cross')),
  position_mode TEXT NOT NULL DEFAULT 'one_way' CHECK (position_mode IN ('one_way', 'hedge')),
  order_size_pct NUMERIC NOT NULL,
  initial_capital_usdt NUMERIC NOT NULL,
  take_profit_pct NUMERIC NOT NULL,
  stop_loss_pct NUMERIC NOT NULL,
  strategy_template TEXT NOT NULL,
  strategy_params JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'stopped')),
  last_signal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_runs_user_id ON public.strategy_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_runs_exchange_connection_id ON public.strategy_runs(exchange_connection_id);
CREATE INDEX IF NOT EXISTS idx_strategy_runs_status ON public.strategy_runs(status);

ALTER TABLE public.strategy_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strategy_runs_select" ON public.strategy_runs;
CREATE POLICY "strategy_runs_select" ON public.strategy_runs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "strategy_runs_insert" ON public.strategy_runs;
CREATE POLICY "strategy_runs_insert" ON public.strategy_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "strategy_runs_update" ON public.strategy_runs;
CREATE POLICY "strategy_runs_update" ON public.strategy_runs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "strategy_runs_delete" ON public.strategy_runs;
CREATE POLICY "strategy_runs_delete" ON public.strategy_runs FOR DELETE USING (auth.uid() = user_id);

-- strategy_events: immutable audit log (orderId, status, code, message only — no secrets)
CREATE TABLE IF NOT EXISTS public.strategy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_run_id UUID NOT NULL REFERENCES public.strategy_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('signal', 'order_submit', 'order_fill', 'error', 'risk_block')),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_events_strategy_run_id ON public.strategy_events(strategy_run_id);
CREATE INDEX IF NOT EXISTS idx_strategy_events_created_at ON public.strategy_events(created_at DESC);

ALTER TABLE public.strategy_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strategy_events_select" ON public.strategy_events;
CREATE POLICY "strategy_events_select" ON public.strategy_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "strategy_events_insert" ON public.strategy_events;
CREATE POLICY "strategy_events_insert" ON public.strategy_events FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.strategy_runs IS 'Live futures strategies from Strategy Backtest';
COMMENT ON TABLE public.strategy_events IS 'Immutable log of strategy signals and executions; payload must not contain secrets';
