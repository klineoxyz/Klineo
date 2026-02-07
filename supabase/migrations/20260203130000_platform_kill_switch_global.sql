-- Platform-wide kill switch for copy engine / strategy runner
-- When value = 'true', no futures orders are placed (enforced in strategyRunner)
INSERT INTO public.platform_settings (key, value) VALUES
  ('kill_switch_global', 'false')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.platform_settings IS 'Admin-editable platform config (fee %, kill_switch_global, etc.)';
