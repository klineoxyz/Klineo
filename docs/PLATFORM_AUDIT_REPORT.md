# KLINEO Platform Audit Report

**Date:** 2026-02-03  
**Scope:** Backend correctness, copy engine safety, payments, exchange keys, admin controls, onboarding UX  
**Assumption:** Hostile environment; never trust client-provided `user_id`. All enforcement server-side + RLS.

---

## Executive Summary

**Verdict: GO (with P0 fixes applied)**

The platform demonstrates solid security foundations: JWT verification on protected routes, admin gating, AES-256-GCM encrypted API keys, HMAC-verified CoinPayments IPN, idempotent purchase allocation, per-connection and global platform kill switch, strategy locking, risk gates (daily loss, max trades, consecutive losses), and FORCE RLS on 19 tables. All P0 fixes have been applied. Run the smoke test, then proceed with onboarding.

---

## System Map

### Key Files

| Area | Path |
|------|------|
| Auth | `backend-skeleton/src/middleware/auth.ts` |
| Rate limit | `backend-skeleton/src/middleware/rateLimit.ts` |
| Admin | `backend-skeleton/src/routes/admin.ts` |
| Payment intents | `backend-skeleton/src/routes/payment-intents.ts` |
| CoinPayments | `backend-skeleton/src/routes/coinpayments.ts` |
| Exchange connections | `backend-skeleton/src/routes/exchange-connections.ts` |
| Copy setups | `backend-skeleton/src/routes/copy-setups.ts` |
| Strategy runner | `backend-skeleton/src/lib/strategyRunner.ts`, `strategy-engine.ts` |
| Strategy lock | `backend-skeleton/src/lib/strategyLock.ts` |
| Strategy risk | `backend-skeleton/src/lib/strategyRisk.ts` |
| Encryption | `backend-skeleton/src/lib/crypto.ts` |
| Allocation | `backend-skeleton/src/lib/allocatePurchaseRevenue.ts` |
| Health | `backend-skeleton/src/routes/health.ts` |

### Routes

| Prefix | Auth | Admin | Notes |
|--------|------|-------|------|
| `/health` | None | - | Status, env |
| `/api/auth` | Mix | - | `/me` JWT; `/admin/users` JWT+admin |
| `/api/admin` | JWT | Yes | All routes require admin |
| `/api/traders` | None | - | Public marketplace |
| `/api/payments/coinpayments/ipn` | None | - | HMAC-verified webhook |
| `/api/payments/intents` | JWT | - | Manual USDT flow |
| `/api/payments/validate-coupon` | JWT | - | Coupon validation |
| `/api/copy-setups` | JWT | - | Uses `req.user.id` |
| `/api/exchange-connections` | JWT | - | Rate limited (10/15min) |
| `/api/runner/*` | JWT+admin or cron secret | - | Strategy runner |
| All other `/api/*` | JWT | - | User-scoped |

### Tables (FORCE RLS)

| Table | RLS | Policies |
|-------|-----|----------|
| user_profiles | Yes | Own; admin |
| user_exchange_connections | Yes | Own CRUD; admin read |
| copy_setups | Yes | Own CRUD; admin |
| positions, orders, trades | Yes | Own; admin |
| payment_intents | Yes | Own select/insert; admin update |
| eligible_purchases | Yes | Service-only |
| user_entitlements | Yes | Own; admin |
| audit_logs | Yes | Admin read; insert by service |
| strategy_runs, strategy_tick_runs | Yes | Own; admin |
| payment_events | Yes | Service insert; admin read |

### Copy Engine / Strategy Runner

- **Strategy Runner:** Runs RSI-based futures strategy (strategy_runs → runRsiTick). Uses `strategy_locks`, `checkUserRiskGate`, per-connection `kill_switch`, `futures_enabled`, leverage/notional limits.
- **Copy setups:** Configuration for following master traders. The actual mirroring of master trades to followers is stored in `copy_setups`; order placement for copy trading may be implemented separately (e.g. via strategy_runs or future copy engine).

---

## P0 Issues (All Applied)

| ID | Issue | Status |
|----|-------|--------|
| P0-1 | tx_hash no format validation | ✅ Implemented |
| P0-2 | Logs might contain secrets | ✅ Implemented |
| P0-3 | Global kill switch | ✅ Implemented (platform_settings.kill_switch_global, enforced in strategy runner, execute-tick, futures order) |

