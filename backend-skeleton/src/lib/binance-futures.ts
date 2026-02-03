/**
 * Binance USD-M Futures API adapter.
 * Production: fapi.binance.com | Testnet: testnet.binancefuture.com
 * Uses binanceFetch so BINANCE_HTTP_PROXY / BINANCE_HTTPS_PROXY can route requests from an allowed region.
 */

import { createHmac } from 'crypto';
import { binanceFetch } from './binance-fetch.js';
import type {
  MarginMode,
  PositionMode,
  FuturesAccountSummary,
  FuturesPlaceOrderParams,
  FuturesOrderResult,
  FuturesOpenPosition,
  FuturesOpenOrder,
} from './futures-adapter-types.js';

export type BinanceFuturesEnvironment = 'production' | 'testnet';

const BINANCE_FUTURES_PROD = 'https://fapi.binance.com';
const BINANCE_FUTURES_TESTNET = 'https://testnet.binancefuture.com';

export interface BinanceFuturesCredentials {
  apiKey: string;
  apiSecret: string;
  environment: BinanceFuturesEnvironment;
}

function getBaseUrl(env: BinanceFuturesEnvironment): string {
  return env === 'testnet' ? BINANCE_FUTURES_TESTNET : BINANCE_FUTURES_PROD;
}

function sign(queryString: string, secret: string): string {
  return createHmac('sha256', secret).update(queryString).digest('hex');
}

function buildSignedQuery(params: Record<string, string | number | undefined>, secret: string): string {
  const timestamp = Date.now();
  const recvWindow = 10000; // 10s for futures (allow some drift)
  const queryParams = new URLSearchParams();
  queryParams.append('timestamp', String(timestamp));
  queryParams.append('recvWindow', String(recvWindow));
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) queryParams.append(k, String(v));
  }
  const qs = queryParams.toString();
  queryParams.append('signature', sign(qs, secret));
  return queryParams.toString();
}

async function signedRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  creds: BinanceFuturesCredentials,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const base = getBaseUrl(creds.environment);
  const query = buildSignedQuery(params, creds.apiSecret);
  const url = `${base}${path}?${query}`;
  const res = await binanceFetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': creds.apiKey, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  const rawText = await res.text();
  if (!res.ok) {
    let errMsg: string;
    try {
      const data = JSON.parse(rawText) as { code?: number; msg?: string };
      errMsg = data.msg ? String(data.msg) : res.statusText;
      const code = data.code != null ? data.code : res.status;
      throw new Error(`Binance Futures (${code}): ${errMsg}`);
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message.startsWith('Binance Futures')) throw parseErr;
      const snippet = rawText.slice(0, 200).replace(/\s+/g, ' ').trim();
      errMsg = res.status === 451
        ? (snippet || 'Service unavailable from a restricted location (HTTP 451).')
        : (snippet || res.statusText || `HTTP ${res.status}`);
      throw new Error(`Binance Futures HTTP ${res.status}: ${errMsg}`);
    }
  }
  let data: { code?: number; msg?: string };
  try {
    data = JSON.parse(rawText) as { code?: number; msg?: string };
  } catch {
    throw new Error(`Binance Futures HTTP ${res.status}: Invalid response body`);
  }
  if (data.code != null && data.code !== 0) {
    throw new Error(`Binance Futures (${data.code}): ${data.msg || res.statusText}`);
  }
  return data as T;
}

/** Public endpoint: get mark price for symbol (no auth). */
export async function getMarkPrice(env: BinanceFuturesEnvironment, symbol: string): Promise<number> {
  const base = getBaseUrl(env);
  const sym = symbol.replace('/', '').toUpperCase();
  const res = await binanceFetch(`${base}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(sym)}`, { signal: AbortSignal.timeout(10000) });
  const data = (await res.json()) as { markPrice?: string; msg?: string };
  if (!res.ok) throw new Error(`Binance mark price: ${data.msg || res.statusText}`);
  const mark = data.markPrice;
  if (mark == null || mark === '') throw new Error('Mark price not found');
  const num = parseFloat(mark);
  if (Number.isNaN(num) || num <= 0) throw new Error('Invalid mark price');
  return num;
}

export async function setLeverage(
  creds: BinanceFuturesCredentials,
  symbol: string,
  leverage: number
): Promise<void> {
  const sym = symbol.replace('/', '').toUpperCase();
  await signedRequest('POST', '/fapi/v1/leverage', creds, { symbol: sym, leverage });
}

export async function setMarginMode(
  creds: BinanceFuturesCredentials,
  symbol: string,
  mode: MarginMode
): Promise<void> {
  const sym = symbol.replace('/', '').toUpperCase();
  const marginType = mode === 'isolated' ? 'ISOLATED' : 'CROSSED';
  await signedRequest('POST', '/fapi/v1/marginType', creds, { symbol: sym, marginType });
}

