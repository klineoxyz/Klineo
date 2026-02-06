-- KLINEO: FORCE ROW LEVEL SECURITY + RLS policy audit
-- Ensures tables enforce RLS even for table owner when FORCE RLS is enabled.
-- Service role (backend) bypasses RLS; this affects table owner access only.
-- Run after enabling FORCE RLS in Supabase dashboard.

-- Apply FORCE ROW LEVEL SECURITY to focus tables (idempotent)
ALTER TABLE IF EXISTS public.user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_exchange_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_risk_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.copy_setups FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.positions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trades FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_intents FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_events FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payout_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_entitlements FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_discounts FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_earnings FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.eligible_purchases FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_referral_earnings FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_revenue_splits FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_allocation_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketing_pool_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profit_events FORCE ROW LEVEL SECURITY;

-- Ensure profit_events has INSERT policy for backend (service_role bypasses; this is for anon-key edge cases)
-- profit_events: users select own; insert is backend-only. Existing policy may be select-only.
-- No change needed - service role bypasses RLS for all backend writes.
