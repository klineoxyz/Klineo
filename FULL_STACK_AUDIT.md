# Full-Stack Audit — KLINEO

**Expert backend + frontend team (15) audit: current state, gaps, and what to do next.**

---

## 1. Executive Summary

| Area | Status | Gap |
|------|--------|-----|
| **Frontend UI** | ✅ Rich: auth, dashboard, marketplace, copy trading, settings, admin, etc. | All data is **mock** or **hardcoded**. |
| **Frontend ↔ Supabase** | ❌ Not wired | `supabase` client exists but **never imported** outside `lib/supabase.ts`. |
| **Frontend ↔ Backend API** | ❌ Not wired | No API client, no `VITE_API_BASE_URL` usage, no fetch to Railway. |
| **Auth** | ❌ Mock only | Login/SignUp set local `isAuthenticated`; no Supabase Auth. |
| **Backend** | ✅ Skeleton ready | `/health`, `/api/auth/me`, `/api/auth/admin/users`; JWT + Supabase. |
| **Database (Supabase)** | ⚠️ Partial | **Only `user_profiles`**. No tables for traders, copies, positions, orders, fees, etc. |

**Verdict:** UI and backend skeleton are in place. **Auth, API wiring, and most DB tables are missing.** The database is **not** fully built for the current UI.

---

## 2. Frontend Audit

### 2.1 What Exists (UI)

| Screen / Feature | Exists? | Data source |
|------------------|---------|-------------|
| Landing, Pricing, How it works, About, FAQ, Contact, Blog, Changelog | ✅ | Static / mock submit |
| Login, Sign up | ✅ | **Mock** — `handleLogin` / `handleSignUp` only set `isAuthenticated` |
| Dashboard | ✅ | **Mock** — `generateSparklineData`, hardcoded metrics, `setTimeout` “Simulate data fetch” |
| Marketplace | ✅ | **Hardcoded** `traders` array (6 traders) |
| Trader profile | ✅ | **Hardcoded** `performanceData` |
| Copy setup, Copy trading | ✅ | **Hardcoded** `activeCopies` |
| Portfolio | ✅ | **Hardcoded** `equityData`, `assets` |
| Positions | ✅ | **Hardcoded** `positions` |
| Orders | ✅ | **Hardcoded** `openOrders`, `filledOrders`, `cancelledOrders` |
| Trade history | ✅ | **Hardcoded** `trades` |
| Fees | ✅ | **Hardcoded** `feeLedger` |
| Referrals | ✅ | **Hardcoded** `earningsHistory` |
| Subscription | ✅ | **Hardcoded** `plans` |
| Payments | ✅ | **Hardcoded** `payments` |
| Settings | ✅ | Forms only; **no load/save** to backend |
| Support | ✅ | **Hardcoded** `tickets` |
| Notifications | ✅ | **Mock** `mockNotifications` |
| Onboarding wizard | ✅ | **Mock** `mockTraders`, `exchanges`; **no persistence** |
| Checkout | ✅ | **Mock** payment, `setTimeout` |
| Master trader application | ✅ | Form only; **no submit** to backend |
| Admin | ✅ | **Hardcoded** `users`, `traders`, `subscriptionPayments`, etc. |
| Trading terminal (old + new) | ✅ | **Mock** order book, recent trades, chart data |
| Strategy backtest | ✅ | **Mock** KPIs, `backtestTrades`, `strategies` |
| UI states demo | ✅ | **Mock** (dev-only) |

### 2.2 Auth Flow (Current vs Required)

| Step | Current | Required |
|------|---------|----------|
| Login | `handleLogin` → `setIsAuthenticated(true)` | `supabase.auth.signInWithPassword` → store session → call `/api/auth/me` for role |
| Sign up | `handleSignUp` → `setIsAuthenticated(true)` | `supabase.auth.signUp` with `data: { full_name }` → confirm → login |
| Session | None; lost on refresh | `supabase.auth.getSession` / `onAuthStateChange` |
| Role / admin | `isAdmin` from `VITE_DEV_ADMIN` only | From `/api/auth/me` or `user_profiles.role` |
| Logout | `setIsAuthenticated(false)` | `supabase.auth.signOut` |

