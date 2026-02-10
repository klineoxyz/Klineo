# KLINEO — High-Level Product Overview

**Version:** 1.0  
**Last updated:** February 2026

---

## 1. What Is KLINEO?

KLINEO is a **professional crypto copy-trading platform** for centralized exchanges. Users connect their Binance or Bybit account via API keys, browse verified Master Traders, set risk parameters, and configure copy trading (allocation, risk limits). When the copy execution engine is live, the platform will replicate master trades to followers in real time. Users retain full custody of their funds on the exchange.

**Implementation status:** Copy *configuration* (who to copy, allocation %, pause/stop) is fully supported. The *order-mirroring engine* that places trades on followers’ accounts when masters trade is planned; see `docs/PRO_COPY_TRADING_STANDARDS.md` and `docs/PLATFORM_AUDIT_REPORT.md` for current scope.

---

## 2. Target Users

| Persona | Description |
|--------|-------------|
| **Copy Traders** | Users who want to mirror trades from verified Master Traders |
| **Master Traders** | Experienced traders who earn when others copy them |
| **Platform Admins** | Manage users, traders, subscriptions, payments, and applications |

---

## 3. Core Value Propositions

- **Copy trading** — Configure Master Traders to copy; allocation and risk limits; when the copy engine is live, trades will replicate automatically
- **Risk control** — Allocation %, max position %, daily loss limits, pause/stop
- **Verified traders** — Master Traders are vetted before approval
- **Multiple exchanges** — Binance and Bybit (spot + futures)
- **Transparent fees** — Joining fee + profit-based packages + referral rewards

---

## 4. Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                         │
│  React · Vite · TypeScript · Tailwind · Supabase Auth Client     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API (Railway)                       │
│  Node.js · Express · JWT Auth · Rate Limiting                    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
            │  Supabase   │ │ Binance API │ │   Bybit API     │
            │  PostgreSQL │ │  (exchange) │ │   (exchange)    │
            │  Auth       │ │             │ │                 │
            └─────────────┘ └─────────────┘ └─────────────────┘
```

---

## 5. Key Flows

### 5.1 Copy Trader Journey
1. Sign up → Pay joining fee → Buy package (profit allowance)
2. Connect exchange (Binance/Bybit) in Settings
3. Browse Marketplace → Select Master Trader → Configure allocation
4. Copy Trading dashboard → Monitor PnL, pause/stop as needed
5. Portfolio & Trade History for performance tracking

### 5.2 Master Trader Journey
1. Apply via “Become a Master Trader” (no package required)
2. Submit form with trading experience and proof
3. Admin reviews in Admin Panel → Approve or Reject
4. Approved traders get 6–12 months free, earn from referral pool
5. If rejected, user can re-apply

### 5.3 Monetization Flow
- **Joining fee** — One-time to access copy trading
- **Packages** — Profit allowance ($100 / $200 / $500 tiers)
- **Referrals** — 7-level MLM; 70% of joining + package revenue to referral pool
- **Platform fees** — % of volume (configurable per tier)

---

## 6. Main Features by Area

| Area | Features |
|------|----------|
| **Marketplace** | Browse traders, filters, trader profiles, “Start Copying” |
| **Copy Trading** | Active copies, allocations, Pause/Resume/Stop, summary cards |
| **Dashboard** | Equity, PnL, active copies, alerts |
| **Portfolio** | Balances, PnL, equity chart |
| **Terminal** | Charts, order book, place orders (spot/futures) |
| **Strategy Backtest** | Backtest strategies, launch demo or live |
| **Settings** | Profile, exchange connections, risk settings |
| **Admin** | Users, traders, subscriptions, payments, Master Trader requests, coupons, audit logs |

---

## 7. Demo vs Live Mode

- **Demo** — Sample data only; no real funds; used to explore the app
- **Live** — Real exchange connections, real balances, real trading
- Mode toggle in top bar; all data (Dashboard, TopBar, Copy Trading) respects this mode

---

## 8. Security & Compliance

- JWT authentication on all API calls
- User data isolated by `user_id`
- Admin routes require admin role
- Exchange API keys stored encrypted
- Rate limiting (e.g. 500 req/15 min) to prevent abuse

---

## 9. Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind, Radix UI |
| Backend | Node.js, Express, Supabase client |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel (frontend), Railway (backend) |
| Payments | CoinPayments, manual USDT (BEP20) |

---

## 10. Environment & Configuration

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API URL (frontend) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_URL` | Backend Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend service role key |
| `API_RATE_LIMIT_MAX` | API rate limit (default 500/15 min) |

---

## 11. Key Documents in Repo

| Document | Description |
|----------|-------------|
| `docs/PRO_COPY_TRADING_STANDARDS.md` | **Pro copy trading checklist** — expert standards, implementation status, copy engine gap |
| `docs/PLATFORM_AUDIT_REPORT.md` | Security audit, RLS, kill switch, copy engine note |
| `docs/LIVE_MODE_AUDIT.md` | Live mode, data sources, access control |
| `docs/PAYMENTS_FLOW.md` | Payments and checkout flow |
| `DEPLOYMENT_GUIDE.md` | Deployment instructions |
| `DEV_DOC.md` | Development setup and conventions |

---

*This document is for internal use. Do not publish to GitHub without review.*
