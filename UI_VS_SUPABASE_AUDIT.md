# UI vs Supabase — What We Collect vs What We Store

**Audit of UI data collection and what exists (or needs to be created) in Supabase**

---

## 1. Current Supabase Schema

**Table: `public.user_profiles`**

| Column     | Type        | Notes                          |
|------------|-------------|--------------------------------|
| `id`       | UUID        | FK → auth.users                |
| `email`    | TEXT        | NOT NULL UNIQUE                |
| `role`     | TEXT        | `user` \| `admin`              |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW()                |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW()                |

- RLS enabled. Trigger `handle_new_user` creates a row on signup (id, email, role).

---

## 2. UI Data We Collect

### 2.1 Auth

| Screen    | Fields Collected                    | Stored in Supabase? |
|-----------|-------------------------------------|---------------------|
| **Login** | email, password                     | ✅ Auth only (auth.users) |
| **Sign Up** | fullName, email, password, confirmPassword, agreedToTerms | ⚠️ email → Auth + user_profiles. **fullName NOT stored** |

### 2.2 Settings → Profile

| Field            | Stored? |
|------------------|--------|
| Full Name        | ❌ No  |
| Email            | ✅ user_profiles.email |
| Username         | ❌ No  |
| Timezone         | ❌ No  |
| Referral Wallet (USDT TRC-20) | ❌ No |

### 2.3 Settings → Security

| Field        | Stored? |
|-------------|--------|
| Password change | ✅ Supabase Auth |
| 2FA         | ✅ Supabase Auth (when enabled) |
| Kill Switch | ❌ UI only / app state |

### 2.4 Settings → Exchange API

| Field       | Stored? |
|------------|--------|
| Exchange   | ❌ No  |
| API Key    | ❌ No  |
| API Secret | ❌ No  |

### 2.5 Onboarding Wizard

| Step   | Fields Collected                          | Stored? |
|--------|-------------------------------------------|--------|
| 1      | (welcome)                                 | —      |
| 2      | selectedExchange                          | ❌ No  |
| 3      | apiKey, apiSecret                         | ❌ No  |
| 4      | leverage, maxPositionSize, dailyLossLimit | ❌ No  |
| 5      | selectedTrader                            | ❌ No  |

All onboarding data is **local state only**; nothing is pushed to Supabase.

### 2.6 Contact Page

| Field   | Purpose       | Stored? |
|--------|----------------|--------|
| name   | Sender name    | ❌ No  |
| email  | Sender email   | ❌ No  |
| category | Topic        | ❌ No  |
| subject | Subject      | ❌ No  |
| message | Message      | ❌ No  |

Form submit is mock; no backend/DB.

### 2.7 Footer Newsletter

| Field | Stored? |
|-------|--------|
| email | ❌ No  |

### 2.8 Master Trader Application

| Field           | Stored? |
|-----------------|--------|
| Full Name       | ❌ No  |
| Email           | ❌ No  |
| Country         | ❌ No  |
| Telegram        | ❌ No  |
| Primary Exchange| ❌ No  |
| Exchange proof (file) | ❌ No |
| (other form fields)   | ❌ No |

### 2.9 Checkout

| Field    | Stored? |
|----------|--------|
| plan, duration, coupon, crypto | ❌ No (mock) |

---

## 3. Gaps: Create and Push to Supabase

### 3.1 Phase 1 — Extend `user_profiles` (do now)

We collect these in UI but **do not store** them today. Add to `user_profiles` and push:

| Column          | Type   | Nullable | Used in UI        |
|-----------------|--------|----------|-------------------|
| `full_name`     | TEXT   | YES      | Sign Up, Settings |
| `username`      | TEXT   | YES      | Settings          |
| `timezone`      | TEXT   | YES      | Settings          |
| `referral_wallet` | TEXT | YES      | Settings (USDT TRC-20) |

- **Sign Up:** send `full_name` via Auth `user_metadata` and persist to `user_profiles` (trigger or app logic).
- **Settings:** allow user to update full_name, username, timezone, referral_wallet.

**SQL:** Use `supabase-migration-ui-fields.sql` (adds columns + trigger update).

### 3.2 Phase 2 — New Tables (later)

| Table / Feature            | Purpose                          | UI Source                |
|----------------------------|----------------------------------|---------------------------|
| **user_exchange_connections** | Exchange, API key/secret (encrypted) | Onboarding, Settings → Exchange |
| **user_risk_settings**     | leverage, max position, daily loss | Onboarding step 4        |
| **copy_setups**            | selected trader, allocation      | Onboarding step 5, Copy Setup |
| **contact_submissions**    | name, email, category, subject, message | Contact form        |
| **newsletter_subscribers** | email                            | Footer newsletter         |
| **master_trader_applications** | Application form + files     | Master Trader Application |
| **subscriptions / orders** | plan, duration, payments         | Checkout                  |

These are **not** created in the migration below; add when you implement those features.

---

## 4. What to Run in Supabase Now

1. **Apply Phase 1 migration**
   - Run `supabase-migration-ui-fields.sql` in Supabase SQL Editor.
   - This adds `full_name`, `username`, `timezone`, `referral_wallet` to `user_profiles` and updates the signup trigger to set `full_name` from `raw_user_meta_data` when present.

2. **Frontend**
   - **Sign Up:** call `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` so `full_name` is in `user_metadata` and then in `user_profiles`.
   - **Settings → Profile:** load and save `full_name`, `username`, `timezone`, `referral_wallet` from/to `user_profiles` (via Supabase client or your API).

3. **Phase 2**
   - When you add Onboarding persistence, Contact backend, Newsletter, Master Trader applications, or Checkout, create the corresponding tables and push those schemas to Supabase.

---

## 5. Summary

| UI / Feature        | In Supabase? | Action                         |
|-------------------|--------------|--------------------------------|
| Login             | ✅ Auth      | None                           |
| Sign Up (email)   | ✅           | None                           |
| Sign Up (fullName)| ❌           | **Add `full_name` + trigger**  |
| Settings (name, username, timezone, wallet) | ❌ | **Add columns + UI save** |
| Onboarding        | ❌           | Phase 2 tables                 |
| Contact           | ❌           | Phase 2 table                  |
| Newsletter        | ❌           | Phase 2 table                  |
| Master Trader App | ❌           | Phase 2 table                  |
| Checkout          | ❌           | Phase 2 tables                 |

**Next step:** run `supabase-migration-ui-fields.sql` and wire Sign Up + Settings profile to the new `user_profiles` fields.
