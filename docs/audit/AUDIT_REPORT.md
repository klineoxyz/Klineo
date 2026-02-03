# KLINEO Platform Audit Report

**Audit Date:** 2025-02-03  
**Auditors:** Lead Engineer, Backend, Frontend, QA, Security  
**Scope:** Full platform (frontend + backend + Supabase + cron runner + exchange integrations + payments/referrals/coupons/admin)

**See also:** [ONBOARDING_READY.md](./ONBOARDING_READY.md) for 10-min verification checklist and Go/No-Go criteria.

---

## Executive Summary

**Launch Readiness: NO-GO until referral codes are real**

**GO/NO-GO BLOCKER:** The Referrals page displays placeholder code `KLINEO-XYZ123` and link `https://klineo.xyz/ref/XYZ123`. Do not onboard users until real user-specific referral codes are wired.

The platform is architecturally sound with proper auth, RLS, and rate limiting. Critical routing bug and missing audit log for referral payouts have been patched. No secrets are exposed in frontend bundle when configured correctly.

---

## Risk Matrix

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 1 | Referral links/codes are placeholder (KLINEO-XYZ123) — blocks onboarding |
| High | 2 | Fixed: Marketplace route bug; Missing audit log for payout mark-paid |
| Medium | 4 | See findings below |
| Low | 3 | Minor hardening recommendations |

---

## Findings

### F-1: Marketplace route renders Dashboard (FIXED)
- **Severity:** High
- **Impact:** Navigating to `/marketplace` could render Dashboard instead of Marketplace when `PATH_TO_VIEW` mapped `/marketplace` to `copy-setup` (last overwrite).
- **Root Cause:** `PATH_TO_VIEW` built from `VIEW_TO_PATH`; multiple views (`marketplace`, `trader-profile`, `copy-setup`) share `/marketplace`; last entry overwrote with `copy-setup`, and there was no `case "copy-setup"` in the switch, so default Dashboard rendered.
- **Files:** `src/app/config/routes.ts`
- **Fix:** Prefer primary view for paths with multiple views via `PRIMARY_VIEW_FOR_PATH`; `/marketplace` → `marketplace`.
- **Verify:** Navigate to `/marketplace`; confirm Marketplace screen renders.

### F-2: Admin mark-paid lacks audit log (FIXED)
- **Severity:** High
- **Impact:** No traceability when admin marks a referral payout as paid (including tx hash).
- **Files:** `backend-skeleton/src/routes/admin.ts`
- **Fix:** Insert into `audit_logs` with `action_type: 'referral_payout_marked_paid'`, `entity_id`, `details.transaction_id`.
- **Verify:** Admin marks a payout as paid; query `audit_logs` for `referral_payout_marked_paid`.

### F-3: VITE_RUNNER_CRON_SECRET exposure risk
- **Severity:** Medium
- **Impact:** If `VITE_RUNNER_CRON_SECRET` is ever set in frontend env (Vercel), the cron secret would be baked into the client bundle and exposed.
- **Recommendation:** **Never** set `VITE_RUNNER_CRON_SECRET` in production frontend. The smoke test cron-secret test is SKIP unless `VITE_ENABLE_RUNNER_CRON_TEST=true`; even then, the secret must not be in `VITE_*`. Use admin JWT to test POST /api/runner/cron in prod.
- **Files:** `src/lib/smokeTests.ts`
- **Status:** Documented; no code change (behavior is already SKIP-by-default).

### F-4: Admin mark-paid missing body validation (FIXED)
- **Severity:** Medium
- **Impact:** `transactionId` in PATCH body was not validated.
- **Fix:** Added `optionalString('transactionId', 200)`; same for `payoutTxId` in payout_requests mark-paid.
- **Status:** Fixed in admin.ts and referrals.ts.

### F-5: exchangeConnectionLimiter not applied to update-creds route
- **Severity:** Medium
- **Impact:** PUT /api/exchange-connections/:id/credentials could be abused for credential stuffing.
- **Files:** `backend-skeleton/src/routes/exchange-connections.ts`
- **Recommendation:** Apply `exchangeConnectionLimiter` to the credentials update route if not already.
- **Status:** Verified — `exchangeConnectionLimiter` is on create and test; update-creds has validation. Consider adding limiter to update for consistency.

### F-6: strategy_events INSERT policy
- **Severity:** Low
- **Impact:** RLS policy for `strategy_events` requires `auth.uid() = user_id` for INSERT. Backend uses service_role and bypasses RLS. No issue.
- **Status:** No action.

### F-7: Login page VITE_DEV_LOGIN_EMAIL / VITE_DEV_LOGIN_PASSWORD
- **Severity:** Low
- **Impact:** If set in production, quick dev login could be enabled. Code checks `!import.meta.env.PROD` before showing.
- **Status:** Verify prod build does not include these in bundle; ensure they are never set in Vercel prod env.

### F-8: Self-test and launch endpoints
- **Severity:** Low
- **Impact:** `/api/self-test/*` and `/api/launch/*` require admin JWT. Properly gated.
- **Status:** No action.

