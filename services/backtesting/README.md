# Klineo Backtesting Module (Freqtrade)

Standalone backtesting service using **Freqtrade**. It runs backtests on historical Binance data and produces normalized JSON for the Klineo backend and **TradingView Lightweight Charts** (OHLC + equity curve).

Freqtrade is isolated from the Node backend: the backend triggers backtests via CLI (e.g. `child_process.spawn`) and reads the normalized output file.

---

## Folder structure

```
services/backtesting/
  Dockerfile
  README.md
  run_backtest.sh
  parse_backtest.py
  triggerBacktestExample.js
  output/                 # gitignored
    raw/                  # raw Freqtrade backtest result
    normalized/           # Klineo JSON (tv_ohlc, tv_equity, trades, metrics)
  freqtrade/
    user_data/
      config.json
      strategies/
        KlineoEmaRsiTrend.py
        KlineoBollingerRevert.py
        KlineoDonchianAtrBreakout.py
        KlineoBenchmarkTrend.py      # Baseline benchmark
        KlineoRangeRevert.py         # Mean reversion (protections)
        KlineoMomentumBreakout.py    # CTA-style breakout
        KlineoRiskManaged.py        # Protections: MaxDrawdown, Cooldown, StoplossGuard
        KlineoMTFConfirm.py         # Multi-timeframe 5m+1h
```

---

## Strategies

| Strategy | Timeframe | Description | ROI / Stoploss |
|----------|-----------|-------------|----------------|
| **KlineoBenchmarkTrend** | 15m | **Baseline benchmark.** EMA50>EMA200, RSI 50–65, volume>SMA(20). Exit RSI<45 or EMA50<EMA200. Low overtrading, clean metrics. | 6%→3%→1.5%→0, -8%, trailing |
| **KlineoEmaRsiTrend** | 15m | EMA(21)/EMA(55) cross + RSI>52 + volume filter | 3%→1.5%→0, -8%, trailing |
| **KlineoBollingerRevert** | 5m | close < BB lower & RSI<30 → exit at BB mid or RSI>55 | 1.2%→0.6%→0, -6% |
| **KlineoRangeRevert** | 5m | **Range market.** BB + RSI + VWAP; CooldownPeriod to reduce overtrading | 2%→1%→0, -5% |
| **KlineoDonchianAtrBreakout** | 15m | Donchian(20) breakout + volume spike | 4%→1.5%→0, -10% |
| **KlineoMomentumBreakout** | 15m | **CTA-style.** Close > Donchian high + volume spike; trail after +2% | 8%→4%→2%→0, -10%, trailing |
| **KlineoRiskManaged** | 15m | **Safety-first.** EMA100 + RSI 50–60. Uses MaxDrawdown, CooldownPeriod, StoplossGuard. | 4%→2%→0, -6% |
| **KlineoMTFConfirm** | 5m (1h informative) | **Multi-timeframe.** 1h close > EMA200, 5m RSI crosses above 50; exit RSI<45 | 3.5%→2%→1%→0, -7% |

Backtests run with `--enable-protections` so strategies that define protections (e.g. **KlineoRiskManaged**, **KlineoRangeRevert**) show reduced drawdowns where applicable.

---

## Local install and run

### Prerequisites

