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
