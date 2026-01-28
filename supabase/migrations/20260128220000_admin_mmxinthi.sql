-- KLINEO: Set mmxinthi@gmail.com as admin (for Smoke Test and Admin panel in production).
-- Run in Supabase SQL Editor or via migration. User must already exist (signed up) in user_profiles.

UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'mmxinthi@gmail.com';
