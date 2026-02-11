# KLINEO Frontend — Full Structured Overview (Onboarding Reference)

This document maps the current KLINEO frontend so you can build an accurate, conversion-optimized onboarding system. It reflects real routes, components, key selectors, feature list, payment/exchange flows, demo vs live, tier enforcement, and recent additions.

---

## 1. Main Pages and Routes

### Public (unauthenticated)

| Path | View / Purpose |
|------|----------------|
| `/` | Landing |
| `/pricing` | Pricing |
| `/how-it-works` | How It Works |
| `/about` | About |
| `/faq` | FAQ |
| `/contact` | Contact |
| `/blog` | Blog |
| `/changelog` | Changelog |
| `/terms-of-service` | Terms of Service |
| `/privacy-policy` | Privacy Policy |
| `/risk-disclosure` | Risk Disclosure |
| `/login` | Login |
| `/signup` | Sign Up |
| `/ref/:code` | Ref redirect (store code, redirect to signup) |

### App (authenticated)

| Path | View ID | Purpose |
|------|---------|--------|
| `/dashboard` | dashboard | Dashboard |
| `/terminal` | trading-terminal | Trading Terminal |
| `/dca-bots` | dca-bots | DCA Bots |
| `/positions` | positions | Positions |
| `/orders` | orders | Orders |
| `/trade-history` | trade-history | Trade History |
| `/portfolio` | portfolio | Portfolio |
| `/strategy-backtest` | strategy-backtest | Strategy Backtest |
| `/packages` | subscription | Packages (billing / subscription) |
| `/referrals` | referrals | Referrals |
| `/fees` | fees | Fees & Allowance |
| `/settings` | settings | Settings |
| `/support` | support | Support |
| `/admin` | admin | Admin (admin only) |
| `/payments` | payments | Payments (intents, TX hash, coupons) |
| `/checkout` | checkout | Checkout |
| `/marketplace` | marketplace | Marketplace (also trader-profile, copy-setup via state) |
| `/copy-trading` | copy-trading | Copy Trading |
| `/master-trader-application` | master-trader-application | Become a Master Trader |
| `/notifications-center` | notifications-center | Notifications |
| `/onboarding-wizard` | onboarding-wizard | Onboarding Wizard |
| `/smoke-test` | smoke-test | Smoke Test (dev or admin + flag) |
| `/ui-states-demo` | ui-states-demo | UI States Demo (dev or admin) |

**Routing notes**

- `trader-profile` and `copy-setup` render on path `/marketplace` with `location.state` (subView + trader data).
- Admin: only if `isAdmin`; otherwise redirect to dashboard.
- Legal pages (terms, privacy, risk) render for everyone (auth or not).

---

## 2. Navigation Structure

### Sidebar (desktop, `md:flex`)

- **Sections**: Primary, Trading, Portfolio, Account, System.
- **Primary**: Dashboard, Marketplace, Copy Trading.
- **Trading**: Terminal, DCA Bots, Positions, Orders, Trade History.
- **Portfolio**: Portfolio, Strategy Backtest.
- **Account**: Packages, Referrals, Fees.
- **System**: Settings, Support.
- **Admin** (if `isAdmin`): Admin link.
- **Optional**: UI States Demo (dev or admin), Smoke Test (dev or admin + `VITE_ENABLE_SMOKE_TEST_PAGE`).
- **Collapse**: Toggle collapses to icon-only; logo stays.
- **Active**: `activeView === item.id`; accent bar on left, `pathForView(item.id)` for `to`.

### TopBar

- Logo (links to dashboard).
- **Demo/Live toggle**: Switch Demo ↔ Live; `aria-label`: "Switch to Demo" / "Switch to Live".
- Connection status (when live).
- Active copy count (demo or live).
- Emergency Pause / Start All (copy trading) — modals.
- Current time.
- Notifications bell → Notifications Center; `aria-label` includes unread count when > 0.
- User menu: Profile, Settings, Master Trader (if approved), Logout.
- **Mobile**: Hamburger opens `MobileNavSheet` (same nav items).

### Mobile

- `MobileNavSheet`: full-screen sheet, same sections and items, `aria-label="Navigation menu"`.

---

## 3. Major UI Components by Page

### Dashboard (`/dashboard`)

