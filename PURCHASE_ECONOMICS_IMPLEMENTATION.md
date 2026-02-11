# Purchase Economics Implementation (70/20/10)

Implementation summary for the updated referral + allocation economics: **70%** referral pool (7 levels), **20%** platform, **10%** marketing, applied to **onboarding fee + package (credit) purchases** only. Not tied to trading PnL.

---

## 1) Files Changed and Why

| File | Change |
|------|--------|
| **supabase/migrations/20260127100000_purchase_economics_7level.sql** | New migration: `eligible_purchases`, `purchase_referral_earnings`, `purchase_revenue_splits`, `marketing_pool_ledger`, `purchase_allocation_runs`. RLS and indexes for idempotency (UNIQUE on `purchase_id`+level / `purchase_id`+split_type). |
| **backend-skeleton/src/lib/allocatePurchaseRevenue.ts** | New: `allocatePurchaseRevenue(client, purchaseId, logContext?)`, `computeAllocationAmounts(amount)`, `LEVEL_PCT`. Loads purchase, resolves 7-level upline from `referrals`, writes referral payouts + revenue splits + marketing ledger; idempotent via `purchase_allocation_runs`. |
| **backend-skeleton/src/routes/purchases.ts** | New: POST `/api/purchases` (auth required). Body: `type` (onboarding_fee \| package), `amount`, `currency` (default USDT), `metadata?`, `idempotency_key?`. Creates `eligible_purchases` row (status=completed) and calls `allocatePurchaseRevenue`. |
| **backend-skeleton/src/index.ts** | Registered `purchasesRouter` at `/api/purchases`. |
| **backend-skeleton/package.json** | Added `"test": "tsx src/lib/allocatePurchaseRevenue.test.ts"`. |
| **backend-skeleton/tsconfig.json** | Excluded `**/*.test.ts` from build. |
| **backend-skeleton/src/lib/allocatePurchaseRevenue.test.ts** | New: Unit tests for `LEVEL_PCT` sum 70%, `computeAllocationAmounts` totals 100%, platform 20%, level weights, remainder to marketing, 2-decimal rounding. |
| **supabase/seed-dev-7level-referral-chain.sql** | New: Dev-only seed. Builds 7-level referral chain from first 8 `user_profiles`: purchaser = 8th user, L1…L7 = 7th down to 1st. Run after migrations when ≥8 users exist. |
| **src/app/components/public/PricingPage.tsx** | Replaced “2-Tier Referral / 10% Tier 1, 5% Tier 2” with “70% referral rewards pool (7 levels)”, “20% platform revenue”, “10% marketing”. Removed “commission” from performance-fee line. Added “Rewards are from onboarding and package purchases only, not from trading PnL.” |
| **src/app/components/screens/Referrals.tsx** | Updated copy to 7-level / 70% pool from purchases only. Earnings cards and table now use “Level” (L1–L7), “Purchase Amount”, “Share %”, “Your Share”; mock data aligned to purchase-based economics. |
| **src/app/components/public/FAQPage.tsx** | Referral FAQ answers updated to 70/20/10 and “from onboarding and package purchases only”. |

---

## 2) Migration SQL

Migration lives at:

**`supabase/migrations/20260127100000_purchase_economics_7level.sql`**

It defines:

- **eligible_purchases**: `id`, `user_id`, `purchase_type` (onboarding_fee \| package), `amount`, `currency`, `status`, `idempotency_key` (UNIQUE), `metadata`, timestamps. RLS: user sees own; insert with `user_id = auth.uid()`.
- **purchase_referral_earnings**: `purchase_id`, `level` (1–7), `user_id`, `amount`, `currency`, `rate_pct`. **UNIQUE (purchase_id, level)** for idempotent payouts per level.
- **purchase_revenue_splits**: `purchase_id`, `split_type` (platform \| marketing), `amount`, `currency`, `source_detail`. **UNIQUE (purchase_id, split_type)**.
- **marketing_pool_ledger**: `purchase_id`, `amount`, `currency`, `source_type` (direct_10pct \| missing_upline_reallocation), `level_if_applicable`. Multiple rows per purchase allowed (direct 10% + each missing-level reallocation).
- **purchase_allocation_runs**: `purchase_id` PK, `ran_at`. Ensures allocation runs at most once per purchase.

