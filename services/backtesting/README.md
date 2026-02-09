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
```

---

## Strategies

| Strategy | Timeframe | Entry | Exit | ROI / Stoploss |
|----------|-----------|--------|------|----------------|
| **KlineoEmaRsiTrend** | 15m | EMA(21) cross above EMA(55) + RSI>52 + volume > SMA(vol,20) | EMA cross below or RSI<45 | 3%→1.5%→0, -8%, trailing |
| **KlineoBollingerRevert** | 5m | close < BB lower & RSI<30 | close > BB mid or RSI>55 | 1.2%→0.6%→0, -6% |
| **KlineoDonchianAtrBreakout** | 15m | close > Donchian high(20).shift(1) | close < Donchian low(20).shift(1) | 4%→1.5%→0, -10% |

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
    "avg_trade_duration_minutes": null
  },
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

### Metrics

- **total_trades**, **win_rate**, **profit_percent**, **avg_trade_duration_minutes**: computed from the trades list.
- **max_drawdown_percent**: computed from the equity curve when available; otherwise 0 (see below).
- **profit_factor**, **sharpe_ratio**: not computed in this module; set to `null`. Can be added later from Freqtrade stats or in the backend.

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
