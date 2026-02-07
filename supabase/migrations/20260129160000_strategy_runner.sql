-- Strategy runner: strategies (config), strategy_tick_runs (audit), risk state, locks.
-- Audit table is strategy_tick_runs to avoid conflicting with existing strategy_runs (Go Live config).

-- 1) strategies: config per strategy
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  market_type TEXT NOT NULL DEFAULT 'futures' CHECK (market_type IN ('spot', 'futures')),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '5m' CHECK (timeframe IN ('1m', '5m', '15m', '1h')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  side_mode TEXT NOT NULL DEFAULT 'both' CHECK (side_mode IN ('long', 'short', 'both')),
  leverage INTEGER NOT NULL DEFAULT 1 CHECK (leverage >= 1 AND leverage <= 125),
  order_size_pct NUMERIC NOT NULL DEFAULT 10 CHECK (order_size_pct > 0 AND order_size_pct <= 100),
  take_profit_pct NUMERIC,
  stop_loss_pct NUMERIC,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON public.strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategies_last_run_at ON public.strategies(last_run_at);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strategies_select" ON public.strategies;
CREATE POLICY "strategies_select" ON public.strategies FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "strategies_insert" ON public.strategies;
CREATE POLICY "strategies_insert" ON public.strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "strategies_update" ON public.strategies;
CREATE POLICY "strategies_update" ON public.strategies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "strategies_delete" ON public.strategies;
CREATE POLICY "strategies_delete" ON public.strategies FOR DELETE USING (auth.uid() = user_id);

-- 2) strategy_tick_runs: append-only audit per tick
CREATE TABLE IF NOT EXISTS public.strategy_tick_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('ok', 'skipped', 'blocked', 'error')),
  reason TEXT,
  signal TEXT CHECK (signal IN ('buy', 'sell', 'hold')),
  latency_ms INTEGER,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Index on strategy_id only if column exists (20260129170000 may have already migrated to strategy_run_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_tick_runs' AND column_name = 'strategy_id') THEN
    CREATE INDEX IF NOT EXISTS idx_strategy_tick_runs_strategy_id ON public.strategy_tick_runs(strategy_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_strategy_tick_runs_user_id ON public.strategy_tick_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_tick_runs_scheduled_at ON public.strategy_tick_runs(scheduled_at DESC);

ALTER TABLE public.strategy_tick_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strategy_tick_runs_select" ON public.strategy_tick_runs;
CREATE POLICY "strategy_tick_runs_select" ON public.strategy_tick_runs FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "strategy_tick_runs_insert" ON public.strategy_tick_runs;
CREATE POLICY "strategy_tick_runs_insert" ON public.strategy_tick_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3) strategy_risk_state: per user per day
CREATE TABLE IF NOT EXISTS public.strategy_risk_state (
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  realized_pnl_usdt NUMERIC NOT NULL DEFAULT 0,
  trades_count INTEGER NOT NULL DEFAULT 0,
  consecutive_losses INTEGER NOT NULL DEFAULT 0,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  paused_reason TEXT,
  paused_until TIMESTAMPTZ,
  last_trade_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_strategy_risk_state_user_day ON public.strategy_risk_state(user_id, day);

ALTER TABLE public.strategy_risk_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strategy_risk_state_select" ON public.strategy_risk_state;
CREATE POLICY "strategy_risk_state_select" ON public.strategy_risk_state FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "strategy_risk_state_insert" ON public.strategy_risk_state;
CREATE POLICY "strategy_risk_state_insert" ON public.strategy_risk_state FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "strategy_risk_state_update" ON public.strategy_risk_state;
CREATE POLICY "strategy_risk_state_update" ON public.strategy_risk_state FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) strategy_locks: distributed lock (service role only in practice; admin read)
CREATE TABLE IF NOT EXISTS public.strategy_locks (
  strategy_id UUID PRIMARY KEY REFERENCES public.strategies(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  lock_owner TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.strategy_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strategy_locks_select" ON public.strategy_locks;
CREATE POLICY "strategy_locks_select" ON public.strategy_locks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Insert/update/delete only via service role (no RLS policy for non-admin; backend uses service role)
DROP POLICY IF EXISTS "strategy_locks_all_admin" ON public.strategy_locks;
CREATE POLICY "strategy_locks_all_admin" ON public.strategy_locks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS strategies_updated_at ON public.strategies;
CREATE TRIGGER strategies_updated_at
  BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS strategy_locks_updated_at ON public.strategy_locks;
CREATE TRIGGER strategy_locks_updated_at
  BEFORE UPDATE ON public.strategy_locks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.strategies IS 'Strategy runner config (exchange, symbol, timeframe, risk params)';
COMMENT ON TABLE public.strategy_tick_runs IS 'Append-only audit of each strategy tick (scheduled_at, status, signal)';
COMMENT ON TABLE public.strategy_risk_state IS 'Per-user per-day risk state (pnl, trades, pause)';
COMMENT ON TABLE public.strategy_locks IS 'Distributed lock per strategy (backend service role)';
