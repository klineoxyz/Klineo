-- Add form_data JSONB to store application form content
ALTER TABLE public.master_trader_applications
  ADD COLUMN IF NOT EXISTS form_data JSONB;

COMMENT ON COLUMN public.master_trader_applications.form_data IS 'Application form fields: fullName, email, country, telegram, primaryExchange, yearsExperience, tradingStyle, preferredMarkets, avgMonthlyReturn, strategyDescription, whyMasterTrader, profileUrl';
