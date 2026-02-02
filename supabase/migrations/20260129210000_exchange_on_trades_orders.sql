-- KLINEO: Add exchange to orders and trades so admin can aggregate volume/value per exchange.
-- Nullable for existing rows; new inserts should set exchange when known (binance/bybit).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS exchange TEXT CHECK (exchange IS NULL OR exchange IN ('binance', 'bybit'));

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS exchange TEXT CHECK (exchange IS NULL OR exchange IN ('binance', 'bybit'));

CREATE INDEX IF NOT EXISTS idx_orders_exchange ON public.orders(exchange) WHERE exchange IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_exchange ON public.trades(exchange) WHERE exchange IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON public.trades(executed_at DESC);

COMMENT ON COLUMN public.orders.exchange IS 'Exchange where order was placed (binance/bybit); set when recording from strategy runner or exchange API';
COMMENT ON COLUMN public.trades.exchange IS 'Exchange where trade executed; set when recording from strategy runner or exchange API';
