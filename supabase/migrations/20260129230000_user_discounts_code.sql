-- Add system-generated coupon code to user_discounts (for claim link and manual entry)
ALTER TABLE public.user_discounts
  ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_discounts_code ON public.user_discounts(code) WHERE code IS NOT NULL;

COMMENT ON COLUMN public.user_discounts.code IS 'System-generated coupon code; used in claim URL and for manual entry at checkout.';