- **Header**: "Dashboard", subtitle "Overview of your trading activity", Refresh button.
- **Cards**: Equity/USDT (when live + connection), Total PnL, Unrealized PnL, Active Copy Setups (with max e.g. 5), Sparklines (portfolio, daily PnL).
- **Paused copy setups**: List with Resume; if none, CTA to Marketplace or Copy Trading.
- **DCA**: Summary (active bots, total allocated, etc.), "Create DCA Bot" opens `CreateBotModal`.
- **Quick links**: Marketplace, Copy Trading, Terminal, Strategy Backtest, Packages (when allowance/joining not met).
- **No stable `id` on root**; use headings and button text or add `data-onboarding` attributes for tours.

### Marketplace (`/marketplace`)

- **Header**: "Marketplace", "Browse and copy professional traders", **Become a Master Trader** (link to `/master-trader-application`).
- **Filters**: Search, Risk, Sort (ROI, Drawdown, Followers), Status; Advanced Filters button.
- **Tabs**: **Traders** | **Strategies** (Radix Tabs; `TabsList` with `TabsTrigger` value `traders` / `strategies`).
- **Traders tab**: Grid of trader cards (name, risk badge, ROI, drawdown, followers, days active), **View & Copy** → trader profile.
- **Strategies tab**: Grid of strategy cards (name, by trader, symbol/interval, description, backtest ROI/win rate/max DD/trades), **View & Copy** → same trader profile (copy that trader).
- **Refresh** button below.
- **Empty**: EmptyTraders component with Refresh.
- **Error**: ErrorState with Try Again.
- **Note**: Radix Tabs generate dynamic IDs (e.g. `radix-:r5:-content-discounts`); prefer `[data-slot="tabs-content"]`, role, or tab value for targeting.

### Trader Profile (same path, state `subView: "trader-profile"`)

- Back → Marketplace.
- Trader name, risk badge, status, verified badge.
- **Copy Trader** button → navigates to copy-setup with trader id/name/slug.
- Metrics: ROI, Max Drawdown, Total Volume, Followers, Performance Points.
- Performance chart with period tabs (1m, 3m, 6m, 1y, all).
- Strategy Description card, Risk Disclosure card.

### Copy Setup (same path, state `subView: "copy-setup"`)

- Back → trader profile.
- "Copy Setup" title, "Configure risk parameters for copying {name}".
- Form: Allocation (percentage or fixed), Max position %, Spot only switch.
- Submit → `POST /api/copy-setups`, then navigate to copy-trading.

### Copy Trading (`/copy-trading`)

- **Header**: "Copy Trading", summary of active/paused/stopped and total allocation.
- **Table**: Trader, Allocation %, Max Position %, Status, PnL, Created, Actions (Pause/Resume/Stop).
- **Empty**: EmptyState; CTA to Marketplace.
- **Demo**: Can show demo copy setups from `DemoContext` in addition to API data.

### Trading Terminal (`/terminal`)

- Chart (TradingView-style or Lightweight), symbol/interval selectors, order book, positions/orders panels.
- **Note**: `aria-label="Hide order book"` on one control; no comprehensive `id` set for onboarding—consider adding.

### DCA Bots (`/dca-bots`)

- **Header**: "DCA Bots", **Create DCA Bot** (opens `CreateBotModal`).
- **Top 10 / Featured**: Section "Top 10 Bots by ROI" (public), "Copy & run" from template.
- **Presets**: Tabs (e.g. by risk), search, preset cards → "Use preset" opens create modal with preset.
- **My Bots table**: Name, Pair, Timeframe, Status (running/paused/stopped), Realized PnL, Actions (Edit, Pause/Play, Stop).
- **Edit**: Opens same `CreateBotModal` in edit mode.
- **Tier**: `maxDcaBots` from entitlement (0 = unlimited); `atBotLimit` blocks new spot bots when at limit.

### Strategy Backtest (`/strategy-backtest`)

- **Chart**: `#backtest-chart` (Card).
- **Strategy config**: Strategy type, direction, RSI/MA/breakout/mean reversion/momentum params, volume filter, ATR.
- **Filters**: Strategy type, Risk tier, Timeframe, Pairs, Single/Multi pair mode.
- **Run backtest**: Fetches klines (or synthetic), runs backtest, shows KPIs (trades, win rate, PnL, ROI, max drawdown, risk tier).
- **Trade table**: Entry/exit, direction, PnL, etc.
- **Actions**: Optimize, Share, **List on Marketplace** (only if `GET /api/me/trader` returns a trader and has results), **Go Live (Futures)**, Review & Start Trading, **Run Demo**.
- **Go Live modal**: Connection, leverage, margin/position mode, order size %, risk checkbox `#go-live-risk`.
- **List on Marketplace modal**: Name, Description; submit creates `marketplace_strategies` row (listed).
- **Launch confirmation**: AlertDialog for Review & Start Trading (`#risk-acceptance`).

