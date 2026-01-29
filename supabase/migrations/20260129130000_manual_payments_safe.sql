-- KLINEO: Manual USDT (BEP20) payments to Safe. Ticketing + admin approval.
-- Treasury Safe (BSC): 0x0E60e94252F58aBb56604A8260492d96cf879007

-- 1) user_profiles: payment wallet (BSC) for manual payments; member/package state for approve flow
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payment_wallet_bsc TEXT,
  ADD COLUMN IF NOT EXISTS member_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_package_code TEXT,
  ADD COLUMN IF NOT EXISTS package_started_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.payment_wallet_bsc IS 'BSC (BEP20) wallet address for manual USDT payments to Safe';
COMMENT ON COLUMN public.user_profiles.member_active IS 'Set true when joining_fee payment intent is approved';
COMMENT ON COLUMN public.user_profiles.active_package_code IS 'Set when package payment intent is approved (e.g. ENTRY_100)';
COMMENT ON COLUMN public.user_profiles.package_started_at IS 'Set when package payment intent is approved';

-- 2) payment_intents
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('joining_fee', 'package')),
  package_code TEXT,
  amount_usdt NUMERIC(20, 4) NOT NULL CHECK (amount_usdt > 0),
  chain TEXT NOT NULL DEFAULT 'bsc' CHECK (chain = 'bsc'),
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging')),
  treasury_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'flagged', 'approved', 'rejected')),
  tx_hash TEXT UNIQUE,
  declared_from_wallet TEXT,
  mismatch_reason TEXT,
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON public.payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON public.payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_tx_hash ON public.payment_intents(tx_hash) WHERE tx_hash IS NOT NULL;

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_intents_select" ON public.payment_intents;
CREATE POLICY "payment_intents_select" ON public.payment_intents FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "payment_intents_insert" ON public.payment_intents;
CREATE POLICY "payment_intents_insert" ON public.payment_intents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payment_intents_update" ON public.payment_intents;
CREATE POLICY "payment_intents_update" ON public.payment_intents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3) payment_events (append-only)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_intent_id ON public.payment_events(intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON public.payment_events(created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_events_select" ON public.payment_events;
CREATE POLICY "payment_events_select" ON public.payment_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.payment_intents pi WHERE pi.id = intent_id AND pi.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "payment_events_insert" ON public.payment_events;
CREATE POLICY "payment_events_insert" ON public.payment_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.payment_intents pi WHERE pi.id = intent_id AND pi.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE public.payment_intents IS 'Manual USDT (BEP20) payment intents to Safe; admin verifies via Safe/BscScan';
COMMENT ON TABLE public.payment_events IS 'Append-only events for payment intents (created, submitted, approved, rejected)';
