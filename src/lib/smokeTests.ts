/**
 * KLINEO Smoke Test Definitions
 * Tests backend endpoints and returns structured results
 */

import { api } from './api';
import { pathForView, viewForPath } from '@/app/config/routes';
import { getSmokeExchangeTestsEnabled, getSmokeRunnerCronTestEnabled } from './smokeTestToggles';

export interface SmokeTestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  httpCode?: number;
  latency?: number;
  message: string;
  details?: {
    requestPath?: string;
    response?: unknown;
    error?: string;
  };
}

export interface SmokeTestDefinition {
  name: string;
  category: 'public' | 'authenticated' | 'admin';
  run: () => Promise<SmokeTestResult>;
}

/**
 * Get current user info (for determining if admin tests should pass/fail)
 */
async function getCurrentUser(): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const data = await api.get<{ id: string; email: string; role: string }>('/api/auth/me');
    return data;
  } catch {
    return null;
  }
}

/**
 * Run a single test with latency measurement
 */
async function runTest(
  name: string,
  testFn: () => Promise<Response>
): Promise<SmokeTestResult> {
  const startTime = performance.now();
  let httpCode: number | undefined;
  let response: Response | null = null;
  let responseData: unknown = null;
  let error: string | undefined;
  let requestPath: string | undefined;

  try {
    response = await testFn();
    httpCode = response.status;
    const latency = Math.round(performance.now() - startTime);
    
    // Extract request path from response URL (mask to origin only)
    if (response.url) {
      try {
        const url = new URL(response.url);
        requestPath = url.pathname + url.search;
      } catch {
        const baseURL = getBaseURL();
        requestPath = response.url.replace(baseURL, '');
        // Mask full URLs to just show origin
        if (requestPath === response.url) {
          try {
            const urlObj = new URL(response.url);
            requestPath = urlObj.origin + urlObj.pathname + urlObj.search;
          } catch {
            requestPath = '[masked]';
          }
        }
      }
    }

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        return {
          name,
          status: 'PASS',
          httpCode,
          latency,
          message: 'Success',
          details: {
            requestPath,
            response: sanitizeResponse(responseData)
          }
        };
    } else {
      // Try to get error message
      try {
        const errorText = await response.text();
        responseData = errorText ? JSON.parse(errorText) : null;
      } catch {
        // Not JSON
      }

      return {
        name,
        status: 'FAIL',
        httpCode,
        latency,
        message: `HTTP ${httpCode}`,
        details: {
          requestPath,
          response: sanitizeResponse(responseData)
        }
      };
    }
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    error = err?.message || 'Unknown error';

    // Check if it's a 401 (unauthorized) - always FAIL
    if (error.includes('Unauthorized') || error.includes('401') || httpCode === 401) {
      return {
        name,
        status: 'FAIL',
        httpCode: 401,
        latency,
        message: 'Unauthorized - session expired',
        details: {
          error: 'Session expired - please login again'
        }
      };
    }

    return {
      name,
      status: 'FAIL',
      httpCode,
      latency,
      message: error,
      details: {
        requestPath,
        error
      }
    };
  }
}

/**
 * Get base URL for direct fetch (for latency measurement)
 */
function getBaseURL(): string {
  const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
  if (!baseURL) {
    throw new Error('VITE_API_BASE_URL not set');
  }
  return baseURL.replace(/\/$/, '');
}

/**
 * Sanitize response data (remove tokens, secrets, sensitive keys)
 * Recursively strips keys containing: token, secret, password, authorization, apikey, key, bearer (case-insensitive)
 */