### 2.3 API Usage

- **None.** No `fetch` to backend, no `VITE_API_BASE_URL`, no `api` module.
- **Supabase client:** Present in `lib/supabase.ts` but **not imported** by any component.

### 2.4 Forms That Don’t Persist

| Form | Current | Required |
|------|---------|----------|
| Sign up | Mock | Supabase Auth + `user_profiles` (trigger) |
| Settings → Profile | Local state only | Load/save `user_profiles` via Supabase or API |
| Settings → Referral wallet | Local state only | Save to `user_profiles.referral_wallet` |
| Contact | Mock submit | Backend endpoint → e.g. `contact_submissions` or email |
| Footer newsletter | Mock | e.g. `newsletter_subscribers` or external service |
| Onboarding | Local state only | e.g. `user_exchange_connections`, `user_risk_settings`, `copy_setups` |
| Master trader application | Local state only | e.g. `master_trader_applications` + storage for files |
| Checkout | Mock payment | Payments provider + e.g. `subscriptions` / `orders` |

---

## 3. Backend Audit

### 3.1 What Exists

| Item | Status |
|------|--------|
| Express app | ✅ |
| CORS | ✅ `FRONTEND_URL` |
| `/health` | ✅ JSON `{ status, service, timestamp }` |
| `/api/auth/me` | ✅ JWT verify, returns `id`, `email`, `role` from `user_profiles` |
| `/api/auth/admin/users` | ⚠️ Placeholder “coming soon” |
| JWT verification | ✅ Supabase `getUser(token)` |
| Admin check | ✅ `requireAdmin` middleware |
| Supabase | ✅ `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

### 3.2 What’s Missing

- No other auth-related endpoints (e.g. refresh, logout proxy).
- No CRUD for traders, copies, positions, orders, fees, referrals, subscriptions, etc.
- No contact, newsletter, or master-trader application endpoints.
- No file upload (e.g. master trader proof).
- No payment webhooks or subscription logic.

---

## 4. Database (Supabase) Audit

### 4.1 What Exists

**Single table: `user_profiles`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | FK → `auth.users` |
| `email` | TEXT | NOT NULL UNIQUE |
| `role` | TEXT | `user` \| `admin` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `full_name` | TEXT | |
| `username` | TEXT | |
| `timezone` | TEXT | |
| `referral_wallet` | TEXT | |

- RLS enabled. Policies: read own, admins read all, update own.
- Trigger `handle_new_user`: create profile on signup, set `full_name` from metadata.

### 4.2 Is the Database Fully Built for the Current UI?

**No.** Only `user_profiles` exists. The UI assumes many more entities.

### 4.3 UI ↔ Database Gap

| UI / Feature | Needs table(s) | Exists? |
|--------------|----------------|---------|
| Auth, Settings profile | `auth.users` + `user_profiles` | ✅ |
| Marketplace, Trader profile | `traders`, `trader_performance`, etc. | ❌ |
| Copy setup, Copy trading | `copy_setups`, `active_copies` | ❌ |
| Portfolio, Positions, Orders, Trade history | `positions`, `orders`, `trades` | ❌ |
| Fees | `fee_ledger` or similar | ❌ |
| Referrals | `referrals`, `referral_earnings` | ❌ |
| Subscription, Payments, Checkout | `subscriptions`, `orders`, `payments` | ❌ |
| Notifications | `notifications` | ❌ |
| Onboarding (exchange, API, risk) | `user_exchange_connections`, `user_risk_settings` | ❌ |
| Contact | `contact_submissions` | ❌ |
| Newsletter | `newsletter_subscribers` | ❌ |
| Master trader application | `master_trader_applications` (+ files) | ❌ |
| Admin (users, traders, coupons, etc.) | Uses above + `user_profiles` | ❌ (no underlying tables) |

So: **we have not built all the database that the current UI implies.** We have only the **auth/user profile** slice.

---

## 5. What We Need to Do

### 5.1 Phase 1 — Auth & Profile (MVP)

**Goal:** Real login/signup, session, and profile load/save.

1. **Wire auth to Supabase**
   - Login: `supabase.auth.signInWithPassword`.
   - Sign up: `supabase.auth.signUp` with `options.data.full_name`.
   - Logout: `supabase.auth.signOut`.
   - Session: `supabase.auth.getSession` / `onAuthStateChange`; restore `isAuthenticated` and user.

2. **Use Supabase client in app**
   - Import `supabase` from `@/lib/supabase` in `App.tsx`, auth components, and anywhere that needs session/profile.

3. **Replace mock auth in `App.tsx`**
   - `handleLogin` / `handleSignUp` → call Supabase Auth; on success, set user + `isAuthenticated`.
   - On init, restore session; redirect to login when unauthenticated on protected routes.

4. **Optional: use backend for role**
   - After login, `fetch(API_BASE + '/api/auth/me', { headers: { Authorization: 'Bearer ' + session.access_token } })` and use `role` for `isAdmin` / UI.

5. **Settings → Profile**
   - Load: `supabase.from('user_profiles').select(...).single()` (or via API).
   - Save: `supabase.from('user_profiles').update(...).eq('id', user.id)` (or via API).

6. **Backend**
   - Deploy to Railway; ensure `FRONTEND_URL`, Supabase env vars, and CORS are correct.

**Deliverables:** Login, signup, logout, session persistence, profile load/save. **No new DB tables.**

---

### 5.2 Phase 2 — DB Schema for Current UI (Design + Implement)

**Goal:** Add tables so the UI can eventually use real data instead of mock.

**Suggested tables (design only here; implement in migrations):**

| Table | Purpose | Notes |
|-------|---------|-------|
| `traders` | Marketplace / trader profiles | Master traders, performance summary |
| `trader_performance` | Time-series performance | ROI, drawdown, etc. |
| `user_exchange_connections` | Onboarding + Settings → Exchange | Exchange, encrypted API key/secret, user id |
| `user_risk_settings` | Onboarding step 4 | Leverage, max position, daily loss limit, etc. |
| `copy_setups` | Copy setup + Onboarding step 5 | User, trader, allocation, risk settings ref |
| `positions` | Open positions | User, trader, symbol, size, entry, etc. |
| `orders` | Orders | Open, filled, cancelled |
| `trades` | Trade history | Executed trades |
| `fee_ledger` | Fees | Per-user fee entries |
| `referrals` | Referral links, relations | Referrer, referee |
| `referral_earnings` | Referral payouts | Amounts, status |
| `subscription_plans` | Plans | Name, limits, price |
| `subscriptions` | User subscriptions | User, plan, status, period |
| `payments` | Payments | User, amount, currency, status, gateway |
| `notifications` | Notifications | User, type, message, read |
| `contact_submissions` | Contact form | Name, email, category, subject, message |
| `newsletter_subscribers` | Footer signup | Email, optional user id |
| `master_trader_applications` | Applications | User, status, form data, file refs |

**Actions:**

- Add migrations (or `supabase-sync-*.sql`) for these tables + RLS.
- Run them (Dashboard or `pnpm db:push`).
- Backend: add endpoints for each domain (or minimal CRUD) and wire frontend to them later.

**Deliverables:** DB schema that matches the current UI’s “shape” of data. Frontend can still use mocks until API wiring is done.

---

### 5.3 Phase 3 — API Wiring & Replace Mock Data

**Goal:** Frontend uses backend (and Supabase where appropriate) instead of hardcoded data.

1. **API client**
   - Create `lib/api.ts`: `VITE_API_BASE_URL`, `fetch` with `Authorization: Bearer <access_token>`, error handling.

2. **Replace mock data per screen**
   - Dashboard: portfolio / PnL from API (or Supabase if you prefer).
   - Marketplace: `GET /api/traders` (or Supabase `traders`).
   - Copy trading, Portfolio, Positions, Orders, Trade history, Fees, Referrals: corresponding endpoints.
   - Admin: user list from `/api/auth/admin/users`; traders, payments, etc. from new admin endpoints.
   - Notifications: `GET /api/notifications` (or Supabase `notifications`).

3. **Forms → API**
   - Contact → `POST /api/contact`.
   - Newsletter → `POST /api/newsletter` or Supabase `newsletter_subscribers`.
   - Master trader application → `POST /api/applications` (+ file upload).
   - Onboarding → `POST /api/onboarding` or separate endpoints for exchange, risk, copy setup.
   - Checkout → integrate payments provider; create `subscriptions` / `orders` / `payments` via backend.

4. **Settings**
   - Already covered in Phase 1 for profile; referral wallet → `user_profiles.referral_wallet` or dedicated table.

**Deliverables:** No mock data for core flows; all persistent data from DB via backend (or Supabase) and API.

---

### 5.4 Phase 4 — Security, Performance, Observability

- **Security:** Ensure no `service_role` or DB secrets in frontend; enforce RLS; validate all inputs; rate limit.
- **Performance:** Indexes, pagination for lists, optional caching.
- **Observability:** Logging, error tracking, metrics for backend and key frontend actions.

---

## 6. Summary: Current vs Required

| Layer | Current | Required |
|-------|---------|----------|
| **Frontend** | Full UI, all mock/hardcoded | Wire auth, API client, replace mocks with real data |
| **Auth** | Mock login/signup | Supabase Auth + session + optional `/api/auth/me` for role |
| **API** | None | `lib/api.ts` + backend base URL; all server-backed data via API |
| **Backend** | Health + auth routes only | Add CRUD for traders, copies, positions, orders, etc.; contact, newsletter, applications |
| **Database** | `user_profiles` only | Add tables above; migrations applied |

---

## 7. Database vs UI: Direct Answer

**Have we built all the database that matches our current UI?**

**No.** We have only **`user_profiles`** (and Auth). The UI assumes **traders, copy setups, positions, orders, trades, fees, referrals, subscriptions, payments, notifications, contact, newsletter, master trader applications, onboarding (exchange/API/risk)**, etc. **None of those tables exist yet.**

To align DB with UI, implement the **Phase 2** schema (and any extras you need for payments, files, etc.).

---

## 8. Recommended Order of Work

1. **Phase 1** — Auth + profile + backend deploy. **No new tables.**
2. **Phase 2** — Design and add DB schema for the rest of the UI; run migrations.
3. **Phase 3** — API client + endpoints; replace mock data and wire forms.
4. **Phase 4** — Harden security, performance, and observability.

Use this audit as the source of truth for what’s done, what’s missing, and what to do next.

---

## 9. Quick Checklist

### Done ✅
- [x] Frontend UI (auth, dashboard, marketplace, copy trading, settings, admin, etc.)
- [x] Supabase client (`lib/supabase.ts`)
- [x] Backend skeleton (Express, /health, /api/auth/me, JWT + Supabase)
- [x] `user_profiles` table + RLS + trigger (full_name, username, timezone, referral_wallet)
- [x] Dev bypass gated (Ctrl+Shift+D/L/O, Quick Dev Login, UI States Demo)
- [x] Env and credentials docs (Vercel, Railway, Supabase)

### Not Done ❌
- [ ] Auth wired to Supabase (login/signup/session)
- [ ] Frontend imports and uses `supabase` / API client
- [ ] Backend deployed and called from frontend
- [ ] Settings profile load/save to `user_profiles`
- [ ] Tables for traders, copies, positions, orders, fees, referrals, subscriptions, notifications, contact, newsletter, master trader applications, onboarding
- [ ] API endpoints for above + contact, newsletter, applications
- [ ] Replace all mock/hardcoded data with real API/Supabase calls

---

## 10. Next Steps (Immediate)

1. **Wire auth** — Login/SignUp → Supabase Auth; session + `onAuthStateChange`; optional `/api/auth/me` for role.
2. **Deploy backend** — Railway; set `VITE_API_BASE_URL` in Vercel.
3. **Settings profile** — Load/save `user_profiles` via Supabase (or API).
4. **Phase 2 schema** — Add migrations for traders, copies, positions, orders, etc.; run in Supabase.
5. **API client** — `lib/api.ts` + replace mock data screen by screen.
