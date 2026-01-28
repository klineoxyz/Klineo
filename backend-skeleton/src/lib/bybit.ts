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
    throw new Error(`Bybit API error (${data.retCode}): ${data.retMsg || response.statusText}`);
  }
  if (!response.ok) {
    throw new Error(`Bybit HTTP ${response.status}: ${data.retMsg || response.statusText}`);
  }

  return data.result as T;
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

/**
 * Place order (stub for future use)
 */
export async function placeOrder(
  _credentials: BybitCredentials,
  _symbol: string,
  _side: 'Buy' | 'Sell',
  _qty: string,
  _orderType: string = 'Market'
): Promise<unknown> {
  throw new Error('placeOrder not implemented');
}

/**
 * Test connection by calling account info
 */
export async function testConnection(credentials: BybitCredentials): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    await getAccountInfo(credentials);
    const latencyMs = Date.now() - startTime;
    return { ok: true, latencyMs, message: 'Connection successful' };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const sanitized = errorMessage.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
    return { ok: false, latencyMs, message: 'Connection failed', error: sanitized };
  }
}
