-- Futures auto-trading: extend user_exchange_connections with futures settings and safety.
-- Spot trading unchanged; futures is opt-in per connection.

ALTER TABLE public.user_exchange_connections
  ADD COLUMN IF NOT EXISTS supports_futures BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS futures_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS futures_tested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS futures_test_status TEXT CHECK (futures_test_status IN ('ok', 'fail')),
  ADD COLUMN IF NOT EXISTS futures_last_error TEXT,
  ADD COLUMN IF NOT EXISTS default_leverage INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_leverage_allowed INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS margin_mode TEXT DEFAULT 'isolated' CHECK (margin_mode IN ('isolated', 'cross')),
  ADD COLUMN IF NOT EXISTS position_mode TEXT DEFAULT 'one_way' CHECK (position_mode IN ('one_way', 'hedge')),
  ADD COLUMN IF NOT EXISTS max_notional_usdt NUMERIC DEFAULT 200,
  ADD COLUMN IF NOT EXISTS kill_switch BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.user_exchange_connections.supports_futures IS 'Exchange supports futures (binance/bybit true)';
COMMENT ON COLUMN public.user_exchange_connections.futures_enabled IS 'User enabled futures for this connection';
COMMENT ON COLUMN public.user_exchange_connections.futures_tested_at IS 'Last futures API test timestamp';
COMMENT ON COLUMN public.user_exchange_connections.futures_test_status IS 'ok or fail from last futures test';
COMMENT ON COLUMN public.user_exchange_connections.futures_last_error IS 'Sanitized error from last futures test';
COMMENT ON COLUMN public.user_exchange_connections.default_leverage IS 'Default leverage for new positions';
COMMENT ON COLUMN public.user_exchange_connections.max_leverage_allowed IS 'User cap on leverage';
COMMENT ON COLUMN public.user_exchange_connections.margin_mode IS 'isolated or cross';
COMMENT ON COLUMN public.user_exchange_connections.position_mode IS 'one_way or hedge';
COMMENT ON COLUMN public.user_exchange_connections.max_notional_usdt IS 'Max position size in USDT for risk guard';
COMMENT ON COLUMN public.user_exchange_connections.kill_switch IS 'When true, no futures orders are placed';

UPDATE public.user_exchange_connections
SET supports_futures = true
WHERE exchange IN ('binance', 'bybit');
