-- KLINEO: Admin can mark referral payouts as paid and record transaction (e.g. tx hash).
-- Adds payout_status, paid_at, transaction_id to purchase_referral_earnings.

ALTER TABLE public.purchase_referral_earnings
  ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_purchase_referral_earnings_payout_status
  ON public.purchase_referral_earnings(payout_status);

-- Admin only: allow UPDATE for marking paid / setting transaction_id
DROP POLICY IF EXISTS "purchase_referral_earnings_update" ON public.purchase_referral_earnings;
CREATE POLICY "purchase_referral_earnings_update" ON public.purchase_referral_earnings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
