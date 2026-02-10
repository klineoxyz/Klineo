# DCA Bots & Related Features — Architecture Inspection

Factual description of the current implementation. No code changes or speculative suggestions except where tied to identified gaps.

---

## 1) DCA Bots – Architecture

### Where is the DCA Bots page implemented?

- **Page component:** `src/app/components/screens/DcaBotsPage.tsx`
- **Create-bot modal:** `src/app/components/screens/dca/CreateBotModal.tsx`
- **Preset data (static):** `src/app/data/dcaPresets.ts`
- **Backend API:** `backend-skeleton/src/routes/dca-bots.ts` — mounted at `/api/dca-bots`
- **Frontend API client:** `src/lib/api.ts` — `dcaBots` object (`list`, `create`, `updateStatus`, `update`, `delete`)

### How is it wired into routing and sidebar?

- **Routes:** `src/app/config/routes.ts` — `dcaBots: "/dca-bots"`, view id `"dca-bots"` maps to that path.
- **App routing:** `src/app/App.tsx` — `case "dca-bots": return <DcaBotsPage onNavigate={handleNavigate} />`
- **Sidebar:** `src/app/config/navigation.ts` — under section **"Trading"**, item `{ id: "dca-bots", label: "DCA Bots", icon: LayoutGrid }`. No separate route file; the app uses a single view id → component map and pathname/subView for deep links.

### How is DCA Bots treated?

- **b) A bot entity.** It is implemented as its own entity type:
  - Own table `dca_bots`, own API `/api/dca-bots`, own page and nav item.
  - Not a strategy type in the Strategy Backtest sense (no backtest template or strategy id).
  - Not a copy-trading variant: it does not use `copy_setups` or traders; it is a user-owned bot configuration (grid/DCA params) with status.

### What table(s) back DCA Bots in Supabase?

- **Single table:** `public.dca_bots` (see migration `supabase/migrations/20260210100000_dca_bots.sql`).
- No separate “DCA strategies” or “DCA runs” tables. Copy Trading uses `copy_setups` + `traders`; DCA uses only `dca_bots`.

---

## 2) DCA Bots – Data Model

### What fields are stored for a DCA Bot?

From the migration and backend:

- **Columns:** `id`, `user_id`, `name`, `exchange`, `market`, `pair`, `timeframe`, `status`, `config` (JSONB), `created_at`, `updated_at`.
- **Constraints:** `exchange` IN ('binance','bybit'), `market` IN ('spot','futures'), `status` IN ('running','paused','stopped').

### Where are grid/DCA parameters stored?

- **In the `config` JSONB column.** No dedicated columns for grid steps or safety orders.
- **Frontend type:** `src/lib/api.ts` — `DcaBotConfig`: `baseOrderSizeUsdt`, `gridStepPct`, `maxSafetyOrders`, `safetyOrderMultiplier`, `maxTotalPositionCapPct`, `tpPct`, `tpLadder`, `tpLadderLevels`, `dailyLossLimitPct`, `maxDrawdownStopPct`, `cooldownMinutes`, `trendFilter`, `volatilityFilter`. All of these are persisted inside `config` when creating/updating a bot.

### How is status handled (running / paused / stopped)?

- **Stored in DB:** `dca_bots.status` is a column, updated via `PUT /api/dca-bots/:id/status` with body `{ status }`.
- **No execution:** Changing to `running` or `paused` only updates the row. There is no backend or worker that reads `status` to start/stop execution. Status is UI/configuration only for now.

### Are risk controls persisted or only UI-level?

- **Persisted.** They live in `config` (e.g. `dailyLossLimitPct`, `maxDrawdownStopPct`, `cooldownMinutes`, `trendFilter`, `volatilityFilter`) and are saved with the bot. No execution engine reads them yet, so enforcement is not implemented—only storage.

---

## 3) Execution Boundary

### Is there any execution logic already wired (even stubbed)?

- **No.** There is no DCA execution code in the repo:
  - No cron, no worker, no `executeDcaBot` (or similar) in the backend.
  - Copy Trading has a documented stub: `backend-skeleton/src/lib/copyEngine.ts` — `replicateMasterTrade` returns `{ replicated: 0, errors: ['Copy engine not implemented'] }`. There is no analogous DCA execution stub or module.

### Where is the intended execution hook or interface?

- **There is no defined hook or interface for DCA execution.** The backend only does CRUD on `dca_bots`. A future engine would need to be added (e.g. a module that polls or is triggered for bots with `status = 'running'`, reads `config` and exchange/pair, and places orders).

### What would be the clean entry point to plug in a DCA execution engine later?