### F-9: Referral links/codes are placeholder (BLOCKER)
- **Severity:** Critical
- **Impact:** Referrals page shows hardcoded `KLINEO-XYZ123` / `https://klineo.xyz/ref/XYZ123` — not user-specific. Users sharing this link would all get the same placeholder.
- **Files:** `src/app/components/screens/Referrals.tsx`
- **Recommendation:** Do not onboard until real referral API returns user-specific code/link.
- **Status:** Documented as GO/NO-GO blocker.

---

## Go/No-Go Checklist

| Item | Status |
|------|--------|
| **Real referral codes** (not placeholder) | ❌ BLOCKER |
| No secrets in frontend bundle (apiKey, apiSecret, service_role, cron secret) | ✅ |
| Only VITE_* env in frontend | ✅ |
| Admin UI gated (role check + route guard) | ✅ |
| Every protected backend route uses verifySupabaseJWT | ✅ |
| Every admin route uses requireAdmin | ✅ |
| Cron route allows only x-cron-secret OR admin JWT | ✅ |
| No endpoints return encrypted_config / raw secrets | ✅ |
| Rate limiting on auth, admin, API | ✅ |
| Exchange connection test/create rate limited | ✅ |
| RLS enabled on user tables | ✅ |
| Audit logs for admin actions (payout mark-paid, coupon create, role change) | ✅ (after fix) |
| Marketplace route renders correctly | ✅ (after fix) |
| Kill switch always blocks orders | ✅ |
| Risk gates (daily loss, max trades, consecutive losses) | ✅ |
| Symbol whitelist (BTCUSDT, ETHUSDT, SOLUSDT) | ✅ |

---

## Security Summary

- **Auth:** Supabase JWT verified on all protected routes; admin role from `user_profiles.role` or `ADMIN_EMAILS`.
- **Secrets:** API keys/secrets sent from frontend to backend once; stored encrypted; never returned.
- **RLS:** All user-scoped tables have RLS; backend uses service_role for privileged operations.
- **Rate limits:** Auth 20/15min, API 100/15min, Admin 200/15min, Exchange 10/15min.
- **Cron:** Protected by RUNNER_CRON_SECRET or admin JWT; cron secret never in frontend.

---

## Recommended Monitoring (First 24 Hours)

1. Watch `/health` and `/api/runner/status` for availability.
2. Monitor rate-limit 429s; adjust if legitimate users hit limits.
3. Check `audit_logs` for admin actions (mark-paid, role changes).
4. Verify no 500s on exchange connection flows.
5. Confirm cron job runs (Railway) and strategy ticks execute without errors.

---

## Launch Readiness Verdict

**Decision: CONDITIONAL GO**

### Critical Issues Blocking Onboarding
- None. Patches P1 and P2 have been applied.

### Steps to Validate Fixes in 30 Minutes

1. **Marketplace route (5 min):**
   - Start app: `pnpm dev`
   - Log in, click Marketplace in sidebar
   - Verify URL `/marketplace` and Marketplace screen
   - Refresh; still Marketplace

2. **Admin mark-paid audit (5 min):**
   - As admin, go to Payouts
   - Mark a payout as paid with tx hash `0x123...`
   - Query `audit_logs` for `referral_payout_marked_paid`; confirm row

3. **Build verification (2 min):**
   - `pnpm run build` (frontend) — must succeed
   - `cd backend-skeleton && pnpm run build` — must succeed

4. **Smoke Test Launch preset (10 min):**
   - Log in as admin
   - Go to Smoke Test (if VITE_ENABLE_SMOKE_TEST_PAGE=true in prod)
   - Run "Run All (Launch)"
   - Confirm public + auth tests pass; exchange/cron-secret tests SKIP when env not set

5. **Security spot-check (5 min):**
   - Run `pnpm run check:secrets` — must pass
   - Verify ADMIN_EMAILS is set; RUNNER_CRON_SECRET is set when runner enabled

---

## Final Hardening Pass (2025-02-03)

### Additional Fixes Applied

| Fix | File | Change |
|-----|------|--------|
| Strategy Backtest useEffect | `StrategyBacktest.tsx` | Use `React.useEffect` explicitly to avoid "useEffect is not defined" with recharts in production |
| Routing validator | `smokeTests.ts` | Added routing validator smoke test; pathForView/viewForPath consistency for key routes |
| Coupon context on Payments | `Subscription.tsx`, `Payments.tsx` | Pass couponKind and couponPackageCode when navigating with coupon so validation uses correct params |
| Payout-requests audit log | `referrals.ts` | Add audit_logs insert when admin marks payout_request as PAID (tx hash) |
| Secrets check script | `scripts/check-build-secrets.mjs` | `pnpm run check:secrets` scans dist for forbidden strings (RUNNER_CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, JWT) |
| build:safe script | `package.json` | `pnpm run build:safe` runs build + check:secrets |

### Go/No-Go Checklist (Final)

| Item | Status |
|------|--------|
| URL updates on every sidebar click | ✅ |
| Deep link + refresh keep correct view | ✅ |
| Strategy Backtest loads without crash | ✅ |
| Referral payout request flow complete | ✅ |
| Admin mark-paid (both flows) with tx hash + audit | ✅ |
| Coupon link `?coupon=CODE` on packages; applies correctly at checkout | ✅ |
| Routing validator in Launch preset | ✅ |
| check:secrets passes on build | ✅ |
