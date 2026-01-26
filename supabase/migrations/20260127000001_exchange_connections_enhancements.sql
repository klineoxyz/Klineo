-- Add missing columns to user_exchange_connections for Binance integration
-- environment: production or testnet
-- last_tested_at: timestamp of last connection test
-- last_test_status: ok or fail
-- last_error_message: sanitized error message from last test

ALTER TABLE public.user_exchange_connections
  ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production' CHECK (environment IN ('production', 'testnet')),
  ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_status TEXT CHECK (last_test_status IN ('ok', 'fail')),
  ADD COLUMN IF NOT EXISTS last_error_message TEXT;

-- Update existing rows to have default environment
UPDATE public.user_exchange_connections
SET environment = 'production'
WHERE environment IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.user_exchange_connections.environment IS 'Exchange environment: production or testnet';
COMMENT ON COLUMN public.user_exchange_connections.last_tested_at IS 'Timestamp of last connection test';
COMMENT ON COLUMN public.user_exchange_connections.last_test_status IS 'Status of last test: ok or fail';
COMMENT ON COLUMN public.user_exchange_connections.last_error_message IS 'Sanitized error message from last failed test';
