# Marketplace & Copy Trading — How It Works (and the Strategy-Listing Gap)

## How copy trading starts in the Marketplace (current design)

1. **Marketplace lists Master Traders only**  
   The Marketplace page loads traders from `GET /api/traders`. Those rows come from the **`traders`** table. Only traders with **`status = 'approved'`** are returned. So the Marketplace is a **curated list of approved Master Traders**, not a list of user-created strategies (e.g. DCA bots or backtest strategies).

2. **How a trader gets into the Marketplace**  
   - User goes to **Become a Master Trader** (link on Marketplace) → **Master Trader Application** page.  
   - They submit the application (personal info, trading experience, strategy description, proof screenshot, etc.) via `POST /api/master-trader-applications`.  
   - An admin reviews in **Admin → Master Trader Requests** and **approves** or rejects via `PATCH /api/admin/master-trader-applications/:id`.  
   - When status is set to **approved**, the backend **creates a row in `traders`** (if one doesn’t already exist for that user): `user_id`, `display_name`, `slug`, `status: 'approved'`.  
   - That trader then **appears in the Marketplace** (because `GET /api/traders` returns approved traders).  
   - Performance stats (ROI, drawdown, followers, etc.) come from **`trader_performance`** and **`copy_setups`** (follower count). Who fills `trader_performance` is a separate backend/cron concern (not covered here).

3. **Copy trading flow (follower side)**  
   - User opens **Marketplace** → sees cards for each approved Master Trader.  
   - Clicks **View & Copy** on a trader → navigates to **Trader Profile** (same route, view `trader-profile` with trader `id`/`slug`).  
   - On Trader Profile they click **Copy Trader** → app switches to **Copy Setup** view (`copy-setup` with trader `id`, `name`, `slug`).  
   - On **Copy Setup** they choose allocation %, max position %, etc., and submit → `POST /api/copy-setups` creates a copy setup (user is now “copying” that trader).  
   - Their active copy setups are shown under **Copy Trading**; the platform then replicates that trader’s trades to the follower (execution path is backend/trading logic).

So: **copy trading “starts” in the Marketplace by browsing approved Master Traders, opening a Trader Profile, then starting a Copy Setup for that trader.** There is no separate “strategy” entity in the Marketplace — only **people (Master Traders)** who were approved via the application.

---

## Where users can “execute their own strategy” today

- **Strategy Backtest** (`/strategy-backtest`): Users can backtest a strategy (e.g. SMA crossover). This is **backtest-only**. There is **no** “publish to Marketplace” or “list this strategy”; it does not create a `traders` row or any Marketplace listing.  
- **DCA Bots** (e.g. DCA Bots page): Users can create and run their own DCA bots. These are **personal automation**. They are **not** listed in the Marketplace and are **not** the same as “Master Traders” in the Marketplace.  
- **Master Trader Application**: This is the **only** path to appearing in the Marketplace. The applicant is a **person** (display name, bio, proof, etc.), not a specific “strategy” or “bot.” Once approved, they show up as one trader in the list; their performance is tracked in `trader_performance`.

So today there is **no** flow for “I run my own strategy (backtest or DCA bot) and I want to **list it in the Marketplace** so others can copy it.” The Marketplace is **only** for approved Master Traders (application-based, human-centric).

---

## Summary

| Question | Answer |
|----------|--------|
| How does copy trading start in the Marketplace? | User opens Marketplace → picks an approved Master Trader → View & Copy → Trader Profile → Copy Trader → Copy Setup (allocation, etc.) → copy setup is created; platform copies that trader’s trades. |
| Where can users execute their own strategy? | **Strategy Backtest**: backtest only, no listing. **DCA Bots**: run their own DCA, not in Marketplace. **Master Trader**: apply to become a trader; if approved, they appear in Marketplace (as a person, not as a “strategy” object). |
| Can users list their own strategy in the Marketplace? | **No.** Only **approved Master Traders** (from Master Trader Application) appear. There is no “publish strategy” or “list my DCA bot / backtest strategy” in the current implementation. |

If you want users to “execute their own strategy and list it in the Marketplace,” you’d need to add a new path, for example:

- A **“Strategy Marketplace”** or **“List my strategy”** flow where a user can attach a strategy (e.g. a DCA bot config or a backtest-derived strategy) to a listing that others can browse and copy, **or**
- Keep the current Marketplace as **Master-Trader-only** and document that “listing” is only via the Master Trader Application (person-based), and that Strategy Backtest and DCA Bots are for personal use only unless you later add a separate strategy-listing feature.
