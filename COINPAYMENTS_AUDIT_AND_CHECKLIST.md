# CoinPayments Integration Audit and Production Readiness

## 1) Issues Found

| # | Severity | Issue |
|---|----------|--------|
| 1 | **Critical** | CoinPayments router was not mounted in `index.ts`; `/api/payments/coinpayments/*` routes were unreachable. |
| 2 | **Critical** | IPN endpoint expected `req.rawBody` for HMAC verification, but no middleware captured raw body. Global `express.urlencoded()` consumes the body, so `rawBody` was always undefined and IPN returned 400 "Missing body". HMAC must be computed over the **exact** raw POST body (application/x-www-form-urlencoded). |
| 3 | **Critical** | Amount validation was computed but never enforced: IPN could set status to `completed` and run allocation even when `amount` from CoinPayments did not match the stored purchase amount. We must only confirm when expected USD amount matches (within tolerance). |
| 4 | **High** | Create-charge flow created the CoinPayments charge first, then inserted `eligible_purchases`. If insert failed, we had an orphan charge (user could pay but IPN would not find a row). Order changed to: insert PENDING first, then call API, then update row with `coinpayments_txn_id`. |
| 5 | **High** | IPN URL was built from `BASE_URL` (often frontend). CoinPayments must POST to the **backend** URL. Added `BACKEND_URL` and use it for `ipnUrl` and mock-ipn. |
| 6 | **Medium** | HMAC verification: `timingSafeEqual` can throw if buffers differ in length or if header is not valid hex. Now we validate hex and length before comparing. |
| 7 | **Medium** | Only one HMAC header name was checked (`x-coins-signature`). Documentation sometimes references `Hmac`. Added `getIpnHmacHeader()` to check both `hmac` and `x-coins-signature`. |
| 8 | **Low** | Optional merchant check: if `COINPAYMENTS_MERCHANT_ID` is set, IPN now rejects requests where `payload.merchant` does not match. |
| 9 | **Recommendation** | Allocation is not inside a single DB transaction; partial failure can leave some ledger rows written and others not. For production, consider a PostgreSQL function that performs all allocation inserts and the `purchase_allocation_runs` insert atomically, and call it via RPC. |

---

## 2) Fixes Applied

### Backend: `backend-skeleton/src/index.ts`

- **Mount CoinPayments router:**  
  `app.use('/api/payments/coinpayments', coinpaymentsRouter);`

- **Raw body for IPN:**  
  Before `express.json()` / `express.urlencoded()`, added path-specific middleware for `/api/payments/coinpayments/ipn`:
  - `express.raw({ type: 'application/x-www-form-urlencoded', limit: '64kb' })`
  - Then `(req as any).rawBody = req.body` so the IPN handler receives the exact raw body for HMAC.

### Backend: `backend-skeleton/src/lib/coinpayments.ts`

- **HMAC:**  
  - Validate signature header is non-empty and hex-only; ensure buffer length equals expected before `timingSafeEqual` to avoid throws.  
  - Added `getIpnHmacHeader(req)` that checks both `hmac` and `x-coins-signature` (Express lowercases header names).

### Backend: `backend-skeleton/src/routes/coinpayments.ts`

- **IPN:**  
  - Use `getIpnHmacHeader(req)` instead of a single header name.  
  - Optional merchant check: if `COINPAYMENTS_MERCHANT_ID` is set, require `payload.merchant === COINPAYMENTS_MERCHANT_ID`; otherwise 401.  
  - Only set status to `completed` and run allocation when `amountOk` and `currencyOk` (expected amount ± $0.01, currency USD/USDT). On mismatch: log, respond 200, do not update or allocate.

- **Create:**  
  - Insert `eligible_purchases` with status `pending` and no `coinpayments_txn_id`.  
  - Call `createCoinPaymentsCharge(..., orderId: purchase.id)`.  
  - Update the same row with `coinpayments_txn_id` and `updated_at`.  
  - Use `BACKEND_URL` (fallback `BASE_URL`) for `ipnUrl`.

- **Mock-ipn:**  
  - Use `BACKEND_URL || 'http://localhost:3000'` for the internal POST to the IPN URL.

---

## 3) Production Readiness Checklist

- [ ] **Env:** `COINPAYMENTS_IPN_SECRET` set and not logged. `BACKEND_URL` set to the public base URL of the backend (e.g. `https://api.klineo.xyz`) so IPN and mock-ipn call the correct host.
- [ ] **Env:** `COINPAYMENTS_MERCHANT_ID` set if you want to validate `merchant` in IPN payloads.
- [ ] **IPN URL:** In CoinPayments merchant settings, IPN URL must be `{BACKEND_URL}/api/payments/coinpayments/ipn` (method POST, application/x-www-form-urlencoded).
- [ ] **HMAC:** IPN secret in CoinPayments must match `COINPAYMENTS_IPN_SECRET`. Header checked: `Hmac` or `X-Coins-Signature` (raw body signed with HMAC-SHA256).
- [ ] **Idempotency:** Same txn_id can hit multiple times; we return 200 and skip update/allocate when status is already `completed`. Allocation is guarded by `purchase_allocation_runs`.
- [ ] **Amount:** We only confirm when IPN amount matches stored purchase amount (tolerance $0.01) and currency is USD/USDT. We never trust client-provided amounts for confirmation; purchase row is looked up by `coinpayments_txn_id`.
- [ ] **Auth:** Create-charge uses `verifySupabaseJWT`; `userId` and amount come from validated JWT and server-side body validation. IPN is unauthenticated; authenticity is HMAC (and optional merchant).
- [ ] **Runtime:** Backend is Node/Express (no Edge); IPN runs in Node with full DB access.
- [x] **Allocation:** Fully atomic via PostgreSQL function `allocate_purchase_revenue(p_purchase_id)`. All inserts (referral earnings, marketing ledger, revenue splits, allocation run) run in one transaction; any failure rolls back everything. Idempotent via `purchase_allocation_runs`. Missing upline levels reallocated to marketing pool.

**Atomicity:** The backend calls `client.rpc('allocate_purchase_revenue', { p_purchase_id })`. The PostgreSQL function locks the purchase row (`FOR UPDATE`), checks status = completed and not already allocated, resolves 7-level upline, computes amounts, then in a single transaction inserts all referral earnings, marketing ledger rows, revenue splits, and the allocation run record. On any error, the function raises and the whole transaction rolls back; no partial credits are written.
