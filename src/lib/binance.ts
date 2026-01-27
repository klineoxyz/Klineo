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

/** 24h ticker item from Binance */
interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

/** Formatted pair for UI: symbol (BTC/USDT), price, change, volume */
export interface UsdtPairInfo {
  symbol: string;
  price: string;
  change: string;
  volume: string;
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Fetch USDT pairs from Binance 24h ticker, sorted by quote volume (desc).
 * Returns top `limit` pairs. No API key required.
 */
export async function fetchUsdtPairs(limit = 100): Promise<UsdtPairInfo[]> {
  const url = `${BINANCE_API}/ticker/24hr`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Binance ticker error ${res.status}: ${t || res.statusText}`);
  }
  const raw = (await res.json()) as BinanceTicker24h[];
  const usdt = raw.filter((t) => t.symbol.endsWith("USDT"));
  usdt.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
  const top = usdt.slice(0, limit);
  return top.map((t) => {
    const base = t.symbol.slice(0, -4);
    const symbol = `${base}/USDT`;
    const last = parseFloat(t.lastPrice);
    const pct = parseFloat(t.priceChangePercent);
    const price = last >= 1000
      ? last.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : last.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    const change = (pct >= 0 ? "+" : "") + pct.toFixed(2);
    const vol = formatVolume(parseFloat(t.quoteVolume));
    return { symbol, price, change, volume: vol };
  });
}
