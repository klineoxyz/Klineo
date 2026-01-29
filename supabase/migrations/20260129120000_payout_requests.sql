-- KLINEO: Payout request lifecycle (PENDING -> APPROVED -> PAID or REJECTED).
-- Available balance = sum(purchase_referral_earnings) - sum(payout_requests where status = PAID).
-- Min payout $50. One PENDING request per user at a time.

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(20, 4) NOT NULL CHECK (amount >= 50),
  currency TEXT NOT NULL DEFAULT 'USDT',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  payout_tx_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created_at ON public.payout_requests(created_at DESC);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_requests_select" ON public.payout_requests;
CREATE POLICY "payout_requests_select" ON public.payout_requests FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "payout_requests_insert" ON public.payout_requests;
CREATE POLICY "payout_requests_insert" ON public.payout_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payout_requests_update" ON public.payout_requests;
CREATE POLICY "payout_requests_update" ON public.payout_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.payout_requests IS
  'User referral payout requests. PENDING -> APPROVED -> PAID or REJECTED. Balance locked when PENDING.';
