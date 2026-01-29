/**
 * Bybit V5 USDT Perpetual (linear) Futures adapter.
 * Production: api.bybit.com | Testnet: api-testnet.bybit.com
 * category=linear for USDT perpetual; signed requests only.
 */

import { createHmac } from 'crypto';
import type {
  MarginMode,
  PositionMode,
  FuturesAccountSummary,
  FuturesPlaceOrderParams,
  FuturesOrderResult,
  FuturesOpenPosition,
  FuturesOpenOrder,
} from './futures-adapter-types.js';

export type BybitFuturesEnvironment = 'production' | 'testnet';

const BYBIT_PROD = 'https://api.bybit.com';
const BYBIT_TESTNET = 'https://api-testnet.bybit.com';

export interface BybitFuturesCredentials {
  apiKey: string;
  apiSecret: string;
  environment: BybitFuturesEnvironment;
}

function getBaseUrl(env: BybitFuturesEnvironment): string {
  return env === 'testnet' ? BYBIT_TESTNET : BYBIT_PROD;
}

function sign(plain: string, secret: string): string {
  return createHmac('sha256', secret).update(plain).digest('hex');
}

const RECV_WINDOW = 10000;

async function signedRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  creds: BybitFuturesCredentials,
  queryParams: Record<string, string> = {},
  body?: object
): Promise<T> {
  const base = getBaseUrl(creds.environment);
  const timestamp = Date.now().toString();
  const queryString = new URLSearchParams(queryParams).toString();
  const signPlain = method === 'GET'
    ? timestamp + creds.apiKey + RECV_WINDOW + queryString
    : timestamp + creds.apiKey + RECV_WINDOW + (body ? JSON.stringify(body) : '{}');
  const signature = sign(signPlain, creds.apiSecret);
  const url = queryString ? `${base}${endpoint}?${queryString}` : `${base}${endpoint}`;
  const opts: RequestInit = {
    method,
    headers: {
      'X-BAPI-API-KEY': creds.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': String(RECV_WINDOW),
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  };
  if (method === 'POST' && body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json() as { retCode?: number; retMsg?: string; result?: T };
  if (data.retCode != null && data.retCode !== 0) {
    throw new Error(`Bybit Futures (${data.retCode}): ${data.retMsg || res.statusText}`);
  }
  if (!res.ok) throw new Error(`Bybit Futures HTTP ${res.status}: ${data.retMsg || res.statusText}`);
  return data.result as T;
}

const CATEGORY = 'linear';

export async function setLeverage(
  creds: BybitFuturesCredentials,
  symbol: string,
  leverage: number
): Promise<void> {
  const sym = symbol.replace('/', '').toUpperCase();
  await signedRequest('POST', '/v5/position/set-leverage', creds, {}, {
    category: CATEGORY,
    symbol: sym,
    buyLeverage: String(leverage),
    sellLeverage: String(leverage),
  });
}

export async function setMarginMode(
  creds: BybitFuturesCredentials,
  _symbol: string,
  mode: MarginMode
): Promise<void> {
  const setMarginModeVal = mode === 'isolated' ? 'ISOLATED_MARGIN' : 'REGULAR_MARGIN';
  await signedRequest('POST', '/v5/account/set-margin-mode', creds, {}, {
    setMarginMode: setMarginModeVal,
    tradeMode: 0, // 0 = one-way for linear
  });
}

export async function setPositionMode(
  creds: BybitFuturesCredentials,
  mode: PositionMode
): Promise<void> {
  const modeVal = mode === 'hedge' ? 3 : 0; // 3 = hedge, 0 = one-way
  await signedRequest('POST', '/v5/position/switch-mode', creds, {}, {
    category: CATEGORY,
    mode: modeVal,
  });
}

export async function getAccountSummary(
  creds: BybitFuturesCredentials
): Promise<FuturesAccountSummary> {
  const result = await signedRequest<{
    list?: Array<{
      totalEquity?: string;
      totalWalletBalance?: string;
      totalAvailableBalance?: string;
      accountType?: string;
    }>;
  }>('GET', '/v5/account/wallet-balance', creds, { accountType: 'CONTRACT' });
  const list = result?.list ?? [];
  const acc = list[0];
  const available = acc?.totalAvailableBalance ?? acc?.totalWalletBalance ?? '0';
  const total = acc?.totalWalletBalance ?? '0';
  return { availableBalanceUsdt: available, totalWalletBalanceUsdt: total };
}

export async function placeOrder(
  creds: BybitFuturesCredentials,
  params: FuturesPlaceOrderParams
): Promise<FuturesOrderResult> {
  const symbol = params.symbol.replace('/', '').toUpperCase();
  const body: Record<string, string> = {
    category: CATEGORY,
    symbol,
    side: params.side,
    orderType: params.type === 'LIMIT' ? 'Limit' : 'Market',
    qty: params.qty,
  };
  if (params.reduceOnly) body.reduceOnly = 'true';
  if (params.stopLoss) body.stopLoss = params.stopLoss;
  if (params.takeProfit) body.takeProfit = params.takeProfit;
  if (params.positionSide && params.positionSide !== 'BOTH') {
    body.positionIdx = params.positionSide === 'LONG' ? '1' : '2';
  }
  const result = await signedRequest<{ orderId?: string; orderStatus?: string }>(
    'POST',
    '/v5/order/create',
    creds,
    {},
    body
  );
  const out = result as any;
  return {
    orderId: out?.orderId ?? '',
    status: out?.orderStatus ?? 'UNKNOWN',
  };
}

export async function getOpenPosition(
  creds: BybitFuturesCredentials,
  symbol: string
): Promise<FuturesOpenPosition | null> {
  const sym = symbol.replace('/', '').toUpperCase();
  const result = await signedRequest<{ list?: Array<{
    symbol: string;
    side: string;
    size: string;
    entryPrice: string;
    markPrice?: string;
    unrealisedPnl?: string;
    leverage?: string;
  }> }>('GET', '/v5/position/list', creds, { category: CATEGORY, symbol: sym });
  const list = result?.list ?? [];
  const pos = list.find((p: any) => parseFloat(p.size) !== 0);
  if (!pos) return null;
  const side = (pos.side ?? '').toUpperCase() === 'SELL' ? 'SHORT' : 'LONG';
  return {
    symbol: pos.symbol,
    side,
    positionAmt: pos.size,
    entryPrice: pos.entryPrice,
    markPrice: pos.markPrice,
    unrealizedProfit: pos.unrealisedPnl,
    leverage: pos.leverage,
  };
}

export async function getOpenOrders(
  creds: BybitFuturesCredentials,
  symbol: string
): Promise<FuturesOpenOrder[]> {
  const sym = symbol.replace('/', '').toUpperCase();
  const result = await signedRequest<{ list?: Array<{
    orderId: string;
    symbol: string;
    side: string;
    orderType: string;
    orderStatus: string;
    qty: string;
    price?: string;
    stopPrice?: string;
  }> }>('GET', '/v5/order/realtime', creds, { category: CATEGORY, symbol: sym });
  const list = result?.list ?? [];
  return list.map((o: any) => ({
    orderId: o.orderId,
    symbol: o.symbol,
    side: o.side,
    type: o.orderType,
    status: o.orderStatus,
    origQty: o.qty,
    price: o.price,
    stopPrice: o.stopPrice,
  }));
}

export async function cancelAll(
  creds: BybitFuturesCredentials,
  symbol: string
): Promise<void> {
  const sym = symbol.replace('/', '').toUpperCase();
  await signedRequest('POST', '/v5/order/cancel-all', creds, {}, { category: CATEGORY, symbol: sym });
}

export function createBybitFuturesAdapter(creds: BybitFuturesCredentials): import('./futures-adapter-types.js').IFuturesAdapter {
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
