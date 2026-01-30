# Admin Panel – UI & Backend Integration

This document summarizes how each Admin tab is wired to the backend and what is required for full functionality.

---

## Dashboard (top cards)

| Card | Backend | Status |
|------|---------|--------|
| Total Users | `GET /api/admin/stats` → `totalUsers` | ✅ Integrated |
| Active Traders | `GET /api/admin/stats` → `activeTraders` | ✅ Integrated |
| Monthly Revenue | `GET /api/admin/stats` → `monthlyRevenue` | ✅ Integrated |
| Package & Onboarding Revenue | `GET /api/admin/stats` → `platformFees` | ✅ Integrated |
| Referral Payouts | `GET /api/admin/stats` → `referralPayouts` | ✅ Integrated |

---

## Tab: Users

- **Load:** `GET /api/admin/users?page=1&limit=50&search=...`
- **Actions:**  
  - Suspend: `PUT /api/admin/users/:id` `{ status: 'suspended', reason }`  
  - Activate: `PUT /api/admin/users/:id` `{ status: 'active' }`  
  - Change role: `PUT /api/admin/users/:id/role` `{ role: 'user' \| 'admin', reason? }`
- **Status:** ✅ Fully integrated and functional.

---

## Tab: Traders

- **Load:** `GET /api/admin/traders`
- **Actions:**  
  - Approve: `PUT /api/admin/traders/:id` `{ status: 'approved' }`  
  - Reject: `PUT /api/admin/traders/:id` `{ status: 'rejected' }`
- **Status:** ✅ Fully integrated and functional.

---

## Tab: Subscriptions

- **Load:** `GET /api/admin/subscriptions`
- **Response:** `subscriptionPayments[]`, `stats: { starter, pro, unlimited }`
- **Backend:** Reads `subscriptions`, `payments`, `subscription_plans`, `user_profiles`.
- **Status:** ✅ Integrated. “Export CSV” is UI-only (no backend).

---

## Tab: Revenue & Payments

- **Load:** `GET /api/admin/fees`
- **Response:** `summary: { totalFees, referralPayouts, netRevenue }`, `transactions[]`
- **Backend:** Reads `fee_ledger`, `purchase_referral_earnings` (this month).
- **Status:** ✅ Integrated. “Export Report” is UI-only (no backend).

---

## Tab: Referrals

- **Load:** `GET /api/admin/referrals`
- **Response:** `payouts[]`, `summary: { totalEarnings, activeReferrers }`
- **Action:** Mark paid → `PATCH /api/admin/referrals/:id/mark-paid` `{ transactionId? }`
- **Backend:** Reads `purchase_referral_earnings`, `eligible_purchases`, `user_profiles`.
- **Status:** ✅ Fully integrated and functional.

---

## Tab: Payments (Payment Intents – Manual Safe)

- **Load:** `GET /api/admin/payments/intents?status=...`
- **Actions:**  
  - Approve: `POST /api/admin/payments/intents/:id/approve` `{ note? }`  
  - Reject: `POST /api/admin/payments/intents/:id/reject` `{ note? }`
- **Backend:** Reads/writes `payment_intents`; approve updates `user_profiles` and logs `payment_events` + `audit_logs`.
- **Requirement:** Backend env `ENABLE_MANUAL_PAYMENTS=true`. If not set, the endpoint returns **404** and the UI shows: “Payment intents are disabled. Set ENABLE_MANUAL_PAYMENTS=true on the backend to enable.”
- **Status:** ✅ Integrated. Functional only when `ENABLE_MANUAL_PAYMENTS=true` and `payment_intents` table exists (migration `20260129130000_manual_payments_safe.sql`).

---

## Tab: Platform Settings

- **Load:** `GET /api/admin/settings` → `{ feeEntryPct, feeProPct, feeElitePct }` (loaded when tab is focused).
- **Save:** `PUT /api/admin/settings` with body `{ feeEntryPct?, feeProPct?, feeElitePct? }`. Persisted in `platform_settings` table.
- **Status:** ✅ Integrated. Requires migration `20260129180000_platform_settings.sql`.

---

## Tab: Discount Coupons

- **Load:** `GET /api/admin/coupons`
- **Create:** `POST /api/admin/coupons` (code, discount, appliesTo, packageIds?, maxRedemptions?, durationMonths, expiresAt?, description)
- **Update status:** `PATCH /api/admin/coupons/:id` `{ status: 'active' \| 'disabled' }`
- **Backend:** `coupons` table.
- **Status:** ✅ Fully integrated and functional.

---

## Tab: Discount Coupons → User Discounts

- **Load:** `GET /api/admin/user-discounts`
- **Create:** `POST /api/admin/user-discounts` (userId, scope, onboarding/trading fields)
- **Update:** `PATCH /api/admin/user-discounts/:id`
- **Delete:** `DELETE /api/admin/user-discounts/:id`
- **Status:** ✅ Integrated (backend routes exist and UI calls them).

---

## Tab: Runner

- **Load status:** `GET /api/runner/status`
- **Load tick runs:** `GET /api/runner/tick-runs?limit=20`
- **Action:** “Run Cron Now” → `POST /api/runner/cron` (admin JWT)
- **Status:** ✅ Fully integrated and functional.

---

## Tab: Audit Logs

- **Load:** `GET /api/admin/audit-logs?limit=100`
- **Response:** `logs[]` (timestamp, admin email, action, reason)
- **Backend:** `audit_logs` table with join to `user_profiles` for admin email.
- **Status:** ✅ Integrated and functional.

---

## Summary

| Tab | Backend integration | Notes |
|-----|---------------------|--------|
| Users | ✅ Full | List, suspend, activate, change role |
| Traders | ✅ Full | List, approve, reject |
| Subscriptions | ✅ Full | List + stats; Export CSV downloads current data (client-side) |
| Revenue & Payments | ✅ Full | Summary + transactions; Export Report downloads current data (client-side) |
| Referrals | ✅ Full | List + mark paid; Export CSV downloads current data (client-side) |
| **Payments** | ✅ Full* | *Requires `ENABLE_MANUAL_PAYMENTS=true` and `payment_intents` migration |
| Platform Settings | ✅ Full | Fee % persisted via `platform_settings`; apply migration `20260129180000_platform_settings.sql` |
| Discount Coupons | ✅ Full | CRUD coupons + user discounts |
| Runner | ✅ Full | Status, tick runs, run cron |
| Audit Logs | ✅ Full | List only |

To enable the **Payments** tab (payment intents for manual Safe verification): set `ENABLE_MANUAL_PAYMENTS=true` in the backend (e.g. Railway) and ensure the `payment_intents` (and related) migrations are applied in Supabase.
