-- KLINEO Migration: Add UI-collected fields to user_profiles
-- Run this in Supabase SQL Editor AFTER supabase-schema-fixed.sql
-- Adds: full_name, username, timezone, referral_wallet

-- 1. Add new columns
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS referral_wallet TEXT;

-- 2. Update trigger function to set full_name from signup metadata
-- Frontend must use: supabase.auth.signUp({ email, password, options: { data: { full_name: '...' } } })
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Trigger already exists from initial schema; no need to recreate)

-- 3. Optional: index for username lookups if you use it for display/login
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username)
  WHERE username IS NOT NULL;

-- 4. Optional: add unique constraint on username if you use it as unique handle
-- ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_username_unique UNIQUE (username);
-- (Uncomment when you enforce unique usernames)
