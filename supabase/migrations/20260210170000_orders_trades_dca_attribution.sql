-- Orders and Trades: DCA bot attribution (source badge, filter by Copy vs DCA).

-- orders: add source and dca_bot_id
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dca_bot_id UUID REFERENCES public.dca_bots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'copy' CHECK (source IN ('copy', 'dca'));

CREATE INDEX IF NOT EXISTS idx_orders_dca_bot_id ON public.orders(dca_bot_id) WHERE dca_bot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);

-- trades: add source and dca_bot_id
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS dca_bot_id UUID REFERENCES public.dca_bots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'copy' CHECK (source IN ('copy', 'dca'));

CREATE INDEX IF NOT EXISTS idx_trades_dca_bot_id ON public.trades(dca_bot_id) WHERE dca_bot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_source ON public.trades(source);

COMMENT ON COLUMN public.orders.source IS 'copy = copy trading, dca = DCA bot';
COMMENT ON COLUMN public.orders.dca_bot_id IS 'Set when source=dca';
COMMENT ON COLUMN public.trades.source IS 'copy = copy trading, dca = DCA bot';
COMMENT ON COLUMN public.trades.dca_bot_id IS 'Set when source=dca';
