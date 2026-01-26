-- KLINEO Phase 3: coupons, user status, referral status, audit logs

-- 1. Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC(5, 2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  max_redemptions INTEGER DEFAULT NULL,
  current_redemptions INTEGER DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  description TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons(status);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Coupons: public read active; admin write
DROP POLICY IF EXISTS "coupons_select" ON public.coupons;
CREATE POLICY "coupons_select" ON public.coupons FOR SELECT USING (status = 'active' OR EXISTS (
  SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
));

DROP POLICY IF EXISTS "coupons_insert" ON public.coupons;
CREATE POLICY "coupons_insert" ON public.coupons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "coupons_update" ON public.coupons;
CREATE POLICY "coupons_update" ON public.coupons FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Add status field to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);

-- 3. Add status field to referral_earnings
ALTER TABLE public.referral_earnings 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed'));

CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON public.referral_earnings(status);

-- 4. Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs: admin read only
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Add trade_id to fee_ledger for linking
ALTER TABLE public.fee_ledger 
ADD COLUMN IF NOT EXISTS trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fee_ledger_trade_id ON public.fee_ledger(trade_id);

-- 6. Add trader_id to fee_ledger for linking
ALTER TABLE public.fee_ledger 
ADD COLUMN IF NOT EXISTS trader_id UUID REFERENCES public.traders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fee_ledger_trader_id ON public.fee_ledger(trader_id);
