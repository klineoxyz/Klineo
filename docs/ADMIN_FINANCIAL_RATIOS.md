# Admin Financial Ratios

Admin-only module for platform performance KPIs: revenue, growth, users, trading activity, risk, and operational reliability. **Production-safe: no secrets, no API keys, no PII in aggregates.** User identity is masked (e.g. `user_****abcd`).

---

## Data sources

| Metric area | Source tables | Fallback when missing |
|-------------|--------------|------------------------|
| Revenue | `eligible_purchases` (status=completed/refunded) | Skip; add to `notes` |
| Users | `user_profiles`, `strategy_tick_runs`, `eligible_purchases` | Skip or 0 |
| Ops / ticks | `strategy_tick_runs` (status=ok/error) | Skip |
| Connections | `user_exchange_connections` (last_test_status, futures_enabled, kill_switch) | Skip |
| Strategy runs | `strategy_runs` (status=active/paused) | Skip |
| Marketing spend | `admin_marketing_spend` (manual) | CAC/LTV:CAC omitted |

Views (admin/service_role only):

- `admin_kpi_revenue_daily` — date, gross, refunds, paying_users
- `admin_kpi_users_daily` — date, new_users, active_users, paying_users
- `admin_kpi_ops_daily` — date, tick_ok, tick_error, tick_total

---

## Ratios and formulas

### A) Revenue & profitability

| Name | Formula | Notes |
|------|---------|--------|
| **Gross Revenue** | Sum of `eligible_purchases.amount` where `status = 'completed'` in period | |
| **Net Revenue** | Gross − refunds (sum of amount where `status = 'refunded'`) | |
| **Marketing Allocation** | `MARKETING_PCT` (default 10%) of gross | Configurable via env |
| **Platform Allocation** | `PLATFORM_PCT` (default 20%) of gross | Configurable via env |
| **Referral Rewards Pool** | `REFERRAL_POOL_PCT` (default 70%) of gross | Configurable via env |
| **ARPU** | gross_revenue / max(active_users, new_users, 1) | Per-user revenue |
| **ARPPU** | gross_revenue / paying_users (or 0) | Per paying user |
| **Take Rate** | platform_share / gross_revenue (when gross > 0) | Platform share ratio |

Config constants (backend env): `REFERRAL_POOL_PCT`, `PLATFORM_PCT`, `MARKETING_PCT`. Must sum to 100.

### B) Growth

| Name | Formula | Notes |
|------|---------|--------|
| **New Users** | Count of `user_profiles` created in period | |
| **Active Users** | Distinct users in `strategy_tick_runs` in period | Proxy for session activity |
| **Paying Users** | Distinct users with completed `eligible_purchases` in period | |
| **Conversion Rate** | paying_users / new_users (or 0) | |
| **Conversion (active)** | paying_users / active_users (or 0) | |

Retention (D1/D7/D30) requires event timestamps; not implemented. Optional: “Repeat Active Rate” (users active in current and previous period) can be added later.

### C) Unit economics

| Name | Formula | Notes |
|------|---------|--------|
| **CAC** | marketing_spend / new_paying_users | Only when `admin_marketing_spend` has a row for the same period (period_start, period_end) |
| **LTV proxy** | ARPPU (single-period) | Can be extended with repeat purchase count |
| **LTV:CAC** | LTV_proxy / CAC | When CAC > 0 |

Marketing spend: manual table `admin_marketing_spend` (period_start, period_end, spend_usdt, notes). Admin enters via Admin → Financial Ratios → Marketing spend form.

### D) Trading & operations

| Name | Formula | Notes |
|------|---------|--------|
| **Connections Health Rate** | ok_connections / total_connections | From `last_test_status = 'ok'` |
| **Futures Enabled Rate** | futures_enabled_connections / total_connections | |
| **Strategy Activation Rate** | active_strategy_runs / total_strategy_runs | status = 'active' |
| **Strategy Success Rate** | tick_ok / tick_total | From `strategy_tick_runs.status = 'ok'` |
| **Error Rate** | tick_error / tick_total | status = 'error' |
| **Auto-Pause Rate** | paused_runs / total_runs | status = 'paused' |
| **Kill Switch Rate** | kill_switch_enabled_connections / total_connections | |

---

## API (admin-only)

All routes require `verifySupabaseJWT` + `requireAdmin`. No PII in responses.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/financial-ratios?window=24h\|7d\|30d\|90d\|mtd\|prev_month` | KPI snapshot + ratios for window |
| GET | `/api/admin/financial-ratios/timeseries?metric=revenue\|paying_users\|active_strategies\|tick_success&days=90` | Time series for charts |
| GET | `/api/admin/financial-ratios/top-payers?window=7d&limit=20` | Top payers (masked user_id, total, last payment) |
| GET | `/api/admin/financial-ratios/refunds-fails?window=7d&limit=50` | Refunded/failed payments (masked) |
| GET | `/api/admin/marketing-spend` | List marketing spend entries |
| POST | `/api/admin/marketing-spend` | Create/upsert (body: period_start, period_end, spend_usdt, notes?) |

**Window**:

- `24h` — last 24 hours  
- `7d` — last 7 days  
- `30d` — last 30 days  
- `90d` — last 90 days  
- `mtd` — month to date  
- `prev_month` — previous calendar month  

**Caching**: In-memory 30s TTL on backend for ratios and timeseries to avoid heavy repeated queries.

---

## Admin UI

- **Location**: Admin Panel → **Financial Ratios** tab.
- **Window selector**: 24h / 7d / 30d / 90d / MTD / Previous month.
- **KPI cards**: Gross revenue, net revenue, paying users, conversion rate, ARPU, tick success rate.
- **Charts**: Revenue trend (90d), Paying users trend (90d), Tick success rate (90d).
- **Tables**: Top payers (masked user, total USD, last payment); Refunds/fails (masked user, amount, status, date).
- **Marketing spend**: Form (period start/end, spend USDT, notes) + list of saved entries.
- **Export**: JSON (ratios + top payers + refunds/fails, no PII), CSV (top payers only, masked user_id).

---

## Safety

- **No secrets**: Env vars and API keys are never returned.
- **No PII**: Emails, IPs, raw user IDs are never returned; only masked IDs (e.g. `user_****abcd`).
- **Indexes**: `created_at`, `user_id`, `status` (and view base tables) are indexed where used.
- **Access**: All endpoints are admin-only (JWT + role check). Views are queried via service_role; RLS on base tables still applies for direct access.

---

## Limitations

1. **Revenue**: Only `eligible_purchases` (onboarding + packages). Manual `payment_intents` (approved) are not summed here; can be added if needed.
2. **Active users**: Proxy is `strategy_tick_runs` (and optionally orders). No generic “session” table.
3. **Retention**: D1/D7/D30 not computed; would require activity event history per user per day.
4. **Strategy “active” trend**: Timeseries shows new strategy_runs created per day, not historical active count (no status history).
5. **CAC/LTV**: CAC only when admin has entered marketing spend for the exact period (period_start/period_end). LTV is a single-period ARPPU proxy.