### Portfolio (`/portfolio`)

- Summary cards (equity, PnL, open positions, active copy setups).
- No route params; uses portfolio API.

### Positions (`/positions`)

- Open positions table (symbol, side, size, entry, mark, PnL, trader/copy setup, etc.).

### Orders (`/orders`)

- Orders table.

### Trade History (`/trade-history`)

- Trades table; demo mode shows backtest-derived demo trades.

### Packages (`/packages`, subscription)

- **Joining fee**: Card with price, **Pay Joining Fee** (or similar) → creates intent, navigates to Payments with `newIntent` + optional coupon.
- **Packages**: Entry ($100/50), Pro ($200), Elite ($500) with profit allowance copy; **Buy** → intent → Payments.
- **Coupon**: `?coupon=CODE` in URL; applied at checkout.
- **Collapsible**: Revenue split explanation.
- **joiningFeePaid**, **activePackageId** from entitlement; CTAs depend on these.

### Payments (`/payments`)

- **Feature flag**: If manual payments disabled, shows message (no 503).
- **Create intent**: Kind (joining_fee / package), package code, optional coupon; **Validate coupon**; create → show Safe address, amount, QR, **Submit TX** form (TX hash, from wallet).
- **Intent list**: Table of intents (status, amount, coupon, TX hash, etc.); Approve/Reject only admin; user sees Submit/Cancel.
- **IDs**: `#mark-paid-tx`, `#payout-request-tx` (admin); payment form uses `fromWallet`, `txHash`, etc.
- **viewData**: Can pass `newIntent`, `couponCode`, `couponKind` from Packages for post-checkout flow.

### Checkout (`/checkout`)

- Used for checkout flow (e.g. redirect from billing); may show plan selection and then redirect to payments or external.

### Settings (`/settings`)

- **Tabs**: Profile, Exchange Connections, Referral, etc.
- **Profile**: Full name, username, timezone, avatar (upload with `id="profile-photo-label"`, `aria-label="Upload profile photo"`), referral wallet, payment wallet (BSC).
- **Exchange connections**: List of connections (exchange, label, env, status); **Connect exchange** opens `ConnectExchangeModal`; Test, Re-enable, Futures enable, Update credentials, Manage futures.
- **Referral**: Claim referral code input; My Referrals; payout wallet; request payout.
- **My discounts**: Table of admin-assigned discounts (if any).
- **Connect Exchange** button: opens modal (`connectModalOpen`).

### Connect Exchange Modal

- **Steps**: Exchange selector (Binance, Bybit, etc.), Environment (production/testnet), Label, API Key, API Secret.
- **Create** → `exchangeConnections.create` then `exchangeConnections.test`; success → "Connected" + latency; failure → error message (sanitized).
- **Step-by-step guide** (right column) from `exchangeSteps` config.
- **aria-label="Close"** on close button.

### Referrals (`/referrals`)

- Referral code, referral link (copy), earnings summary (total, paid, pending, available, requestable, min payout).
- Payout wallet, **Request Payout**.
- Payout requests table.
- My Referrals table (referred user, joined, spend, your earnings).
- Tier breakdown (L1–L7) with `role="img"` and `aria-label` for percentages.
- SVG gradients `#ref-line`, `#ref-node-top`, etc. (decorative).

### Fees (`/fees`)

- **Fees & Allowance** title.
- Alert: credit-based allowance explanation.
- Cards: This month's profit, Allowance used, Packages purchased, etc.
- Fee ledger table (period, realized profit, platform fee, status, settlement).

### Admin (`/admin`)

- **Tabs** (Radix): Users, Traders, Subscriptions, Revenue & Payments, Referrals, Platform Settings, Payments (intents), Master Trader Requests, Discount Coupons, Financial Ratios, Runner, Audit Logs.
- **Discount Coupons**: Global coupons table, Shareable Coupon Links, User-specific discounts; coupon create form (e.g. `#coupon-code`, `#discount-percent`, `#max-redemptions`, `#duration-months`, `#coupon-expiry`, `#coupon-description`); Copy URL buttons (type="button", no form submit).
- **Platform Settings**: Fee inputs `#starter-fee`, `#pro-fee`, `#unlimited-fee`; ConfirmationDialog for save.
- **Payments**: Payment intents table (approve/reject), discount column, BSC scan link, Safe link.
- **Master Trader Requests**: Application list; View opens dialog; Approve/Reject.
- **Audit**: Audit log table.
- **Runner**: Cron status, tick runs.
- **Financial Ratios**: AdminFinancialRatios component (charts, gradients).

