/**
 * Public klines/candles for Binance Futures and Bybit (no auth).
 * Used by strategy engine to compute RSI and signals.
 * Binance uses binanceFetch so BINANCE_HTTPS_PROXY works in restricted regions.
 */

import { binanceFetch } from './binance-fetch.js';

const BINANCE_FUTURES_PUBLIC = 'https://fapi.binance.com';
// USDT-M perpetual testnet; testnet.binancefuture.com is for Coin-M/delivery
const BINANCE_FUTURES_TESTNET = (process.env.BINANCE_FUTURES_TESTNET_URL || '').trim() || 'https://demo-fapi.binance.com';
const BYBIT_PUBLIC = 'https://api.bybit.com';
const BYBIT_TESTNET = 'https://api-testnet.bybit.com';

export type ExchangeEnv = 'production' | 'testnet';

// Binance Futures klines interval: use 1h, 2h, 1d etc. (not 60m). See Binance API docs.
const BINANCE_INTERVAL: Record<string, string> = {
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
  '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M',
};

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
}

function binanceInterval(interval: string): string {
  return BINANCE_INTERVAL[interval] ?? '1h';
}

function bybitInterval(interval: string): string {
  const map: Record<string, string> = {
    '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
    '1h': '60', '2h': '120', '4h': '240', '1d': 'D', '1w': 'W',
  };
  return map[interval] ?? '5';
}

export async function getBinanceFuturesKlines(
  symbol: string,
  interval: string,
  limit: number = 100,
  env: ExchangeEnv = 'production',
  startTime?: number,
  endTime?: number
): Promise<Candle[]> {
  const base = env === 'testnet' ? BINANCE_FUTURES_TESTNET : BINANCE_FUTURES_PUBLIC;
  const sym = symbol.replace('/', '').toUpperCase();
  const int = binanceInterval(interval);
  const params = new URLSearchParams({
    symbol: sym,
    interval: int,
    limit: String(Math.min(limit, 1500)),
  });
  if (startTime != null) params.set('startTime', String(startTime));
  if (endTime != null) params.set('endTime', String(endTime));
  const url = `${base}/fapi/v1/klines?${params}`;
  const res = await binanceFetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Binance klines ${res.status}`);
  const raw = (await res.json()) as Array<[number, string, string, string, string, number, number, string, number, number, number, string]>;
  return raw.map(([time, o, h, l, c]) => ({
    time,
    open: parseFloat(o),
    high: parseFloat(h),
    low: parseFloat(l),
    close: parseFloat(c),
  }));
}

export async function getBybitFuturesKlines(
  symbol: string,
  interval: string,
  limit: number = 100,
  env: ExchangeEnv = 'production',
  startTime?: number,
  endTime?: number
): Promise<Candle[]> {
  const base = env === 'testnet' ? BYBIT_TESTNET : BYBIT_PUBLIC;
  const sym = symbol.replace('/', '').toUpperCase();
  const int = bybitInterval(interval);
  const params = new URLSearchParams({
    category: 'linear',
    symbol: sym,
    interval: int,
    limit: String(Math.min(limit, 200)),
  });
  if (startTime != null) params.set('start', String(startTime));
  if (endTime != null) params.set('end', String(endTime));
  const url = `${base}/v5/market/kline?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Bybit klines ${res.status}`);
  const data = await res.json() as { retCode?: number; result?: { list?: Array<{ 0?: string; 1?: string; 2?: string; 3?: string; 4?: string }> } };
  if (data.retCode !== 0) throw new Error(`Bybit klines ${data.retCode}`);
  const list = (data.result?.list ?? []).reverse();
  return list.map((row: any) => ({
    time: parseInt(row[0], 10),
    open: parseFloat(row[1]),
    high: parseFloat(row[2]),
    low: parseFloat(row[3]),
    close: parseFloat(row[4]),
  }));
}

export function getKlines(
  exchange: 'binance' | 'bybit',
  symbol: string,
  interval: string,
  limit: number = 100,
  env: ExchangeEnv = 'production',
  startTime?: number,
  endTime?: number
): Promise<Candle[]> {
  if (exchange === 'bybit') {
    return getBybitFuturesKlines(symbol, interval, limit, env, startTime, endTime);
  }
  return getBinanceFuturesKlines(symbol, interval, limit, env, startTime, endTime);
}

/**
 * RSI(period) from close prices.
 */
export function computeRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!;
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
