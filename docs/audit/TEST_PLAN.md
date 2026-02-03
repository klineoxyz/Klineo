# KLINEO Test Plan

**Version:** 1.0  
**Date:** 2025-02-03

---

## 1. Manual QA Checklist (User Flows)

### 1.1 Authentication
- [ ] Sign up with email/password; verify profile created
- [ ] Login; verify redirect to dashboard
- [ ] Logout; verify redirect to landing
- [ ] Invalid credentials show error; no stack trace
- [ ] 401 on protected API redirects to login

### 1.2 Routing & Navigation
- [ ] Every sidebar/menu click updates URL
- [ ] Deep link to `/dashboard`, `/terminal`, `/positions` works
- [ ] Deep link to `/marketplace` shows Marketplace (not Dashboard)
- [ ] Back/forward browser buttons work
- [ ] Refresh on any screen keeps current screen
- [ ] No runtime hook import errors (e.g. useEffect)

### 1.3 Critical Screens (Smoke)
- [ ] **Terminal:** Loads; Futures Quick Actions; Strategy tab; Manual Futures Order (no real order required)
- [ ] **Positions / Orders / Trade History:** Load; empty state or data shown
- [ ] **Strategy Backtest:** Load; run backtest; no crash
- [ ] **Packages:** Load; select package; checkout flow (if applicable)
- [ ] **Referrals:** Load; see referral link; request payout (if balance)
- [ ] **Fees:** Load
- [ ] **Settings:** Connect Exchange wizard; Futures enable modal

### 1.4 Connect Exchange Wizard
- [ ] Add Binance connection (testnet); test connection; save
- [ ] Add Bybit connection (testnet); test connection; save
- [ ] Futures test; futures enable; verify kill switch toggle
- [ ] Update credentials for existing connection

### 1.5 Admin Panel (Admin User)
- [ ] Admin section visible in sidebar
- [ ] Payouts: list; mark paid with tx hash; verify audit log
- [ ] Coupons: create; assign; view redemptions
- [ ] Users: list; suspend/reactivate; change role
- [ ] Audit logs: view entries
- [ ] Marketing spend: add; view
- [ ] Payment intents (if manual payments enabled): approve/reject

### 1.6 Payments & Checkout
- [ ] Checkout page loads
- [ ] Coupon apply via URL param `?coupon=XXX`
- [ ] Payment intent creation (manual flow); admin approval

---

## 2. Edge Cases

### 2.1 Bad Inputs
- [ ] Empty/invalid API key on exchange connect → validation error
- [ ] Invalid symbol on futures order → 400
- [ ] Negative qty/leverage → validation error
- [ ] SQL injection attempts in search → sanitized

### 2.2 Rate Limits
- [ ] Auth: 20+ requests in 15 min → 429
- [ ] Exchange connections: 10+ create/test in 15 min → 429
- [ ] Admin: 200+ in 15 min → 429

### 2.3 Invalid States
- [ ] Strategy run with kill switch ON → no orders placed
- [ ] Strategy run with futures disabled → blocked
- [ ] Expired coupon → invalid message
- [ ] Already-redeemed coupon → invalid message

---

## 3. Testnet Trading Validation (Binance / Bybit)

### 3.1 Binance Testnet
- [ ] Create connection with testnet API keys
- [ ] Futures test succeeds
- [ ] Futures enable; leverage/margin mode set
- [ ] Manual order placement (minimal size) works
- [ ] Position appears in Positions screen

### 3.2 Bybit Testnet
- [ ] Same flow as Binance
- [ ] Verify symbol whitelist (BTCUSDT, ETHUSDT, SOLUSDT)

---

## 4. Cron Runner Validation

- [ ] GET /api/runner/status (admin JWT) returns counts
- [ ] POST /api/runner/cron with x-cron-secret (from Railway Cron) runs
- [ ] POST /api/runner/cron with admin JWT runs
- [ ] POST /api/runner/cron without auth → 401
- [ ] Distributed lock prevents double-run (observe tick_runs)
- [ ] Kill switch blocks order placement

---

## 5. Security Tests

### 5.1 RLS
- [ ] User A cannot read User B's exchange connections (direct Supabase anon client)
- [ ] User A cannot read User B's strategy_runs
- [ ] Admin can read all via backend (service_role)

### 5.2 Privilege Escalation
- [ ] Non-admin cannot access /admin routes
- [ ] Non-admin cannot access /api/admin/*
- [ ] Non-admin cannot access /api/runner/execute-tick

### 5.3 Secret Leakage
- [ ] Build frontend; grep bundle for apiKey, apiSecret, service_role, RUNNER_CRON
- [ ] Toasts never show raw API errors containing secrets
- [ ] Smoke test report never includes tokens

---

## 6. Smoke Test Page

- [ ] Run All (Launch) preset executes
- [ ] Public tests pass without auth
- [ ] Auth tests pass when logged in
- [ ] Admin tests pass when admin
- [ ] Exchange/futures tests SKIP when VITE_ENABLE_EXCHANGE_SMOKE_TESTS not set
- [ ] Cron-secret test SKIP when VITE_ENABLE_RUNNER_CRON_TEST not set

---

## 7. Production Build

- [ ] `pnpm run build` (frontend) succeeds
- [ ] Backend build (if applicable) succeeds
- [ ] No console errors in production build
- [ ] No hardcoded testnet assumptions in prod UI