### Master Trader Application (`/master-trader-application`)

- Form: full name, email, country, telegram, exchange, experience, trading style, markets, avg return, strategy description, why Master Trader, profile URL.
- **Proof upload**: `id="master-trader-proof-upload"`; max size 10 MB.
- Submit → `POST /api/master-trader-applications`; then status (pending / approved / rejected) with message.

### Notifications Center (`/notifications-center`)

- List of notifications; **Unread only** filter `id="unread-only"`.

### Onboarding Wizard (`/onboarding-wizard`)

- **Steps**: 1 Welcome, 2 Select Exchange (Binance, Bybit, OKX, Bitget), 3 Connect API Key, 4 Set Risk Controls, 5 Choose First Trader (mock list).
- Progress bar, Next/Back, Skip → marketplace, Complete → dashboard.
- Uses `ValidatedInput` / `ValidatedNumberInput`; validation helpers for API key/secret, leverage, percentage.

### Auth (Login / Sign Up)

- **Login**: `id="email"`, `id="password"`.
- **Sign up**: `id="fullName"`, `id="email"`, `id="password"`, `id="confirmPassword"`, `id="terms"` (checkbox).

---

## 4. Key Selectors and IDs (Summary)

Use these for anchors; add `data-onboarding` or `data-tour` where missing for stable tours.

| Element | Selector / ID |
|---------|----------------|
| Backtest chart | `#backtest-chart` |
| Go Live risk checkbox | `#go-live-risk` |
| Risk acceptance (launch) | `#risk-acceptance` |
| Profile photo label | `#profile-photo-label` |
| Master trader proof upload | `#master-trader-proof-upload` |
| Admin coupon code | `#coupon-code` |
| Admin discount percent | `#discount-percent` |
| Admin fee inputs | `#starter-fee`, `#pro-fee`, `#unlimited-fee` |
| Admin mark-paid TX | `#mark-paid-tx` |
| Login email/password | `#email`, `#password` |
| Sign up fullName, email, password, confirmPassword, terms | `#fullName`, `#email`, `#password`, `#confirmPassword`, `#terms` |
| Unread only (notifications) | `#unread-only` |
| Demo/Live toggle | `aria-label="Switch to Demo"` / `"Switch to Live"` |
| Notifications bell | `aria-label` includes unread count |
| Radix components | `data-slot` (e.g. `data-slot="card"`, `data-slot="tabs-content"`) |

**Note**: Radix Tabs/Dialog generate dynamic IDs (`radix-:r1:`-style). Prefer `[data-slot="..."]`, `role`, or `TabsTrigger`/`TabsContent` by value for targeting. No `data-cursor-element-id` in codebase; add stable IDs for onboarding if needed.

---

## 5. Current Feature List (Implemented)

- **Copy trading**: Marketplace (traders + strategies) → Trader Profile → Copy Setup → Copy Trading; copy-setups API; allocation %, max position %, pause/stop.
- **DCA Bots**: Create/Edit/Pause/Stop; presets; Top 10 by ROI (public); tier limit (Entry 5, Pro 10, Elite unlimited); spot/futures; engine runs on backend.
- **Strategy Backtest**: Backtest with live or synthetic klines; RSI, MA crossover, breakout, mean reversion, momentum; optimize; share; **List on Marketplace** (Master Traders only); Go Live (Futures); Run Demo.
- **Marketplace strategies**: Master Traders list backtest strategies; Marketplace has **Strategies** tab; View & Copy → copy that trader.
- **Referrals**: Referral code, link, earnings, payout wallet, request payout, my referrals; claim on first login from stored ref code.
- **Packages / billing**: Joining fee + packages (Entry/Pro/Elite); credit-based profit allowance; payment intents (manual USDT BEP20 → Safe); admin approve; coupons (global + user-specific).
- **Exchange connections**: Binance, Bybit; production/testnet; create, test, re-enable, update credentials; futures enable/manage.
- **Trading Terminal**: Chart, order book, positions/orders (live).
- **Positions / Orders / Trade History**: Live data; demo mode shows demo data from backtest.
- **Portfolio**: Summary (PnL, positions, active copy setups).
- **Fees**: Allowance explanation, fee ledger (UI).
- **Admin**: Users, Traders, Subscriptions, Revenue, Referrals, Platform Settings, Payment intents, Master Trader Requests, Discount Coupons, Financial Ratios, Runner, Audit.
- **Master Trader**: Application form + proof upload; admin approve → row in `traders` → appears in Marketplace.
- **Notifications**: Notifications center; unread count in TopBar.
- **Demo mode**: Toggle in TopBar; Trade History/Orders/Positions/Copy Trading can show demo data; Strategy Backtest "Run Demo" injects demo trades/setups.
- **Onboarding Wizard**: 5-step flow (welcome, exchange, API key, risk, first trader); skip → marketplace, complete → dashboard.

