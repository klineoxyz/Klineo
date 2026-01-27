/**
 * Binance public API — klines (OHLCV) for charts.
 * No API key required. Rate limits apply.
 */

const BINANCE_API = "https://api.binance.com/api/v3";

export type BinanceInterval =
  | "1m" | "3m" | "5m" | "15m" | "30m"
  | "1h" | "2h" | "4h" | "6h" | "8h" | "12h"
  | "1d" | "3d" | "1w" | "1M";

export interface OhlcvItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** "BTC/USDT" -> "BTCUSDT" */
export function pairToSymbol(pair: string): string {
  return pair.replace("/", "").toUpperCase();
}

/** KLINEO timeframe -> Binance interval */
const TF_MAP: Record<string, BinanceInterval> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
  "1h": "1h", "2h": "2h", "4h": "4h", "12h": "12h",
  "1D": "1d", "5D": "5d", "1W": "1w", "1M": "1M",
};

export function timeframeToInterval(tf: string): BinanceInterval {
  return TF_MAP[tf] ?? "1h";
}

/** Binance kline: [openTime, open, high, low, close, volume, ...] */
type BinanceKline = [number, string, string, string, string, string, ...unknown[]];

/**
 * Fetch OHLCV klines from Binance and return as OhlcvItem[].
 */
export async function fetchKlines(
  pair: string,
  timeframe: string,
  limit = 500
): Promise<OhlcvItem[]> {
  const symbol = pairToSymbol(pair);
  const interval = timeframeToInterval(timeframe);
  const url = `${BINANCE_API}/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Binance klines error ${res.status}: ${t || res.statusText}`);
  }
  const raw = (await res.json()) as BinanceKline[];
  return raw.map(([openTime, o, h, l, c, v]) => ({
    time: new Date(openTime).toISOString(),
    open: parseFloat(o),
    high: parseFloat(h),
    low: parseFloat(l),
    close: parseFloat(c),
    volume: parseFloat(v),
  }));
}

/** Order book level: price, amount, total (price × amount) */
export interface OrderBookLevel {
  price: string;
  amount: string;
  total: string;
}

/** Binance depth response */
interface BinanceDepthResponse {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

/**
 * Fetch live order book from Binance (public, no API key).
 * Returns top `limit` bids and asks. limit 5–100 recommended for UI.
 */
export async function fetchOrderBook(
  pair: string,
  limit = 50
): Promise<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }> {
  const symbol = pairToSymbol(pair);
  const url = `${BINANCE_API}/depth?symbol=${encodeURIComponent(symbol)}&limit=${Math.min(Math.max(limit, 5), 100)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Binance depth error ${res.status}: ${t || res.statusText}`);
  }
  const raw = (await res.json()) as BinanceDepthResponse;

  const bids: OrderBookLevel[] = raw.bids.map(([p, q]) => {
    const price = parseFloat(p);
    const amount = parseFloat(q);
    const total = price * amount;
    return { price: p, amount: q, total: total.toFixed(2) };
  });

  const asks: OrderBookLevel[] = raw.asks.map(([p, q]) => {
    const price = parseFloat(p);
    const amount = parseFloat(q);
    const total = price * amount;
    return { price: p, amount: q, total: total.toFixed(2) };
  });

  return { bids, asks };
}
