#!/usr/bin/env python3
"""
Parse Freqtrade backtest raw JSON into Klineo normalized format.
Produces tv_ohlc (TradingView CandlestickSeries) and tv_equity (LineSeries).
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Union

# Optional: load OHLCV from .json or .json.gz
try:
    import gzip
except ImportError:
    gzip = None


def parse_args():
    p = argparse.ArgumentParser(description="Parse Freqtrade backtest to Klineo normalized JSON")
    p.add_argument("--raw", required=True, help="Path to raw backtest result JSON")
    p.add_argument("--strategy", required=True, help="Strategy name")
    p.add_argument("--timeframe", required=True, help="Timeframe (e.g. 15m)")
    p.add_argument("--pairs", required=True, help="Comma-separated pairs (e.g. BTC/USDT,ETH/USDT)")
    p.add_argument("--timerange", required=True, help="Timerange (e.g. 20240101-20251231)")
    p.add_argument("--out", required=True, help="Output path for normalized JSON")
    p.add_argument("--data-dir", default=None, help="Freqtrade user_data/data dir for OHLCV")
    return p.parse_args()


def load_json(path: str) -> Union[dict, list]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def ensure_list_trades(raw: Union[dict, list]) -> list:
    """Extract list of trades from raw backtest result (array or object with 'trades' key)."""
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        if "trades" in raw:
            return raw["trades"]
        if "strategy" in raw and isinstance(raw.get("strategy"), dict):
            return raw.get("trades", [])
    return []


def trade_open_time_ts(t: dict) -> int:
    """Unix seconds for trade open."""
    for key in ("open_date_utc", "open_timestamp", "open_date"):
        if key in t and t[key]:
            v = t[key]
            if isinstance(v, (int, float)):
                return int(v) if v > 1e10 else int(v) * 1000 // 1000
            if isinstance(v, str):
                try:
                    dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
                    return int(dt.timestamp())
                except Exception:
                    pass
    return 0


def trade_close_time_ts(t: dict) -> int:
    """Unix seconds for trade close."""
    for key in ("close_date_utc", "close_timestamp", "close_date"):
        if key in t and t[key]:
            v = t[key]
            if isinstance(v, (int, float)):
                return int(v) if v > 1e10 else int(v) * 1000 // 1000
            if isinstance(v, str):
                try:
                    dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
                    return int(dt.timestamp())
                except Exception:
                    pass
    return 0


def trade_duration_minutes(t: dict) -> float:
    if "duration" in t and t["duration"] is not None:
        return float(t["duration"])
    o = trade_open_time_ts(t)
    c = trade_close_time_ts(t)
    if o and c:
        return (c - o) / 60.0
    return 0.0


def load_ohlcv(data_dir: str, pair: str, timeframe: str) -> List[Dict[str, Any]]:
    """
    Load OHLCV candles from Freqtrade data dir.
    Pair format: BTC/USDT -> file BTC_USDT-15m.json or BTC_USDT-15m.json.gz
    """
    if not data_dir or not os.path.isdir(data_dir):
        return []
    # First pair for chart (prefer BTC/USDT if in list)
    symbol = pair.replace("/", "_")
    base = os.path.join(data_dir, "binance", f"{symbol}-{timeframe}")
    for ext in (".json", ".json.gz"):
        path = base + ext
        if not os.path.isfile(path):
            continue
        try:
            if ext == ".json.gz" and gzip:
                with gzip.open(path, "rt", encoding="utf-8") as f:
                    data = json.load(f)
            else:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
        except Exception:
            return []
        if isinstance(data, list):
            out = []
            for row in data:
                if isinstance(row, dict):
                    t = row.get("date") or row.get("time") or row.get(0)
                    if isinstance(t, (int, float)):
                        ts = int(t) if t > 1e10 else int(t) / 1000
                    elif isinstance(t, str):
                        try:
                            ts = int(datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp())
                        except Exception:
                            ts = 0
                    else:
                        ts = 0
                    out.append({
                        "time": ts,
                        "open": float(row.get("open", 0)),
                        "high": float(row.get("high", 0)),
                        "low": float(row.get("low", 0)),
                        "close": float(row.get("close", 0)),
                        "volume": float(row.get("volume", 0)),
                    })
                elif isinstance(row, (list, tuple)) and len(row) >= 6:
                    ts = int(row[0]) if row[0] > 1e10 else int(row[0]) // 1000
                    out.append({
                        "time": ts,
                        "open": float(row[1]),
                        "high": float(row[2]),
                        "low": float(row[3]),
                        "close": float(row[4]),
                        "volume": float(row[5]),
                    })
            return out
        if isinstance(data, dict) and "data" in data:
            return load_ohlcv_from_struct(data["data"])
    return []


def load_ohlcv_from_struct(data: Any) -> List[Dict[str, Any]]:
    out = []
    for row in data:
        if isinstance(row, dict):
            t = row.get("date") or row.get("time") or row.get(0)
            if isinstance(t, (int, float)):
                ts = int(t) if t > 1e10 else int(t) / 1000
            elif isinstance(t, str):
                try:
                    ts = int(datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp())
                except Exception:
                    ts = 0
            else:
                ts = 0
            out.append({
                "time": ts,
                "open": float(row.get("open", 0)),
                "high": float(row.get("high", 0)),
                "low": float(row.get("low", 0)),
                "close": float(row.get("close", 0)),
                "volume": float(row.get("volume", 0)),
            })
        elif isinstance(row, (list, tuple)) and len(row) >= 6:
            ts = int(row[0]) if row[0] > 1e10 else int(row[0]) // 1000
            out.append({
                "time": ts,
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
                "volume": float(row[5]),
            })
    return out


def build_equity_curve(trades: list, start_balance: float = 10000.0) -> List[Dict[str, Any]]:
    """Build tv_equity from trades: (time, value) with cumulative profit."""
    out = []
    cumulative = 0.0
    # Sort by close time
    sorted_trades = sorted(
        [t for t in trades if trade_close_time_ts(t)],
        key=trade_close_time_ts,
    )
    # Initial point (use first trade open or 0)
    if sorted_trades:
        t0 = trade_open_time_ts(sorted_trades[0]) or trade_close_time_ts(sorted_trades[0])
        if t0:
            out.append({"time": t0, "value": start_balance})
    for t in sorted_trades:
        close_ts = trade_close_time_ts(t)
        if not close_ts:
            continue
        profit = float(t.get("profit_abs") or t.get("profit_amount") or 0)
        cumulative += profit
        out.append({"time": close_ts, "value": round(start_balance + cumulative, 2)})
    if not out and trades:
        out.append({"time": trade_open_time_ts(trades[0]) or 0, "value": start_balance})
    if not out:
        out.append({"time": 0, "value": start_balance})
    return out


def main():
    args = parse_args()
    raw_path = args.raw
    if not os.path.isfile(raw_path):
        print(f"Error: raw file not found: {raw_path}", file=sys.stderr)
        sys.exit(1)

    raw = load_json(raw_path)
    trades_raw = ensure_list_trades(raw)

    pairs_list = [p.strip() for p in args.pairs.split(",") if p.strip()]
    first_pair = "BTC/USDT" if "BTC/USDT" in pairs_list else (pairs_list[0] if pairs_list else "BTC/USDT")

    # OHLCV for first pair (TradingView CandlestickSeries)
    tv_ohlc = []
    if args.data_dir:
        tv_ohlc = load_ohlcv(args.data_dir, first_pair, args.timeframe)
    if not tv_ohlc and isinstance(raw, dict) and "ohlcv" in raw:
        tv_ohlc = load_ohlcv_from_struct(raw["ohlcv"])

    # Normalized trades
    trades = []
    for t in trades_raw:
        open_ts = trade_open_time_ts(t)
        close_ts = trade_close_time_ts(t)
        profit_abs = float(t.get("profit_abs") or t.get("profit_amount") or 0)
        profit_ratio = float(t.get("profit_ratio") or t.get("profit_pct") or 0)
        if "profit_ratio" in t and profit_ratio == 0 and profit_abs != 0:
            profit_ratio = float(t.get("profit_ratio", 0))
        duration_min = trade_duration_minutes(t)
        is_win = profit_abs > 0
        trades.append({
            "pair": str(t.get("pair") or t.get("pair_id") or first_pair),
            "open_time": open_ts,
            "close_time": close_ts,
            "open_rate": float(t.get("open_rate") or t.get("open_price") or 0),
            "close_rate": float(t.get("close_rate") or t.get("close_price") or 0),
            "profit_abs": round(profit_abs, 4),
            "profit_ratio": round(profit_ratio, 6),
            "duration_minutes": round(duration_min, 1),
            "is_win": is_win,
        })

    # Metrics
    total_trades = len(trades)
    wins = sum(1 for x in trades if x["is_win"])
    win_rate = (wins / total_trades * 100.0) if total_trades else 0.0
    profit_ratio_sum = sum(x["profit_ratio"] for x in trades)
    profit_percent = profit_ratio_sum  # or from raw backtest summary if present
    if isinstance(raw, dict) and "backtest_stats" in raw:
        bs = raw["backtest_stats"]
        if "profit_total" in bs and "profit_total_abs" in bs:
            pass  # could derive profit_percent
        if "max_drawdown" in bs:
            profit_percent = float(bs.get("profit_total", profit_ratio_sum))
    avg_duration = (sum(x["duration_minutes"] for x in trades) / total_trades) if total_trades else None

    # Max drawdown: from equity curve if we have it
    tv_equity = build_equity_curve(trades_raw)
    max_dd_percent = 0.0
    if len(tv_equity) >= 2:
        peak = tv_equity[0]["value"]
        for pt in tv_equity:
            v = pt["value"]
            if v > peak:
                peak = v
            dd = (peak - v) / peak * 100.0 if peak else 0
            if dd > max_dd_percent:
                max_dd_percent = dd

    payload = {
        "strategy": args.strategy,
        "exchange_data_source": "binance",
        "timeframe": args.timeframe,
        "pairs": pairs_list or [first_pair],
        "timerange": args.timerange,
        "metrics": {
            "total_trades": total_trades,
            "win_rate": round(win_rate, 2),
            "profit_percent": round(profit_percent, 4),
            "max_drawdown_percent": round(max_dd_percent, 2),
            "profit_factor": None,
            "sharpe_ratio": None,
            "avg_trade_duration_minutes": round(avg_duration, 1) if avg_duration is not None else None,
        },
        "tv_ohlc": tv_ohlc,
        "tv_equity": tv_equity,
        "trades": trades,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Wrote normalized output to {out_path} (trades={total_trades}, tv_ohlc={len(tv_ohlc)}, tv_equity={len(tv_equity)})")


if __name__ == "__main__":
    main()
