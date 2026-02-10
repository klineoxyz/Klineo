-- DCA Bots: execution tracking columns and state/orders tables for Spot Grid engine.

-- 1) Add execution tracking columns to dca_bots
ALTER TABLE public.dca_bots
  ADD COLUMN IF NOT EXISTS last_tick_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_tick_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_tick_status TEXT,
  ADD COLUMN IF NOT EXISTS last_tick_error TEXT,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.dca_bots.last_tick_at IS 'Last time engine processed this bot';
COMMENT ON COLUMN public.dca_bots.next_tick_at IS 'When engine should process next (null = asap)';
COMMENT ON COLUMN public.dca_bots.last_tick_status IS 'ok | skipped | error | blocked';
COMMENT ON COLUMN public.dca_bots.last_tick_error IS 'Error message if last tick failed';
COMMENT ON COLUMN public.dca_bots.is_locked IS 'Engine lock to prevent concurrent ticks';
COMMENT ON COLUMN public.dca_bots.lock_expires_at IS 'Lock expiry (release if past)';

-- 2) DCA bot state (deterministic execution)
CREATE TABLE IF NOT EXISTS public.dca_bot_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dca_bot_id UUID NOT NULL REFERENCES public.dca_bots(id) ON DELETE CASCADE,
  grid_level INT NOT NULL DEFAULT 0,
  safety_orders_filled INT NOT NULL DEFAULT 0,
  avg_entry_price NUMERIC(20, 8),
  position_size NUMERIC(20, 8),
  last_entry_order_id TEXT,
  last_tp_order_id TEXT,
  realized_pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dca_bot_id)
);

CREATE INDEX IF NOT EXISTS idx_dca_bot_state_bot_id ON public.dca_bot_state(dca_bot_id);

COMMENT ON TABLE public.dca_bot_state IS 'Per-bot execution state: grid level, fills, avg entry, position, PnL';

-- 3) DCA bot order mapping (audit + reconciliation)
CREATE TABLE IF NOT EXISTS public.dca_bot_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dca_bot_id UUID NOT NULL REFERENCES public.dca_bots(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  pair TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL CHECK (type IN ('limit', 'market')),
  price NUMERIC(20, 8),
  qty NUMERIC(20, 8) NOT NULL,
  exchange_order_id TEXT,
  client_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dca_bot_orders_bot_id ON public.dca_bot_orders(dca_bot_id);
CREATE INDEX IF NOT EXISTS idx_dca_bot_orders_exchange_id ON public.dca_bot_orders(exchange_order_id) WHERE exchange_order_id IS NOT NULL;

COMMENT ON TABLE public.dca_bot_orders IS 'Orders placed by DCA engine; link to exchange order id for reconciliation';

-- RLS: user can read only their bots and related state/orders (via dca_bots.user_id)
ALTER TABLE public.dca_bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dca_bot_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dca_bot_state_select_own" ON public.dca_bot_state;
CREATE POLICY "dca_bot_state_select_own" ON public.dca_bot_state FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.dca_bots b WHERE b.id = dca_bot_state.dca_bot_id AND b.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "dca_bot_state_all_service" ON public.dca_bot_state;
CREATE POLICY "dca_bot_state_all_service" ON public.dca_bot_state FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "dca_bot_orders_select_own" ON public.dca_bot_orders;
CREATE POLICY "dca_bot_orders_select_own" ON public.dca_bot_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.dca_bots b WHERE b.id = dca_bot_orders.dca_bot_id AND b.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "dca_bot_orders_all_service" ON public.dca_bot_orders;
CREATE POLICY "dca_bot_orders_all_service" ON public.dca_bot_orders FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Backend uses service_role key, so RLS for inserts/updates: service_role can do everything.
-- For anon/key from frontend we only allow SELECT on own rows via the EXISTS policies above.
-- If your backend uses service_role, it bypasses RLS by default in Supabase; if it uses a user JWT, the SELECT own policies apply.
