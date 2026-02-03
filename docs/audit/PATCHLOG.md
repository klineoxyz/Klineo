# KLINEO Audit Patch Log

**Date:** 2025-02-03

---

## Summary

| Patch | File(s) | Change | Why |
|-------|---------|--------|-----|
| P1 | `src/app/config/routes.ts` | Prefer primary view for PATH_TO_VIEW when multiple views share a path | Fix /marketplace rendering Dashboard |
| P2 | `backend-skeleton/src/routes/admin.ts` | Add audit_logs insert when admin marks referral payout as paid | Traceability for payout operations |

---

## P1: Marketplace Route Fix

**File:** `src/app/config/routes.ts`

**Change:**
- Introduced `PRIMARY_VIEW_FOR_PATH` mapping `/marketplace` → `marketplace`
- Updated `PATH_TO_VIEW` build logic to prefer primary view when multiple views share a path
- Prevents `trader-profile` and `copy-setup` from overwriting `/marketplace` → `marketplace`

**Verification:**
1. Start dev server: `pnpm dev`
2. Log in, navigate to Marketplace via sidebar
3. Confirm URL is `/marketplace` and Marketplace screen renders
4. Refresh page; Marketplace still renders

---

## P2: Admin Mark-Paid Audit Log

**File:** `backend-skeleton/src/routes/admin.ts`

**Change:**
- After successful PATCH `/api/admin/referrals/:id/mark-paid`, insert into `audit_logs`:
  - `action_type: 'referral_payout_marked_paid'`
  - `entity_type: 'purchase_referral_earnings'`
  - `entity_id`: payout id
  - `details.transaction_id`: tx hash if provided

**Verification:**
1. As admin, mark a referral payout as paid with a tx hash
2. Query: `SELECT * FROM audit_logs WHERE action_type = 'referral_payout_marked_paid'`
3. Confirm row exists with correct entity_id and details

---

## P3: Strategy Backtest useEffect (2025-02-03)

**File:** `src/app/components/screens/StrategyBacktest.tsx`

**Change:** Use `import * as React from "react"` and `React.useEffect` explicitly to avoid "useEffect is not defined" with recharts in production builds.

**Verification:** Load Strategy Backtest page; no console error.

---

## P4: Routing validator + check:secrets (2025-02-03)

**Files:** `src/lib/smokeTests.ts`, `scripts/check-build-secrets.mjs`, `package.json`

**Change:** Added routing validator smoke test; `pnpm run check:secrets` script; `build:safe` script.

**Verification:** Run Launch preset — Routing validator PASS; run `pnpm run check:secrets` after build.

---

## P5: Coupon context + payout audit (2025-02-03)

**Files:** `Subscription.tsx`, `Payments.tsx`, `referrals.ts`

**Change:** Pass couponKind/couponPackageCode when navigating with coupon; add audit_logs for payout_request mark-paid.

**Verification:** Packages → checkout with coupon → Payments; coupon validates correctly. Admin marks payout_request paid; audit_logs has payout_request_marked_paid.

---

## P6: Transaction/tx hash validation (2025-02-03)

**Files:** `backend-skeleton/src/routes/admin.ts`, `backend-skeleton/src/routes/referrals.ts`

**Change:** Add optionalString('transactionId', 200) for admin mark-paid; optionalString('payoutTxId', 200) for payout_requests mark-paid. Trim and slice to max 200 chars.

**Verification:** Mark paid with long tx hash; stored truncated. Invalid body rejected by validator.

---

## No Changes (Documented Only)

- **VITE_RUNNER_CRON_SECRET:** Never set in production frontend. Smoke test already SKIPs cron-secret test unless explicitly enabled.
- **Rate limiting:** Existing limits (auth 20, API 100, admin 200, exchange 10) deemed sufficient.
- **RLS:** All tables audited; policies correct.
