/**
 * KLINEO API client — baseURL from VITE_API_BASE_URL, Bearer from session, 401 → logout.
 */

import { supabase } from './supabase';
import { triggerLogout } from './authEvents';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Sanitize error messages so we never show secrets, apiKey, apiSecret, or other sensitive data.
 * Use when displaying exchange/connection errors in UI or toasts.
 */
export function sanitizeExchangeError(message: string | undefined | null): string {
  if (message == null || typeof message !== 'string') return 'Something went wrong';
  let out = message;
  const sensitive = /\b(api[_-]?key|api[_-]?secret|secret|apisecret|private[_-]?key|password|credential)\b/gi;
  if (sensitive.test(out)) {
    out = out.replace(sensitive, '[REDACTED]');
  }
  return out.slice(0, 500);
}

/** Check if error indicates backend unreachable (502, network, CORS preflight failure). */
export function isBackendUnreachableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '').toLowerCase();
  return (
    /failed to fetch|networkerror|load failed|network request failed|connection refused/i.test(msg) ||
    /502|bad gateway/i.test(msg)
  );
}

/** User-facing message when backend is unreachable. */
export const BACKEND_UNREACHABLE_MESSAGE =
  'Backend unreachable. The API may be down (502) or temporarily unavailable. Check Railway dashboard or try again later.';

/**
 * Extract user-facing message from an API error. Handles raw JSON body thrown by apiRequest
 * (e.g. "403: {\"error\":\"...\", \"message\":\"...\"}" or plain "{\"message\":\"...\"}").
 */
/** Check if error indicates rate limit (429). */
export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /429|rate limit|too many requests/i.test(msg);
}