export async function setPositionMode(
  creds: BinanceFuturesCredentials,
  mode: PositionMode
): Promise<void> {
  const dualSidePosition = mode === 'hedge' ? 'true' : 'false';
  await signedRequest('POST', '/fapi/v1/positionSide/dual', creds, { dualSidePosition });
}

export async function getAccountSummary(
  creds: BinanceFuturesCredentials
): Promise<FuturesAccountSummary> {
  const data = await signedRequest<{
    availableBalance?: string;
    totalWalletBalance?: string;
    assets?: Array<{ asset: string; availableBalance?: string; walletBalance?: string }>;
  }>('GET', '/fapi/v2/account', creds);
  const available = (data as any).availableBalance ?? (data.assets?.find((a: any) => a.asset === 'USDT')?.availableBalance ?? '0');
  const total = (data as any).totalWalletBalance ?? (data.assets?.find((a: any) => a.asset === 'USDT')?.walletBalance ?? '0');
  return { availableBalanceUsdt: available, totalWalletBalanceUsdt: total };
}

export async function placeOrder(
  creds: BinanceFuturesCredentials,
  params: FuturesPlaceOrderParams
): Promise<FuturesOrderResult> {
  const symbol = params.symbol.replace('/', '').toUpperCase();
  const query: Record<string, string | number> = { symbol, side: params.side, type: params.type, quantity: params.qty };
  if (params.positionSide) query.positionSide = params.positionSide;
  if (params.reduceOnly === true) query.reduceOnly = 'true';
  const res = await signedRequest<{ orderId: number; status: string }>(
    'POST',
    '/fapi/v1/order',
    creds,
    query
  );
  const out = res as any;
  return {
    orderId: String(out.orderId ?? ''),
    status: out.status ?? 'UNKNOWN',
  };
}

export async function getOpenPosition(
  creds: BinanceFuturesCredentials,
  symbol: string
): Promise<FuturesOpenPosition | null> {
  const sym = symbol.replace('/', '').toUpperCase();
  const data = await signedRequest<{ positions?: Array<{
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    markPrice?: string;
    unRealizedProfit?: string;
    leverage?: string;
    positionSide: string;
  }> }>('GET', '/fapi/v2/account', creds);
  const positions = (data as any).positions ?? [];
  const pos = positions.find((p: any) => p.symbol === sym && parseFloat(p.positionAmt) !== 0);
  if (!pos) return null;
  const amt = parseFloat(pos.positionAmt);
  return {
    symbol: pos.symbol,
    side: amt > 0 ? 'LONG' : 'SHORT',
    positionAmt: pos.positionAmt,
    entryPrice: pos.entryPrice,
    markPrice: pos.markPrice,
    unrealizedProfit: pos.unRealizedProfit,
    leverage: pos.leverage,
  };
}

export async function getOpenOrders(
  creds: BinanceFuturesCredentials,
  symbol: string
): Promise<FuturesOpenOrder[]> {
  const sym = symbol.replace('/', '').toUpperCase();
  const list = await signedRequest<any[]>('GET', '/fapi/v1/openOrders', creds, { symbol: sym });
  return (list ?? []).map((o: any) => ({
    orderId: String(o.orderId),
    symbol: o.symbol,
    side: o.side,
    type: o.type,
    status: o.status,
    origQty: o.origQty,
    price: o.price,
    stopPrice: o.stopPrice,
  }));
}

export async function cancelAll(
  creds: BinanceFuturesCredentials,
  symbol: string
): Promise<void> {
  const sym = symbol.replace('/', '').toUpperCase();
  await signedRequest('DELETE', '/fapi/v1/allOpenOrders', creds, { symbol: sym });
}

export function createBinanceFuturesAdapter(creds: BinanceFuturesCredentials): import('./futures-adapter-types.js').IFuturesAdapter {
  return {
    async setLeverage(symbol: string, leverage: number) {
      await setLeverage(creds, symbol, leverage);
    },
    async setMarginMode(symbol: string, mode: MarginMode) {
      await setMarginMode(creds, symbol, mode);
    },
    async setPositionMode(mode: PositionMode) {
      await setPositionMode(creds, mode);
    },
    async getAccountSummary() {
      return getAccountSummary(creds);
    },
    async placeOrder(params: FuturesPlaceOrderParams) {
      return placeOrder(creds, params);
    },
    async getOpenPosition(symbol: string) {
      return getOpenPosition(creds, symbol);
    },
    async getOpenOrders(symbol: string) {
      return getOpenOrders(creds, symbol);
    },
    async cancelAll(symbol: string) {
      return cancelAll(creds, symbol);
    },
  };
}