---

## 6. Payment Flow Steps

1. **Packages page** (`/packages`): User sees joining fee and packages (Entry/Pro/Elite). Optional `?coupon=CODE`.
2. **Pay joining fee**: Click Pay Joining Fee → `POST /api/payments/intents` with `kind: "joining_fee"` and optional `coupon_code` → response has `intent`, `treasury_address`, `amount_usdt`, `safe_link`.
3. **Navigate to Payments**: `onNavigate("payments", { newIntent, couponCode, couponKind: "joining_fee" })`. Payments page shows deposit instructions (Safe address, amount, QR), optional coupon prefill/validate.
4. **User sends USDT (BEP20)** to Safe; then in Payments: **Submit TX** form (TX hash, from wallet) for that intent → `POST /api/payments/intents/:id/submit` (or equivalent). Status → pending_review.
5. **Admin**: Admin → Payments tab; Approve or Reject intent. On approve: `member_active`, `active_package_code` (if package), entitlements (joining_fee_paid, profit allowance), referral rewards if applicable.
6. **Package purchase**: Same flow with `kind: "package"`, `package_code` (e.g. ENTRY_100). After approve, user gets that package’s profit allowance and DCA limits.
7. **Coupon**: Validate via `GET /api/payments/validate-coupon?code=...&kind=...&package_code=...`; applied at intent creation; discount % and final amount shown.

---

## 7. Exchange Connection Flow Steps

1. **Settings** → Exchange Connections section.
2. Click **Connect exchange** (or similar) → **ConnectExchangeModal** opens.
3. **Select exchange** (e.g. Binance, Bybit), **environment** (production/testnet), optional **label**.
4. Enter **API Key** and **API Secret** (min length validated).
5. **Create** → `exchangeConnections.create({ exchange, environment, label, apiKey, apiSecret })` → backend stores encrypted; then `exchangeConnections.test(connection.id)`.
6. **Result**: Success → "Connected" + latency; failure → sanitized error message.
7. **Post-connect**: In Settings, connection appears in list; user can Test, Re-enable (if disabled), **Futures enable** (if supported), Update credentials, Manage futures.
8. **Futures**: FuturesEnableModal for enabling futures on a connection; leverage, margin mode, etc.

---

## 8. Demo vs Live Differences

- **Toggle**: TopBar switch; `isDemoMode` from `DemoContext`; `aria-label` "Switch to Demo" / "Switch to Live".
- **Demo mode**:
  - **Trade History / Orders / Positions**: Show demo data (from Strategy Backtest "Run Demo" or persisted demo data) instead of live API.
  - **Copy Trading**: Can show demo copy setups in addition to real ones; "Start All" / "Pause" in TopBar disabled or no-op for demo.
  - **Dashboard**: Sparklines mock; copy setups can include demo; DCA summary may be live only.
  - **Portfolio / Terminal**: Typically still call live APIs unless explicitly gated; TopBar shows "Demo" state.
- **Persistence**: Demo on/off and demo data (trades, orders, positions, copySetups) persisted in localStorage (`klineo_demo_mode`, `klineo_demo_data`).
- **Onboarding**: Tours and tooltips should branch on `isDemoMode` (e.g. "You're in Demo" vs "Live trading") and on entitlement (joining fee paid, package, allowance).

---

## 9. Tier / Package Enforcement Logic

- **Source**: `GET /api/me/entitlement` returns:
  - `joiningFeePaid`, `status` (inactive | active | exhausted), `activePackageId`, `profitAllowanceUsd`, `profitUsedUsd`, `remainingUsd`, `hasReferral`, `maxDcaBots`.
