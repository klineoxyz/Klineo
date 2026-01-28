# KLINEO MVP Launch Readiness

**Last updated**: January 2026  
**Vision**: Make KLINEO the most viral product in crypto — trusted copy trading + profit-allowance model + 7-level referral.

---

## ✅ Ready for Launch

### 1. Smoke Test Visibility — FIXED

- **Dev**: All users see **Developer** → Smoke Test in the sidebar. Admins also see it under Admin.
- **Prod**: Admins always see **Smoke Test** under Admin (no env var required for the link). Page access in prod still respects `VITE_ENABLE_SMOKE_TEST_PAGE=true` when you want to lock the route.
- **Mobile**: Same logic in MobileNavSheet (Developer block in dev for non-admins, Admin block for admins).

### 2. Platform-Wide Live / Demo Mode — IMPLEMENTED

- **Single source of truth**: `DemoContext` — `isDemoMode` (true = Demo, false = Live). Persisted in `localStorage`.
- **TopBar**: Always shows **Live** or **Demo** badge. User menu includes **Switch to Live** / **Switch to Demo** so the whole app toggles in one place.
- **Screens that respect mode**:
  - **Copy Trading**: Uses demo copy setups when Demo, real API when Live.
  - **Positions, Orders, Trade History**: Use demo data when Demo, real API when Live.
  - **Portfolio**: In Demo shows placeholder + banner; in Live loads `/api/portfolio/summary`.
  - **Trading Terminal**: In Demo shows banner (“charts/order book use sample data; switch to Live and connect Binance/Bybit…”); in Live uses real/market data.
- **Strategy Backtest**: “Add to Demo” sets demo mode and seeds demo trades/positions/copy setups — same platform-wide mode.

When **Live** is on, the whole app uses real APIs and exchange connections. When **Demo** is on, the whole app uses demo/placeholder data and clear banners.

### 3. Exchange Connections (Binance)

- **Settings → Exchange**: User can **connect Binance** (production + testnet). Keys are stored encrypted; **Test connection** validates before use.
- **Onboarding**: Joining fee + package purchase (credit-based profit allowance) are required before copy trading; exchange connection is prompted in onboarding and Settings.

### 4. Bybit — NEXT STEP

- **Current**: Backend and UI support **Binance** only (`exchange === 'binance'`).
- **To add for MVP**:
  - Backend: In `exchange-connections` allow `exchange === 'bybit'`, add Bybit test-connection logic (or stub that returns “Bybit support coming soon”).
  - Frontend: In Settings, add **Bybit** as a second exchange option (tabs or dropdown: Binance | Bybit), same flow (label, env, API key/secret, test).

### 5. Onboarding Users

- **Sign up** → Profile created → **Onboarding wizard** (optional) for join fee, packages, exchange connection.
- **Joining fee** (e.g. $100) required before connecting exchange or buying packages (enforced in backend).
- **Packages**: Entry $100, Pro $200, Elite $500 — each grants profit allowance (3x, 5x, 10x). User buys a package to get allowance; when `profit_used >= profit_allowance`, trading/copy actions return 402 `ALLOWANCE_EXCEEDED`.

### 6. Asking Users to Connect Binance and Bybit

- **Where**:
  - **Settings → Exchange**: Primary place. Copy: “Connect your Binance (and soon Bybit) API keys to enable copy trading and portfolio tracking.”
  - **Onboarding wizard**: Step that says “Connect at least one exchange (Binance now, Bybit soon)” and links to Settings or in-wizard connect.
  - **Dashboard / Copy Trading**: If no connection, show CTA: “Connect Binance in Settings to start copy trading. Bybit coming soon.”

- **Safety**: Only request **read + trade** (and optionally withdraw if you support it). Recommend **sub-accounts** or **restricted keys** in your docs.

---

## Launch Checklist

| Item | Status |
|------|--------|
| Smoke Test visible (dev for all, prod for admins) | ✅ |
| Platform-wide Live/Demo toggle (TopBar + all relevant screens) | ✅ |
| Binance connect + test in Settings | ✅ |
| Bybit in backend + Settings UI | 🔲 Next |
| Onboarding: joining fee → packages → exchange connect | ✅ (flow exists; copy can stress Binance/Bybit) |
| Profit allowance + 402 gating on copy/trading | ✅ |
| 7-level MLM distribution on fee + package sales | ✅ (backend/logic in place) |

---

## How to Ship “Bybit Ready”

1. **Backend**  
   - In `backend-skeleton/src/routes/exchange-connections.ts`: allow `body('exchange').isIn(['binance','bybit'])`, and in the test endpoint branch on `exchange` to call Binance or a Bybit client (or return “Bybit test coming soon”).

2. **Frontend**  
   - In `Settings.tsx`: add exchange selector (Binance / Bybit). Reuse the same form (label, environment, API key, API secret); send `exchange: 'bybit'` when Bybit is selected.

3. **Copy**  
   - Replace “Connect your Binance API keys” with “Connect your Binance or Bybit API keys” once Bybit is live.

---

## Summary

- **Smoke Test**: Visible in dev for everyone (Developer section) and in prod for admins (Admin section).
- **Live/Demo**: One toggle in the TopBar user menu; all relevant screens (Copy Trading, Positions, Orders, Trade History, Portfolio, Trading Terminal) use the same mode.
- **Binance**: Supported end-to-end (connect, test, use for copy/portfolio).
- **Bybit**: Ready to add in backend + Settings UI when you implement the Bybit client/test.
- **Onboarding**: Joining fee → packages → “Connect Binance (and Bybit when available)” is the path; MVP is ready to onboard users and ask them to connect Binance now and Bybit as soon as it’s integrated.
