# Exchange as source of truth

**Apply this everywhere:** DCA, Copy Trading, Grid/Strategy, Terminal, and any feature that uses balances or order status.

## Principles

1. **Balances**  
   Use **live exchange balance** for any check (e.g. “can I place this sell?”). Do not assume DB or in-memory state is correct after the user or a bot has traded.

2. **Order status**  
   When showing orders or deciding what to do next, **sync from the exchange** when it matters (e.g. “is this order filled?”). Keep the unified `orders` table (and any bot-specific tables) in sync when we discover fills/cancels via the exchange.

3. **Sells (spot)**  
   Required balance to sell = quantity to sell (no fee buffer on the base asset). If our “position” says we have X base but the exchange has less (e.g. user sold manually), **reconcile** before placing a sell: use `min(our_position, actual_exchange_balance)` and/or clear position state so we don’t keep trying to sell more than the user has.

4. **Reconciliation**  
   Before acting on “we have a position” (e.g. placing a take-profit sell), **reconcile with the exchange**: fetch current base balance (and open orders if needed) and update our state so it matches reality. Then use that reconciled state for the rest of the flow.

5. **UI**  
   Where we show Orders / Trade History, give users a way to **refresh from the exchange** (e.g. “Refresh from exchange” that runs sync then reloads). Don’t rely only on DB state that might be stale.

## Where it’s implemented

| Area | What we do |
|------|------------|
| **Order execution** | `orderExecution.ts`: spot sell uses exchange balance only for required amount (no fee buffer on base). `getSpotBaseBalance` exported for callers. |
| **DCA engine** | Each tick: reconcile position with exchange balance; TP sell quantity = min(position, actual base balance); on sync, update `orders` and `dca_bot_state` from exchange. |
| **DCA API** | `POST /api/dca-bots/sync-orders` runs sync for all running spot DCA bots so Orders/Trade History can be refreshed. |
| **Orders page** | “Refresh from exchange” calls sync then reloads orders. |

When adding or changing Copy, Grid, or Terminal flows, follow the same rules: use live balance for checks, sync order status from the exchange when displaying or before acting, and reconcile position/state with the exchange when it might be stale.
