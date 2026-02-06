# KLINEO Onboarding Readiness Audit

**Date:** 2025-02-03  
**Scope:** Auth/JWT, RLS, payments, exchange API keys, copy engine, admin, rate limiting, logging  
**Assumption:** Hostile environment; never trust frontend `user_id`. All enforcement server-side + RLS.

---

## Executive Summary

**Verdict: GO (with P0 fixes applied)**

The codebase demonstrates solid security practices: JWT verification on protected routes, admin gating, encrypted API keys, HMAC-verified payment webhooks, idempotent allocation, and RLS on all user-owned tables. Critical gaps have been addressed in this audit. Complete the P0 fixes and run the smoke test plan before onboarding real users.

---

## System Map

### Key Files

| Area | Path |
|------|------|
| Auth middleware | `backend-skeleton/src/middleware/auth.ts` |
| Rate limiting | `backend-skeleton/src/middleware/rateLimit.ts` |
| Validation | `backend-skeleton/src/middleware/validation.ts` |
| Admin routes | `backend-skeleton/src/routes/admin.ts` |
| Copy setups | `backend-skeleton/src/routes/copy-setups.ts` |
| Exchange connections | `backend-skeleton/src/routes/exchange-connections.ts` |
| CoinPayments | `backend-skeleton/src/routes/coinpayments.ts` |
| Payment intents | `backend-skeleton/src/routes/payment-intents.ts` |
| Strategy runner | `backend-skeleton/src/lib/strategyRunner.ts`, `strategy-engine.ts` |
| Encryption | `backend-skeleton/src/lib/crypto.ts` |
| Allocation | `backend-skeleton/src/lib/allocatePurchaseRevenue.ts` |

### Routes Summary

| Prefix | Auth | Admin | Notes |
|--------|------|-------|------|
| `/api/auth` | Mix | - | `/me` JWT, `/admin/users` JWT+admin |
| `/api/admin` | JWT | Yes | All routes |
| `/api/traders` | None | - | Public marketplace |
| `/api/billing/plans` | None | - | Public |
| `/api/payments/coinpayments/ipn` | None | - | HMAC-verified webhook |
| `/api/payments/intents` | JWT | - | Manual USDT flow |
| `/api/copy-setups` | JWT | - | Uses `req.user.id` |
| `/api/exchange-connections` | JWT | - | Rate limited |
| `/api/runner/*` | Cron secret or JWT+admin | - | Strategy runner |
| All other `/api/*` | JWT | - | User-scoped |

### Tables (RLS)

| Table | RLS | Policies |
|-------|-----|----------|
| user_profiles | Yes | Own read/update; admin read all |
| user_exchange_connections | Yes | Own CRUD; admin read |
| copy_setups | Yes | Own CRUD; admin read |
| positions, orders, trades | Yes | Own; admin read |
| payment_intents | Yes | Own select/insert; admin update |
| eligible_purchases | Yes | Service-only (backend) |
| user_discounts | Yes | Own select; admin CRUD |
| coupons | Yes | Active/own; admin |
| audit_logs | Yes | Admin read; insert by service |
| strategy_runs, strategy_tick_runs | Yes | Own; admin |

### Onboarding Funnel

1. **Sign up** → Supabase Auth (`/signup`)
2. **Pay** → `/payments` (manual USDT) or CoinPayments
3. **Buy package** → Same payment flow; admin approves
4. **Connect exchange** → `/api/exchange-connections` (joining fee required)
5. **Select trader** → `/api/copy-setups` (allowance required)
6. **Start copy** → `PUT /api/copy-setups/:id` status=active

---

## Critical Issues (P0)

### P0-1: Admin Payment Approve – Optimistic Locking

**Risk:** Double-click or race could theoretically apply approve twice.  
**Status:** Mitigated – status check prevents wrong-state approval, but update does not restrict by status.  
**Fix:** Use conditional update `WHERE status IN ('pending_review','flagged')` and return 409 if 0 rows.

### P0-2: Payment Intent Submit – Conditional Update

**Risk:** Two concurrent submits could overwrite each other.  
**Fix:** Add `.eq('status','draft')` to the update; if 0 rows, return 409.

### P0-3: Ensure No Secrets in Logs

**Risk:** Error objects or request bodies might include API keys, tokens.  
**Status:** Most handlers sanitize; verify error handler never logs `req.body` or full `err`.  
**Fix:** Confirm error middleware and any catch blocks never log sensitive fields.

### P0-4: CoinPayments IPN – Avoid Allocation on No-Op Update