All tables use `IF NOT EXISTS`, indexes, and RLS as in the file.

---

## 3) Example JSON Responses

### Purchase creation (success)

**Request**

```http
POST /api/purchases
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "type": "onboarding_fee",
  "amount": 100,
  "currency": "USDT",
  "metadata": { "source": "checkout" }
}
```

**Response (201)**

```json
{
  "purchase": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid-from-jwt",
    "purchaseType": "onboarding_fee",
    "amount": 100,
    "currency": "USDT",
    "status": "completed",
    "createdAt": "2026-01-27T12:00:00.000Z"
  },
  "allocation": "completed"
}
```

### Purchase with idempotency (duplicate key)

**Request**

```http
POST /api/purchases
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "type": "package",
  "amount": 50,
  "currency": "USDT",
  "idempotency_key": "pkg-abc-123"
}
```

**Response (409 if same idempotency_key already used)**

```json
{
  "error": "Duplicate purchase",
  "message": "A purchase with this idempotency_key already exists"
}
```

### Allocation result when already allocated

If allocation is run again for the same purchase (e.g. internal retry), the API still returns success; the allocation step is a no-op and the response can include:

```json
{
  "purchase": { ... },
  "allocation": "skipped",
  "allocationReason": "already_allocated"
}
```

---

## 4) Sums Always 100% and Rounding Rules

- **Shares:** 70% referral pool (L1…L7 with weights 30/20/10/8/6/4/2 of that 70%), 20% platform, 10% marketing. So of the purchase: L1 26.25%, L2 17.5%, L3 8.75%, L4 7%, L5 5.25%, L6 3.5%, L7 1.75%, platform 20%, marketing 10%. **Sum = 100%.**

- **Rounding:** Every monetary share is rounded to **2 decimals (cents)** using “round half away from zero”.  
  - Level amounts, platform, and base marketing (10%) are rounded per share.  
  - **Remainder:** The difference `purchase_amount - (sum of rounded referral + platform + base marketing)` is added to **marketing**. So no money is dropped; the full purchase amount is allocated and totals always equal 100% within rounding (≤ 0.01 per share; remainder absorbed by marketing).

- **Missing upline:** If a level has no referrer, that level’s share is not paid to any user; it is written to `marketing_pool_ledger` as `source_type = 'missing_upline_reallocation'` and included in the marketing split for that purchase. Total still sums to 100%.

- **Idempotency:** Same purchase processed twice does not duplicate payouts: `purchase_allocation_runs` is checked first; already-allocated purchases skip allocation. Unique constraints on `(purchase_id, level)` and `(purchase_id, split_type)` prevent duplicate rows if logic were to insert again.

---

## 5) When Referral Rewards Are Given

Payments are **manual only** (no CoinPayments in use). Referral rewards are allocated only when **there was a successful payment** and **admins have approved/confirmed** it in the admin panel:

- **Payment intents (manual/Safe):** When an admin approves the intent in the admin panel (`POST /api/admin/payments/intents/:id/approve`), the backend creates an `eligible_purchases` row with the intent’s `amount_usdt` and runs allocation. Referral rewards are given only after admin approval.
- **Zero amount / full discount:** If the user paid **$0** (e.g. 100% discount or coupon), there is no dollar value to distribute. The system does **not** create an eligible purchase for $0 and does **not** run referral allocation. The DB function `allocate_purchase_revenue` also returns `invalid_amount` when `amount <= 0`, so no referral rewards are ever credited for zero-value transactions.

---

## Running Tests and Dev Seed

- **Unit tests:**  
  `cd backend-skeleton && pnpm test`  
  (Runs `tsx src/lib/allocatePurchaseRevenue.test.ts`. If you see spawn/EPERM in some environments, run the same file manually with `tsx`.)

- **Dev 7-level chain:**  
  After migrations and with at least 8 users in `user_profiles`, run  
  `supabase/seed-dev-7level-referral-chain.sql`  
  in the Supabase SQL Editor (or via `psql $DATABASE_URL -f supabase/seed-dev-7level-referral-chain.sql`). The 8th user is the purchaser; the 7th down to 1st are L1…L7.