---

## P1 Issues (Fix Soon)

| ID | Issue | Risk |
|----|-------|------|
| P1-1 | `/api/traders` unauthenticated | Low; intentional; consider rate limit |
| P1-2 | Mock IPN with `ENABLE_MOCK_IPN=true` | Medium; disable in prod |
| P1-3 | Health lacks runner/last-tick status | Low; add optional `/health/runner` |
| P1-4 | tx_hash duplicate across users | Low; DB UNIQUE prevents; consider per-user scoping for UX |

---

## P2 Issues (Later)

| ID | Issue |
|----|-------|
| P2-1 | Refund/chargeback flow is admin-gated only; no automated handling |
| P2-2 | strategy_events payload sanitization: extend to more key-like fields |

---

## Audit Areas (A–G)

### A) Auth + Authorization

- **JWT middleware:** Applied to all protected routes via `verifySupabaseJWT`. Admin routes add `requireAdmin`.
- **Admin-only:** `/api/admin/*` uses `adminRouter.use(verifySupabaseJWT); adminRouter.use(requireAdmin);`
- **RLS alignment:** Backend uses service role; identity from JWT. No client-provided `user_id` trusted.
- **Session/refresh:** Supabase Auth handles; backend validates token per request.

### B) Payments + Packages + Entitlements

- **Payment intent lifecycle:** draft → submitted (pending_review/flagged) → approved/rejected. Conditional update on submit (`.eq('status','draft')`) and approve (`.in('status', ['pending_review','flagged'])`).
- **tx_hash:** UNIQUE in DB. **Implemented (P0-1):** format/length validation in `POST /api/payments/intents/:id/submit` — max length 66, regex `^0x[a-fA-F0-9]{64}$` (BSC chain).
- **CoinPayments IPN:** HMAC verified; idempotent (checks `purchase.status === 'completed'` before allocation).
- **Entitlements:** Atomic upsert on approve; `allocatePurchaseRevenue` is idempotent.
- **Refunds:** Admin-gated; no automated flow.

### C) Exchange Connection Security

- **Encryption:** AES-256-GCM via `crypto.ts`; `encrypted_config_b64` stored.
- **No secrets in responses:** Endpoints return only metadata; keys never exposed.
- **Logs:** Error messages sanitized (`api[_-]?key`, `secret` replaced with `[REDACTED]`).
- **Connect/disconnect:** Audit logs on create, update, delete, credentials update.
- **Rate limiting:** `exchangeConnectionLimiter` 10/15min on test and save.

### D) Copy Engine / Strategy Runner Safety

- **Position sizing:** `max_notional_usdt`, `max_leverage_allowed`, `order_size_pct` enforced.
- **Pause/stop:** `status !== 'active'` blocks run; `kill_switch` blocks order placement.
- **Idempotency:** `clientOrderId` for Binance; `strategy_locks` prevent concurrent ticks.
- **Retry:** Bounded; no infinite loops.
- **Error handling:** Insufficient balance, min notional, leverage limits, order rejects handled; 429 not explicitly retried.
- **Kill switch:** Per-connection enforced in `strategy-engine.ts`. Global platform kill switch enforced in strategy runner, execute-tick, and futures order routes (fail-closed on lookup error).
- **Risk gates:** Daily max loss, max trades/day, consecutive losses, cooldown.
- **Locking:** `strategyLock.ts` per strategy_run; cooldown between runs.

### E) Database + RLS Policy Sanity

- **FORCE RLS:** Applied to 19 tables in `20260203120000_force_rls_and_audit_policies.sql`.
- **Policies:** Least-privilege; `audit_logs` insert service/admin; read admin.
- **No `USING (true)`** for authenticated on sensitive tables.

### F) Admin Panel + Ops

- **Admin actions logged:** User suspend/ban, payment approve/reject, referral mark-paid, master trader application, coupon create/update.
- **Admin capabilities:** Approve payments, pause user, update copy setup status (via user), disable trader, view connections.
- **Emergency stop:** Per-connection kill switch and global platform kill switch (`GET/PATCH /api/admin/platform-settings/kill-switch-global`).
- **Monitoring:** `/health` returns status; no runner/last-tick in health yet.

### G) Frontend Onboarding Flow

