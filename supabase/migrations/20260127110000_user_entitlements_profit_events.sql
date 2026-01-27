-- KLINEO: Credit-based allowance enforcement
-- user_entitlements: joining fee + package allowance state per user
-- profit_events: audit trail for allowance consumption
-- payments: extend with kind + package_id for joining_fee/package

-- 1. user_entitlements
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  joining_fee_paid BOOLEAN NOT NULL DEFAULT false,
  joining_fee_paid_at TIMESTAMPTZ,
  active_package_id TEXT,
  package_price_usd NUMERIC(12, 2),
  multiplier NUMERIC(6, 2),
  profit_allowance_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  profit_used_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'exhausted')),
  activated_at TIMESTAMPTZ,
  exhausted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_status ON public.user_entitlements(status);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own row only
DROP POLICY IF EXISTS "user_entitlements_select_own" ON public.user_entitlements;
CREATE POLICY "user_entitlements_select_own" ON public.user_entitlements FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- No INSERT/UPDATE/DELETE for users (backend service role only)
-- Service role bypasses RLS, so no policy needed for backend writes.

-- 2. profit_events
CREATE TABLE IF NOT EXISTS public.profit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('manual', 'copy', 'trading', 'admin_adjustment')),
  amount_usd NUMERIC(12, 2) NOT NULL CHECK (amount_usd >= 0),
  ref_type TEXT,
  ref_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profit_events_user_id ON public.profit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_events_created_at ON public.profit_events(created_at DESC);

ALTER TABLE public.profit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profit_events_select_own" ON public.profit_events;
CREATE POLICY "profit_events_select_own" ON public.profit_events FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. payments: add kind + package_id if missing
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS kind TEXT CHECK (kind IN ('joining_fee', 'package', 'subscription'));
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS package_id TEXT;

-- Backfill existing rows so constraint can be added safely (Postgres allows null in check)
COMMENT ON COLUMN public.payments.kind IS 'joining_fee | package | subscription (legacy)';
COMMENT ON COLUMN public.payments.package_id IS 'entry_100 | pro_200 | elite_500 when kind=package';
