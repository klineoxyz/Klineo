# KLINEO Onboarding Readiness

**Date:** 2025-02-03  
**Status:** BETA-READY

---

## 10-Minute Production Verification Checklist

Run through these steps in production (or staging with prod-like config):

### 1. Navigation (2 min)
- [ ] Log in, click each sidebar item: Dashboard, Marketplace, Terminal, Positions, Orders, Trade History, Strategy Backtest, Portfolio, Packages, Referrals, Fees, Settings
- [ ] Confirm URL updates for each (e.g. `/terminal`, `/strategy-backtest`, `/packages`)
- [ ] Refresh on `/marketplace` — should show Marketplace, not Dashboard
- [ ] Use browser Back/Forward — content should match URL

### 2. Strategy Backtest (1 min)
- [ ] Open Strategy Backtest page — no console error, no "useEffect is not defined"
- [ ] Run backtest — completes; Run Demo / Go Live buttons work

### 3. Referral Payouts (2 min)
- [ ] User: Set payout wallet in Settings → Request payout on Referrals (if balance ≥ $50)
- [ ] Admin: Payout requests tab — mark one as paid with tx hash
- [ ] User: Payout History shows PAID + tx link
- [ ] Query `audit_logs` for `payout_request_marked_paid` or `referral_payout_marked_paid`

### 4. Coupons (2 min)
- [ ] Visit `/packages?coupon=TESTCODE` — coupon field prefilled
- [ ] From Packages with coupon: checkout → Payments; coupon validates and applies
- [ ] Admin: Create coupon; copy shareable link; User discounts shows assignments

### 5. Security (2 min)
- [ ] `pnpm run build` then `pnpm run check:secrets` — passes
- [ ] No `VITE_RUNNER_CRON_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` in frontend env
- [ ] Non-admin cannot access `/admin` — redirected to Dashboard

### 6. Builds (1 min)
- [ ] `pnpm run build` (frontend) — succeeds
- [ ] `cd backend-skeleton && pnpm run build` — succeeds

---

## Go/No-Go Criteria

| Criterion | Required |
|-----------|----------|
| All main routes update URL on navigation | Yes |
| Deep link + refresh render correct screen | Yes |
| Strategy Backtest loads without crash | Yes |
| Referral payout request + admin mark-paid flow | Yes |
| Coupon apply at checkout (joining_fee + package) | Yes |
| Audit logs for payout mark-paid | Yes |
| check:secrets passes | Yes |
| Admin routes gated | Yes |

---

## Known Limitations for Beta

1. **Referral code/link**: Referrals page uses placeholder `KLINEO-XYZ123` / `https://klineo.xyz/ref/XYZ123` until referral API returns real user code.
2. **Coupon redemption tracking**: Admin sees coupon `currentRedemptions`; "who used" requires scanning payment_intents by coupon_code (no dedicated redemption table).
3. **Admin filter by coupon code**: Coupons list shows all; no search/filter API — use browser Find or scroll.
4. **Playwright E2E**: Not added; manual QA + smoke test preset used for launch.

---

## Verification Summary

| Area | Status | Notes |
|------|--------|-------|
| Navigation + URLs | ✅ | pathForView/viewForPath; routing validator in Launch preset |
| Strategy Backtest | ✅ | React.useEffect pattern; Optimize/Share show "coming soon" toast |
| Referral payouts | ✅ | Request flow; admin mark-paid; audit logs; tx hash validation (max 200) |
| Coupons | ✅ | /packages?coupon=CODE; couponKind passed to Payments; admin copy link |
| Buttons/CTAs | ✅ | Dead handlers fixed (Optimize, Share); key flows wired |
| Security | ✅ | check:secrets; no VITE_* secrets; requireAdmin on admin routes |

---

## Quick Commands

```bash
pnpm run build          # Frontend
pnpm run check:secrets  # Scan dist for forbidden strings
pnpm run build:safe     # Build + check:secrets
cd backend-skeleton && pnpm run build  # Backend
```
