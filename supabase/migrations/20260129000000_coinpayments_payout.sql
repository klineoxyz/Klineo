-- CoinPayments checkout + IPN: store txn id on purchases, payout wallet on users.
-- Reward allocation (70/20/10, 7-level) and existing tables unchanged.

-- 1) eligible_purchases: add CoinPayments txn id and allow 'cancelled'
ALTER TABLE public.eligible_purchases
  ADD COLUMN IF NOT EXISTS coinpayments_txn_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_eligible_purchases_coinpayments_txn_id
  ON public.eligible_purchases(coinpayments_txn_id)
  WHERE coinpayments_txn_id IS NOT NULL;

-- Allow status 'cancelled' (CoinPayments failed/cancelled)
ALTER TABLE public.eligible_purchases
  DROP CONSTRAINT IF EXISTS eligible_purchases_status_check;

ALTER TABLE public.eligible_purchases
  ADD CONSTRAINT eligible_purchases_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled'));

-- 2) user_profiles: payout wallet for BSC USDT (referral payouts)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payout_wallet_address TEXT;

COMMENT ON COLUMN public.user_profiles.payout_wallet_address IS 'BSC (Binance Smart Chain) USDT wallet address for referral payout; min payout $50 USDT';
