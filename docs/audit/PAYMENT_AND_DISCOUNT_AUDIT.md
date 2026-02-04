# KLINEO Payment & Discount System — In-Depth Audit

**Audit date:** 2026-02-03  
**Scope:** Payment intents (joining fee + packages), discount coupons (OB/100/200/500), user-specific discounts, admin confirm/deny, contribution wallet flow  
**Auditor:** Lead Engineer

---

## Executive Summary

The payment and discount system implements a manual USDT (BEP20) flow with admin verification, scoped coupon codes (OB/100/200/500), and user-specific discounts. The architecture is sound and consistent with the stated requirements. Several edge cases and improvements are documented below.

**Overall verdict:** **Production-ready with recommended follow-ups** — no critical blockers; medium-priority items should be addressed before scale.

---

## 1. Architecture Overview

### 1.1 Data Flow

```
User → Packages/Subscription
       ↓ (click Pay)
       POST /api/payments/intents { kind, package_code?, coupon_code? }
       ↓
       Backend: validate coupon (global coupons or user_discounts)
       ↓
       Insert payment_intents (status: draft)
       ↓
       User → Payments page
       ↓ (copy wallet / scan QR, send USDT, paste tx_hash)
       POST /api/payments/intents/:id/submit { tx_hash?, from_wallet? }
       ↓
       status → pending_review (or flagged if wallet mismatch)
       ↓
       Admin → Admin panel → Payment Intents
       ↓ (verify TX on BscScan / Safe)
       POST /api/admin/payments/intents/:id/approve or reject
       ↓
       user_profiles: member_active = true OR active_package_code set
```

### 1.2 Key Tables

| Table | Purpose |
|-------|---------|
| `payment_intents` | Draft → pending_review/flagged → approved/rejected. Stores `tx_hash`, `declared_from_wallet`, `coupon_code`, `discount_percent`. |
| `payment_events` | Append-only audit trail (created, submitted, approved, rejected). |
| `coupons` | Global coupons with `applies_to`, `package_ids`, `current_redemptions`. |
| `user_discounts` | Per-user discounts with `code`, `scope`, `trading_used_count`. |
| `user_profiles` | `payment_wallet_bsc` (Contribution wallet), `member_active`, `active_package_code`. |

---

## 2. User Flow Audit

### 2.1 Contribution Wallet

| Check | Status | Notes |
|-------|--------|-------|
| Settings label | ✅ | "Contribution Wallet (BSC)" — clear. |
| Profile API | ✅ | `payment_wallet_bsc` returned from GET /api/me/profile. |
| Gate before create intent | ✅ | `hasPaymentWallet` blocks Create intent; toast directs to Settings. |
| Auto-fill from wallet | ✅ | `useEffect` fills `fromWallet` from `profile.paymentWalletBsc` when opening draft submit form. |

**Minor:** The `Referral Payout Wallet` and `Contribution Wallet` are both in Profile. Consider grouping under a "Wallets" section if more wallets are added.

### 2.2 Payment Intent Creation

| Check | Status | Notes |
|-------|--------|-------|
| Joining fee | ✅ | `kind: "joining_fee"`, amount $100 or discounted. |
| Package | ✅ | `kind: "package"`, `package_code`: ENTRY_100, LEVEL_200, LEVEL_500. |
| Coupon at creation | ✅ | `coupon_code` passed; validated; amount computed server-side. |
| Subscription → Payments | ✅ | Subscription passes `couponFromUrl` in POST body when creating intent; navigates with `newIntent` + `couponCode` in viewData. |
| 100% off | ✅ | `amount_usdt = 0`; submit allows no tx_hash; admin confirms. |

**Flow consistency:** When user arrives from Subscription with coupon, intent is created with coupon applied. When user lands on Payments via `/payments?coupon=CODE`, coupon is validated and prefilled, but user must still click "Create intent" — correct.

### 2.3 Submit (TX Hash)

| Check | Status | Notes |
|-------|--------|-------|
| TX hash required when amount > 0 | ✅ | Backend returns 400 if `amount_usdt > 0` and no tx_hash. |
| TX hash not required when 100% off | ✅ | `isZeroAmount` path allows submit without tx_hash. |
| From wallet auto-filled | ✅ | From Contribution wallet. |
| Wallet mismatch → flagged | ✅ | Backend compares `declared_from_wallet` to `payment_wallet_bsc`; sets `mismatch_reason` and status `flagged`. |