- **Suggested entry points (for when you add it):**
  1. **Backend:** A new module (e.g. `backend-skeleton/src/lib/dcaEngine.ts` or a worker) that:
     - Queries `dca_bots` where `status = 'running'`.
     - For each bot, resolves the user’s exchange connection (same pattern as copy engine: user_id → exchange connection), then runs grid/DCA logic.
  2. **Trigger:** Either a cron calling into that module, or a queue/event driven by status changes. Currently nothing subscribes to `dca_bots` or status changes.
  3. **Data:** All required inputs are already in the DB: `dca_bots` (id, user_id, exchange, market, pair, timeframe, config). Exchange credentials live in `user_exchange_connections` (or the current exchange abstraction). No new tables are strictly required to *start* execution; you may add tables later for DCA-specific orders/positions if you want to track them separately from copy-trading positions.

---

## 4) Relationship to Copy Trading

### Is DCA Bots completely isolated from Copy Trading logic?

- **Yes.** Separate tables, APIs, and UI:
  - Copy Trading: `copy_setups`, `traders`, `/api/copy-setups`, `/api/traders`, CopyTrading page, copy engine stub.
  - DCA Bots: `dca_bots`, `/api/dca-bots`, DcaBots page, no execution stub.
- They do not reference each other. Positions/orders tables reference `copy_setup_id` (copy trading), not `dca_bots`.

### Do they share any tables, services, or abstractions?

- **Shared only in a generic sense:**
  - Both assume a “user” and “exchange connection” (e.g. `user_profiles`, exchange connection / balance APIs). There is no shared “bot service” or “strategy runner” that both use.
  - Copy engine and (future) DCA engine would both need to resolve user → exchange connection and place orders; that shared concern is not abstracted into a single execution service today.

### Are Futures explicitly blocked for DCA Bots at code level or only in UI?

- **UI only.** In `src/app/components/screens/dca/CreateBotModal.tsx`, the market selector has `<SelectItem value="futures" disabled>Futures (Soon)</SelectItem>`. The backend and DB allow `market = 'futures'`: validation in `backend-skeleton/src/routes/dca-bots.ts` uses `body('market').optional().isIn(['spot', 'futures'])`, and the migration has `CHECK (market IN ('spot', 'futures'))`. So enabling Futures for DCA is a frontend change (remove or adjust the `disabled` on the futures option); no backend or migration change required for storing futures bots.

---

## 5) Strategy Backtest Integration

### How is Strategy Backtest implemented?

- **Single page:** `src/app/components/screens/StrategyBacktest.tsx`.
- **Flow:** User picks a **strategy template** (e.g. `rsi-oversold`, `ma-crossover`, `breakout`, `mean-reversion`, `momentum`, `custom`), symbol, date range, timeframe, and strategy-specific params. The page fetches or generates OHLC candles, runs an in-browser backtest (e.g. `runBacktest()` and strategy-specific logic in the same file), and shows results (chart, trades, PnL). “Go Live” can launch to demo or (with entitlement) to a connected exchange (Futures). No separate backtest backend; all backtest logic is client-side in StrategyBacktest.tsx.

### Does it already support multiple strategy types?

- **Yes.** It supports multiple **indicator-based** strategy types (RSI, MA crossover, breakout, mean reversion, momentum, custom). Each is a different signal generator over OHLC. They are not “DCA” or “grid” strategies; they are discrete entry/exit signals. So: multiple strategy types exist, but they are all the same “family” (indicator/price-based backtest). DCA/grid is a different family (order ladder, no backtest implemented for it).

### Is there a path to plug DCA Bots into Strategy Backtest results cleanly?

- **Not today.** Strategy Backtest does not know about `dca_bots` or DCA presets. It has no “DCA” or “grid” template, no read from `dca_bots` or `dcaPresets`, and no shared result format for “strategy type X” that DCA could implement. To plug DCA in cleanly you would need to either:
  - Add a DCA/grid backtest mode (new template + new backtest path that simulates grid orders over OHLC), and optionally surface DCA presets or saved bots there, or
  - Define a small “backtest result” or “strategy performance” abstraction that both the current backtest and a future DCA backtest can emit, then have the UI or marketplace consume that. Right now there is no such abstraction; backtest state and results are local to StrategyBacktest.tsx.

---

## 6) Marketplace Compatibility

### Can DCA Bots be listed in the Marketplace today?

- **No.** The Marketplace (`src/app/components/screens/Marketplace.tsx`) lists **traders** only. It loads `GET /api/traders?limit=100` and renders trader cards (ROI, drawdown, followers, etc.). There is no API or UI for listing “DCA Bot presets” or “DCA strategies” in the Marketplace. The Marketplace is copy-trading oriented (browse traders → copy them).

### If yes: how would they be differentiated?  
*(N/A — currently no.)*

### If no: what would be required (minimal) to allow listing DCA Bot presets?

