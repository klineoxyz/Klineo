-- KLINEO: Prevent self-referral. No user (including admin) may have referred_by_user_id = their own id.
-- Fix any existing invalid data, then add a CHECK constraint.

-- 1) Clear any self-referral (e.g. from seed or bug)
UPDATE public.user_profiles
SET referred_by_user_id = NULL, updated_at = NOW()
WHERE referred_by_user_id IS NOT NULL AND referred_by_user_id = id;

-- 2) Enforce at DB level so no one can set self-referral via API or direct SQL
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS chk_user_profiles_no_self_referral;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_user_profiles_no_self_referral
  CHECK (referred_by_user_id IS NULL OR referred_by_user_id <> id);

COMMENT ON CONSTRAINT chk_user_profiles_no_self_referral ON public.user_profiles
  IS 'Prevents self-referral: referred_by_user_id must be null or a different user id.';
