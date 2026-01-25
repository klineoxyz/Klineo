-- KLINEO Phase 2: referrals (two-tier), referral_earnings (10% tier1, 5% tier2)

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
  tier SMALLINT NOT NULL CHECK (tier IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  fee_ledger_id UUID REFERENCES public.fee_ledger(id) ON DELETE SET NULL,
  amount NUMERIC(20, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  tier SMALLINT NOT NULL CHECK (tier IN (1, 2)),
  rate_pct NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_id ON public.referral_earnings(referral_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "referrals_insert" ON public.referrals;
CREATE POLICY "referrals_insert" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "referral_earnings_select" ON public.referral_earnings;
CREATE POLICY "referral_earnings_select" ON public.referral_earnings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.referrals r WHERE r.id = referral_id AND (r.referrer_id = auth.uid() OR r.referred_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
DROP POLICY IF EXISTS "referral_earnings_insert" ON public.referral_earnings;
CREATE POLICY "referral_earnings_insert" ON public.referral_earnings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.referrals r WHERE r.id = referral_id AND r.referrer_id = auth.uid()));