- Python 3.10+
- [Freqtrade](https://www.freqtrade.io/) installed (`pip install freqtrade` or use the Docker image)
- TA-Lib (for indicators): see [Freqtrade docs](https://www.freqtrade.io/en/stable/installation/) for your OS

### Run backtest (host)

From repo root:

```bash
cd services/backtesting
chmod +x run_backtest.sh
./run_backtest.sh KlineoEmaRsiTrend 15m BTC/USDT 20240101-20241231
```

Output:

- `output/raw/<strategy>_<timeframe>_<timerange>.json` — raw Freqtrade result
- `output/normalized/<strategy>_<timeframe>_<timerange>.json` — Klineo format (tv_ohlc, tv_equity, trades, metrics)

### Example: trigger from Node

From repo root:

```bash
node services/backtesting/triggerBacktestExample.js
```

This runs the shell script via `child_process.spawn`, waits for completion, then reads the normalized JSON and logs summary metrics and the first 5 trades.

---

## Docker build and run

Build:

```bash
docker build -t klineo-backtest services/backtesting
```

Run (default: KlineoEmaRsiTrend, 15m, BTC/USDT, 20240101–20241231):

```bash
docker run --rm -v "$(pwd)/services/backtesting/output:/app/output" klineo-backtest
```

Custom args:

```bash
docker run --rm -v "$(pwd)/services/backtesting/output:/app/output" \
  klineo-backtest KlineoBollingerRevert 5m BTC/USDT,ETH/USDT 20240101-20251231
```

The volume mount ensures `output/raw` and `output/normalized` are written on the host.

---

## Normalized JSON shape (for backend and TradingView)

Exactly as required by Klineo:

```json
{
  "strategy": "KlineoEmaRsiTrend",
  "exchange_data_source": "binance",
  "timeframe": "15m",
  "pairs": ["BTC/USDT", "ETH/USDT"],
  "timerange": "20240101-20251231",
  "metrics": {
    "total_trades": 0,
    "win_rate": 0.0,
    "profit_percent": 0.0,
    "max_drawdown_percent": 0.0,
    "profit_factor": null,
    "sharpe_ratio": null,
    "avg_trade_duration_minutes": null,
    "avg_profit_per_trade": 0,
    "total_profit_abs": 0
  },
  "monthly_pnl_breakdown": [
    { "year": 2024, "month": 1, "profit_abs": 0, "trade_count": 0 }
  ],
  "tv_ohlc": [
    { "time": 1704067200, "open": 0, "high": 0, "low": 0, "close": 0, "volume": 0 }
  ],
  "tv_equity": [
    { "time": 1704067200, "value": 10000.0 }
  ],
  "trades": [
    {
      "pair": "BTC/USDT",
      "open_time": 1704067200,
      "close_time": 1704070800,
      "open_rate": 0,
      "close_rate": 0,
      "profit_abs": 0,
      "profit_ratio": 0,
      "duration_minutes": 0,
      "is_win": true
    }
  ]
}
```

- **tv_ohlc**: Compatible with TradingView Lightweight Charts `CandlestickSeries` (time in Unix seconds).
- **tv_equity**: Compatible with `LineSeries` (time, value).
- **tv_ohlc** is built from the first pair’s OHLCV in the Freqtrade data dir (or BTC/USDT if present). Multiple pairs are supported for backtest; only the first pair’s candles are exported for v1.

### Metrics (dashboard-ready)

- **total_trades**, **win_rate**, **profit_percent**, **avg_trade_duration_minutes**: from the trades list.
- **max_drawdown_percent**: from the equity curve.
- **profit_factor**: gross profit / abs(gross loss); `null` if no losing trades.
- **sharpe_ratio**: not computed; set to `null`.
- **avg_profit_per_trade**, **total_profit_abs**: for UI display.
- **monthly_pnl_breakdown**: list of `{ year, month, profit_abs, trade_count }` for monthly PnL charts and copy-trading marketplace UI.

---

## Data and config

- **Exchange**: Binance (public OHLCV; no API keys for backtesting).
- **Config**: `freqtrade/user_data/config.json` — dry_run, no keys, stake_currency USDT. Pairs and timeframe are overridden via CLI in `run_backtest.sh`.
- Bybit (or other exchanges) can be added later by extending the download/backtest commands and config.

---

## Non-goals (current scope)

- No UI implementation
- No live trading
- No API keys in this module
- No changes to existing Binance/Bybit trading code in the main app

This module is intended to be production-ready and isolated; the Node backend calls it via CLI and stores the normalized JSON in Supabase.
