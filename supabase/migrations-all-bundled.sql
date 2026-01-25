-- KLINEO: All migrations + seed (bundled)
-- Run in Supabase Dashboard → SQL Editor → New query → Paste → Run
--

-- === 20260125000000_initial_schema.sql ===
-- KLINEO Initial Database Schema
-- Migration: 20260125000000_initial_schema.sql
-- Run via: supabase db push
-- Or copy-paste into Supabase SQL Editor (use supabase-schema-fixed.sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- RLS Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Users can update their own profile
-- Role changes: only backend (service_role) can change roles
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Optional: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);


-- === 20260125100000_ui_fields_user_profiles.sql ===
-- KLINEO Migration: Add UI-collected fields to user_profiles
-- Run via: supabase db push
-- Or copy-paste supabase-migration-ui-fields.sql into Supabase SQL Editor

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS referral_wallet TEXT;

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

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username)
  WHERE username IS NOT NULL;


-- === 20260126100000_traders_and_performance.sql ===
-- KLINEO Phase 2: traders + trader_performance (time series)
-- Requires: user_profiles exist

CREATE TABLE IF NOT EXISTS public.traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  exchange TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traders_user_id ON public.traders(user_id);
CREATE INDEX IF NOT EXISTS idx_traders_status ON public.traders(status);
CREATE INDEX IF NOT EXISTS idx_traders_slug ON public.traders(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.trader_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID NOT NULL REFERENCES public.traders(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  pnl_pct NUMERIC(10, 4),
  volume NUMERIC(20, 8),
  drawdown_pct NUMERIC(10, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trader_performance_trader_id ON public.trader_performance(trader_id);
CREATE INDEX IF NOT EXISTS idx_trader_performance_period ON public.trader_performance(period_start, period_end);

ALTER TABLE public.traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trader_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traders_select_public" ON public.traders;
CREATE POLICY "traders_select_public"
  ON public.traders FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "traders_insert_own" ON public.traders;
CREATE POLICY "traders_insert_own"
  ON public.traders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "traders_update_own_or_admin" ON public.traders;
CREATE POLICY "traders_update_own_or_admin"
  ON public.traders FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);

DROP POLICY IF EXISTS "trader_performance_select" ON public.trader_performance;
CREATE POLICY "trader_performance_select"
  ON public.trader_performance FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.traders t WHERE t.id = trader_id AND t.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.traders t WHERE t.id = trader_id AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "trader_performance_insert" ON public.trader_performance;
CREATE POLICY "trader_performance_insert"
  ON public.trader_performance FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.traders WHERE id = trader_id AND user_id = auth.uid()));


-- === 20260126110000_user_connections_risk_copy.sql ===
-- KLINEO Phase 2: user_exchange_connections, user_risk_settings, copy_setups
-- user_exchange_connections: NO raw secrets; encrypted blobs or references only.

CREATE TABLE IF NOT EXISTS public.user_exchange_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  label TEXT,
  encrypted_config BYTEA,
  secret_ref TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, exchange)
);

CREATE TABLE IF NOT EXISTS public.user_risk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
  max_position_pct NUMERIC(5, 2),
  max_drawdown_pct NUMERIC(5, 2),
  max_daily_loss_pct NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.copy_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  trader_id UUID NOT NULL REFERENCES public.traders(id) ON DELETE CASCADE,
  allocation_pct NUMERIC(5, 2) NOT NULL DEFAULT 100,
  max_position_pct NUMERIC(5, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_exchange_connections_user_id ON public.user_exchange_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_risk_settings_user_id ON public.user_risk_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_setups_user_id ON public.copy_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_setups_trader_id ON public.copy_setups(trader_id);

ALTER TABLE public.user_exchange_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_setups ENABLE ROW LEVEL SECURITY;

-- user_exchange_connections: own rows only
DROP POLICY IF EXISTS "user_exchange_connections_select" ON public.user_exchange_connections;
CREATE POLICY "user_exchange_connections_select" ON public.user_exchange_connections FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_exchange_connections_insert" ON public.user_exchange_connections;
CREATE POLICY "user_exchange_connections_insert" ON public.user_exchange_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_exchange_connections_update" ON public.user_exchange_connections;
CREATE POLICY "user_exchange_connections_update" ON public.user_exchange_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_exchange_connections_delete" ON public.user_exchange_connections;
CREATE POLICY "user_exchange_connections_delete" ON public.user_exchange_connections FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_read_user_exchange_connections" ON public.user_exchange_connections;
CREATE POLICY "admins_read_user_exchange_connections" ON public.user_exchange_connections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- user_risk_settings: own rows only
DROP POLICY IF EXISTS "user_risk_settings_select" ON public.user_risk_settings;
CREATE POLICY "user_risk_settings_select" ON public.user_risk_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_risk_settings_insert" ON public.user_risk_settings;
CREATE POLICY "user_risk_settings_insert" ON public.user_risk_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_risk_settings_update" ON public.user_risk_settings;
CREATE POLICY "user_risk_settings_update" ON public.user_risk_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins_read_user_risk_settings" ON public.user_risk_settings;
CREATE POLICY "admins_read_user_risk_settings" ON public.user_risk_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- copy_setups: own rows only
DROP POLICY IF EXISTS "copy_setups_select" ON public.copy_setups;
CREATE POLICY "copy_setups_select" ON public.copy_setups FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "copy_setups_insert" ON public.copy_setups;
CREATE POLICY "copy_setups_insert" ON public.copy_setups FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "copy_setups_update" ON public.copy_setups;
CREATE POLICY "copy_setups_update" ON public.copy_setups FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "copy_setups_delete" ON public.copy_setups;
CREATE POLICY "copy_setups_delete" ON public.copy_setups FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins_read_copy_setups" ON public.copy_setups;
CREATE POLICY "admins_read_copy_setups" ON public.copy_setups FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));


