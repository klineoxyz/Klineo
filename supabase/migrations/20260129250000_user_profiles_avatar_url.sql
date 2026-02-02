-- Add profile image URL to user_profiles (Settings page)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.user_profiles.avatar_url IS 'Profile image URL set by user in Settings';
