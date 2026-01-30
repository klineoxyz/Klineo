-- Unify runner with strategy_runs: add last_run_at, point tick_runs and locks at strategy_runs.
-- strategies table is kept but no longer used by runner.

-- 1) strategy_runs: add last_run_at for runner scheduling
ALTER TABLE public.strategy_runs
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_strategy_runs_last_run_at ON public.strategy_runs(last_run_at);

-- 2) strategy_tick_runs: reference strategy_runs instead of strategies
ALTER TABLE public.strategy_tick_runs
  DROP CONSTRAINT IF EXISTS strategy_tick_runs_strategy_id_fkey;

ALTER TABLE public.strategy_tick_runs
  ADD COLUMN IF NOT EXISTS strategy_run_id UUID REFERENCES public.strategy_runs(id) ON DELETE CASCADE;

-- Migrate any existing rows: no backfill (runner will use strategy_run_id only)
ALTER TABLE public.strategy_tick_runs
  DROP COLUMN IF EXISTS strategy_id;

CREATE INDEX IF NOT EXISTS idx_strategy_tick_runs_strategy_run_id ON public.strategy_tick_runs(strategy_run_id);

-- 3) strategy_locks: reference strategy_runs (drop and recreate; PK is strategy_id)
DROP TABLE IF EXISTS public.strategy_locks;

CREATE TABLE public.strategy_locks (
  strategy_run_id UUID PRIMARY KEY REFERENCES public.strategy_runs(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  lock_owner TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER strategy_locks_updated_at
  BEFORE UPDATE ON public.strategy_locks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.strategy_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strategy_locks_select" ON public.strategy_locks;
CREATE POLICY "strategy_locks_select" ON public.strategy_locks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "strategy_locks_all_admin" ON public.strategy_locks;
CREATE POLICY "strategy_locks_all_admin" ON public.strategy_locks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

COMMENT ON TABLE public.strategy_locks IS 'Distributed lock per strategy_run (backend service role)';
