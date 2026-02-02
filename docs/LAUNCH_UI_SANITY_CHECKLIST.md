# Launch UI sanity checklist

Use this list before release to confirm critical paths work.

## 1. Navigation and URLs

- [ ] Clicking each sidebar menu item updates the browser URL (e.g. Terminal → `/terminal`, Strategy Backtest → `/strategy-backtest`, Packages → `/packages`, Referrals → `/referrals`, Fees → `/fees`, Settings → `/settings`).
- [ ] Copy/pasting a URL into a new tab (e.g. `/strategy-backtest`) loads the same screen.
- [ ] Refreshing on a deep link (e.g. `/strategy-backtest`) keeps that screen; no redirect to `/`.
- [ ] Browser back/forward works after navigating between app screens.
- [ ] Unknown routes (e.g. `/foo`) show dashboard or a safe fallback.

## 2. Strategy Backtest

- [ ] Strategy Backtest page loads without runtime errors (no "useEffect is not defined" or similar).
- [ ] Backtest can be run and results display.
- [ ] "Go Live (Futures)" button appears only when there are results and a futures-enabled connection exists.

## 3. Payout request lifecycle

- [ ] User can request a referral payout from the Referrals page (wallet set in Settings, balance ≥ min).
- [ ] Request appears in Admin → Referrals → "Payout Requests (user-requested)".
- [ ] Admin can Approve, then Mark paid with BSC tx hash.
- [ ] User sees payout history with "Paid" and tx hash link when admin marks paid.

## 4. Coupon link

- [ ] Opening `/packages?coupon=CODE` (with a valid coupon code) shows Packages; after starting checkout and going to Payments, coupon is prefilled/applied (or applied on Payments when opened with coupon in state).
- [ ] Admin can copy a coupon link (e.g. `https://klineo.xyz/packages?coupon=CODE`) and share it.

## 5. Key CTAs

- [ ] Terminal: Connect Exchange navigates to Settings; Test Futures and Enable Futures work; Kill switch works.
- [ ] Strategy tab: Create from Backtest navigates correctly; Enable Futures CTA works; Manual Futures Order submit shows success/error toast.
- [ ] Referrals: Copy link and Copy code work; Request payout works (see section 3).
- [ ] Packages: Start/Buy buttons work and show loading/disabled where appropriate.
- [ ] Admin: Tabs load; actions show success/failure toasts; no double submit on key actions (loading/disabled states).

## 6. Build and secrets

- [ ] `pnpm run build` passes for frontend.
- [ ] Backend build passes.
- [ ] No secrets (API keys, tokens) are logged in app or backend.
