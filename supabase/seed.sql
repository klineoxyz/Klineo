-- KLINEO Phase 2 — Dev seed: traders + performance (sample data only)
-- Run AFTER migrations. Requires at least one user in auth.users + user_profiles.
-- Use Supabase SQL Editor or: psql $SUPABASE_DB_URL -f supabase/seed.sql

DO $$
DECLARE
  dev_user_id UUID;
  t1_id UUID;
  t2_id UUID;
BEGIN
  SELECT id INTO dev_user_id FROM public.user_profiles LIMIT 1;
  IF dev_user_id IS NULL THEN
    RAISE NOTICE 'No user_profiles. Sign up via app first, then re-run seed.';
    RETURN;
  END IF;

  INSERT INTO public.traders (user_id, display_name, slug, status)
  VALUES (dev_user_id, 'AlphaTrader', 'alpha-trader', 'approved')
  ON CONFLICT (slug) DO NOTHING;
  INSERT INTO public.traders (user_id, display_name, slug, status)
  VALUES (dev_user_id, 'CryptoMax', 'crypto-max', 'approved')
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO t1_id FROM public.traders WHERE slug = 'alpha-trader' LIMIT 1;
  SELECT id INTO t2_id FROM public.traders WHERE slug = 'crypto-max' LIMIT 1;

  IF t1_id IS NOT NULL THEN
    INSERT INTO public.trader_performance (trader_id, period_start, period_end, pnl, pnl_pct, volume)
    VALUES
      (t1_id, NOW() - INTERVAL '7 days', NOW(), 1250.50, 5.2, 25000),
      (t1_id, NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days', 800.00, 3.1, 18000);
  END IF;
  IF t2_id IS NOT NULL THEN
    INSERT INTO public.trader_performance (trader_id, period_start, period_end, pnl, pnl_pct, volume)
    VALUES (t2_id, NOW() - INTERVAL '7 days', NOW(), -200.00, -1.1, 12000);
  END IF;

  INSERT INTO public.subscription_plans (name, slug, price, currency, interval)
  VALUES ('Pro', 'pro', 29.99, 'USDT', 'month'), ('Premium', 'premium', 99.99, 'USDT', 'month')
  ON CONFLICT (slug) DO NOTHING;

  RAISE NOTICE 'Seed complete: traders + performance + subscription_plans.';
END $$;
