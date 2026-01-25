-- KLINEO Phase 2: traders + trader_performance (time series)
-- Requires: user_profiles exist

CREATE TABLE IF NOT EXISTS public.traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  exchange TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traders_user_id ON public.traders(user_id);
CREATE INDEX IF NOT EXISTS idx_traders_status ON public.traders(status);
CREATE INDEX IF NOT EXISTS idx_traders_slug ON public.traders(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.trader_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID NOT NULL REFERENCES public.traders(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  pnl_pct NUMERIC(10, 4),
  volume NUMERIC(20, 8),
  drawdown_pct NUMERIC(10, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trader_performance_trader_id ON public.trader_performance(trader_id);
CREATE INDEX IF NOT EXISTS idx_trader_performance_period ON public.trader_performance(period_start, period_end);

ALTER TABLE public.traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trader_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traders_select_public" ON public.traders;
CREATE POLICY "traders_select_public"
  ON public.traders FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "traders_insert_own" ON public.traders;
CREATE POLICY "traders_insert_own"
  ON public.traders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "traders_update_own_or_admin" ON public.traders;
CREATE POLICY "traders_update_own_or_admin"
  ON public.traders FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);

DROP POLICY IF EXISTS "trader_performance_select" ON public.trader_performance;
CREATE POLICY "trader_performance_select"
  ON public.trader_performance FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.traders t WHERE t.id = trader_id AND t.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.traders t WHERE t.id = trader_id AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "trader_performance_insert" ON public.trader_performance;
CREATE POLICY "trader_performance_insert"
  ON public.trader_performance FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.traders WHERE id = trader_id AND user_id = auth.uid()));
