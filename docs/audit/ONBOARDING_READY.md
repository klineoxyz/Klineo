# KLINEO Onboarding Readiness

**Last updated:** 2026-02-03  
**Audit snapshot:** 2025-02-03  
**Status:** BETA-READY (real referral codes implemented)

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
- [ ] `pnpm run build:safe` — passes (build + check:secrets)
- [ ] No `VITE_RUNNER_CRON_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` in frontend env
- [ ] Non-admin cannot access `/admin` — redirected to Dashboard

### 6. Production Config Sanity
- [ ] **Railway (backend):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `ADMIN_EMAILS`, `RUNNER_CRON_SECRET` (if runner enabled)
- [ ] **Vercel (frontend):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` only — no service role, no cron secret
- [ ] **Cron secret:** Only in Railway backend env; never in Vercel/frontend

### 7. Version / Commit Verification
- [ ] Footer or Settings shows build version (e.g. `v0.0.1` or commit hash)
- [ ] Deployed version matches expected commit (check git SHA or version in UI)

### 8. Builds (1 min)
- [ ] `pnpm run build:safe` (frontend) — succeeds
- [ ] `cd backend-skeleton && pnpm run build` — succeeds

---

## Go/No-Go Criteria

| Criterion | Required |
|-----------|----------|
| **Real referral codes** (not placeholder) | ✅ |
| All main routes update URL on navigation | Yes |
| Deep link + refresh render correct screen | Yes |
| Strategy Backtest loads without crash | Yes |
| Referral payout request + admin mark-paid flow | Yes |
| Coupon apply at checkout (joining_fee + package) | Yes |
| Audit logs for payout mark-paid | Yes |
| check:secrets passes | Yes |
| Admin routes gated | Yes |
| Production config: service role only in Railway, anon only in frontend | Yes |

---

## Known Limitations for Beta

1. **Referral code/link:** Implemented — GET /api/referrals/me returns real code/link; /ref/:code deep link; POST /api/referrals/claim for attribution.
2. **Coupon admin:** Search filter by coupon code on Discount Coupons list; usage visible via `currentRedemptions`; payment_intents list shows `coupon_code` (masked user id) for who used.
3. **Playwright E2E:** Not added; manual QA + smoke test preset used for launch.

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
pnpm run build:safe     # Build + check:secrets (recommended for deploy)
cd backend-skeleton && pnpm run build  # Backend
```

## Coupons Admin Visibility

- **Filter by coupon code:** Admin → Discount Coupons → search input filters list by code (client-side).
- **Who received:** User-Specific Discounts table shows assignments (user email, code, claim link).
- **Who used:** Coupons table shows `currentRedemptions`; Payment Intents list shows `coupon_code` per intent (masked user_id in API; no PII).
