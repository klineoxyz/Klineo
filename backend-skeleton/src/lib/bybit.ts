/**
 * Bybit Spot API client (V5)
 * Handles signed requests, testnet/production environments
 * Docs: https://bybit-exchange.github.io/docs/v5/intro
 * Testnet: https://api-testnet.bybit.com
 */

import { createHmac } from 'crypto';

export type BybitEnvironment = 'production' | 'testnet';

const BYBIT_PRODUCTION_BASE = 'https://api.bybit.com';
const BYBIT_TESTNET_BASE = 'https://api-testnet.bybit.com';

export interface BybitCredentials {
  apiKey: string;
  apiSecret: string;
  environment: BybitEnvironment;
}

export interface BybitAccountInfo {
  marginMode: string;
  updatedTime: string;
  unifiedMarginStatus: number;
  isMasterTrader: boolean;
  spotHedgingStatus: string;
}

/** Balance item for compatibility with balance route (asset, free, locked) */
export interface BybitBalanceItem {
  asset: string;
  free: string;
  locked: string;
}

function getBaseUrl(environment: BybitEnvironment): string {
  return environment === 'testnet' ? BYBIT_TESTNET_BASE : BYBIT_PRODUCTION_BASE;
}

/**
 * Bybit V5: sign = HMAC-SHA256(timestamp + api_key + recv_window + queryString)
 * GET: queryString = query params; POST: queryString = jsonBody
 */
function sign(plain: string, secret: string): string {
  return createHmac('sha256', secret).update(plain).digest('hex');
}

const RECV_WINDOW = 5000;

