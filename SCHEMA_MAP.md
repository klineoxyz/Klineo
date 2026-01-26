# KLINEO Database Schema Map

**Database**: Supabase PostgreSQL  
**RLS**: Row Level Security enabled on all tables  
**Last Updated**: January 26, 2026

---

## Core Tables

### `user_profiles`
**Purpose**: Extends Supabase `auth.users` with app-specific fields.

**Key Columns**:
- `id` (UUID, PK, FK → auth.users)
- `email` (TEXT, UNIQUE)
- `role` (TEXT, CHECK: 'user' | 'admin', DEFAULT: 'user')
- `status` (TEXT, CHECK: 'active' | 'suspended' | 'banned', DEFAULT: 'active')
- `full_name` (TEXT, nullable)
- `username` (TEXT, nullable, indexed)
- `timezone` (TEXT, DEFAULT: 'UTC')
- `referral_wallet` (TEXT, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can read own profile
- Admins can read all profiles
- Users can update own profile (role changes blocked by RLS, backend-only)

**Indexes**: `email`, `role`, `status`, `username` (partial, where not null)

---

### `traders`
**Purpose**: Master trader profiles (users who offer copy trading).

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `display_name` (TEXT, NOT NULL)
- `slug` (TEXT, UNIQUE, nullable)
- `bio` (TEXT, nullable)
- `avatar_url` (TEXT, nullable)
- `status` (TEXT, CHECK: 'pending' | 'approved' | 'rejected', DEFAULT: 'pending')
- `exchange` (TEXT, nullable)
- `verified_at` (TIMESTAMPTZ, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Public read: `status = 'approved'` OR own trader OR admin
- Insert: own trader only
- Update: own trader OR admin

**Indexes**: `user_id`, `status`, `slug` (partial, where not null)

---

### `trader_performance`
**Purpose**: Time-series performance data for traders.

**Key Columns**:
- `id` (UUID, PK)
- `trader_id` (UUID, FK → traders)
- `period_start`, `period_end` (TIMESTAMPTZ, NOT NULL)
- `pnl` (NUMERIC(20, 8), DEFAULT: 0)
- `pnl_pct` (NUMERIC(10, 4), nullable)
- `volume` (NUMERIC(20, 8), nullable)
- `drawdown_pct` (NUMERIC(10, 4), nullable)
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Read: trader is approved OR own trader OR admin
- Insert: own trader only

**Indexes**: `trader_id`, `(period_start, period_end)`

---

## Copy Trading

### `copy_setups`
**Purpose**: User's copy trading configurations (which traders to copy, allocation, risk).

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `trader_id` (UUID, FK → traders)
- `allocation_pct` (NUMERIC(5, 2), DEFAULT: 100)
- `max_position_pct` (NUMERIC(5, 2), nullable)
- `status` (TEXT, CHECK: 'active' | 'paused' | 'stopped', DEFAULT: 'active')
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own copy setups
- Admins can read all

**Indexes**: `user_id`, `trader_id`

---

### `user_exchange_connections`
**Purpose**: User's exchange API connections (encrypted, no raw secrets).

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `exchange` (TEXT, NOT NULL)
- `label` (TEXT, nullable)
- `encrypted_config` (BYTEA, nullable)
- `secret_ref` (TEXT, nullable)
- `last_synced_at` (TIMESTAMPTZ, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- UNIQUE: `(user_id, exchange)`

**RLS Policies**:
- Users can only access own connections
- Admins can read all

**Indexes**: `user_id`

---

### `user_risk_settings`
**Purpose**: User's global risk management settings.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles, UNIQUE)
- `max_position_pct` (NUMERIC(5, 2), nullable)
- `max_drawdown_pct` (NUMERIC(5, 2), nullable)
- `max_daily_loss_pct` (NUMERIC(5, 2), nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own settings
- Admins can read all

**Indexes**: `user_id`

---

## Trading Data

### `positions`
**Purpose**: User's open/closed trading positions.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `copy_setup_id` (UUID, FK → copy_setups, nullable)
- `symbol` (TEXT, NOT NULL)
- `side` (TEXT, CHECK: 'long' | 'short')
- `size` (NUMERIC(20, 8), NOT NULL)
- `entry_price` (NUMERIC(20, 8), NOT NULL)
- `current_price` (NUMERIC(20, 8), nullable)
- `unrealized_pnl` (NUMERIC(20, 8), nullable)
- `exchange_order_id` (TEXT, nullable)
- `opened_at` (TIMESTAMPTZ, DEFAULT: NOW())
- `closed_at` (TIMESTAMPTZ, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own positions
- Admins can read all

**Indexes**: `user_id`, `copy_setup_id`

---

### `orders`
**Purpose**: User's trading orders (pending/filled/cancelled).

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `position_id` (UUID, FK → positions, nullable)
- `symbol` (TEXT, NOT NULL)
- `side` (TEXT, CHECK: 'buy' | 'sell')
- `order_type` (TEXT, CHECK: 'market' | 'limit', DEFAULT: 'market')
- `amount` (NUMERIC(20, 8), NOT NULL)
- `price` (NUMERIC(20, 8), nullable)
- `status` (TEXT, CHECK: 'pending' | 'filled' | 'cancelled' | 'failed', DEFAULT: 'pending')
- `exchange_order_id` (TEXT, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own orders
- Admins can read all

**Indexes**: `user_id`

---

### `trades`
**Purpose**: Executed trades (filled orders).

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `order_id` (UUID, FK → orders, nullable)
- `position_id` (UUID, FK → positions, nullable)
- `symbol` (TEXT, NOT NULL)
- `side` (TEXT, CHECK: 'buy' | 'sell')
- `amount` (NUMERIC(20, 8), NOT NULL)
- `price` (NUMERIC(20, 8), NOT NULL)
- `fee` (NUMERIC(20, 8), DEFAULT: 0)
- `executed_at` (TIMESTAMPTZ, DEFAULT: NOW())
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own trades
- Admins can read all

**Indexes**: `user_id`

---

### `fee_ledger`
**Purpose**: Platform fee tracking.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `amount` (NUMERIC(20, 8), NOT NULL)
- `currency` (TEXT, DEFAULT: 'USDT')
- `fee_type` (TEXT, CHECK: 'subscription' | 'copy_fee' | 'platform_fee' | 'other')
- `reference_id` (UUID, nullable)
- `trade_id` (UUID, FK → trades, nullable)
- `trader_id` (UUID, FK → traders, nullable)
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own fees
- Admins can read all

**Indexes**: `user_id`, `trade_id`, `trader_id`

---

## Subscriptions & Payments

### `subscription_plans`
**Purpose**: Available subscription tiers.

**Key Columns**:
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `slug` (TEXT, UNIQUE, NOT NULL)
- `price` (NUMERIC(12, 2), NOT NULL)
- `currency` (TEXT, DEFAULT: 'USDT')
- `interval` (TEXT, CHECK: 'month' | 'year', DEFAULT: 'month')
- `features` (JSONB, DEFAULT: '[]')
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Public read (anyone can view plans)
- Admin write

**Indexes**: `slug`

---

### `subscriptions`
**Purpose**: User's active subscriptions.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `plan_id` (UUID, FK → subscription_plans)
- `status` (TEXT, CHECK: 'active' | 'cancelled' | 'expired', DEFAULT: 'active')
- `current_period_start`, `current_period_end` (TIMESTAMPTZ, NOT NULL)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own subscriptions
- Admins can read all

**Indexes**: `user_id`, `plan_id`

---

### `payments`
**Purpose**: Payment transactions.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `subscription_id` (UUID, FK → subscriptions, nullable)
- `amount` (NUMERIC(12, 2), NOT NULL)
- `currency` (TEXT, DEFAULT: 'USDT')
- `provider` (TEXT, nullable)
- `provider_payment_id` (TEXT, nullable)
- `status` (TEXT, CHECK: 'pending' | 'succeeded' | 'failed' | 'refunded', DEFAULT: 'pending')
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own payments
- Admins can read all

**Indexes**: `user_id`, `subscription_id`

---

## Referrals

### `referrals`
**Purpose**: Two-tier referral relationships.

**Key Columns**:
- `id` (UUID, PK)
- `referrer_id` (UUID, FK → user_profiles)
- `referred_id` (UUID, FK → user_profiles, UNIQUE)
- `tier` (SMALLINT, CHECK: 1 | 2)
- `created_at` (TIMESTAMPTZ)
- UNIQUE: `(referrer_id, referred_id)`

**RLS Policies**:
- Users can read own referrals (as referrer or referred)
- Admins can read all
- Users can insert own referrals (as referrer)

**Indexes**: `referrer_id`, `referred_id`

---

### `referral_earnings`
**Purpose**: Referral commission payouts.

**Key Columns**:
- `id` (UUID, PK)
- `referral_id` (UUID, FK → referrals)
- `fee_ledger_id` (UUID, FK → fee_ledger, nullable)
- `amount` (NUMERIC(20, 8), NOT NULL)
- `currency` (TEXT, DEFAULT: 'USDT')
- `tier` (SMALLINT, CHECK: 1 | 2)
- `rate_pct` (NUMERIC(5, 2), NOT NULL)
- `status` (TEXT, CHECK: 'pending' | 'paid' | 'failed', DEFAULT: 'pending')
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can read own earnings (via referral relationship)
- Admins can read all
- Users can insert own earnings (as referrer)

**Indexes**: `referral_id`

---

## Notifications & Support

### `notifications`
**Purpose**: User notifications.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `type` (TEXT, NOT NULL)
- `title` (TEXT, NOT NULL)
- `body` (TEXT, nullable)
- `read_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can only access own notifications
- Admins can read all

**Indexes**: `user_id`, `read_at` (partial, where null)

---

### `contact_submissions`
**Purpose**: Contact form submissions.

**Key Columns**:
- `id` (UUID, PK)
- `email` (TEXT, NOT NULL)
- `name` (TEXT, nullable)
- `subject` (TEXT, nullable)
- `message` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Anyone can insert
- Only admins can read

---

### `newsletter_subscribers`
**Purpose**: Newsletter email list.

**Key Columns**:
- `id` (UUID, PK)
- `email` (TEXT, UNIQUE, NOT NULL)
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Anyone can insert
- Only admins can read

---

### `master_trader_applications`
**Purpose**: Master trader application submissions.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → user_profiles)
- `status` (TEXT, CHECK: 'pending' | 'approved' | 'rejected', DEFAULT: 'pending')
- `message` (TEXT, nullable)
- `proof_url` (TEXT, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can read own applications
- Admins can read all and update

**Indexes**: `user_id`

---

## Admin & System

### `coupons`
**Purpose**: Discount coupon codes.

**Key Columns**:
- `id` (UUID, PK)
- `code` (TEXT, UNIQUE, NOT NULL)
- `discount_percent` (NUMERIC(5, 2), CHECK: 0-100)
- `max_redemptions` (INTEGER, nullable)
- `current_redemptions` (INTEGER, DEFAULT: 0)
- `duration_months` (INTEGER, DEFAULT: 1)
- `expires_at` (TIMESTAMPTZ, nullable)
- `status` (TEXT, CHECK: 'active' | 'expired' | 'disabled', DEFAULT: 'active')
- `description` (TEXT, nullable)
- `created_by` (UUID, FK → user_profiles, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Public read: `status = 'active'`
- Admin read: all
- Admin write only

**Indexes**: `code`, `status`

---

### `audit_logs`
**Purpose**: Admin action audit trail.

**Key Columns**:
- `id` (UUID, PK)
- `admin_id` (UUID, FK → user_profiles, NOT NULL)
- `action_type` (TEXT, NOT NULL)
- `entity_type` (TEXT, NOT NULL)
- `entity_id` (UUID, nullable)
- `details` (JSONB, DEFAULT: '{}')
- `reason` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Admin read/write only

**Indexes**: `admin_id`, `(entity_type, entity_id)`, `created_at` (DESC)

---

## RLS Policy Summary

| Table | User Access | Admin Access | Public Access |
|-------|-------------|--------------|---------------|
| `user_profiles` | Own read/update | All read | None |
| `traders` | Own read/write | All read/write | Approved only (read) |
| `trader_performance` | Own trader | All read | Approved traders only |
| `copy_setups` | Own only | All read | None |
| `user_exchange_connections` | Own only | All read | None |
| `user_risk_settings` | Own only | All read | None |
| `positions` | Own only | All read | None |
| `orders` | Own only | All read | None |
| `trades` | Own only | All read | None |
| `fee_ledger` | Own only | All read | None |
| `subscription_plans` | Read all | All | Read all |
| `subscriptions` | Own only | All read | None |
| `payments` | Own only | All read | None |
| `referrals` | Own (as referrer/referred) | All read | None |
| `referral_earnings` | Own (via referral) | All read | None |
| `notifications` | Own only | All read | None |
| `contact_submissions` | Insert only | All read | Insert only |
| `newsletter_subscribers` | Insert only | All read | Insert only |
| `master_trader_applications` | Own read | All read/write | None |
| `coupons` | Read active | All | Read active |
| `audit_logs` | None | All read/write | None |

---

## Notes

- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- All monetary values use `NUMERIC` for precision
- Foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
- RLS policies are enforced at the database level (Supabase)
- Backend uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS when needed (admin operations)
