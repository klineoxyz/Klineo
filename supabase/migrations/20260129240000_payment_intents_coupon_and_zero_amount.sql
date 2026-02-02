-- Payment intents: coupon columns + allow amount_usdt = 0 (100% discount)
-- When amount is 0, TX hash is not required; user can request approval without payment.

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2);

COMMENT ON COLUMN public.payment_intents.coupon_code IS 'Coupon or user-discount code applied at creation';
COMMENT ON COLUMN public.payment_intents.discount_percent IS 'Discount % applied at creation (0–100); when 100%, tx_hash is optional';

-- Allow amount_usdt = 0 for 100% discount
ALTER TABLE public.payment_intents DROP CONSTRAINT IF EXISTS payment_intents_amount_usdt_check;
ALTER TABLE public.payment_intents ADD CONSTRAINT payment_intents_amount_usdt_check CHECK (amount_usdt >= 0);