async function signedRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  credentials: BybitCredentials,
  queryParams: Record<string, string> = {},
  body?: object
): Promise<T> {
  const baseUrl = getBaseUrl(credentials.environment);
  const timestamp = Date.now().toString();
  let queryString = new URLSearchParams(queryParams).toString();
  let signPlain: string;
  if (method === 'GET') {
    signPlain = timestamp + credentials.apiKey + RECV_WINDOW + queryString;
  } else {
    const jsonBody = body ? JSON.stringify(body) : '{}';
    signPlain = timestamp + credentials.apiKey + RECV_WINDOW + jsonBody;
  }
  const signature = sign(signPlain, credentials.apiSecret);

  const url = queryString ? `${baseUrl}${endpoint}?${queryString}` : `${baseUrl}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'X-BAPI-API-KEY': credentials.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': String(RECV_WINDOW),
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  };
  if (method === 'POST' && body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json() as { retCode?: number; retMsg?: string; result?: T };

  if (data.retCode !== 0 && data.retCode !== undefined) {
    const human = mapBybitErrorToHuman(data.retCode, data.retMsg);
    throw new Error(human);
  }
  if (!response.ok) {
    const human = mapBybitErrorToHuman(undefined, data.retMsg || `HTTP ${response.status}`);
    throw new Error(human);
  }

  return data.result as T;
}

/** Map Bybit API errors to human-readable fix instructions */
function mapBybitErrorToHuman(retCode?: number, retMsg?: string): string {
  const msg = (retMsg || '').toLowerCase();
  switch (retCode) {
    case 10003:
      return 'Invalid API key or secret. Check that your key and secret are correct and match the environment (mainnet vs testnet).';
    case 10004:
      return 'Invalid API key or secret. Ensure you copied the full key and secret correctly.';
    case 10005:
      return 'This API key does not have trading permissions enabled. Go to Bybit API Management and enable Read and Trade permissions.';
    case 10007:
      return 'Invalid API key or secret. Verify your credentials and try again.';
    case 10010:
      return 'API key IP restriction may be blocking this request. If you use IP whitelist, add your server IP, or create a key without IP restriction.';
    default:
      break;
  }
  if (msg.includes('unified') || msg.includes('uta') || msg.includes('account type')) {
    return 'The selected account is not a Unified Trading Account (UTA). Klineo supports Unified Trading Accounts only. Create a UTA subaccount and use its API key.';
  }
  if (msg.includes('permission') || msg.includes('read') || msg.includes('trade')) {
    return 'This API key does not have the required permissions. Enable Read and Trade in Bybit API Management.';
  }
  if (msg.includes('rate') || msg.includes('limit') || msg.includes('429')) {
    return 'Bybit API temporarily unavailable. Please retry in a few seconds.';
  }
  if (msg.includes('timeout') || msg.includes('unavailable') || msg.includes('502') || msg.includes('503')) {
    return 'Bybit API temporarily unavailable. Please retry.';
  }
  return retMsg || `Bybit API error (${retCode ?? 'unknown'}). Please verify your API key, secret, and permissions.`;
}

/**
 * Get account info (margin mode, etc.) — used for test connection
 */
export async function getAccountInfo(credentials: BybitCredentials): Promise<BybitAccountInfo> {
  return signedRequest<BybitAccountInfo>('GET', '/v5/account/info', credentials);
}

/**
 * Get wallet balance (UNIFIED account). Returns list of coins with walletBalance, locked.
 * Mapped to { balances: [{ asset, free, locked }] } for compatibility with Binance-shaped balance route.
 */
export async function getWalletBalance(credentials: BybitCredentials): Promise<{ balances: BybitBalanceItem[] }> {
  const result = await signedRequest<{ list?: Array<{ coin?: Array<{ coin?: string; walletBalance?: string; locked?: string }> }> }>(
    'GET',
    '/v5/account/wallet-balance',
    credentials,
    { accountType: 'UNIFIED' }
  );

  const balances: BybitBalanceItem[] = [];
  const list = result?.list ?? [];
  for (const account of list) {
    const coins = account.coin ?? [];
    for (const c of coins) {
      const asset = c.coin ?? '';
      const free = c.walletBalance ?? '0';
      const locked = c.locked ?? '0';
      if (parseFloat(free) > 0 || parseFloat(locked) > 0) {
        balances.push({ asset, free, locked });
      }
    }
  }
  return { balances };
}

/** Public request (no auth). Used for ticker. */
async function publicGetBybit<T>(
  endpoint: string,
  params: Record<string, string> = {},
  environment: BybitEnvironment = 'production'
): Promise<T> {
  const baseUrl = getBaseUrl(environment);
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${baseUrl}${endpoint}?${qs}` : `${baseUrl}${endpoint}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = (await res.json()) as { retCode?: number; retMsg?: string; result?: T };
  if (data.retCode !== 0 && data.retCode !== undefined) {
    throw new Error(data.retMsg || `Bybit API ${data.retCode}`);
  }
  return data.result as T;
}

/**
 * Get last price for spot symbol. Public. Bybit V5: category=spot.
 * https://bybit-exchange.github.io/docs/v5/market/tickers
 */
export async function getTickerPriceSpot(symbol: string, environment: BybitEnvironment = 'production'): Promise<{ lastPrice: string }> {
  const sym = (symbol || '').toUpperCase().replace(/\//g, '');
  if (!sym) throw new Error('Symbol required for getTickerPriceSpot');
  const result = await publicGetBybit<{ list?: Array<{ lastPrice?: string }> }>('/v5/market/tickers', {
    category: 'spot',
    symbol: sym,
  }, environment);
  const list = result?.list ?? [];
  const item = list[0];
  if (!item?.lastPrice) throw new Error(`No ticker for ${sym}`);
  return { lastPrice: item.lastPrice };
}

/** Alias: return { price } for consistency with Binance getTickerPrice. */
export async function getTickerPrice(symbol: string, environment: BybitEnvironment = 'production'): Promise<{ price: string }> {
  const r = await getTickerPriceSpot(symbol, environment);
  return { price: r.lastPrice };
}

/** Bybit spot symbol filters (from instruments info). */
export interface BybitSpotSymbolFilters {
  minQty: number;
  maxQty: number;
  stepSize: number;
  minNotional: number;
}

const bybitInstrumentCache = new Map<string, { at: number; data: Map<string, BybitSpotSymbolFilters> }>();
const BYBIT_CACHE_TTL_MS = 60_000;

/**
 * Get spot symbol filters (min qty, step, min notional). Caches in-memory.
 * Bybit V5: GET /v5/market/instruments-info?category=spot
 */
export async function getSpotSymbolFilters(symbol: string, environment: BybitEnvironment = 'production'): Promise<BybitSpotSymbolFilters> {
  const sym = (symbol || '').toUpperCase().replace(/\//g, '');
  if (!sym) throw new Error('Symbol required for getSpotSymbolFilters');
  const cached = bybitInstrumentCache.get(sym);
  if (cached && Date.now() - cached.at < BYBIT_CACHE_TTL_MS) {
    const f = cached.data.get(sym);
    if (f) return f;
  }
  const result = await publicGetBybit<{
    list?: Array<{
      symbol: string;
      lotSizeFilter?: { minOrderQty?: string; maxOrderQty?: string; qtyStep?: string; minNotionalValue?: string };
    }>;
  }>('/v5/market/instruments-info', { category: 'spot', symbol: sym }, environment);
  const map = new Map<string, BybitSpotSymbolFilters>();
  for (const i of result?.list ?? []) {
    const l = i.lotSizeFilter;
    const stepSize = l?.qtyStep ? parseFloat(l.qtyStep) : 1e-8;
    const minQty = l?.minOrderQty ? parseFloat(l.minOrderQty) : 0;
    const maxQty = l?.maxOrderQty ? parseFloat(l.maxOrderQty) : 1e12;
    const minNotional = l?.minNotionalValue ? parseFloat(l.minNotionalValue) : 1;
    map.set(i.symbol, { minQty, maxQty, stepSize, minNotional });
  }
  bybitInstrumentCache.set(sym, { at: Date.now(), data: map });
  const out = map.get(sym);
  if (!out) throw new Error(`Symbol ${sym} not found in Bybit instruments`);
  return out;
}

export interface BybitPlaceOrderParams {
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  orderLinkId?: string;
}

/** Response from POST /v5/order/create (spot) */
export interface BybitOrderResponse {
  orderId?: string;
  orderLinkId?: string;
}

/**
 * Place spot order (Bybit V5). Category = spot.
 * https://bybit-exchange.github.io/docs/v5/order/create-order
 */
export async function placeSpotOrder(
  credentials: BybitCredentials,
  params: BybitPlaceOrderParams
): Promise<BybitOrderResponse> {
  const sym = (params.symbol || '').toUpperCase().replace(/\//g, '');
  if (!sym) throw new Error('Symbol required for placeSpotOrder');
  const body: Record<string, string> = {
    category: 'spot',
    symbol: sym,
    side: params.side,
    orderType: params.orderType,
    qty: params.qty,
  };
  if (params.price != null) body.price = params.price;
  if (params.orderLinkId != null) body.orderLinkId = params.orderLinkId;

  return signedRequest<BybitOrderResponse>('POST', '/v5/order/create', credentials, {}, body);
}

/** Bybit spot order (single order response). */
export interface BybitSpotOrderRow {
  orderId?: string;
  orderLinkId?: string;
  symbol?: string;
  side?: string;
  orderType?: string;
  price?: string;
  qty?: string;
  leavesQty?: string;
  cumExecQty?: string;
  cumExecValue?: string;
  orderStatus?: string;
  createdTime?: string;
  updatedTime?: string;
}

/**
 * Get single spot order by orderId or orderLinkId.
 * GET /v5/order/realtime
 */
export async function getSpotOrder(
  credentials: BybitCredentials,
  params: { symbol: string; orderId?: string; orderLinkId?: string }
): Promise<BybitSpotOrderRow | null> {
  const sym = (params.symbol || '').toUpperCase().replace(/\//g, '');
  if (!sym) throw new Error('Symbol required for getSpotOrder');
  const q: Record<string, string> = { category: 'spot', symbol: sym };
  if (params.orderId) q.orderId = params.orderId;
  else if (params.orderLinkId) q.orderLinkId = params.orderLinkId;
  else throw new Error('orderId or orderLinkId required');
  const result = await signedRequest<{ list?: BybitSpotOrderRow[] }>('GET', '/v5/order/realtime', credentials, q);
  const list = result?.list ?? [];
  return list[0] ?? null;
}

/**
 * Get open spot orders. Symbol optional (all symbols if omitted).
 * GET /v5/order/open-orders
 */
export async function getSpotOpenOrders(
  credentials: BybitCredentials,
  symbol?: string
): Promise<BybitSpotOrderRow[]> {
  const q: Record<string, string> = { category: 'spot' };
  if (symbol) q.symbol = (symbol || '').toUpperCase().replace(/\//g, '');
  const result = await signedRequest<{ list?: BybitSpotOrderRow[] }>('GET', '/v5/order/open-orders', credentials, q);
  return result?.list ?? [];
}

/**
 * Cancel spot order by orderId or orderLinkId.
 * POST /v5/order/cancel
 */
export async function cancelSpotOrder(
  credentials: BybitCredentials,
  params: { symbol: string; orderId?: string; orderLinkId?: string }
): Promise<BybitSpotOrderRow> {
  const sym = (params.symbol || '').toUpperCase().replace(/\//g, '');
  if (!sym) throw new Error('Symbol required for cancelSpotOrder');
  const body: Record<string, string> = { category: 'spot', symbol: sym };
  if (params.orderId) body.orderId = params.orderId;
  else if (params.orderLinkId) body.orderLinkId = params.orderLinkId;
  else throw new Error('orderId or orderLinkId required');
  const result = await signedRequest<BybitSpotOrderRow>('POST', '/v5/order/cancel', credentials, {}, body);
  return result;
}

/**
 * Test connection by calling account info.
 * Uses wallet-balance with accountType=UNIFIED to verify UTA and permissions.
 */
export async function testConnection(credentials: BybitCredentials): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    await getWalletBalance(credentials);
    const latencyMs = Date.now() - startTime;
    return { ok: true, latencyMs, message: 'Connection successful' };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const sanitized = errorMessage.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
    return { ok: false, latencyMs, message: 'Connection failed', error: sanitized };
  }
}