- **Joining fee**: Required before packages and before copy trading (backend returns e.g. `JOINING_FEE_REQUIRED`); Packages page and Copy Setup show CTAs or errors accordingly.
- **Profit allowance**: Copy trading uses allowance; when exhausted, backend can return `ALLOWANCE_EXHAUSTED`; user must buy another package to get more allowance.
- **DCA limits** (backend `getMaxDcaBots(activePackageId)`):
  - Entry / Starter: 5
  - Pro / Booster: 10
  - Elite / Establish / Unlimited: 0 (unlimited)
  - No package: 0
- **Packages**: Entry ($100, 50% promo), Pro ($200), Elite ($500); profit allowance per package (e.g. $300, $1,000, $5,000) from backend.
- **Referral**: Optional claim on first login; referral code required for some flows (config-dependent). Payouts only when payment approved and amount > 0.

---

## 10. Recently Added Features (Not Yet Documented Elsewhere)

- **Marketplace Strategies**: Master Traders can list a backtest strategy from Strategy Backtest (name, description, config, backtest summary). Marketplace has **Strategies** tab; strategies show trader; "View & Copy" copies that trader. API: `GET/POST /api/marketplace-strategies`, `GET /api/marketplace-strategies/my`, `GET /api/me/trader`.
- **DCA Bots**: Top 10 by ROI (public) on DCA Bots page; "Copy & run" from template; Create/Edit modal with preset and template support; tier-based spot bot limit.
- **Payment intents**: Discount % column; coupon validation and application at intent creation; admin approve flow with referral allocation when amount > 0.
- **Admin Discount Coupons**: Copy coupon URL buttons (type="button", preventDefault); no onFocus reload on Discounts tab to avoid "loading" on copy; shareable coupon links section.
- **Strategy Backtest**: "List on Marketplace" button and modal (Master Trader only); backtest chart `#backtest-chart`.

---

## 11. UI / Structure Notes (Refactors and Conventions)

- **Layout**: App shell = TopBar + Sidebar (or mobile sheet) + main content; `main` has `flex-1 overflow-y-auto overflow-x-hidden min-w-0`.
- **Cards**: Most content in `Card` with `data-slot="card"` (from UI library).
- **Tabs**: Radix Tabs; dynamic IDs; use `data-slot="tabs-content"` and value for targeting.
- **Modals**: Radix Dialog/AlertDialog; no single consistent `id` on all modals—identify by title or first heading.
- **Forms**: Many forms use shadcn/ui Input/Label/Select; Login/SignUp and Admin have explicit `id`s; others rely on labels and placeholders.
- **No global `data-cursor-element-id`**: Add stable `data-onboarding` or `id` for tour steps where needed.
- **Error boundaries**: Main content wrapped in ErrorBoundary; fallback suggests "Go to Dashboard".

---

## 12. Recommended Onboarding Anchors (Stable Targets)

To avoid broken tooltips and fake steps, prefer:

- **Routes**: Use pathnames and `viewForPath(pathname)` for "which page" (dashboard, marketplace, etc.).
- **Sidebar**: `pathForView(item.id)` and link `to`; active state by `activeView === item.id`.
- **TopBar**: Demo/Live by `aria-label`; notifications by `aria-label`.
- **Dashboard**: First heading "Dashboard", Refresh button, "Create DCA Bot" (if present), CTA cards (Marketplace, Copy Trading, Packages).
- **Marketplace**: Tabs by value `traders` / `strategies`; "Become a Master Trader" link; trader/strategy cards and "View & Copy" buttons.
- **Copy Setup**: Heading "Copy Setup", allocation inputs, submit button.
- **Packages**: "Pay Joining Fee" / "Buy" buttons; coupon in URL.
- **Payments**: Create intent form, Safe address block, Submit TX form (tx hash, from wallet).
- **Settings**: Tabs (Profile, Exchange Connections, …); "Connect exchange" → ConnectExchangeModal.
- **Strategy Backtest**: `#backtest-chart`, "List on Marketplace" (conditional), "Run Demo", "Go Live (Futures)".
- **DCA Bots**: "Create DCA Bot", preset tabs, My Bots table, Edit/Pause/Play.
- **Admin**: Tab triggers by value (users, traders, discounts, payments, …); Discount form IDs; Platform fee IDs.

Add `data-onboarding="step-name"` (or similar) on critical CTA buttons and key sections so the onboarding system can target them without depending on text or fragile DOM order.

---

*Document generated for KLINEO onboarding design. Update this file when adding routes, major components, or tier/feature logic.*
