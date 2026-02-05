# Binance API Integration Audit

**Date:** 2026-02  
**Reference:** [Binance Spot API](https://binance-docs.github.io/apidocs/spot/en/), [Binance Futures API](https://developers.binance.com/docs/derivatives/usds-margined-futures), [Testnet docs](https://testnet.binance.vision/)

## Summary

This audit compares the KLINEO Binance integration to official Binance API documentation. Issues found have been fixed with **minimal changes** (no architecture refactor).

---

## 1. Endpoints & URLs

### Spot
| Environment | Correct URL | Our Code | Status |
|-------------|-------------|----------|--------|
| Production | `https://api.binance.com` | ✓ | OK |
| Testnet | `https://testnet.binance.vision` | ✓ | OK |

### Futures (USDT-M Perpetual)
| Environment | Correct URL | Our Code (before) | Our Code (after) | Status |
|-------------|-------------|-------------------|------------------|--------|
| Production | `https://fapi.binance.com` | ✓ | ✓ | OK |
| Testnet | `https://demo-fapi.binance.com` | `testnet.binancefuture.com` | `demo-fapi.binance.com` | **FIXED** |

**Critical fix:** `testnet.binancefuture.com` is for **Coin-Margined (delivery) futures**, not USDT-M perpetual. We use `/fapi/` endpoints, so we must use `demo-fapi.binance.com` for testnet. This mismatch could cause connection/test failures.

---

## 2. Request Signing (HMAC SHA256)

| Doc requirement | Our implementation | Status |
|-----------------|--------------------|--------|
| HMAC SHA256 with `secretKey` | `createHmac('sha256', secret).update(queryString).digest('hex')` | ✓ OK |
| `timestamp` (ms) | `Date.now()` | ✓ OK |
| `recvWindow` (optional, max 60000) | 10000 ms | ✓ OK (tolerates clock drift) |
| `signature` in query string | Appended after signing | ✓ OK |
| `X-MBX-APIKEY` header | ✓ | OK |

**Note:** Binance recommends `recvWindow` 5000 or less; we use 10000 to tolerate clock drift. Max is 60000.

---

## 3. Error Handling

### -1021 (Timestamp outside recvWindow)
- **Cause:** Server clock drift.
- **Doc:** Sync clock or use Binance server time (`/api/v3/time`).
- **Change:** Clearer error message suggesting sync/server time.

### 429 (Rate limit)
- **Doc:** "When a 429 is received, back off and do not spam. Violations → IP ban (418)."
- **Change:** Retry up to 2 times with backoff (1s, 2s) or `Retry-After` header. Fresh timestamp on each retry.

### 451 (Restricted region)
- Already handled with clear message. Proxy support via `BINANCE_HTTPS_PROXY`.

---

## 4. Order Placement (Futures)

| Doc requirement | Our implementation | Status |
|-----------------|--------------------|--------|
| `clientOrderId` for idempotency | Not sent | **FIXED** – now sends `klneo_${timestamp}_${randomHex}` |
| Avoid duplicates on retry | — | ✓ Helps with retry safety |

---

## 5. Rate Limits & Headers

- **X-MBX-USED-WEIGHT-*** (Spot) / **X-MBX-ORDER-COUNT-*** (Futures): We do not read these. Optional for advanced rate limiting.
- **429 handling:** Implemented with retry + backoff.
- No architectural change; minimal retry logic only.

---

## 6. WebSockets & User Data Streams

- **Spot User Data Stream:** Not implemented. Used for real-time account/order updates.
- **Futures User Data Stream:** Not implemented.
- **Market WebSockets:** Frontend `src/lib/binance.ts` uses REST for klines; no WS.
- **Impact:** Read-only flows work. For live trading, REST polling is used; no WS resilience. Out of scope for this audit.

---

## 7. API Key Permissions

- **Spot test** (`/api/v3/account`): Requires "Enable Reading".
- **Futures test** (`/fapi/v2/account`): Requires "Enable Futures" + "Enable Reading".
- Users must create keys with correct permissions. Errors are surfaced as returned by Binance.

---

## 8. Testnet Key Sources

- **Spot:** https://testnet.binance.vision/
- **Futures (USDT-M):** https://testnet.binancefuture.com/ (web UI; API base is `demo-fapi.binance.com`)

Same keys from the Futures testnet UI work with `demo-fapi.binance.com` REST API.

---

## 9. Changes Made

1. **Binance Futures testnet URL:** `testnet.binancefuture.com` → `demo-fapi.binance.com` in:
   - `backend-skeleton/src/lib/binance-futures.ts`
   - `backend-skeleton/src/lib/candles.ts`
2. **429 retry:** Added retry with backoff in `binance.ts` and `binance-futures.ts`.
3. **-1021 message:** Improved error text with sync/server time guidance.
4. **clientOrderId:** Added to Futures `placeOrder` for idempotency.
5. **Env override:** `BINANCE_FUTURES_TESTNET_URL` for custom testnet base URL.

---

## 10. Hardening (Feb 2026)

### Capability-based connection test

- **Before:** Single call to `/api/v3/account`.
- **After:**  
  1. `GET /api/v3/time` (public) — connectivity check  
  2. `GET /api/v3/account` (signed) — uses server time to avoid -1021  
  3. Permission validation (canTrade, canWithdraw, permissions) — returns warnings only  

- **Spot success = overall success.** Futures is never called during connection test.
- **Futures failure does not affect connection test** — Futures test is a separate endpoint.

### Server time offset

- `getServerTime()` fetches `/api/v3/time`.
- Connection test uses server time for signed requests to avoid -1021.
- `buildSignedQuery()` accepts optional `overrideTimestamp`.

### Error classification

- `classifyBinanceError()` maps codes to: permission, timestamp, signature, ip_whitelist, rate_limit, restricted, other.
- `getBinanceUserMessage()` returns user-safe messages (no secrets).
- Codes: -2015 (permission), -1021 (timestamp), -1022 (signature), 429, 451.

### Spot-only guarantees

| Path | Endpoint(s) | Gating |
|------|-------------|--------|
| POST /test, POST /:id/test | Spot only | Always |
| GET /balance | Spot only | Always |
| POST /:id/futures/test | Futures | User-triggered |
| POST /:id/futures/enable | Futures | User-triggered |
| POST /futures/order | Futures | `futures_enabled` required |
| Strategy runner | Futures | `futures_enabled` + kill_switch checked |

### Checklist

- [x] Spot-only EU users succeed (no Futures call in connection test)
- [x] Futures-enabled users still work (separate test/enable/order endpoints)
- [x] No regression: balance, orders, strategy runner unchanged
- [x] Server time used in connection test to avoid -1021
- [x] User-safe error messages; secrets never logged

---

## 11. Not Changed (Intentional)

- **recvWindow 10000:** Kept for clock drift tolerance.
- **Server time for general signed requests:** Used in connection test only; other requests use `Date.now()`.
- **No WebSocket implementation:** Requires larger changes; not part of this audit.
- **Parameter order:** Doc allows any order; current implementation is fine.

---

## References

- [Spot REST API](https://binance-docs.github.io/apidocs/spot/en/)
- [Spot General API Info](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/general-api-information)
- [Futures General Info](https://developers.binance.com/docs/derivatives/usds-margined-futures/general-info)
- [Spot Testnet](https://testnet.binance.vision/)
- [Futures Testnet (USDT-M)](https://demo-fapi.binance.com)
