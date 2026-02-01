-- KLINEO: Admin Financial Ratios — marketing spend table + KPI views (admin/service_role only).
-- No PII in views; aggregates only. Used by backend GET /api/admin/financial-ratios.

-- 1) admin_marketing_spend: manual input for CAC (marketing spend per period)
CREATE TABLE IF NOT EXISTS public.admin_marketing_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  spend_usdt NUMERIC(20, 4) NOT NULL CHECK (spend_usdt >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_admin_marketing_spend_period ON public.admin_marketing_spend(period_start, period_end DESC);

ALTER TABLE public.admin_marketing_spend ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_marketing_spend_admin_only" ON public.admin_marketing_spend;
CREATE POLICY "admin_marketing_spend_admin_only" ON public.admin_marketing_spend FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.admin_marketing_spend IS 'Manual marketing spend per period for CAC; admin-only';

-- 2) admin_kpi_revenue_daily: gross, net, refunds, paying_users by day (from eligible_purchases)
CREATE OR REPLACE VIEW public.admin_kpi_revenue_daily AS
SELECT
  (created_at AT TIME ZONE 'UTC')::date AS date,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)::numeric(20, 4) AS gross,
  COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0)::numeric(20, 4) AS refunds,
  COUNT(DISTINCT CASE WHEN status = 'completed' THEN user_id END)::integer AS paying_users
FROM public.eligible_purchases
WHERE status IN ('completed', 'refunded')
GROUP BY (created_at AT TIME ZONE 'UTC')::date;

COMMENT ON VIEW public.admin_kpi_revenue_daily IS 'Daily revenue KPIs from eligible_purchases; net = gross - refunds computed in app';

-- 3) admin_kpi_users_daily: new_users, active_users (tick proxy), paying_users by day
CREATE OR REPLACE VIEW public.admin_kpi_users_daily AS
WITH new_users AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS date, COUNT(*)::integer AS new_users
  FROM public.user_profiles
  GROUP BY (created_at AT TIME ZONE 'UTC')::date
),
paying AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS date, COUNT(DISTINCT user_id)::integer AS paying_users
  FROM public.eligible_purchases
  WHERE status = 'completed'
  GROUP BY (created_at AT TIME ZONE 'UTC')::date
),
active_ticks AS (
  SELECT (scheduled_at AT TIME ZONE 'UTC')::date AS date, COUNT(DISTINCT user_id)::integer AS active_users
  FROM public.strategy_tick_runs
  GROUP BY (scheduled_at AT TIME ZONE 'UTC')::date
),
all_dates AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS date FROM public.user_profiles
  UNION
  SELECT (created_at AT TIME ZONE 'UTC')::date FROM public.eligible_purchases WHERE status = 'completed'
  UNION
  SELECT (scheduled_at AT TIME ZONE 'UTC')::date FROM public.strategy_tick_runs
)
SELECT
  d.date,
  COALESCE(nu.new_users, 0) AS new_users,
  COALESCE(at.active_users, 0) AS active_users,
  COALESCE(p.paying_users, 0) AS paying_users
FROM (SELECT DISTINCT date FROM all_dates) d
LEFT JOIN new_users nu ON nu.date = d.date
LEFT JOIN paying p ON p.date = d.date
LEFT JOIN active_ticks at ON at.date = d.date;

COMMENT ON VIEW public.admin_kpi_users_daily IS 'Daily user KPIs; active_users from strategy_tick_runs';

-- 4) admin_kpi_ops_daily: tick success/error rates by day (strategy_tick_runs)
CREATE OR REPLACE VIEW public.admin_kpi_ops_daily AS
SELECT
  (scheduled_at AT TIME ZONE 'UTC')::date AS date,
  COUNT(*) FILTER (WHERE status = 'ok')::integer AS tick_ok,
  COUNT(*) FILTER (WHERE status = 'error')::integer AS tick_error,
  COUNT(*)::integer AS tick_total
FROM public.strategy_tick_runs
GROUP BY (scheduled_at AT TIME ZONE 'UTC')::date;

COMMENT ON VIEW public.admin_kpi_ops_daily IS 'Daily strategy tick success/error counts';

-- RLS: views are built on tables with RLS; access via service_role or admin-only backend.
-- No direct grant to anon; backend uses service_role for admin routes.
