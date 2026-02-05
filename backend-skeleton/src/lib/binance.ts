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
 * Build signed query string with timestamp and recvWindow
 */
function buildSignedQuery(params: Record<string, string | number | undefined>, secret: string): string {
  const timestamp = Date.now();
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
    const queryString = buildSignedQuery(params, credentials.apiSecret);
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
      let errMsg: string;
      try {
        const data = JSON.parse(rawText) as BinanceError;
        errMsg = data.msg ? String(data.msg) : response.statusText;
        const code = typeof data.code === 'number' ? data.code : response.status;
        if (code === -1021) {
          errMsg += ' Sync server clock or use Binance server time for timestamp.';
        }
        throw new Error(`Binance API error (${code}): ${errMsg}`);
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
 * Test connection by calling account info endpoint
 * Returns success status and latency
 */
export async function testConnection(credentials: BinanceCredentials): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    await getAccountInfo(credentials);
    const latencyMs = Date.now() - startTime;
    return {
      ok: true,
      latencyMs,
      message: 'Connection successful',
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    // Sanitize error message (remove sensitive data)
    const sanitized = errorMessage.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
    return {
      ok: false,
      latencyMs,
      message: 'Connection failed',
      error: sanitized,
    };
  }
}
