/**
 * Cached time offset for Binance and Bybit signed requests.
 * offsetMs = exchangeServerTimeMs - Date.now(); signed requests use Date.now() + offsetMs.
 * Cache TTL 60s. On timestamp/recvWindow errors, call invalidateTimeOffsetCache and retry once.
 */

import { binanceFetch } from './binance-fetch.js';

const CACHE_TTL_MS = 60_000;

type Exchange = 'binance' | 'bybit';
type Environment = 'production' | 'testnet';
type MarketType = 'spot' | 'futures';

const cache = new Map<string, { offsetMs: number; fetchedAt: number }>();

function cacheKey(exchange: Exchange, environment: Environment, marketType: MarketType): string {
  return `${exchange}:${environment}:${marketType}`;
}

/** Binance spot/futures return { serverTime: number } in ms. */
async function fetchBinanceSpotTimeMs(environment: Environment): Promise<number> {
  const base =
    environment === 'testnet'
      ? 'https://testnet.binance.vision'
      : process.env.BINANCE_SPOT_BASE_URL?.trim() || 'https://api.binance.com';
  const res = await binanceFetch(`${base}/api/v3/time`, { signal: AbortSignal.timeout(5000) });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Binance spot time: ${res.status}`);
  const data = JSON.parse(raw) as { serverTime?: number };
  const t = data.serverTime;
  if (typeof t !== 'number' || t <= 0) throw new Error('Invalid Binance spot time');
  return t;
}

async function fetchBinanceFuturesTimeMs(environment: Environment): Promise<number> {
  const base =
    environment === 'testnet'
      ? process.env.BINANCE_FUTURES_TESTNET_URL?.trim() || 'https://demo-fapi.binance.com'
      : process.env.BINANCE_FUTURES_BASE_URL?.trim() || 'https://fapi.binance.com';
  const res = await binanceFetch(`${base}/fapi/v1/time`, { signal: AbortSignal.timeout(5000) });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Binance futures time: ${res.status}`);
  const data = JSON.parse(raw) as { serverTime?: number };
  const t = data.serverTime;
  if (typeof t !== 'number' || t <= 0) throw new Error('Invalid Binance futures time');
  return t;
}

/** Bybit /v5/market/time: result.timeNano, result.timeSecond, or time (ms). Return ms. */
function parseBybitTimeMs(data: { time?: number; result?: { timeSecond?: string; timeNano?: string } }): number {
  const r = data.result;
  let ms: number;
  if (r?.timeNano != null && r.timeNano !== '') {
    const nano = parseInt(r.timeNano, 10);
    ms = Number.isFinite(nano) ? nano / 1e6 : NaN;
  } else if (r?.timeSecond != null && r.timeSecond !== '') {
    const sec = parseInt(r.timeSecond, 10);
    ms = Number.isFinite(sec) ? sec * 1000 : NaN;
  } else if (data.time != null && typeof data.time === 'number') {
    ms = data.time;
  } else {
    ms = NaN;
  }
  if (Number.isNaN(ms) || ms <= 0) return NaN;
  if (ms < 1e12) ms *= 1000;
  return Math.floor(ms);
}

async function fetchBybitTimeMs(environment: Environment): Promise<number> {
  const base = environment === 'testnet' ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  const res = await fetch(`${base}/v5/market/time`, { signal: AbortSignal.timeout(5000) });
  const data = (await res.json()) as { retCode?: number; result?: { timeSecond?: string; timeNano?: string }; time?: number };
  if (data.retCode !== 0 && data.retCode !== undefined) throw new Error(`Bybit time: ${data.retCode}`);
  const ms = parseBybitTimeMs(data);
  if (Number.isNaN(ms) || ms <= 0) throw new Error('Invalid Bybit server time');
  return ms;
}

async function fetchServerTimeMs(exchange: Exchange, environment: Environment, marketType: MarketType): Promise<number> {
  if (exchange === 'binance') {
    return marketType === 'spot' ? fetchBinanceSpotTimeMs(environment) : fetchBinanceFuturesTimeMs(environment);
  }
  return fetchBybitTimeMs(environment);
}

/**
 * Get cached time offset for signed requests: timestamp = Date.now() + offsetMs.
 * Cached 60s per (exchange, environment, marketType). Returns 0 on fetch error (use local time).
 */
export async function getExchangeTimeOffset(
  exchange: Exchange,
  environment: Environment,
  marketType: MarketType
): Promise<number> {
  const key = cacheKey(exchange, environment, marketType);
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && now - entry.fetchedAt < CACHE_TTL_MS) {
    return entry.offsetMs;
  }
  try {
    const serverTimeMs = await fetchServerTimeMs(exchange, environment, marketType);
    const offsetMs = serverTimeMs - now;
    cache.set(key, { offsetMs, fetchedAt: now });
    return offsetMs;
  } catch {
    return 0;
  }
}

/** Call after timestamp/recvWindow error before retry so next getExchangeTimeOffset fetches fresh. */
export function invalidateTimeOffsetCache(
  exchange: Exchange,
  environment: Environment,
  marketType: MarketType
): void {
  cache.delete(cacheKey(exchange, environment, marketType));
}

/** For tests / debugging: return current timestamp in ms using cache (or fresh fetch). */
export async function getExchangeTimestampMs(
  exchange: Exchange,
  environment: Environment,
  marketType: MarketType
): Promise<number> {
  const offset = await getExchangeTimeOffset(exchange, environment, marketType);
  return Date.now() + offset;
}