export function sanitizeResponse(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;
  if (Array.isArray(data)) return data.map(sanitizeResponse);
  
  const sanitized: Record<string, unknown> = {};
  const sensitivePatterns = ['token', 'secret', 'password', 'authorization', 'apikey', 'apisecret', 'key', 'bearer'];
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitivePatterns.some(pattern => lowerKey.includes(pattern));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeResponse(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const SMOKE_TESTS_HEADER = 'x-klineo-smoke-tests';

/**
 * Get auth headers for fetch. When addSmokeHeader is true, adds x-klineo-smoke-tests: true for backend guardrails.
 */
async function getAuthHeaders(addSmokeHeader = false): Promise<HeadersInit> {
  const { supabase } = await import('./supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  if (addSmokeHeader) {
    (headers as Record<string, string>)[SMOKE_TESTS_HEADER] = 'true';
  }

  return headers;
}

/**
 * Routing validator: ensure pathForView and viewForPath are consistent for key routes.
 * Prevents regressions where URL doesn't match rendered view.
 */
function runRoutingValidator(): SmokeTestResult {
  try {
    const keyViews = [
      'dashboard', 'trading-terminal', 'positions', 'orders', 'trade-history',
      'strategy-backtest', 'portfolio', 'subscription', 'referrals', 'fees',
      'settings', 'marketplace', 'admin', 'payments', 'copy-trading'
    ];
    for (const view of keyViews) {
      const path = pathForView(view);
      const back = viewForPath(path);
      if (back !== view) {
        return {
          name: 'Routing validator',
          status: 'FAIL',
          message: `pathForView("${view}") → "${path}" but viewForPath("${path}") → "${back}"`,
        };
      }
    }
    return { name: 'Routing validator', status: 'PASS', message: 'pathForView/viewForPath consistent for key routes' };
  } catch (e) {
    return {
      name: 'Routing validator',
      status: 'FAIL',
      message: (e instanceof Error ? e.message : 'Routing config error'),
    };
  }
}

/**
 * Test definitions
 */
export const smokeTests: SmokeTestDefinition[] = [
  // Frontend routing (sync)
  {
    name: 'Routing validator',
    category: 'public',
    run: async () => runRoutingValidator(),
  },
  // Public tests
  {
    name: 'Health Check',
    category: 'public',
    run: async () => {
      const baseURL = getBaseURL();
      return runTest('Health Check', () =>
        fetch(`${baseURL}/health`)
      );
    }
  },
  {
    name: 'GET /api/traders (Public)',
    category: 'public',
    run: async () => {
      const baseURL = getBaseURL();
      return runTest('GET /api/traders (Public)', () =>
        fetch(`${baseURL}/api/traders?limit=5`)
      );
    }
  },

  // Authenticated tests
  {
    name: 'GET /api/auth/me',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/auth/me',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/auth/me', () =>
        fetch(`${baseURL}/api/auth/me`, { headers })
      );
    }
  },
  {
    name: 'GET /api/me/profile',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/me/profile',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/me/profile', () =>
        fetch(`${baseURL}/api/me/profile`, { headers })
      );
    }
  },
  {
    name: 'GET /api/copy-setups',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/copy-setups',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/copy-setups', () =>
        fetch(`${baseURL}/api/copy-setups`, { headers })
      );
    }
  },
  {
    name: 'GET /api/portfolio/summary',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/portfolio/summary',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/portfolio/summary', () =>
        fetch(`${baseURL}/api/portfolio/summary`, { headers })
      );
    }
  },
  {
    name: 'GET /api/positions',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/positions',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/positions', () =>
        fetch(`${baseURL}/api/positions?page=1&limit=5`, { headers })
      );
    }
  },
  {
    name: 'GET /api/orders',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/orders',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/orders', () =>
        fetch(`${baseURL}/api/orders?page=1&limit=5`, { headers })
      );
    }
  },
  {
    name: 'GET /api/trades',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/trades',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/trades', () =>
        fetch(`${baseURL}/api/trades?page=1&limit=5`, { headers })
      );
    }
  },
  {
    name: 'GET /api/notifications',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/notifications',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/notifications', () =>
        fetch(`${baseURL}/api/notifications?limit=5`, { headers })
      );
    }
  },
  {
    name: 'Referral code real + self-referral blocked',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'Referral code real + self-referral blocked', status: 'SKIP', message: 'Login required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const meRes = await fetch(`${baseURL}/api/referrals/me`, { headers });
      if (!meRes.ok) {
        return {
          name: 'Referral code real + self-referral blocked',
          status: 'FAIL',
          httpCode: meRes.status,
          message: `GET /api/referrals/me failed: ${meRes.status}`,
        };
      }
      const meData = (await meRes.json()) as { referralCode?: string; referralLink?: string };
      const code = meData.referralCode || '';
      const link = meData.referralLink || '';
      if (code === 'KLINEO-XYZ123' || link.includes('XYZ123')) {
        return {
          name: 'Referral code real + self-referral blocked',
          status: 'FAIL',
          message: 'Referral code/link is still placeholder (KLINEO-XYZ123)',
          details: { referralCode: code, referralLink: link },
        };
      }
      if (!code || !link || !link.includes(code)) {
        return {
          name: 'Referral code real + self-referral blocked',
          status: 'FAIL',
          message: 'referralLink must contain referralCode',
          details: { referralCode: code, referralLink: link },
        };
      }
      const claimRes = await fetch(`${baseURL}/api/referrals/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code }),
      });
      const claimData = claimRes.ok ? await claimRes.json() : await claimRes.text();
      if (claimRes.status !== 400) {
        return {
          name: 'Referral code real + self-referral blocked',
          status: 'FAIL',
          httpCode: claimRes.status,
          message: 'Self-referral (claim own code) should return 400',
          details: { response: claimData },
        };
      }
      const errMsg = typeof claimData === 'string' ? claimData : (claimData as { error?: string })?.error || '';
      if (!errMsg.toLowerCase().includes('own') && !errMsg.toLowerCase().includes('self')) {
        return {
          name: 'Referral code real + self-referral blocked',
          status: 'FAIL',
          message: 'Self-referral should be rejected with own/self message',
          details: { response: claimData },
        };
      }
      return {
        name: 'Referral code real + self-referral blocked',
        status: 'PASS',
        message: 'Real referral code; self-referral correctly blocked',
      };
    },
  },

  // Admin tests
  {
    name: 'GET /api/admin/stats',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/admin/stats',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('GET /api/admin/stats', () =>
        fetch(`${baseURL}/api/admin/stats`, { headers })
      );

      // Admin test logic: 200 is PASS for admin, 403 is PASS for non-admin, 401 is always FAIL
      if (result.httpCode === 401) {
        return { ...result, status: 'FAIL', message: 'Unauthorized' };
      }
      
      if (user.role === 'admin') {
        if (result.httpCode === 200) {
          return { ...result, status: 'PASS', message: 'Success (admin access)' };
        } else if (result.httpCode === 403) {
          return { ...result, status: 'FAIL', message: 'Expected 200 for admin, got 403' };
        }
      } else {
        if (result.httpCode === 403) {
          return { ...result, status: 'PASS', message: 'Correctly blocked (non-admin)' };
        } else if (result.httpCode === 200) {
          return { ...result, status: 'FAIL', message: 'Unexpected access (non-admin got 200)' };
        }
      }

      return result;
    }
  },
  {
    name: 'GET /api/admin/users',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/admin/users',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('GET /api/admin/users', () =>
        fetch(`${baseURL}/api/admin/users?limit=5`, { headers })
      );

      // Admin test logic
      if (user.role === 'admin') {
        if (result.httpCode === 200) {
          return { ...result, status: 'PASS', message: 'Success (admin access)' };
        } else if (result.httpCode === 403) {
          return { ...result, status: 'FAIL', message: 'Expected 200 for admin, got 403' };
        }
      } else {
        if (result.httpCode === 403) {
          return { ...result, status: 'PASS', message: 'Correctly blocked (non-admin)' };
        } else if (result.httpCode === 200) {
          return { ...result, status: 'FAIL', message: 'Unexpected access (non-admin got 200)' };
        }
      }

      return result;
    }
  },
  {
    name: 'GET /api/admin/traders',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/admin/traders',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('GET /api/admin/traders', () =>
        fetch(`${baseURL}/api/admin/traders?limit=5`, { headers })
      );

      // Admin test logic
      if (user.role === 'admin') {
        if (result.httpCode === 200) {
          return { ...result, status: 'PASS', message: 'Success (admin access)' };
        } else if (result.httpCode === 403) {
          return { ...result, status: 'FAIL', message: 'Expected 200 for admin, got 403' };
        }
      } else {
        if (result.httpCode === 403) {
          return { ...result, status: 'PASS', message: 'Correctly blocked (non-admin)' };
        } else if (result.httpCode === 200) {
          return { ...result, status: 'FAIL', message: 'Unexpected access (non-admin got 200)' };
        }
      }

      return result;
    }
  },
  {
    name: 'GET /api/admin/audit-logs',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/admin/audit-logs',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('GET /api/admin/audit-logs', () =>
        fetch(`${baseURL}/api/admin/audit-logs?limit=5`, { headers })
      );

      // Admin test logic
      if (user.role === 'admin') {
        if (result.httpCode === 200) {
          return { ...result, status: 'PASS', message: 'Success (admin access)' };
        } else if (result.httpCode === 403) {
          return { ...result, status: 'FAIL', message: 'Expected 200 for admin, got 403' };
        }
      } else {
        if (result.httpCode === 403) {
          return { ...result, status: 'PASS', message: 'Correctly blocked (non-admin)' };
        } else if (result.httpCode === 200) {
          return { ...result, status: 'FAIL', message: 'Unexpected access (non-admin got 200)' };
        }
      }

      return result;
    }
  },
  {
    name: 'GET /api/self-test/rls',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return {
          name: 'GET /api/self-test/rls',
          status: 'SKIP',
          message: 'Login required'
        };
      }

      if (user.role !== 'admin') {
        return {
          name: 'GET /api/self-test/rls',
          status: 'SKIP',
          message: 'Admin role required'
        };
      }

      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('GET /api/self-test/rls', () =>
        fetch(`${baseURL}/api/self-test/rls`, { headers })
      );
      if (result.httpCode === 404) {
        return { ...result, status: 'SKIP', message: 'Self-test disabled in production' };
      }
      return result;
    }
  },

  // Entitlement / allowance smoke tests
  {
    name: 'GET /api/entitlements/me',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'GET /api/entitlements/me', status: 'SKIP', message: 'Login required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/entitlements/me', () =>
        fetch(`${baseURL}/api/entitlements/me`, { headers })
      );
    }
  },
  {
    name: 'POST /api/self-test/simulate-profit',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'POST /api/self-test/simulate-profit', status: 'SKIP', message: 'Login required' };
      }
      if (user.role !== 'admin') {
        return { name: 'POST /api/self-test/simulate-profit', status: 'SKIP', message: 'Admin role required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('POST /api/self-test/simulate-profit', () =>
        fetch(`${baseURL}/api/self-test/simulate-profit`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount: 10 })
        })
      );
      if (result.httpCode === 404) {
        return { ...result, status: 'SKIP', message: 'Self-test disabled in production' };
      }
      return result;
    }
  },
  {
    name: 'Allowance gating (402 ALLOWANCE_EXCEEDED)',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'Allowance gating (402 ALLOWANCE_EXCEEDED)', status: 'SKIP', message: 'Login required' };
      }
      if (user.role !== 'admin') {
        return { name: 'Allowance gating (402 ALLOWANCE_EXCEEDED)', status: 'SKIP', message: 'Admin role required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const testName = 'Allowance gating (402 ALLOWANCE_EXCEEDED)';

      const entRes = await fetch(`${baseURL}/api/entitlements/me`, { headers });
      if (!entRes.ok) {
        return { name: testName, status: 'FAIL', httpCode: entRes.status, message: 'Failed to load entitlement', details: { error: 'entitlements/me not ok' } };
      }
      const entData = await entRes.json();
      const status = (entData?.entitlement?.status as string) || 'none';
      if (status === 'none') {
        return { name: testName, status: 'SKIP', message: 'No active package to test allowance gating' };
      }

      const remaining = Number(entData?.entitlement?.remaining ?? 0);
      const simulateAmount = Math.max(10, remaining + 1);
      const simRes = await fetch(`${baseURL}/api/self-test/simulate-profit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: simulateAmount })
      });
      if (simRes.status === 404) {
        return { name: testName, status: 'SKIP', message: 'Self-test disabled in production' };
      }

      let traderId: string | null = null;
      const tradersRes = await fetch(`${baseURL}/api/traders?limit=1`, { headers });
      if (tradersRes.ok) {
        const tradersData = await tradersRes.json();
        const list = Array.isArray(tradersData?.traders) ? tradersData.traders : tradersData?.data || [];
        if (list.length > 0 && list[0]?.id) traderId = list[0].id;
      }
      if (!traderId) {
        return { name: testName, status: 'SKIP', message: 'No trader available to call gated copy-setups' };
      }

      const gatedRes = await fetch(`${baseURL}/api/copy-setups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ traderId })
      });
      const code = gatedRes.status;
      let gatedBody: Record<string, unknown> = {};
      try {
        gatedBody = (await gatedRes.json()) as Record<string, unknown>;
      } catch {
        gatedBody = {};
      }
      const errCode = gatedBody?.error as string;
      if (code === 402 && errCode === 'ALLOWANCE_EXCEEDED') {
        return {
          name: testName,
          status: 'PASS',
          httpCode: 402,
          message: 'Gating OK: 402 ALLOWANCE_EXCEEDED',
          details: { requestPath: '/api/copy-setups', response: sanitizeResponse(gatedBody) }
        };
      }
      return {
        name: testName,
        status: 'FAIL',
        httpCode: code,
        message: `Expected 402 ALLOWANCE_EXCEEDED, got ${code}${errCode ? ` (${errCode})` : ''}`,
        details: { requestPath: '/api/copy-setups', response: sanitizeResponse(gatedBody) }
      };
    }
  },
  {
    name: 'GET /api/self-test/mlm-summary',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'GET /api/self-test/mlm-summary', status: 'SKIP', message: 'Login required' };
      }
      if (user.role !== 'admin') {
        return { name: 'GET /api/self-test/mlm-summary', status: 'SKIP', message: 'Admin role required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('GET /api/self-test/mlm-summary', () =>
        fetch(`${baseURL}/api/self-test/mlm-summary?limit=5`, { headers })
      );
      if (result.httpCode === 404) {
        return { ...result, status: 'SKIP', message: 'Self-test disabled in production' };
      }
      return result;
    }
  },

  // Exchange connections (authenticated; create/futures gated by VITE_ENABLE_EXCHANGE_SMOKE_TESTS)
  {
    name: 'GET /api/exchange-connections',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'GET /api/exchange-connections', status: 'SKIP', message: 'Login required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      return runTest('GET /api/exchange-connections', () =>
        fetch(`${baseURL}/api/exchange-connections`, { headers })
      );
    }
  },
  {
    name: 'POST /api/exchange-connections (validation)',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'POST /api/exchange-connections (validation)', status: 'SKIP', message: 'Login required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('POST /api/exchange-connections (validation)', () =>
        fetch(`${baseURL}/api/exchange-connections`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ exchange: 'binance', environment: 'testnet' })
        })
      );
      if (result.httpCode === 400 || result.httpCode === 422) {
        return { ...result, status: 'PASS', message: 'Validation OK (missing keys rejected)' };
      }
      return result;
    }
  },
  {
    name: 'POST /api/exchange-connections/:id/test',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'POST /api/exchange-connections/:id/test', status: 'SKIP', message: 'Login required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const listRes = await fetch(`${baseURL}/api/exchange-connections`, { headers });
      if (!listRes.ok) {
        return { name: 'POST /api/exchange-connections/:id/test', status: 'SKIP', message: 'Could not list connections' };
      }
      const listData = (await listRes.json()) as { connections?: { id: string }[] };
      const connections = Array.isArray(listData?.connections) ? listData.connections : [];
      const firstId = connections[0]?.id;
      if (!firstId) {
        return { name: 'POST /api/exchange-connections/:id/test', status: 'SKIP', message: 'No exchange connection to test' };
      }
      return runTest('POST /api/exchange-connections/:id/test', () =>
        fetch(`${baseURL}/api/exchange-connections/${firstId}/test`, { method: 'POST', headers })
      );
    }
  },
  {
    name: 'POST /api/exchange-connections/:id/futures/test',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'POST /api/exchange-connections/:id/futures/test', status: 'SKIP', message: 'Login required' };
      }
      if (!getSmokeExchangeTestsEnabled()) {
        return { name: 'POST /api/exchange-connections/:id/futures/test', status: 'SKIP', message: 'Exchange smoke tests disabled (toggle or VITE_ENABLE_EXCHANGE_SMOKE_TESTS)' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders(true);
      const listRes = await fetch(`${baseURL}/api/exchange-connections`, { headers });
      if (!listRes.ok) {
        return { name: 'POST /api/exchange-connections/:id/futures/test', status: 'SKIP', message: 'Could not list connections' };
      }
      const listData = (await listRes.json()) as { connections?: { id: string }[] };
      const connections = Array.isArray(listData?.connections) ? listData.connections : [];
      const firstId = connections[0]?.id;
      if (!firstId) {
        return { name: 'POST /api/exchange-connections/:id/futures/test', status: 'SKIP', message: 'No exchange connection' };
      }
      return runTest('POST /api/exchange-connections/:id/futures/test', () =>
        fetch(`${baseURL}/api/exchange-connections/${firstId}/futures/test`, { method: 'POST', headers })
      );
    }
  },
  {
    name: 'POST /api/exchange-connections/:id/futures/enable',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'POST /api/exchange-connections/:id/futures/enable', status: 'SKIP', message: 'Login required' };
      }
      if (!getSmokeExchangeTestsEnabled()) {
        return { name: 'POST /api/exchange-connections/:id/futures/enable', status: 'SKIP', message: 'Exchange smoke tests disabled (toggle or VITE_ENABLE_EXCHANGE_SMOKE_TESTS)' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders(true);
      const listRes = await fetch(`${baseURL}/api/exchange-connections`, { headers });
      if (!listRes.ok) {
        return { name: 'POST /api/exchange-connections/:id/futures/enable', status: 'SKIP', message: 'Could not list connections' };
      }
      const listData = (await listRes.json()) as { connections?: { id: string; environment?: string }[] };
      const connections = Array.isArray(listData?.connections) ? listData.connections : [];
      const testnetConn = connections.find((c: { environment?: string }) => c.environment === 'testnet');
      const conn = testnetConn ?? connections[0];
      const connId = conn?.id;
      if (!connId) {
        return { name: 'POST /api/exchange-connections/:id/futures/enable', status: 'SKIP', message: 'No connection (use testnet for this test)' };
      }
      const result = await runTest('POST /api/exchange-connections/:id/futures/enable', () =>
        fetch(`${baseURL}/api/exchange-connections/${connId}/futures/enable`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ default_leverage: 1, margin_mode: 'isolated', position_mode: 'one_way' })
        })
      );
      if (result.httpCode === 200) {
        return { ...result, status: 'PASS', message: 'Futures enable OK (testnet)' };
      }
      return result;
    }
  },
  {
    name: 'POST /api/futures/order',
    category: 'authenticated',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'POST /api/futures/order', status: 'SKIP', message: 'Login required' };
      }
      if (!getSmokeExchangeTestsEnabled()) {
        return { name: 'POST /api/futures/order', status: 'SKIP', message: 'Exchange smoke tests disabled (toggle or VITE_ENABLE_EXCHANGE_SMOKE_TESTS)' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders(true);
      const listRes = await fetch(`${baseURL}/api/exchange-connections`, { headers });
      if (!listRes.ok) {
        return { name: 'POST /api/futures/order', status: 'SKIP', message: 'Could not list connections' };
      }
      const listData = (await listRes.json()) as { connections?: { id: string; environment?: string; futures_enabled?: boolean }[] };
      const connections = Array.isArray(listData?.connections) ? listData.connections : [];
      const futuresTestnet = connections.find((c: { environment?: string; futures_enabled?: boolean }) => c.environment === 'testnet' && c.futures_enabled);
      const connId = futuresTestnet?.id ?? connections.find((c: { futures_enabled?: boolean }) => c.futures_enabled)?.id;
      if (!connId) {
        return { name: 'POST /api/futures/order', status: 'SKIP', message: 'No futures-enabled (testnet) connection' };
      }
      const result = await runTest('POST /api/futures/order', () =>
        fetch(`${baseURL}/api/futures/order`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            connectionId: connId,
            symbol: 'BTCUSDT',
            side: 'BUY',
            quoteSizeUsdt: 5,
            type: 'MARKET',
          }),
        })
      );
      if (result.httpCode === 200) {
        return { ...result, status: 'PASS', message: 'Futures order OK (quoteSizeUsdt)' };
      }
      if (result.httpCode === 409) {
        return { ...result, status: 'FAIL', message: 'Futures OFF (409)' };
      }
      if (result.httpCode === 423) {
        return { ...result, status: 'FAIL', message: 'Kill switch enabled (423)' };
      }
      return result;
    }
  },

  // Strategy runner (admin: 200, non-admin: 403)
  {
    name: 'POST /api/runner/cron',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'POST /api/runner/cron', status: 'SKIP', message: 'Login required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('POST /api/runner/cron', () =>
        fetch(`${baseURL}/api/runner/cron`, { method: 'POST', headers })
      );
      if (result.httpCode === 401) return { ...result, status: 'FAIL', message: 'Unauthorized' };
      if (user.role === 'admin') {
        if (result.httpCode === 200 || result.httpCode === 503) return { ...result, status: 'PASS', message: result.httpCode === 503 ? 'Runner disabled (503)' : 'Success (admin)' };
        if (result.httpCode === 403) return { ...result, status: 'FAIL', message: 'Expected 200/503 for admin, got 403' };
      } else {
        if (result.httpCode === 403) return { ...result, status: 'PASS', message: 'Correctly blocked (non-admin)' };
        if (result.httpCode === 200) return { ...result, status: 'FAIL', message: 'Unexpected access (non-admin got 200)' };
      }
      return result;
    }
  },
  // Runner cron (admin proxy) — when toggle on, call admin endpoint so frontend never sees RUNNER_CRON_SECRET
  {
    name: 'Runner cron (admin proxy)',
    category: 'admin',
    run: async () => {
      if (!getSmokeRunnerCronTestEnabled()) {
        return { name: 'Runner cron (admin proxy)', status: 'SKIP', message: 'Runner cron (admin proxy) test disabled (toggle or env)' };
      }
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'Runner cron (admin proxy)', status: 'SKIP', message: 'Login required' };
      }
      if (user.role !== 'admin') {
        return { name: 'Runner cron (admin proxy)', status: 'SKIP', message: 'Admin required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders(true);
      const result = await runTest('Runner cron (admin proxy)', () =>
        fetch(`${baseURL}/api/admin/smoke/runner-cron-secret`, { method: 'POST', headers })
      );
      if (result.httpCode === 200 || result.httpCode === 503) {
        return { ...result, status: 'PASS', message: result.httpCode === 503 ? 'Runner disabled (503)' : 'Success (admin proxy)' };
      }
      if (result.httpCode === 403) return { ...result, status: 'FAIL', message: 'Smoke header required or admin required' };
      return result;
    }
  },
  {
    name: 'GET /api/runner/status',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'GET /api/runner/status', status: 'SKIP', message: 'Login required' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('GET /api/runner/status', () =>
        fetch(`${baseURL}/api/runner/status`, { headers })
      );
      if (result.httpCode === 401) return { ...result, status: 'FAIL', message: 'Unauthorized' };
      if (user.role === 'admin') {
        if (result.httpCode === 200) return { ...result, status: 'PASS', message: 'Success (admin)' };
        if (result.httpCode === 403) return { ...result, status: 'FAIL', message: 'Expected 200 for admin, got 403' };
      } else {
        if (result.httpCode === 403) return { ...result, status: 'PASS', message: 'Correctly blocked (non-admin)' };
        if (result.httpCode === 200) return { ...result, status: 'FAIL', message: 'Unexpected access (non-admin got 200)' };
      }
      return result;
    }
  },
  {
    name: 'POST /api/runner/simulate-trade-result',
    category: 'admin',
    run: async () => {
      const user = await getCurrentUser();
      if (!user) {
        return { name: 'POST /api/runner/simulate-trade-result', status: 'SKIP', message: 'Login required' };
      }
      if (user.role !== 'admin') {
        return { name: 'POST /api/runner/simulate-trade-result', status: 'SKIP', message: 'Admin role required' };
      }
      if (!import.meta.env.VITE_ENABLE_RUNNER_SIM_TESTS) {
        return { name: 'POST /api/runner/simulate-trade-result', status: 'SKIP', message: 'VITE_ENABLE_RUNNER_SIM_TESTS not set' };
      }
      const baseURL = getBaseURL();
      const headers = await getAuthHeaders();
      const result = await runTest('POST /api/runner/simulate-trade-result', () =>
        fetch(`${baseURL}/api/runner/simulate-trade-result`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, pnlDeltaUsdt: -25 })
        })
      );
      if (result.httpCode === 403 && (result.details?.response as any)?.code === 'ADMIN_SIMULATE_DISABLED') {
        return { ...result, status: 'SKIP', message: 'Simulate endpoint disabled (ENABLE_RUNNER_ADMIN_ENDPOINTS)' };
      }
      return result;
    }
  }
];

/**
 * Run all tests
 * Stops early on 401 and marks remaining authenticated/admin tests as SKIPPED
 */
export async function runAllTests(): Promise<SmokeTestResult[]> {
  const results: SmokeTestResult[] = [];
  let shouldStop = false;
  let stopReason = '';

  for (const test of smokeTests) {
    if (shouldStop) {
      // Only skip authenticated/admin tests after 401
      if (test.category === 'authenticated' || test.category === 'admin') {
        results.push({
          name: test.name,
          status: 'SKIP',
          message: stopReason || 'Stopped after 401'
        });
        continue;
      }
      // Public tests can still run
    }

    const result = await test.run();
    results.push(result);

    // Stop if we get a 401 (session expired) - always FAIL
    if (result.httpCode === 401) {
      shouldStop = true;
      stopReason = 'Stopped after 401';
    }
  }

  return results;
}

/**
 * Run a single test by name
 */
export async function runTestByName(name: string): Promise<SmokeTestResult | null> {
  const test = smokeTests.find(t => t.name === name);
  if (!test) return null;
  return test.run();
}

/** Launch preset test names: Public + Auth + Runner status; Futures and Runner cron SKIP unless env set. */
const LAUNCH_PRESET_NAMES = [
  'Routing validator',
  'Health Check',
  'GET /api/traders (Public)',
  'GET /api/auth/me',
  'GET /api/me/profile',
  'GET /api/exchange-connections',
  'Referral code real + self-referral blocked',
  'GET /api/portfolio/summary',
  'GET /api/positions',
  'GET /api/orders',
  'GET /api/trades',
  'GET /api/notifications',
  'GET /api/runner/status',
  'POST /api/runner/cron',
  'POST /api/exchange-connections/:id/futures/test',
  'POST /api/exchange-connections/:id/futures/enable',
  'POST /api/futures/order',
  'Runner cron (admin proxy)',
];

/**
 * Run Launch preset: Public + Auth + Runner status; Futures tests SKIP unless toggle or VITE_ENABLE_EXCHANGE_SMOKE_TESTS;
 * Runner cron (admin proxy) SKIP unless toggle or VITE_ENABLE_RUNNER_CRON_TEST.
 */
export async function runLaunchTests(): Promise<SmokeTestResult[]> {
  const results: SmokeTestResult[] = [];
  const exchangeSmokeEnabled = getSmokeExchangeTestsEnabled();
  const runnerCronTestEnabled = getSmokeRunnerCronTestEnabled();
  let stopAfter401 = false;

  for (const name of LAUNCH_PRESET_NAMES) {
    if (stopAfter401) {
      const t = smokeTests.find(x => x.name === name);
      if (t && (t.category === 'authenticated' || t.category === 'admin')) {
        results.push({ name, status: 'SKIP', message: 'Stopped after 401' });
      }
      continue;
    }
    if (name.startsWith('POST /api/exchange-connections/:id/futures') || name === 'POST /api/futures/order') {
      if (!exchangeSmokeEnabled) {
        results.push({ name, status: 'SKIP', message: 'Exchange smoke tests disabled (toggle or env)' });
        continue;
      }
    }
    if (name === 'Runner cron (admin proxy)') {
      if (!runnerCronTestEnabled) {
        results.push({ name, status: 'SKIP', message: 'Runner cron (admin proxy) disabled (toggle or env)' });
        continue;
      }
    }

    const test = smokeTests.find(t => t.name === name);
    if (!test) {
      results.push({ name, status: 'SKIP', message: 'Test not found' });
      continue;
    }
    const result = await test.run();
    results.push(result);
    if (result.httpCode === 401) stopAfter401 = true;
  }
  return results;
}
