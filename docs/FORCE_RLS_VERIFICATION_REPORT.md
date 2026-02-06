# FORCE RLS Verification Report

**Date:** 2025-02-03  
**Scope:** Backend Supabase usage, RLS policies, insert error handling, smoke test

---

## 1. Backend Supabase Usage – VERIFIED

### Service Role Key
- **All backend routes** use `getSupabase()` (or equivalent) which creates a client with `SUPABASE_SERVICE_ROLE_KEY`.
- **Files:** `admin.ts`, `exchange-connections.ts`, `payment-intents.ts`, `copy-setups.ts`, `coinpayments.ts`, `referrals.ts`, `entitlements.ts`, `profile.ts`, `purchases.ts`, `trades.ts`, `positions.ts`, `orders.ts`, `portfolio.ts`, `notifications.ts`, `traders.ts`, `strategies.ts`, `strategies-runner.ts`, `futures.ts`, `launch.ts`, `self-test.ts`, `master-trader-applications.ts`, `admin-financial-ratios.ts`, `requireEntitlement.ts`, `auth.ts`.
- **Result:** Backend bypasses RLS via service role.

### Frontend
- **`src/lib/supabase.ts`** uses `VITE_SUPABASE_ANON_KEY` only.
- Frontend uses Supabase client only for `auth.getSession()`, `signIn`, `signUp`, `signOut`, `onAuthStateChange` – no direct table access.
- **Result:** Frontend uses anon key only; no table RLS impact.

### User Identity
- User identity always comes from `req.user!.id` (JWT-verified by `verifySupabaseJWT`).
- `userId` from request body is used only on **admin-only routes** (`admin.ts` user-discounts, `entitlements.ts`, `strategies-runner.ts`).
- **Result:** User identity is never trusted from client for authorization.

---

## 2. RLS Policy Audit – VERIFIED

| Table | RLS | Policies | Notes |
|-------|-----|----------|-------|
| user_profiles | Yes | Own read/update; admin read all | OK |
| user_exchange_connections | Yes | Own CRUD; admin read | OK |
| user_risk_settings | Yes | Own CRUD; admin read | OK |
| copy_setups | Yes | Own CRUD; admin read | OK |
| positions, orders, trades | Yes | Own; admin read | OK |
| fee_ledger | Yes | Own select; own insert | OK |
| payment_intents | Yes | Own select/insert; admin update | OK |
| payment_events | Yes | Own/admin select; own/admin insert | OK |
| payout_requests | Yes | Own select/insert; admin update | OK |
| user_entitlements | Yes | Own select | Backend-only writes |
| user_discounts | Yes | Own select; admin CRUD | OK |
| referrals | Yes | Own select; own insert | OK |
| referral_earnings | Yes | Own/admin select | Backend-only inserts |
| audit_logs | Yes | Admin select/insert | OK |
| eligible_purchases | Yes | Own/admin select; own insert | CoinPayments IPN uses service role |
| purchase_* | Yes | Admin/backend policies | OK |
| marketing_pool_ledger | Yes | Admin select/insert | OK |
| profit_events | Yes | Own select | Backend-only inserts |

**Migration added:** `supabase/migrations/20260203120000_force_rls_and_audit_policies.sql` – applies `FORCE ROW LEVEL SECURITY` to all focus tables (idempotent).

---

## 3. Supabase Insert Error Handling – FIXED

### Changes
- **Removed:** Any `.catch()` chained on Supabase query builders (they are not Promises until awaited).
- **Added:** `try/catch` around all non-critical inserts (audit_logs, payment_events, notifications).
- **Rule:** Audit logging and event inserts must never block core flow; they are wrapped in `try { ... } catch { /* non-fatal */ }`.

### Files Changed
| File | Change |
|------|--------|
| `backend-skeleton/src/routes/admin.ts` | Wrapped 7 audit_logs/notifications/payment_events inserts in try/catch |
| `backend-skeleton/src/routes/referrals.ts` | Wrapped audit_logs insert in try/catch |
| `backend-skeleton/src/routes/entitlements.ts` | Wrapped 2 audit_logs inserts in try/catch; added error check for profit_events insert |
| `backend-skeleton/src/routes/exchange-connections.ts` | Already had try/catch (from prior audit) |
| `backend-skeleton/src/routes/copy-setups.ts` | Already had try/catch (from prior audit) |
| `backend-skeleton/src/routes/payment-intents.ts` | payment_events uses `{ error }` check (unchanged) |

---

## 4. Smoke Test – UPDATED

**Script:** `scripts/smoke-prod.mjs`

**New tests:**
- `POST /api/payments/intents` (create joining_fee)
- `POST /api/payments/intents/:id/submit`
- `POST /api/admin/payments/intents/:id/approve`
- `POST /api/copy-setups` (create)
- `PUT /api/copy-setups/:id` (pause, resume)
- `GET /api/exchange-connections` (admin)

**Run:**
```bash
TEST_USER_EMAIL=... TEST_USER_PASSWORD=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/smoke-prod.mjs
```

---

## 5. Summary of Fixes

| Category | Action |
|----------|--------|
| Backend key | Verified service role everywhere |
| Frontend key | Verified anon only |
| JWT identity | Verified req.user.id; body userId only on admin routes |
| RLS | Migration for FORCE RLS on focus tables |
| Insert handling | try/catch on audit/event inserts; error check on profit_events |
| Smoke test | Extended with payment intent + copy setup flow |

---

## 6. File Paths Changed

```
backend-skeleton/src/routes/admin.ts         # 7 try/catch wrappers
backend-skeleton/src/routes/referrals.ts     # 1 try/catch wrapper
backend-skeleton/src/routes/entitlements.ts  # 2 try/catch + profit_events error check
scripts/smoke-prod.mjs                       # Extended smoke tests
supabase/migrations/20260203120000_force_rls_and_audit_policies.sql  # New migration
docs/FORCE_RLS_VERIFICATION_REPORT.md        # This report
```