- **Flow:** Sign up → pay (joining fee) → package → connect exchange → create copy setup → start copying.
- **Dead ends:** None identified at P0. Allowance exhausted returns 402 with clear message.
- **Redirects:** Payment success flows to appropriate next step.

---

## Attack Surface Notes

| Vector | Mitigation |
|--------|------------|
| JWT spoofing | Supabase Auth; backend validates per request |
| Admin impersonation | `requireAdmin` + `ADMIN_EMAILS` fallback; role in DB |
| API key theft | Encrypted at rest; never returned; logs sanitized |
| Payment replay | tx_hash UNIQUE; intent status transitions guarded |
| IPN forgery | HMAC verification |
| Double approve | Conditional update; 409 if 0 rows |
| Order flood | Strategy lock; cooldown; risk gates |

---

## 10-Minute Production Verification Checklist

1. [ ] Health: `GET /health` → `status: ok`
2. [ ] Admin 403: Non-admin `GET /api/admin/users` → 403
3. [ ] Payment create: `POST /api/payments/intents` (JWT) → 201
4. [ ] Payment submit: `POST /api/payments/intents/:id/submit` (tx_hash) → pending_review
5. [ ] Admin approve: `POST /api/admin/payments/intents/:id/approve` (admin JWT) → 200
6. [ ] Entitlement: `GET /api/me/entitlement` → joining_fee_paid, package
7. [ ] Exchange connect: `POST /api/exchange-connections` (apiKey, apiSecret) → 201
8. [ ] Copy setup: `POST /api/copy-setups` (traderId) → 201 or 402 if allowance exhausted
9. [ ] Kill switch (per-connection): `PATCH /api/exchange-connections/:id/kill-switch` { enabled: true } → 200
10. [ ] Kill switch (global): `GET /api/admin/platform-settings/kill-switch-global` → { enabled: boolean }; `PATCH` to toggle

---

## Smoke Test Steps

Run: `node scripts/smoke-prod.mjs`

Required env: `BACKEND_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

The script tests: health, public traders, login, profile, copy-setups, positions, orders, trades, notifications, portfolio, payment intent create/submit, admin approve, copy setup create/pause/resume, admin 403 for non-admin, admin users/traders/stats.

---

## Global Kill Switch – Enforcement Locations

| Path | File | Lines | Blocks orders? |
|------|------|-------|----------------|
| Strategy Runner (scheduler) | `backend-skeleton/src/lib/strategyRunner.ts` | 101–105 | ✅ Yes |
| Manual execute-tick | `backend-skeleton/src/routes/strategies.ts` | 267–269 | ✅ Yes |
| Manual futures order | `backend-skeleton/src/routes/futures.ts` | 118–120 | ✅ Yes |
| runRsiTick (per-connection) | `backend-skeleton/src/lib/strategy-engine.ts` | 81–83 | ✅ Per-connection only |

Shared helper: `backend-skeleton/src/lib/platformSettings.ts` – `isPlatformKillSwitchOn(client)`. Cached (5s TTL), with DB query timeout. **Fail-closed:** on lookup error or timeout, treats kill switch as ON (blocks orders).

**Copy trading:** There is no copy-trading order placement engine in the codebase. `copy_setups` are configuration; no code mirrors master trades to followers. If a copy engine is added later, it must call `isPlatformKillSwitchOn(client)` before placing any order.

## platform_settings UNIQUE(key)

`platform_settings` is defined in `20260129180000_platform_settings.sql` with `key TEXT PRIMARY KEY`. PRIMARY KEY implies UNIQUE. The migration `20260203130000_platform_kill_switch_global.sql` uses `ON CONFLICT (key) DO NOTHING`, which requires a unique constraint on `key` and is satisfied by the existing PRIMARY KEY. No additional constraint is needed.

## P0 Fixes Implemented

See diffs in:

1. `backend-skeleton/src/routes/payment-intents.ts` – tx_hash validation
2. `backend-skeleton/src/index.ts` – error handler sanitization
3. `backend-skeleton/src/lib/platformSettings.ts` – `isPlatformKillSwitchOn()` helper
4. `backend-skeleton/src/lib/strategyRunner.ts` – global kill switch check
5. `backend-skeleton/src/routes/strategies.ts` – global kill switch on execute-tick
6. `backend-skeleton/src/routes/futures.ts` – global kill switch on manual futures order
7. `supabase/migrations/20260203130000_platform_kill_switch_global.sql` – platform_settings key
