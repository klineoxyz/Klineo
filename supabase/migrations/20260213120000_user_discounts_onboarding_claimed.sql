-- Track when a user-specific onboarding discount was claimed (joining fee paid with this code)
ALTER TABLE public.user_discounts
  ADD COLUMN IF NOT EXISTS onboarding_claimed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.user_discounts.onboarding_claimed_at IS 'Set when user pays joining fee with this discount (admin confirms payment intent).';