**Risk:** Low – allocation RPC is idempotent.  
**Fix:** Only call `allocatePurchaseRevenue` when the status update actually affected 1 row (optional optimization).

### P0-5: Exchange Connect/Disconnect Audit

**Risk:** No audit trail for sensitive credential actions.  
**Fix:** Insert into `audit_logs` on connect (create/update) and delete.

---

## Important Issues (P1)

| ID | Issue | Risk | Recommendation |
|----|-------|------|-----------------|
| P1-1 | `/api/traders` unauthenticated | Low | Intentional; consider rate limit |
| P1-2 | Mock IPN with `ENABLE_MOCK_IPN=true` | Medium | Disable in production; use strong secret |
| P1-3 | `ADMIN_EMAILS` fallback | Low | Document; prefer `role=admin` in DB |
| P1-4 | Platform kill switch | Medium | Add `platform_settings.kill_switch_global` for copy engine |
| P1-5 | Payment intent submit `tx_hash` | Low | Add length/format validation (BSC tx hash pattern) |

---

## Later Issues (P2)

| ID | Issue |
|----|-------|
| P2-1 | Exchange connection test – add validation for IP-restricted keys |
| P2-2 | Referral claim – idempotency key to prevent double-claim |
| P2-3 | Strategy runner – expose metrics (Prometheus) for monitoring |
| P2-4 | Health check – include DB connectivity and runner status |

---

## 10-Minute Production Verification Checklist

Before onboarding users, run through:

- [ ] **Auth:** Sign up → log in → JWT in `Authorization` header on API calls
- [ ] **Payments:** Create intent (joining_fee) → submit tx_hash → admin approve → `user_entitlements` updated
- [ ] **Packages:** Create intent (package) → submit → approve → allowance increased
- [ ] **Exchange:** Connect Binance/Bybit → test → credentials encrypted, not logged
- [ ] **Copy:** Create copy setup → start → pause → stop → status persisted
- [ ] **Admin:** Admin user can access `/admin`; non-admin gets 403
- [ ] **Rate limit:** 429 after exceeding limit; Retry-After header present
- [ ] **RLS:** Direct Supabase anon client cannot read other users’ data
- [ ] **Kill switch:** Enable on connection → strategy runner blocks orders
- [ ] **Logs:** No API keys, secrets, or JWTs in console output

---

## Smoke Test Plan

### Prerequisites

- Backend running (Railway or local)
- Frontend running (Vercel or local)
- `ENABLE_MANUAL_PAYMENTS=true` and admin user configured

### Steps

1. **Create user**  
   - Sign up at `/signup`  
   - Confirm email if required

2. **Pay joining fee**  
   - Go to `/payments`  
   - Create intent (joining_fee)  
   - Submit with `tx_hash` (or 0 amount + coupon)  
   - Admin: Approve in Admin → Payment Intents

3. **Buy package**  
   - Go to `/packages`  
   - Create intent (package, ENTRY_100)  
   - Submit  
   - Admin: Approve

4. **Connect exchange**  
   - Go to Settings → Exchange  
   - Add Binance/Bybit API key (testnet OK)  
   - Run Test → success  
   - Verify credentials not in response

5. **Start copy**  
   - Go to Marketplace → select trader → Start Copying  
   - Verify copy setup in Copy Trading  
   - Pause → resume → Stop  
   - Reload page → state persists

6. **Verify trades (if runner enabled)**  
   - With strategy_runs active, check `strategy_tick_runs` for executions  
   - Enable kill_switch → verify no new orders

7. **Relogin persistence**  
   - Log out → log in  
   - Copy setups, connections, entitlement still present

---

## Applied Fixes (This Audit)

The following P0 fixes have been implemented:

1. **Admin payment approve** (`admin.ts`): Conditional update `WHERE status IN ('pending_review','flagged')`; return 409 if no rows updated (race / double-click).
2. **Payment intent submit** (`payment-intents.ts`): Conditional update `.eq('status','draft')`; return 409 if already submitted (idempotency).
3. **Audit logs** (`exchange-connections.ts`, `copy-setups.ts`):
   - `exchange_connection_created` / `exchange_connection_updated` on POST
   - `exchange_connection_credentials_updated` on PUT credentials
   - `exchange_connection_deleted` on DELETE
   - `copy_setup_status_changed` on PUT (status changes)
4. **Error handler**: Never logs `req.body` or full error object (verified).
5. **RLS**: Verified all tables; no new gaps.

**Frontend:** Handle 409 responses for approve/submit; show "Already processed, please refresh."
