#!/usr/bin/env bash
# Run Freqtrade backtest and produce normalized JSON for Klineo.
# Usage: ./run_backtest.sh <strategy> <timeframe> <pairs_csv> <timerange>
# Example: ./run_backtest.sh KlineoEmaRsiTrend 15m BTC/USDT,ETH/USDT 20240101-20251231

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FREQTRADE_DIR="${SCRIPT_DIR}/freqtrade"
USER_DATA="${FREQTRADE_DIR}/user_data"
OUTPUT_RAW="${SCRIPT_DIR}/output/raw"
OUTPUT_NORM="${SCRIPT_DIR}/output/normalized"
CONFIG="${USER_DATA}/config.json"

print_help() {
  echo "Usage: $0 <strategy> <timeframe> <pairs_csv> <timerange>"
  echo ""
  echo "  strategy   - Freqtrade strategy name (e.g. KlineoEmaRsiTrend, KlineoBollingerRevert, KlineoDonchianAtrBreakout)"
  echo "  timeframe  - Candle timeframe (e.g. 5m, 15m)"
  echo "  pairs_csv  - Comma-separated pairs (e.g. BTC/USDT,ETH/USDT)"
  echo "  timerange  - Backtest range (e.g. 20240101-20251231)"
  echo ""
  echo "Example:"
  echo "  $0 KlineoEmaRsiTrend 15m BTC/USDT 20240101-20241231"
  exit 1
}

if [ $# -lt 4 ]; then
  print_help
fi

STRATEGY="$1"
TIMEFRAME="$2"
PAIRS_CSV="$3"
TIMERANGE="$4"

# Convert pairs csv to space-separated for freqtrade
PAIRS_SPACE=$(echo "$PAIRS_CSV" | tr ',' ' ')
# Sanitize for filename
SAFE_TIMERANGE=$(echo "$TIMERANGE" | tr '/' '_')
RAW_FILENAME="${STRATEGY}_${TIMEFRAME}_${SAFE_TIMERANGE}.json"
RAW_PATH="${OUTPUT_RAW}/${RAW_FILENAME}"
NORM_PATH="${OUTPUT_NORM}/${RAW_FILENAME}"
mkdir -p "$OUTPUT_RAW" "$OUTPUT_NORM"
BACKTEST_RESULTS="${USER_DATA}/backtest_results"
mkdir -p "$BACKTEST_RESULTS"
# Freqtrade writes under userdir; we export to a known name then copy to output/raw
RAW_IN_USERDATA="${BACKTEST_RESULTS}/klineo_backtest_export.json"

echo "[Klineo Backtest] Strategy=$STRATEGY timeframe=$TIMEFRAME pairs=$PAIRS_CSV timerange=$TIMERANGE"

# 1) Download missing data
echo "[Klineo Backtest] Downloading data..."
freqtrade download-data \
  --config "$CONFIG" \
  --userdir "$FREQTRADE_DIR" \
  --exchange binance \
  --timeframes "$TIMEFRAME" \
  --pairs $PAIRS_SPACE \
  --timerange "$TIMERANGE" \
  --data-format-ohlcv json

# 2) Run backtest and export trades (Freqtrade writes under user_data/backtest_results/)
echo "[Klineo Backtest] Running backtest..."
freqtrade backtesting \
  --config "$CONFIG" \
  --userdir "$FREQTRADE_DIR" \
  --strategy "$STRATEGY" \
  --timeframe "$TIMEFRAME" \
  --timerange "$TIMERANGE" \
  --pairs $PAIRS_SPACE \
  --export trades \
  --export-filename "$RAW_IN_USERDATA" \
  --enable-protections

# Copy to output/raw for persistence
if [ -f "$RAW_IN_USERDATA" ]; then
  cp "$RAW_IN_USERDATA" "$RAW_PATH"
else
  LATEST=$(ls -t "$BACKTEST_RESULTS"/backtest-result-*.json 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    cp "$LATEST" "$RAW_PATH"
    echo "[Klineo Backtest] Used latest result: $LATEST"
  fi
fi

if [ ! -f "$RAW_PATH" ]; then
  echo "[Klineo Backtest] ERROR: Raw result file not found." >&2
  exit 1
fi

# 3) Parse to normalized JSON (tv_ohlc, tv_equity, trades, metrics)
echo "[Klineo Backtest] Parsing to normalized JSON..."
python3 "${SCRIPT_DIR}/parse_backtest.py" \
  --raw "$RAW_PATH" \
  --strategy "$STRATEGY" \
  --timeframe "$TIMEFRAME" \
  --pairs "$PAIRS_CSV" \
  --timerange "$TIMERANGE" \
  --out "$NORM_PATH" \
  --data-dir "${USER_DATA}/data"

echo "[Klineo Backtest] Done. Normalized output: $NORM_PATH"
