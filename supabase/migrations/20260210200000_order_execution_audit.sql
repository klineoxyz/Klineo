-- order_execution_audit: production-grade traceability for ALL order execution paths.
-- Every order attempt (DCA, Grid, Copy, Terminal) flows through the central execution layer and is logged here.
-- Enables: "My trade didn't execute" → open this table, see exact reason in seconds.

CREATE TABLE IF NOT EXISTS public.order_execution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('DCA', 'GRID', 'COPY', 'TERMINAL')),
  bot_id UUID REFERENCES public.dca_bots(id) ON DELETE SET NULL,
  copy_setup_id UUID REFERENCES public.copy_setups(id) ON DELETE SET NULL,
  exchange TEXT NOT NULL,
  market_type TEXT NOT NULL CHECK (market_type IN ('spot', 'futures')),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL,
  requested_qty NUMERIC,
  requested_quote NUMERIC,
  price NUMERIC,
  leverage INTEGER,
  min_notional NUMERIC,
  available_balance NUMERIC,
  required_balance NUMERIC,
  precheck_result JSONB,
  exchange_request_payload JSONB,
  exchange_response JSONB,
  exchange_order_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('PLACED', 'SKIPPED', 'FAILED')),
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_execution_audit_user_created
  ON public.order_execution_audit (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_execution_audit_source_created
  ON public.order_execution_audit (source, created_at DESC);

COMMENT ON TABLE public.order_execution_audit IS 'Audit log for every order attempt; no silent failures. Last 100 per user visible in UI.';

-- RLS: users see only their own rows
ALTER TABLE public.order_execution_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_execution_audit_select_own
  ON public.order_execution_audit FOR SELECT
  USING (auth.uid() = user_id);

-- Backend uses service_role (bypasses RLS) to insert. Users read only their own via this policy.
