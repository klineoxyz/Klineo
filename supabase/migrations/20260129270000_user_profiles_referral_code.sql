-- KLINEO: Real user-specific referral codes and attribution.
-- referral_code: unique, indexed, format KLINEO-XXXXXXXX (8 alphanumeric)
-- referred_by_user_id: set when user claims a referral link (idempotent, no overwrite)

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_referral_code
  ON public.user_profiles(referral_code) WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by
  ON public.user_profiles(referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;

COMMENT ON COLUMN public.user_profiles.referral_code IS 'Unique referral code (KLINEO-XXXXXXXX). Generated on first access.';
COMMENT ON COLUMN public.user_profiles.referred_by_user_id IS 'User who referred this user (set once via claim, never overwritten).';
