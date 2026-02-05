/**
 * Binance Spot API client
 * Handles signed requests, testnet/production environments.
 * Uses binanceFetch so BINANCE_HTTP_PROXY / BINANCE_HTTPS_PROXY can route requests from an allowed region.
 */

import { createHmac } from 'crypto';
import { binanceFetch } from './binance-fetch.js';

export type BinanceEnvironment = 'production' | 'testnet';

const BINANCE_PRODUCTION_BASE = process.env.BINANCE_SPOT_BASE_URL?.trim() || 'https://api.binance.com';
const BINANCE_TESTNET_BASE = 'https://testnet.binance.vision';

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
  environment: BinanceEnvironment;
}

export interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
  permissions: string[];
}

export interface BinanceOrder {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice?: string;
  icebergQty?: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  origQuoteOrderQty: string;
}

export interface BinanceTrade {
  id: number;
  orderId: number;
  symbol: string;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

interface BinanceError {
  code: number;
  msg: string;
}

/** User-safe error classification for Binance API errors. Never logs secrets. */
export type BinanceErrorType =
  | 'permission'      // -2015: Invalid API-key, IP, or permissions
  | 'timestamp'       // -1021: Timestamp outside recvWindow
  | 'signature'       // -1022: Invalid signature
  | 'ip_whitelist'    // IP not whitelisted (often part of -2015)
  | 'rate_limit'      // 429, -1015
  | 'restricted'      // 451: Geographic restriction
  | 'other';

export function classifyBinanceError(code: number, msg: string, httpStatus?: number): BinanceErrorType {
  if (httpStatus === 429) return 'rate_limit';
  if (httpStatus === 451) return 'restricted';
  if (code === -2015) return 'permission';
  if (code === -1021) return 'timestamp';
  if (code === -1022) return 'signature';
  if (code === -1015) return 'rate_limit';
  if (/ip|whitelist|permission|invalid.*key/i.test(msg)) return 'permission';
  // Geographic restriction (can be 403, 451, or JSON with code 0)
  if (/restricted location|eligibility|service unavailable.*restricted|not available.*region/i.test(msg)) return 'restricted';
  return 'other';
}

/** User-safe message for Binance errors. Never includes secrets. */
export function getBinanceUserMessage(code: number, msg: string, errorType: BinanceErrorType): string {
  switch (errorType) {
    case 'permission':
      return 'Invalid API key, IP not whitelisted, or insufficient permissions. Enable Spot trading and Reading in Binance API settings.';
    case 'timestamp':
      return 'Server clock may be out of sync. Sync system time (NTP) or try again.';
    case 'signature':
      return 'Invalid API secret. Check your secret key.';
    case 'rate_limit':
      return 'Rate limit exceeded. Wait a moment and try again.';
    case 'restricted':
      return 'Your server IP (Railway) is in a region Binance restricts. Set BINANCE_HTTPS_PROXY in Railway Variables to an HTTP(S) proxy in an allowed region (e.g. Singapore, Hong Kong). See project TROUBLESHOOT_BINANCE_RESTRICTED.md.';
    default:
      return msg || 'Connection failed. Check API key, secret, and permissions.';
  }
}

/**
 * Get base URL based on environment
 */
function getBaseUrl(environment: BinanceEnvironment): string {
  return environment === 'testnet' ? BINANCE_TESTNET_BASE : BINANCE_PRODUCTION_BASE;
}

/**
 * Generate HMAC SHA256 signature for Binance API
 */
function sign(queryString: string, secret: string): string {
  return createHmac('sha256', secret).update(queryString).digest('hex');
}

/**
 * Fetch Binance server time (public, no auth). Use for timestamp sync to avoid -1021.
 */
export async function getServerTime(credentials: BinanceCredentials): Promise<number> {
  const baseUrl = getBaseUrl(credentials.environment);
  const res = await binanceFetch(`${baseUrl}/api/v3/time`, { signal: AbortSignal.timeout(5000) });
  const raw = await res.text();
  if (!res.ok) {
    try {
      const parsed = JSON.parse(raw) as { code?: number; msg?: string };
      const code = parsed.code ?? res.status;
      const msg = parsed.msg ?? raw.slice(0, 200);
      const errType = classifyBinanceError(code, msg, res.status);
      if (errType === 'restricted') {
        throw new Error(getBinanceUserMessage(code, msg, 'restricted'));
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('BINANCE_HTTPS_PROXY')) throw e;
    }
    throw new Error(`Binance connectivity: ${res.status} ${raw.slice(0, 100)}`);
  }
  const data = JSON.parse(raw) as { serverTime?: number };
  const t = data.serverTime;
  if (typeof t !== 'number' || t <= 0) throw new Error('Invalid server time response');
  return t;
}

/**
 * Build signed query string with timestamp and recvWindow
 */
function buildSignedQuery(
  params: Record<string, string | number | undefined>,
  secret: string,
  overrideTimestamp?: number
): string {
  const timestamp = overrideTimestamp ?? Date.now();
  const recvWindow = 10000; // 10 seconds (Binance allows clock drift; -1021 if too small)

  const queryParams = new URLSearchParams();
  queryParams.append('timestamp', timestamp.toString());
  queryParams.append('recvWindow', recvWindow.toString());

  // Add other params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  }

  const queryString = queryParams.toString();
  const signature = sign(queryString, secret);
  queryParams.append('signature', signature);

  return queryParams.toString();
}

const RETRY_429_MAX = 2;
const RETRY_429_BASE_MS = 1000;

/**
 * Make signed request to Binance API. Retries on 429 (rate limit) with backoff per docs.
 */
async function signedRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  credentials: BinanceCredentials,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const baseUrl = getBaseUrl(credentials.environment);
  let lastRawText = '';
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= RETRY_429_MAX; attempt++) {
    const queryString = buildSignedQuery(params, credentials.apiSecret, undefined);
    const url = `${baseUrl}${endpoint}?${queryString}`;

    const response = await binanceFetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': credentials.apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    const rawText = await response.text();
    lastRawText = rawText;
    lastResponse = response;

    if (response.status === 429 && attempt < RETRY_429_MAX) {
      const retryAfter = parseInt(response.headers.get('Retry-After') ?? '', 10) || RETRY_429_BASE_MS * (attempt + 1);
      await new Promise((r) => setTimeout(r, Math.min(retryAfter, 60000)));
      continue;
    }

    if (!response.ok) {
      try {
        const data = JSON.parse(rawText) as BinanceError;
        const code = typeof data.code === 'number' ? data.code : response.status;
        const msg = data.msg ? String(data.msg) : response.statusText;
        const errType = classifyBinanceError(code, msg, response.status);
        const userMsg = getBinanceUserMessage(code, msg, errType);
        throw new Error(`Binance API error (${code}): ${userMsg}`);
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.startsWith('Binance API error')) throw parseErr;
        const snippet = rawText.slice(0, 200).replace(/\s+/g, ' ').trim();
        const statusMsg = response.status === 451
          ? (snippet || 'Service unavailable from a restricted location (HTTP 451).')
          : (snippet || response.statusText || `HTTP ${response.status}`);
        throw new Error(`Binance API error (${response.status}): ${statusMsg}`);
      }
    }

    let data: T;
    try {
      data = JSON.parse(rawText) as T;
    } catch {
      throw new Error(`Binance API error (${response.status}): Invalid response body`);
    }
    return data;
  }

  if (lastResponse && !lastResponse.ok) {
    try {
      const data = JSON.parse(lastRawText) as BinanceError;
      throw new Error(`Binance API error (${data.code ?? lastResponse.status}): ${data.msg ?? lastResponse.statusText}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Binance API error')) throw e;
    }
  }
  throw new Error('Binance API error: Too many retries');
}

/**
 * Get account information
 * https://binance-docs.github.io/apidocs/spot/en/#account-information-user_data
 */
export async function getAccountInfo(credentials: BinanceCredentials): Promise<BinanceAccountInfo> {
  return signedRequest<BinanceAccountInfo>('GET', '/api/v3/account', credentials);
}

/**
 * Get all open orders for a symbol (or all symbols)
 * https://binance-docs.github.io/apidocs/spot/en/#current-open-orders-user_data
 */
export async function getOpenOrders(
  credentials: BinanceCredentials,
  symbol?: string
): Promise<BinanceOrder[]> {
  const params: Record<string, string | undefined> = {};
  if (symbol) {
    params.symbol = symbol.toUpperCase();
  }
  return signedRequest<BinanceOrder[]>('GET', '/api/v3/openOrders', credentials, params);
}

/**
 * Get trade history for a symbol
 * https://binance-docs.github.io/apidocs/spot/en/#account-trade-list-user_data
 */
export async function getMyTrades(
  credentials: BinanceCredentials,
  symbol: string,
  limit: number = 50
): Promise<BinanceTrade[]> {
  if (!symbol) {
    throw new Error('Symbol is required for getMyTrades');
  }

  const params: Record<string, string | number> = {
    symbol: symbol.toUpperCase(),
    limit: Math.min(Math.max(limit, 1), 1000), // Clamp between 1 and 1000
  };

  return signedRequest<BinanceTrade[]>('GET', '/api/v3/myTrades', credentials, params);
}

/**
 * Test connection: capability-based (Spot only). NEVER touches Futures.
 * 1. Public connectivity: GET /api/v3/time
 * 2. Signed Spot account: GET /api/v3/account (uses server time to avoid -1021)
 * 3. Validates permissions from account response
 * Spot success = overall success. Futures is never tested here.
 */
export async function testConnection(credentials: BinanceCredentials): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
  error?: string;
  warnings?: string[];
}> {
  const startTime = Date.now();
  const sanitize = (s: string) => s.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');

  try {
    // 1. Public connectivity
    const serverTime = await getServerTime(credentials);

    // 2. Signed Spot account (use server time to avoid -1021)
    const baseUrl = getBaseUrl(credentials.environment);
    const params: Record<string, string | number> = {};
    const queryString = buildSignedQuery(params, credentials.apiSecret, serverTime);
    const url = `${baseUrl}/api/v3/account?${queryString}`;
    const res = await binanceFetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': credentials.apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const rawText = await res.text();

    if (!res.ok) {
      let errMsg: string;
      try {
        const data = JSON.parse(rawText) as BinanceError;
        const code = typeof data.code === 'number' ? data.code : res.status;
        const msg = data.msg ? String(data.msg) : res.statusText;
        const errType = classifyBinanceError(code, msg, res.status);
        errMsg = getBinanceUserMessage(code, msg, errType);
      } catch {
        errMsg = rawText.slice(0, 200) || res.statusText || 'Connection failed';
      }
      const latencyMs = Date.now() - startTime;
      return {
        ok: false,
        latencyMs,
        message: 'Connection failed',
        error: sanitize(errMsg),
      };
    }

    let account: BinanceAccountInfo;
    try {
      account = JSON.parse(rawText) as BinanceAccountInfo;
    } catch {
      const latencyMs = Date.now() - startTime;
      return {
        ok: false,
        latencyMs,
        message: 'Connection failed',
        error: 'Invalid account response',
      };
    }

    // 3. Validate permissions (warnings only; Spot success = overall success)
    const warnings: string[] = [];
    if (!account.canTrade) {
      warnings.push('Spot trading is disabled. Enable it in Binance API settings for full functionality.');
    }
    if (account.canWithdraw) {
      warnings.push('Withdrawals are enabled. We recommend disabling for security.');
    }
    const hasSpot = Array.isArray(account.permissions) && account.permissions.some((p) => /SPOT|MARGIN/i.test(String(p)));
    if (!hasSpot && account.permissions?.length) {
      warnings.push('Spot/Margin permission not detected. Enable Reading and Spot trading.');
    }

    const latencyMs = Date.now() - startTime;
    return {
      ok: true,
      latencyMs,
      message: 'Connection successful',
      ...(warnings.length ? { warnings } : {}),
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return {
      ok: false,
      latencyMs,
      message: 'Connection failed',
      error: sanitize(errorMessage),
    };
  }
}