export function getApiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? 'Something went wrong');
  if (isBackendUnreachableError(err)) return BACKEND_UNREACHABLE_MESSAGE;
  if (isRateLimitError(err)) return 'Too many requests. Please wait a minute and try again.';
  const toParse = msg.replace(/^\d+\s*:\s*/, '').trim();
  if (toParse.startsWith('{')) {
    try {
      const body = JSON.parse(toParse) as { message?: string; error?: string };
      const text = body.message || body.error;
      if (typeof text === 'string' && text.length > 0) return text;
    } catch {
      /* not JSON, use raw */
    }
  }
  return msg;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!baseURL?.trim()) {
    throw new Error('VITE_API_BASE_URL not set — API calls disabled');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const base = baseURL.replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    triggerLogout();
    throw new Error('Unauthorized');
  }

  if (res.status === 403) {
    const text = await res.text();
    const error = text || 'Access denied';
    throw new Error(`403: ${error}`);
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after') || '60';
    throw new Error(`429: {"error":"Too many requests","message":"Rate limit exceeded. Please wait ${retryAfter} seconds and try again."}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

// Exchange Connections API
export interface ExchangeConnection {
  id: string;
  exchange: string;
  label: string | null;
  environment: 'production' | 'testnet';
  created_at: string;
  updated_at: string;
  last_tested_at: string | null;
  last_test_status: 'ok' | 'fail' | null;
  last_error_message: string | null;
  consecutive_failures?: number;
  disabled_at?: string | null;
  supports_futures?: boolean;
  futures_enabled?: boolean;
  futures_tested_at?: string | null;
  futures_test_status?: 'ok' | 'fail' | null;
  futures_last_error?: string | null;
  default_leverage?: number;
  max_leverage_allowed?: number;
  margin_mode?: 'isolated' | 'cross';
  position_mode?: 'one_way' | 'hedge';
  max_notional_usdt?: number;
  kill_switch?: boolean;
}

export interface CreateConnectionRequest {
  exchange: 'binance' | 'bybit';
  environment?: 'production' | 'testnet';
  label?: string;
  apiKey: string;
  apiSecret: string;
}

/** Body for POST /api/exchange-connections/test (test credentials without saving) */
export interface TestConnectionRequest {
  exchange: 'binance' | 'bybit';
  environment?: 'production' | 'testnet';
  apiKey: string;
  apiSecret: string;
}

export interface TestConnectionResponse {
  ok: boolean;
  latencyMs: number;
  message: string;
  /** Present when ok is false; e.g. Binance "Service unavailable from a restricted location" */
  error?: string;
  requestId: string;
}

// Entitlement (joining fee + package allowance)
export interface EntitlementResponse {
  joiningFeePaid: boolean;
  status: 'inactive' | 'active' | 'exhausted';
  activePackageId: string | null;
  profitAllowanceUsd: number;
  profitUsedUsd: number;
  remainingUsd: number;
}

// Billing / Packages (credit-based model)
export interface BillingPlansResponse {
  joiningFee: { priceUsd: number; currency: string };
  packages: Array<{
    id: string;
    priceUsd: number;
    multiplier: number;
    profitAllowanceUsd: number;
  }>;
  revenueSplit: { mlmPct: number; platformPct: number; marketingPct: number };
}

export interface JoiningFeeCheckoutResponse {
  status: string;
  message: string;
  method?: string;
}

export interface PackageCheckoutResponse {
  status: string;
  message: string;
  packageId?: string;
  method?: string;
}

/** Balance for one asset (e.g. USDT or BTC) */
export interface AssetBalance {
  free: string;
  locked: string;
}

/** Response from GET /api/exchange-connections/balance */
export interface ExchangeBalanceResponse {
  connected: boolean;
  exchange: string | null;
  connectionId: string | null;
  balances: Record<string, AssetBalance>;
  requestId: string;
}

export const exchangeConnections = {
  /**
   * List all exchange connections for current user
   */
  list: async (): Promise<{ connections: ExchangeConnection[]; requestId: string }> => {
    return api.get('/api/exchange-connections');
  },

  /**
   * Fetch account balances from connected exchange (Binance). Used by trading terminal.
   * Returns empty balances when not connected or API key not set.
   */
  getBalance: async (): Promise<ExchangeBalanceResponse> => {
    return api.get('/api/exchange-connections/balance');
  },

  /**
   * Create or update exchange connection
   */
  create: async (data: CreateConnectionRequest): Promise<{ connection: ExchangeConnection; message: string; requestId: string }> => {
    return api.post('/api/exchange-connections', data);
  },

  /**
   * Test credentials before saving (no persistence). Call before "Save Connection".
   */
  testBeforeSave: async (data: TestConnectionRequest): Promise<{ success: boolean; ok?: boolean; latencyMs?: number; message?: string; error?: string; requestId?: string }> => {
    return api.post('/api/exchange-connections/test', data);
  },

  /**
   * Test existing exchange connection (by id)
   */
  test: async (id: string): Promise<TestConnectionResponse> => {
    return api.post(`/api/exchange-connections/${id}/test`);
  },

  /**
   * Re-save API key/secret for an existing connection (fixes decrypt errors after storage change).
   */
  updateCredentials: async (
    id: string,
    data: { apiKey: string; apiSecret: string; environment?: 'production' | 'testnet' }
  ): Promise<{ message: string; requestId: string }> => {
    return api.put(`/api/exchange-connections/${id}/credentials`, data);
  },

  /**
   * Re-enable connection after auto-disable (clears disabled_at and consecutive_failures)
   */
  reEnable: async (id: string): Promise<{ message: string; requestId: string }> => {
    return api.patch(`/api/exchange-connections/${id}/re-enable`);
  },

  /**
   * Delete exchange connection
   */
  delete: async (id: string): Promise<{ message: string; requestId: string }> => {
    return api.delete(`/api/exchange-connections/${id}`);
  },

  /** Test Futures API (no order). Updates futures_test_status. */
  futuresTest: async (id: string): Promise<{ ok: boolean; latencyMs: number; message: string; error?: string; requestId: string }> => {
    return api.post(`/api/exchange-connections/${id}/futures/test`);
  },

  /** Enable Futures: set leverage, margin mode, position mode for BTCUSDT. Sets futures_enabled true. */
  futuresEnable: async (
    id: string,
    data: { default_leverage?: number; margin_mode?: 'isolated' | 'cross'; position_mode?: 'one_way' | 'hedge' }
  ): Promise<{ message: string; requestId: string }> => {
    return api.post(`/api/exchange-connections/${id}/futures/enable`, data);
  },

  /** Set kill switch (stops all futures strategies from placing orders). */
  setKillSwitch: async (id: string, enabled: boolean): Promise<{ kill_switch: boolean; message: string; requestId: string }> => {
    return api.patch(`/api/exchange-connections/${id}/kill-switch`, { enabled });
  },
};

// Candles / klines from connected exchange (Binance or Bybit Futures) — for Strategy Backtest and charts
export interface KlineCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const candles = {
  getKlines: async (params: {
    exchange: 'binance' | 'bybit';
    symbol: string;
    interval?: string;
    limit?: number;
    env?: 'production' | 'testnet';
  }): Promise<{ candles: KlineCandle[]; exchange: string; symbol: string; interval: string; env: string }> => {
    const { exchange, symbol, interval = '1h', limit = 500, env = 'production' } = params;
    const q = new URLSearchParams({
      exchange,
      symbol: symbol.replace('/', '').toUpperCase(),
      interval,
      limit: String(Math.min(limit, 500)),
      env,
    });
    const data = await api.get<{ candles: KlineCandle[]; exchange: string; symbol: string; interval: string; env: string }>(
      `/api/candles/klines?${q}`
    );
    return data;
  },
};

// Manual Futures Order (MVP: market only). Send qty (base) or quoteSizeUsdt (USDT; backend converts via mark price).
export interface PlaceFuturesOrderRequest {
  connectionId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET';
  qty?: string;
  quoteSizeUsdt?: number;
}

export const futures = {
  placeOrder: async (data: PlaceFuturesOrderRequest): Promise<{ orderId: string; status: string; requestId: string }> => {
    return api.post('/api/futures/order', data);
  },
};

// Strategies API (Futures auto trading)
export interface StrategyRun {
  id: string;
  exchange_connection_id: string;
  exchange: string;
  symbol: string;
  timeframe: string;
  direction: 'long' | 'short' | 'both';
  leverage: number;
  status: 'draft' | 'active' | 'paused' | 'stopped';
  last_signal_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyEvent {
  id: string;
  event_type: 'signal' | 'order_submit' | 'order_fill' | 'error' | 'risk_block';
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CreateStrategyRequest {
  exchange_connection_id: string;
  symbol: string;
  timeframe: string;
  direction: 'long' | 'short' | 'both';
  leverage: number;
  margin_mode?: 'isolated' | 'cross';
  position_mode?: 'one_way' | 'hedge';
  order_size_pct?: number;
  initial_capital_usdt?: number;
  take_profit_pct?: number;
  stop_loss_pct?: number;
  strategy_template?: string;
  strategy_params?: Record<string, unknown>;
}

export const strategies = {
  create: async (data: CreateStrategyRequest): Promise<{ strategy: StrategyRun; requestId: string }> => {
    return api.post('/api/strategies', data);
  },
  list: async (): Promise<{ strategies: StrategyRun[]; requestId: string }> => {
    return api.get('/api/strategies');
  },
  get: async (id: string): Promise<{ strategy: StrategyRun & Record<string, unknown>; events: StrategyEvent[]; requestId: string }> => {
    return api.get(`/api/strategies/${id}`);
  },
  setStatus: async (id: string, status: 'active' | 'paused' | 'stopped'): Promise<{ status: string; requestId: string }> => {
    return api.put(`/api/strategies/${id}/status`, { status });
  },
  executeTick: async (id: string): Promise<{ signal: string; rsi?: number; orderPlaced: boolean; orderId?: string; riskBlock?: string; error?: string; requestId: string }> => {
    return api.post(`/api/strategies/${id}/execute-tick`);
  },
};