-- === 20260126120000_positions_orders_trades.sql ===
-- KLINEO Phase 2: positions, orders, trades

CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  copy_setup_id UUID REFERENCES public.copy_setups(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  size NUMERIC(20, 8) NOT NULL,
  entry_price NUMERIC(20, 8) NOT NULL,
  current_price NUMERIC(20, 8),
  unrealized_pnl NUMERIC(20, 8),
  exchange_order_id TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit')),
  amount NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'failed')),
  exchange_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  amount NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  fee NUMERIC(20, 8) DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(20, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  fee_type TEXT NOT NULL CHECK (fee_type IN ('subscription', 'copy_fee', 'platform_fee', 'other')),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_copy_setup_id ON public.positions(copy_setup_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_user_id ON public.fee_ledger(user_id);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_ledger ENABLE ROW LEVEL SECURITY;

-- positions: own + admin read
DROP POLICY IF EXISTS "positions_select" ON public.positions;
CREATE POLICY "positions_select" ON public.positions FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "positions_insert" ON public.positions;
CREATE POLICY "positions_insert" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "positions_update" ON public.positions;
CREATE POLICY "positions_update" ON public.positions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "positions_delete" ON public.positions;
CREATE POLICY "positions_delete" ON public.positions FOR DELETE USING (auth.uid() = user_id);

-- orders: own + admin read
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- trades: own + admin read
DROP POLICY IF EXISTS "trades_select" ON public.trades;
CREATE POLICY "trades_select" ON public.trades FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "trades_insert" ON public.trades;
CREATE POLICY "trades_insert" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);

-- fee_ledger: own + admin read
DROP POLICY IF EXISTS "fee_ledger_select" ON public.fee_ledger;
CREATE POLICY "fee_ledger_select" ON public.fee_ledger FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "fee_ledger_insert" ON public.fee_ledger;
CREATE POLICY "fee_ledger_insert" ON public.fee_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);


-- === 20260126130000_referrals_referral_earnings.sql ===
-- KLINEO Phase 2: referrals (two-tier), referral_earnings (10% tier1, 5% tier2)

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
  tier SMALLINT NOT NULL CHECK (tier IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  fee_ledger_id UUID REFERENCES public.fee_ledger(id) ON DELETE SET NULL,
  amount NUMERIC(20, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  tier SMALLINT NOT NULL CHECK (tier IN (1, 2)),
  rate_pct NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_id ON public.referral_earnings(referral_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "referrals_insert" ON public.referrals;
CREATE POLICY "referrals_insert" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "referral_earnings_select" ON public.referral_earnings;
CREATE POLICY "referral_earnings_select" ON public.referral_earnings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.referrals r WHERE r.id = referral_id AND (r.referrer_id = auth.uid() OR r.referred_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
DROP POLICY IF EXISTS "referral_earnings_insert" ON public.referral_earnings;
CREATE POLICY "referral_earnings_insert" ON public.referral_earnings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.referrals r WHERE r.id = referral_id AND r.referrer_id = auth.uid()));


-- === 20260126140000_subscription_plans_subscriptions_payments.sql ===
-- KLINEO Phase 2: subscription_plans, subscriptions, payments

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  provider TEXT,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- subscription_plans: public read; admin write
DROP POLICY IF EXISTS "subscription_plans_select" ON public.subscription_plans;
CREATE POLICY "subscription_plans_select" ON public.subscription_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "subscription_plans_admin_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_all" ON public.subscription_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- subscriptions: own + admin read
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_insert" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- payments: own + admin read
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);


-- === 20260126150000_notifications_contact_newsletter_master.sql ===
-- KLINEO Phase 2: notifications, contact_submissions, newsletter_subscribers, master_trader_applications

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_trader_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_master_trader_applications_user_id ON public.master_trader_applications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_trader_applications ENABLE ROW LEVEL SECURITY;

-- notifications: own + admin read
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- contact_submissions: anyone insert; admin read
DROP POLICY IF EXISTS "contact_submissions_insert" ON public.contact_submissions;
CREATE POLICY "contact_submissions_insert" ON public.contact_submissions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "contact_submissions_select_admin" ON public.contact_submissions;
CREATE POLICY "contact_submissions_select_admin" ON public.contact_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- newsletter_subscribers: anyone insert; admin read
DROP POLICY IF EXISTS "newsletter_subscribers_insert" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_insert" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "newsletter_subscribers_select_admin" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_select_admin" ON public.newsletter_subscribers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- master_trader_applications: own + admin
DROP POLICY IF EXISTS "master_trader_applications_select" ON public.master_trader_applications;
CREATE POLICY "master_trader_applications_select" ON public.master_trader_applications FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "master_trader_applications_insert" ON public.master_trader_applications;
CREATE POLICY "master_trader_applications_insert" ON public.master_trader_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "master_trader_applications_update" ON public.master_trader_applications;
CREATE POLICY "master_trader_applications_update" ON public.master_trader_applications FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);


-- === seed.sql ===
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
