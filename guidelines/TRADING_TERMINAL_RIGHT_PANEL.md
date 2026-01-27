# Trading Terminal — Right Panel UX (Copy / Strategy vs Manual)

**Product direction:** The right-hand panel in the trading terminal should be **context-aware**, not always “Buy / Sell spot only.”

## Current vs target

| Context | Current | Target (expert trading platform) |
|--------|--------|-----------------------------------|
| **Manual trading** | Buy / Sell, Limit / Market, Amount, % | Keep order entry; add **leverage**, margin mode, order types (e.g. TP/SL). |
| **Copy trading** | Same Buy/Sell panel | **Select bot/trader** to copy, allocation, risk limits, then “Start copying” / “Execute”. |
| **Strategy / algo** | — | **Create or pick strategy**, set params, backtest entry, then **Run / Execute** live. |

## Right-panel content by mode

1. **Manual**  
   Order entry (market/limit), leverage selector, margin/cross mode, size, TP/SL, then Place order.

2. **Copy**  
   “Who to copy” (list/cards of bots/traders), allocation and risk (%, max loss, etc.), then Start / Pause / Stop copy.

3. **Strategy**  
   Strategy picker or “Create strategy”, parameters, optional “Backtest” step, then **Execute** / Run live.

## Implementation note

- Today the right panel is a single **Buy / Sell** order form (spot, demo balance).
- When the app is in “copy trading” or “strategy” flow, that panel should switch (or be supplemented) to **Copy** or **Strategy** content as above, not only Buy/Sell.
- Use a mode or route (e.g. `manual` | `copy` | `strategy`) to choose which right-panel content to render.
