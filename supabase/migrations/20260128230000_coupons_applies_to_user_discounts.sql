-- Coupons: align with onboarding + trading packages; add user-specific discounts

-- 1. Extend coupons: applies_to (onboarding / trading_packages / both), package_ids (which packages)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS applies_to TEXT NOT NULL DEFAULT 'both'
    CHECK (applies_to IN ('onboarding', 'trading_packages', 'both'));

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS package_ids TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.coupons.applies_to IS 'Where coupon applies: onboarding (joining fee), trading_packages, or both';
COMMENT ON COLUMN public.coupons.package_ids IS 'Package IDs (e.g. entry_100, pro_200, elite_500) when applies_to is trading_packages or both; NULL = all packages';

CREATE INDEX IF NOT EXISTS idx_coupons_applies_to ON public.coupons(applies_to);

-- 2. User-specific discounts (admin-assigned per user)
CREATE TABLE IF NOT EXISTS public.user_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('onboarding', 'trading_packages')),
  -- Onboarding: percent and/or fixed amount
  onboarding_discount_percent NUMERIC(5, 2) CHECK (onboarding_discount_percent IS NULL OR (onboarding_discount_percent >= 0 AND onboarding_discount_percent <= 100)),
  onboarding_discount_fixed_usd NUMERIC(10, 2) CHECK (onboarding_discount_fixed_usd IS NULL OR onboarding_discount_fixed_usd >= 0),
  -- Trading packages: which packages, how many at discount, percent off
  trading_discount_percent NUMERIC(5, 2) CHECK (trading_discount_percent IS NULL OR (trading_discount_percent >= 0 AND trading_discount_percent <= 100)),
  trading_package_ids TEXT[] DEFAULT NULL,
  trading_max_packages INT CHECK (trading_max_packages IS NULL OR trading_max_packages >= 1),
  trading_used_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_discounts_user_id ON public.user_discounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discounts_scope ON public.user_discounts(scope);
CREATE INDEX IF NOT EXISTS idx_user_discounts_status ON public.user_discounts(status);

ALTER TABLE public.user_discounts ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write user_discounts
DROP POLICY IF EXISTS "user_discounts_select" ON public.user_discounts;
CREATE POLICY "user_discounts_select" ON public.user_discounts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "user_discounts_insert" ON public.user_discounts;
CREATE POLICY "user_discounts_insert" ON public.user_discounts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "user_discounts_update" ON public.user_discounts;
CREATE POLICY "user_discounts_update" ON public.user_discounts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "user_discounts_delete" ON public.user_discounts;
CREATE POLICY "user_discounts_delete" ON public.user_discounts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);
