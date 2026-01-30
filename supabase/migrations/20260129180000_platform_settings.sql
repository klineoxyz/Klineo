-- Platform settings (admin-editable key/value). Used for fee percentages etc.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
DROP POLICY IF EXISTS "platform_settings_admin_all" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_all" ON public.platform_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Defaults: Entry $100 = 20%, Pro $200 = 15%, Elite $500 = 10%
INSERT INTO public.platform_settings (key, value) VALUES
  ('fee_entry_pct', '20'),
  ('fee_pro_pct', '15'),
  ('fee_elite_pct', '10')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.platform_settings IS 'Admin-editable platform config (fee %, etc.)';
