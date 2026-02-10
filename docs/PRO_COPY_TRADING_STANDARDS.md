# KLINEO — Pro Copy Trading Platform Standards

**Purpose:** Ensure KLINEO is built to **expert-level** standards expected of a **professional copy trading platform**. Use this as the single source of truth for what “pro” means and what is in place vs. planned.

**Last updated:** February 2026

---

## 1. Definition of “Pro” Copy Trading Platform

A **professional copy trading platform** must deliver:

| Area | Standard | Notes |
|------|----------|--------|
| **Security** | No client-trusted identity; server-side + RLS; encrypted API keys; fail-closed kill switch | Non-negotiable |
| **Risk** | User-controlled allocation, max position, daily loss limits; pause/stop; clear risk disclosure | Regulatory and trust |
| **Transparency** | Real PnL, real trade history, no fake performance; clear “demo” vs “live” | Trust |
| **Execution** | Low-latency mirroring of master trades to followers; proper sizing and slippage handling | Core product |
| **Compliance** | Risk disclosure, terms, no misleading claims; audit trail for orders/payments | Legal |
| **UX** | Expert-grade UI: clear state (copy active/paused), no amateur placeholders, consistent terminology | Perception |

---

## 2. Current Implementation Status

### ✅ In Place (Expert-Level)

| Component | Status | Location / Notes |
|-----------|--------|-------------------|
| Auth & identity | ✅ | JWT; `req.user.id` from token only; no client `user_id` trusted |
| RLS | ✅ | All user/trader/copy/position/order tables; admin read where needed |
| Exchange keys | ✅ | AES-256-GCM; no raw secrets in logs or responses |
| Global kill switch | ✅ | `platform_settings.kill_switch_global`; enforced in strategy runner, execute-tick, futures order; fail-closed on error |
| Copy setups (config) | ✅ | Create/update/pause/stop; allocation %, max position %; entitlement gating (joining fee + allowance); admin bypass |
| Entitlements | ✅ | Joining fee, package allowance, 402 when exhausted |
| Risk disclosure | ✅ | Dedicated page; copy-trading-specific risks; leverage, slippage, no guarantee |
| Payments | ✅ | Payment intents, tx_hash validation, HMAC IPN, idempotent allocation |
| Strategy runner (own algo) | ✅ | RSI-based futures; locks, risk gate, per-connection kill switch |
| Backtest | ✅ | Timeframe- and range-aware candle count; paginated live klines; synthetic with mean reversion |
| Master Trader flow | ✅ | Apply → Admin review → Approve/Reject; MT badge; admin treated as MT |
| Demo vs Live | ✅ | Clear mode toggle; demo = sample data only |

### ✅ Addressed (Partially in Place → Hardened)

| Component | Status | What was done |
|-----------|--------|----------------|
| Public `/api/traders` | ✅ Rate limited | `tradersPublicLimiter`: 120 req/15min per IP (see `backend-skeleton/src/middleware/rateLimit.ts`, applied in `index.ts`) |
| Health / runner status | ✅ Added | `GET /health/runner` returns `strategy_runs_total`, `strategy_runs_active`, `last_tick_at` (see `backend-skeleton/src/routes/health.ts`) |
| Copy engine contract | ✅ Stub in place | `backend-skeleton/src/lib/copyEngine.ts`: contract and placeholder; implementation still to be added |

### ❌ Not Yet Implemented (Copy Engine — Implementation)

| Component | Description |
|-----------|-------------|
| **Copy order placement** | Stub and contract exist in `backend-skeleton/src/lib/copyEngine.ts`. Full implementation must: (1) consume a feed of master trades (or poll master positions), (2) compute follower size (allocation %, max position %, risk limits), (3) call exchange API per follower with kill-switch and risk checks, (4) record orders/positions/trades. |

**Wording in product:** Until the copy engine exists, avoid promising “trades are copied automatically in real time” in a way that implies execution. Prefer “configure copy trading,” “set up copying,” “when copy execution is active, trades will replicate,” or add a short “Copy execution: in development” where appropriate.

---

## 3. Pro Standards Checklist for New Work

When adding or changing features, ensure:

- [ ] **Security:** No trust of client-supplied `user_id` or sensitive IDs; enforce server-side with JWT and RLS.
- [ ] **Copy / trading:** Any order placement must check global kill switch and user/connection risk limits.
- [ ] **Terminology:** Use “Master Trader,” “Copy Trader,” “copy setup,” “allocation” consistently; avoid “bot” in user-facing copy unless intended.
- [ ] **Risk:** New trading/copy features must respect entitlement (joining fee + allowance) unless explicitly admin/bypass.
- [ ] **UX:** No placeholder text in production; Demo vs Live clearly labeled; numbers (PnL, %) from real or clearly synthetic data.
- [ ] **Docs:** Update this file and `KLINEO_HIGH_LEVEL_OVERVIEW.md` when adding major capabilities (e.g. copy engine).

---

## 4. References

- **Platform audit:** `docs/PLATFORM_AUDIT_REPORT.md`
- **Copy engine note:** “Copy trading: There is no copy-trading order placement engine in the codebase” (audit report).
- **High-level product:** `docs/KLINEO_HIGH_LEVEL_OVERVIEW.md`
- **Trading terminal UX:** `guidelines/TRADING_TERMINAL_RIGHT_PANEL.md`
