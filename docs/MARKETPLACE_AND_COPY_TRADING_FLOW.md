# Marketplace & Copy Trading — Design (incl. Strategy Listing)

## Agreed design (from product)

- **DCA Bots**: Show in the **DCA Bots** section only (e.g. TOP 10 by ROI). They do **not** get listed in the Marketplace. No change needed for DCA in Marketplace.
- **Copy trading / Marketplace**: Users who are **approved Master Traders** can **build a strategy in Strategy Backtest** and **list it on the Marketplace**. Other users browse Marketplace (traders + strategies), view a strategy, and copy the Master Trader who listed it.

So:
- **Marketplace** = list of **Master Traders** (people) + list of **Strategies** (backtest strategies listed by those Master Traders).
- **Strategy listing** = only for approved Master Traders; strategies come from **Strategy Backtest** (config + optional backtest summary), not from DCA Bots.

---

## How copy trading starts today (traders only)

1. **Marketplace** lists approved **Master Traders** from `GET /api/traders` (from `traders` table, `status = 'approved'`).
2. A trader gets listed by: **Become a Master Trader** → Application → Admin approves → row in `traders` → appears in Marketplace.
3. **Copy flow**: Marketplace → View & Copy (trader) → Trader Profile → Copy Trader → Copy Setup (allocation) → `POST /api/copy-setups`. Platform copies that trader’s trades.

---

## New: Strategy listing (Master Traders only)

- **Who**: Only **approved Master Traders** (user has an approved row in `traders`).
- **Where**: They build a strategy in **Strategy Backtest**, then **List on Marketplace** (name, description, current backtest config + optional summary).
- **Storage**: `marketplace_strategies` table — `trader_id`, `name`, `description`, `symbol`, `interval`, `config` (JSONB), `backtest_summary` (JSONB), `status` (draft / listed / unlisted).
- **Discovery**: Marketplace shows a **Strategies** section (or tab) with listed strategies; each strategy shows the Master Trader who listed it. **Copy** = copy that trader (same Copy Setup flow as today).

**Implemented so far**

- Migration: `supabase/migrations/20260210180000_marketplace_strategies.sql` (table + RLS).
- Backend: `GET /api/me/trader` (profile router) — returns current user’s approved trader profile so the app can show “List on Marketplace” only to Master Traders.

**Still to do**

- Backend: Marketplace-strategies API — public list (listed only), “my strategies”, create/update/delete.
- Strategy Backtest UI: “List on Marketplace” button (only if `GET /api/me/trader` returns a trader) + dialog to submit strategy.
- Marketplace UI: “Strategies” section/tab, list strategies with trader info, “View & Copy” → Trader Profile or Copy Setup for that trader.

---

## DCA Bots (unchanged for Marketplace)

- DCA Bots live in the **DCA Bots** section (e.g. TOP 10 by ROI in that section).
- They are **not** listed in the Marketplace. No DCA-specific changes required for the Marketplace/copy-trading flow.

---

## Summary

| Area              | Behavior |
|-------------------|----------|
| DCA Bots          | DCA Bots section only (TOP 10 by ROI, etc.). Not in Marketplace. |
| Marketplace       | Master Traders (people) + **Strategies** (backtest strategies listed by Master Traders). |
| Strategy listing  | Only approved Master Traders; from Strategy Backtest → “List on Marketplace”. |
| Copy trading      | Copy a **trader** (from trader card or from a strategy card: “Copy [Trader name]”). |