- **Minimal changes could be:**
  1. **Backend:** An endpoint that returns “listable” DCA presets (e.g. from `dcaPresets.ts` or a new table if presets become user-generated). Today presets are frontend-only in `src/app/data/dcaPresets.ts`.
  2. **Marketplace UI:** A way to show “DCA Presets” (or “Strategies”) in addition to or instead of traders—e.g. a tab or filter, and cards that link to “Use this preset” (prefill Create Bot modal or deep link to DCA Bots with preset id).
  3. **Differentiation:** Marketplace currently has a single concept (trader to copy). You’d add a second concept (e.g. “DCA preset” or “strategy preset”) and label it clearly (e.g. “DCA Preset” vs “Copy Trader”) so users see the difference.

---

## 7) Dashboard Widget

### How is the DCA Bots widget implemented on the Dashboard?

- **Location:** `src/app/components/screens/Dashboard.tsx` — in the second row of cards (same row as Platform Fees, Referral Earnings, Copy Engine). The grid is `grid-cols-2 sm:grid-cols-4`; the fourth card is “DCA Bots”.
- **Content:** Title “DCA Bots” with LayoutGrid icon; then either loading state, error state, empty state (no bots), or data state (status dot, running count, Paused/Total lines, Allocated USDT, “Open DCA Bots” and “Create Bot” buttons). Empty state has “Create your first bot” and “Browse presets” (navigate to dca-bots). Create Bot opens `CreateBotModal` (same as on DcaBotsPage).

### Where does it fetch data from?

- **REST API:** `GET /api/dca-bots` (via `dcaBots.list()` from `src/lib/api.ts`). The widget does not use a dedicated “summary” endpoint; it uses the same list endpoint as the DCA Bots page.

### Is aggregation done client-side or server-side?

- **Client-side.** The hook `src/app/hooks/useDcaBotSummary.ts` calls `dcaBots.list()`, then in the browser computes: `activeBotsCount` (status === 'running'), `pausedBotsCount` (status === 'paused'), `totalBots` (length), and `totalAllocatedUSDT` (sum of an estimated allocation per bot derived from `config.baseOrderSizeUsdt`, `config.maxSafetyOrders`, `config.safetyOrderMultiplier`). There is no `getDcaBotSummary()` or similar on the backend; aggregation is entirely in the frontend.

---

## 8) Gaps & Risks

### Architectural risks / shortcuts / TODOs

- **No execution path:** DCA is configuration-only. Status “running” is not consumed by any worker. Users may assume “running” means the bot is trading; it does not.
- **No DCA-specific orders/positions:** Positions and orders tables are tied to copy trading (`copy_setup_id`). If/when DCA execution exists, you may want a clear way to attribute orders/positions to a DCA bot (e.g. `dca_bot_id` or a shared “source” enum) for reporting and risk.
- **Allocation is estimated:** Dashboard “Allocated” is a client-side estimate from config (base order + safety-order ladder). It is not actual committed capital or exposure. Misleading if users treat it as “real” allocation.
- **Presets are static:** DCA presets live in frontend code (`dcaPresets.ts`). They are not in the DB or API. To make them listable in the Marketplace or editable by admins, they’d need to be moved to backend/DB or served by an API.
- **Strategy Backtest and DCA are unrelated:** No shared “strategy” or “backtest result” model. Adding DCA to backtest or to a unified “strategy marketplace” would require design and refactor.

### What could block scaling bots?

- **Single list endpoint:** Dashboard and DcaBots page both call `GET /api/dca-bots` with no pagination. For many bots per user, you’d want pagination or a summary endpoint so the Dashboard doesn’t pull the full list every time.
- **No rate limiting or quotas:** Backend does not enforce per-user bot limits. If you later want “max N bots per package,” that logic doesn’t exist yet.

### What could block adding Futures DCA later?

- **Nothing at the DB or API level.** `market` already allows `'futures'`. Only the Create Bot UI disables the futures option. Enabling it is a small frontend change; execution would then need to use a futures-capable order path when `market === 'futures'`.

### What could block “copying” DCA Bots (e.g. one user reusing another’s preset/config)?

- **No “public” or “listable” DCA presets.** Presets are local to the app; bots are per-user and private (RLS). To let users “copy” a DCA bot or preset you’d need: either a way to expose some presets/bots as copyable (e.g. marketplace of presets, or “duplicate from bot id” with permission), and possibly a “template” or “preset from another user” concept. Not implemented today.

### What should be refactored now vs later?

- **Now (if you want a clear execution contract):** Add a minimal DCA execution interface (e.g. a single function or module that “runs one tick for bot X” or “process running DCA bots”) and call it from a cron or queue, even if the implementation is a no-op or stub. That locks the contract and avoids big rewrites when you add real execution.
- **Later:** Moving presets to DB/API, adding a summary endpoint for the Dashboard, pagination for `GET /api/dca-bots`, and any shared “strategy” or “backtest result” abstraction between Strategy Backtest and DCA can be done when you need Marketplace listing, scaling, or unified strategy features.
