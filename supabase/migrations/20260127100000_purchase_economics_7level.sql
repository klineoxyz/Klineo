-- KLINEO: Purchase-based referral economics (70% referral pool / 20% platform / 10% marketing)
-- Applies to: onboarding fee + package (credit) purchases. NOT tied to trading PnL.
-- 7-level upline: L1 30%, L2 20%, L3 10%, L4 8%, L5 6%, L6 4%, L7 2% (of the 70% pool).
-- Missing upline levels → reallocated to marketing pool. Idempotent per purchase.

-- 1) Eligible purchases (onboarding fee + package purchases)
CREATE TABLE IF NOT EXISTS public.eligible_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('onboarding_fee', 'package')),
  amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USDT',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eligible_purchases_user_id ON public.eligible_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_eligible_purchases_created_at ON public.eligible_purchases(created_at DESC);

ALTER TABLE public.eligible_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eligible_purchases_select" ON public.eligible_purchases;
CREATE POLICY "eligible_purchases_select" ON public.eligible_purchases FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "eligible_purchases_insert" ON public.eligible_purchases;
CREATE POLICY "eligible_purchases_insert" ON public.eligible_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2) Purchase referral earnings (per level per purchase; idempotent via unique)
CREATE TABLE IF NOT EXISTS public.purchase_referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.eligible_purchases(id) ON DELETE CASCADE,
  level SMALLINT NOT NULL CHECK (level >= 1 AND level <= 7),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(20, 4) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USDT',
  rate_pct NUMERIC(8, 4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (purchase_id, level)
);

CREATE INDEX IF NOT EXISTS idx_purchase_referral_earnings_purchase_id ON public.purchase_referral_earnings(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_referral_earnings_user_id ON public.purchase_referral_earnings(user_id);

ALTER TABLE public.purchase_referral_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_referral_earnings_select" ON public.purchase_referral_earnings;
CREATE POLICY "purchase_referral_earnings_select" ON public.purchase_referral_earnings FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.eligible_purchases p WHERE p.id = purchase_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert by backend only (service_role); no user-facing INSERT policy for earnings
DROP POLICY IF EXISTS "purchase_referral_earnings_insert" ON public.purchase_referral_earnings;
CREATE POLICY "purchase_referral_earnings_insert" ON public.purchase_referral_earnings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3) Purchase revenue splits (platform 20%, marketing 10% + reallocations)
CREATE TABLE IF NOT EXISTS public.purchase_revenue_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.eligible_purchases(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL CHECK (split_type IN ('platform', 'marketing')),
  amount NUMERIC(20, 4) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USDT',
  source_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (purchase_id, split_type)
);

CREATE INDEX IF NOT EXISTS idx_purchase_revenue_splits_purchase_id ON public.purchase_revenue_splits(purchase_id);

ALTER TABLE public.purchase_revenue_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_revenue_splits_select" ON public.purchase_revenue_splits;
CREATE POLICY "purchase_revenue_splits_select" ON public.purchase_revenue_splits FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.eligible_purchases p WHERE p.id = purchase_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "purchase_revenue_splits_insert" ON public.purchase_revenue_splits;
CREATE POLICY "purchase_revenue_splits_insert" ON public.purchase_revenue_splits FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4) Marketing pool ledger (audit of marketing allocations + missing upline reallocations)
CREATE TABLE IF NOT EXISTS public.marketing_pool_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.eligible_purchases(id) ON DELETE CASCADE,
  amount NUMERIC(20, 4) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USDT',
  source_type TEXT NOT NULL CHECK (source_type IN ('direct_10pct', 'missing_upline_reallocation')),
  level_if_applicable SMALLINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_pool_ledger_purchase_id ON public.marketing_pool_ledger(purchase_id);

ALTER TABLE public.marketing_pool_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_pool_ledger_select" ON public.marketing_pool_ledger;
CREATE POLICY "marketing_pool_ledger_select" ON public.marketing_pool_ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "marketing_pool_ledger_insert" ON public.marketing_pool_ledger;
CREATE POLICY "marketing_pool_ledger_insert" ON public.marketing_pool_ledger FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5) Allocation tracking: ensure we only run allocation once per purchase (idempotency)
CREATE TABLE IF NOT EXISTS public.purchase_allocation_runs (
  purchase_id UUID PRIMARY KEY REFERENCES public.eligible_purchases(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.purchase_allocation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_allocation_runs_select" ON public.purchase_allocation_runs;
CREATE POLICY "purchase_allocation_runs_select" ON public.purchase_allocation_runs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "purchase_allocation_runs_insert" ON public.purchase_allocation_runs;
CREATE POLICY "purchase_allocation_runs_insert" ON public.purchase_allocation_runs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