### 2.4 QR Code

| Check | Status | Notes |
|-------|--------|-------|
| QR for Safe address | ✅ | External API: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=...` |
| Client-side QR | ✅ | Uses qrcode.react (QRCodeSVG); no external API. |

---

## 3. Coupon System Audit

### 3.1 Global Coupons (OB/100/200/500)

| Check | Status | Notes |
|-------|--------|-------|
| Prefix format | ✅ | OB (onboarding), 100/200/500 (packages). One coupon = one scope. |
| Code generation | ✅ | `generatePrefixedCouponCode(prefix)` uses `crypto.randomBytes`; 8-char suffix. |
| Uniqueness check | ✅ | Checks both `coupons` and `user_discounts` before insert. |
| Admin create flow | ✅ | Discount Type dropdown (OB, 100, 200, 500); `couponScope` sent; backend sets `applies_to` and `package_ids`. |
| Custom code | ✅ | Admin can still enter custom code; `finalAppliesTo`/`finalPackageIds` derived from `couponScope`. |

### 3.2 Coupon Validation

| Check | Status | Notes |
|-------|--------|-------|
| Global coupons first | ✅ | `validateCoupon` checks `coupons`; then `validateUserDiscountByCode` for user_discounts. |
| Scope enforcement | ✅ | OB → onboarding only; 100/200/500 → specific package. |
| Package ID mapping | ✅ | `PACKAGE_CODE_TO_ID`: ENTRY_100→entry_100, LEVEL_200→pro_200, LEVEL_500→elite_500. |
| Max redemptions | ✅ | Checked before validation; coupon rejected if `current_redemptions >= max_redemptions`. |
| Expiry | ✅ | `expires_at` checked. |

### 3.3 Coupon Redemption (current_redemptions)

| Check | Status | Notes |
|-------|--------|-------|
| Increment on intent create | ✅ | After insert, `coupons` row updated: `current_redemptions += 1`. |
| Only for global coupons | ✅ | Increment only when `couponRow` exists (from `coupons` table). User_discounts not incremented. |
| Race condition | ✅ | Fixed: `try_increment_coupon_redemption` RPC atomically increments; fails if max_redemptions reached. Migration `20260203100000_atomic_coupon_redemption.sql`. |
| user_discounts.trading_used_count | ✅ | Fixed: Admin approve increments `trading_used_count` when package intent approved with user_discount (scope=trading_packages). |

### 3.4 URL / Deep Link

| Check | Status | Notes |
|-------|--------|-------|
| `/packages?coupon=CODE` | ✅ | Subscription reads `searchParams.get("coupon")`; passes to checkout. |
| `/payments?coupon=CODE` | ✅ | Payments reads `searchParams.get("coupon")`; validates and prefills. |
| Shareable link in Admin | ✅ | Copy link for coupon; format `/packages?coupon=CODE` or `/payments?coupon=CODE`. |

---

## 4. Admin Flow Audit

### 4.1 Payment Intents Panel

| Check | Status | Notes |
|-------|--------|-------|
| List all intents | ✅ | GET /api/admin/payments/intents; filter by status. |
| Coupon code column | ✅ | `coupon_code` shown. |
| Confirm / Deny | ✅ | Labels updated from Approve/Reject. |
| Approve flow | ✅ | Sets status `approved`; updates `user_profiles` (member_active, active_package_code); logs payment_events + audit_logs. |
| Reject flow | ✅ | Sets status `rejected`; logs. |
| Draft rejection | ✅ | Admin can Deny draft intents. |

### 4.2 Discount Coupons Admin

| Check | Status | Notes |
|-------|--------|-------|
| Create with scope | ✅ | OB/100/200/500; applies_to and package_ids set correctly. |
| Search/filter | ✅ | Filter by coupon code (client-side). |
| Global vs user-specific counts | ✅ | Header shows "X global coupons active · Y user-specific discounts active". |
| User-Specific Discounts | ✅ | Assign per user; system-generated code; claim link. |

---

## 5. Security Audit

### 5.1 Authentication & Authorization

| Check | Status | Notes |
|-------|--------|-------|
| Payment routes | ✅ | `verifySupabaseJWT` on all payment routes. |
| Admin routes | ✅ | `requireAdmin` on admin router. |
| RLS payment_intents | ✅ | User: own intents; Admin: all (via backend service_role). |
| RLS payment_events | ✅ | User: own via intent ownership; Admin: all. |

### 5.2 Input Validation

| Check | Status | Notes |
|-------|--------|-------|
| Intent create | ✅ | `kind`, `package_code`, `coupon_code` validated. |
| Submit | ✅ | `tx_hash`, `from_wallet` optional strings. |
| Admin approve/reject | ✅ | `uuidParam`, optional `note`. |
| Coupon create | ✅ | `discount`, `couponScope`, `durationMonths`, etc. |

### 5.3 Sensitive Data

| Check | Status | Notes |
|-------|--------|-------|
| Treasury address | ✅ | Hardcoded constant; not user-supplied. |
| TX hash | ✅ | Stored; linked to BscScan (public). |
| Declared from wallet | ✅ | Stored for admin review; no raw secrets. |

---

## 6. Edge Cases & Gaps

### 6.1 Documented Gaps

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| G1 | Medium | **Coupon redemption race** | ✅ Fixed: `try_increment_coupon_redemption` RPC |
| G2 | Low | **user_discounts.trading_used_count** not incremented | ✅ Fixed: Admin approve increments on package + user_discount |
| G3 | Low | **QR code external API** | ✅ Fixed: Client-side `qrcode.react` |
| G4 | Low | **Custom coupon + wrong scope:** Admin can enter code "OB123" but select scope "100". Backend uses `couponScope` for applies_to/package_ids. | Document that custom codes should match scope; or validate prefix vs scope. |

### 6.2 Schema Notes

- **payment_intents.amount_usdt:** Migration `20260129240000` allows `>= 0` for 100% off. Original migration had `> 0`; ensure migration order is correct in deployed DB.
- **payment_intents.tx_hash:** UNIQUE. Duplicate tx_hash from same user (e.g. retry) would fail. Acceptable.
- **payment_intents.coupon_code, discount_percent:** Nullable; populated when coupon applied.

---

## 7. UX & Consistency

### 7.1 Naming

| Term | Used In | Consistency |
|------|---------|-------------|
| Contribution wallet | Settings, Payments | ✅ |
| Confirm / Deny | Admin payment panel | ✅ (replaced Approve/Reject) |
| Discount Type | Admin coupon create | ✅ (OB, 100, 200, 500) |

### 7.2 Error Handling

| Scenario | Behavior |
|----------|----------|
| No Contribution wallet | Toast + link to Settings. |
| Invalid coupon | Toast with error from API. |
| Intent create failure | Toast with error. |
| Submit without tx_hash (amount > 0) | Toast "Enter transaction hash". |
| Manual payments disabled | Card explaining feature disabled. |

---

## 8. Testing Recommendations

### 8.1 Manual QA

1. **Full flow:** Set Contribution wallet → Create joining fee intent → Copy/scan → Send USDT (testnet) → Submit tx_hash → Admin Confirm → Verify member_active.
2. **100% coupon:** Create OB coupon 100% off → User applies → Create intent (amount 0) → Request approval (no tx) → Admin Confirm.
3. **Package coupon:** Create 100-scope coupon 50% off → User selects $100 package → Apply coupon → Create intent → Pay $50 → Admin Confirm → Verify active_package_code.
4. **URL deep link:** `/packages?coupon=OB12345678` → Pay joining fee → Coupon prefilled and applied.
5. **Wallet mismatch:** Submit with different from_wallet than profile → Intent flagged → Admin can still Confirm after manual check.

### 8.2 Automated

- Smoke test: Payment intents API returns 200 when manual payments enabled.
- E2E (if added): Full flow from Packages → Payments → Admin approve.

---

## 9. Summary & Recommendations

### Strengths

- Clear separation: global coupons vs user_discounts.
- Scoped coupon format (OB/100/200/500) matches requirements.
- 100% off flow (no TX hash) works correctly.
- Admin Confirm/Deny semantics are clear.
- Contribution wallet flow is straightforward.
- Coupon validation is thorough (expiry, redemptions, scope).

### Deployment Note

**Run migration before deploy:** `supabase/migrations/20260203100000_atomic_coupon_redemption.sql` creates `try_increment_coupon_redemption`. Without it, coupon redemption will return 500.

### No Critical Blockers

The system is suitable for beta/production use. All audit gaps G1–G3 have been addressed.

---

**End of audit.**
