-- DCA Bots: grid-style DCA ladder bots (Binance/KuCoin style) within KLINEO.
-- No execution logic; UI + draft records only.

CREATE TABLE IF NOT EXISTS public.dca_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  market TEXT NOT NULL DEFAULT 'spot' CHECK (market IN ('spot', 'futures')),
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1h',
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'paused', 'stopped')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dca_bots_user_id ON public.dca_bots(user_id);
CREATE INDEX IF NOT EXISTS idx_dca_bots_status ON public.dca_bots(status);

ALTER TABLE public.dca_bots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dca_bots_select_own" ON public.dca_bots;
CREATE POLICY "dca_bots_select_own" ON public.dca_bots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dca_bots_insert_own" ON public.dca_bots;
CREATE POLICY "dca_bots_insert_own" ON public.dca_bots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dca_bots_update_own" ON public.dca_bots;
CREATE POLICY "dca_bots_update_own" ON public.dca_bots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dca_bots_delete_own" ON public.dca_bots;
CREATE POLICY "dca_bots_delete_own" ON public.dca_bots FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can read all (optional, for support)
DROP POLICY IF EXISTS "dca_bots_admin_select" ON public.dca_bots;
CREATE POLICY "dca_bots_admin_select" ON public.dca_bots FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.dca_bots IS 'DCA grid bot configurations; no execution yet. config: grid + TP + risk settings.';
