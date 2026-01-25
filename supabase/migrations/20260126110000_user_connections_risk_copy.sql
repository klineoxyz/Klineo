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
