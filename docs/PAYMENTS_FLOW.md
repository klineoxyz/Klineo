# Payment flow: user and admin

## When a user clicks Pay (joining fee or package)

1. **Subscription (Packages) page**
   - User sees **Joining Fee** card ($100 one-time) and **Pay joining fee** button.
   - User sees **Trading packages** (Starter $100, Booster $200, Establish $500) with **Pay** buttons (enabled after joining fee is paid).

2. **On "Pay joining fee" or "Pay" (package)**
   - App creates a **payment intent** via `POST /api/payments/intents` (`kind: "joining_fee"` or `kind: "package"` + `package_code`).
   - User is **navigated to Payments** with the new intent pre-loaded.

3. **Payments page – what the user sees**
   - **Deposit instructions** card:
     - **Amount:** X USDT (copy button).
     - **Treasury Safe:** BSC address of the Safe (copy button + "Open Safe" link).
     - **Instructions:** Send exactly X USDT (BEP20) to the Treasury Safe. Use **BSC** network.
   - **Wallet they must use**
     - Any **BSC (BEP20)** wallet that holds USDT (e.g. MetaMask, Trust Wallet, Binance withdrawal to BEP20).
     - They send **USDT (BEP20)** to the **Safe address** shown. Contract: `0x55d398326f99059fF775485246999027B3197955` (USDT on BSC).
   - After sending, user fills:
     - **Transaction hash** (required): the BSC tx hash from their wallet/explorer.
     - **From wallet** (optional): the BEP20 address they sent from (should match Settings → Payment wallet (BSC) to avoid flagging).
   - User clicks **Submit for review**. Intent status becomes `pending_review` (or `flagged` if from wallet does not match Settings).

4. **User profile (backend)**
   - **payment_intents** row: `user_id`, `kind`, `package_code`, `amount_usdt`, `status` (draft → pending_review/flagged → approved/rejected), `tx_hash`, `declared_from_wallet`, `mismatch_reason`, `reviewed_by`, `reviewed_at`, `review_note`.
   - **payment_events** rows: created, submitted, approved/rejected (audit trail).
   - After admin **approves**: `user_profiles` gets `member_active = true` (joining fee) or `active_package_code` + `package_started_at` (package).

---

## What the admin gets (Admin → Payments tab)

- **List** of all payment intents: user (id), kind, package_code, amount_usdt, status, **tx_hash**, declared_from_wallet, mismatch_reason, reviewed_at, review_note, created_at.
- **When user has submitted** (tx hash + optional from wallet):
  - Admin sees **tx_hash** (link to BscScan) and **declared_from_wallet**.
  - Admin verifies on BscScan that the tx sent the correct USDT amount to the Safe.
  - If **from wallet** does not match the user’s saved Payment wallet (BSC) in Settings, intent is **flagged** and mismatch_reason is set; admin can still approve after manual checks.
- **Actions**
  - **Approve:** Sets intent status to `approved`, updates `user_profiles` (member_active or package), writes `payment_events` and `audit_logs`.
  - **Reject:** Sets intent status to `rejected`, writes `payment_events` and `audit_logs` (optional note).

---

## Backend / env

- **ENABLE_MANUAL_PAYMENTS=true** on the backend (e.g. Railway) to enable `POST /api/payments/intents` and the Payments UI.
- Treasury Safe BSC address and Safe link are configured in `backend-skeleton/src/routes/payment-intents.ts` (constants).

---

## Summary

| Step | User | Admin |
|------|------|--------|
| 1 | Clicks Pay (joining fee or package) on Subscription | — |
| 2 | Redirected to Payments; sees amount + Safe address + “Send USDT (BEP20) on BSC” | — |
| 3 | Sends USDT from their BSC wallet to Safe; enters tx hash (+ optional from wallet); submits | — |
| 4 | — | Sees new intent with tx_hash; verifies on BscScan; Approve or Reject |
| 5 | Profile updated (member_active or package); can use app / trade | — |
