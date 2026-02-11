-- Marketplace strategies: backtest strategies that approved Master Traders can list for copy trading.
-- Only users with an approved trader row can create/list strategies.

CREATE TABLE IF NOT EXISTS public.marketplace_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID NOT NULL REFERENCES public.traders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL DEFAULT '1h',
  config JSONB NOT NULL DEFAULT '{}',
  backtest_summary JSONB,
  status TEXT NOT NULL DEFAULT 'listed' CHECK (status IN ('draft', 'listed', 'unlisted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_strategies_trader_id ON public.marketplace_strategies(trader_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_strategies_status ON public.marketplace_strategies(status);

ALTER TABLE public.marketplace_strategies ENABLE ROW LEVEL SECURITY;

-- Public can select listed strategies (for Marketplace browse)
DROP POLICY IF EXISTS "marketplace_strategies_select_listed" ON public.marketplace_strategies;
CREATE POLICY "marketplace_strategies_select_listed"
  ON public.marketplace_strategies FOR SELECT
  USING (
    status = 'listed'
    OR EXISTS (SELECT 1 FROM public.traders t WHERE t.id = trader_id AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only the trader (owner) can insert their own strategies
DROP POLICY IF EXISTS "marketplace_strategies_insert_own" ON public.marketplace_strategies;
CREATE POLICY "marketplace_strategies_insert_own"
  ON public.marketplace_strategies FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.traders WHERE id = trader_id AND user_id = auth.uid() AND status = 'approved'));

-- Only the trader (owner) or admin can update/delete
DROP POLICY IF EXISTS "marketplace_strategies_update_own" ON public.marketplace_strategies;
CREATE POLICY "marketplace_strategies_update_own"
  ON public.marketplace_strategies FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.traders WHERE id = trader_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);

DROP POLICY IF EXISTS "marketplace_strategies_delete_own" ON public.marketplace_strategies;
CREATE POLICY "marketplace_strategies_delete_own"
  ON public.marketplace_strategies FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.traders WHERE id = trader_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
