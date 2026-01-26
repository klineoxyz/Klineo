/**
 * Binance Spot API client
 * Handles signed requests, testnet/production environments
 */

import { createHmac } from 'crypto';

export type BinanceEnvironment = 'production' | 'testnet';

const BINANCE_PRODUCTION_BASE = 'https://api.binance.com';
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
  const recvWindow = 5000; // 5 seconds

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

/**
 * Make signed request to Binance API
 */
async function signedRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  credentials: BinanceCredentials,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const baseUrl = getBaseUrl(credentials.environment);
  const queryString = buildSignedQuery(params, credentials.apiSecret);
  const url = `${baseUrl}${endpoint}?${queryString}`;

  const response = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': credentials.apiKey,
      'Content-Type': 'application/json',
    },
    // Timeout: 10 seconds
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as BinanceError;
    throw new Error(`Binance API error (${error.code}): ${error.msg || response.statusText}`);
  }

  return data as T;
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
