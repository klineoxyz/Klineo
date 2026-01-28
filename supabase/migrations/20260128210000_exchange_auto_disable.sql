-- KLINEO: Auto-disable exchange connection after N consecutive failures.
-- Prevents hammering bad keys and surfaces "Re-enable" in UI.

ALTER TABLE public.user_exchange_connections
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_exchange_connections_disabled_at
  ON public.user_exchange_connections(disabled_at) WHERE disabled_at IS NULL;

COMMENT ON COLUMN public.user_exchange_connections.consecutive_failures IS 'Incremented on test/API failure; reset to 0 on success';
COMMENT ON COLUMN public.user_exchange_connections.disabled_at IS 'Set when consecutive_failures >= 5; connection excluded from balance/orders until re-enabled';
