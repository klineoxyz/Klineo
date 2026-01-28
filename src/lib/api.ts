/**
 * KLINEO API client — baseURL from VITE_API_BASE_URL, Bearer from session, 401 → logout.
 */

import { supabase } from './supabase';
import { triggerLogout } from './authEvents';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

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
   * Delete exchange connection
   */
  delete: async (id: string): Promise<{ message: string; requestId: string }> => {
    return api.delete(`/api/exchange-connections/${id}`);
  },
};
