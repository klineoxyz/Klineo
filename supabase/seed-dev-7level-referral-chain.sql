-- KLINEO Dev-only: Build a 7-level referral chain from existing user_profiles.
-- Run AFTER migrations and after you have at least 8 users in user_profiles.
-- Usage: Supabase SQL Editor, or: psql $DATABASE_URL -f supabase/seed-dev-7level-referral-chain.sql
--
-- Chain: U0 refers U1, U1 refers U2, … U6 refers U7. Purchaser = U7; L1=U6, L2=U5, … L7=U0.

DO $$
DECLARE
  users uuid[];
  i int;
BEGIN
  SELECT ARRAY_AGG(id ORDER BY created_at, id) INTO users
  FROM (SELECT id, created_at FROM public.user_profiles ORDER BY created_at, id LIMIT 8) x;

  IF users IS NULL OR array_length(users, 1) < 8 THEN
    RAISE NOTICE 'Need at least 8 user_profiles. Create more users and re-run.';
    RETURN;
  END IF;

  -- referrals(referrer_id, referred_id): (users[1], users[2]), (users[2], users[3]), … (users[7], users[8])
  -- So purchaser = users[8], L1 = users[7], L2 = users[6], … L7 = users[1]
  FOR i IN 1..7 LOOP
    INSERT INTO public.referrals (referrer_id, referred_id, tier)
    VALUES (users[i], users[i+1], 1)
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE '7-level referral chain created: purchaser = 8th user, L1…L7 = 7th down to 1st.';
END $$;
