/**
 * KLINEO Smoke Test Definitions
 * Tests backend endpoints and returns structured results
 */

import { api } from './api';

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
  const sensitivePatterns = ['token', 'secret', 'password', 'authorization', 'apikey', 'key', 'bearer'];
  
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

/**
 * Get auth headers for fetch
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { supabase } = await import('./supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Test definitions
 */
export const smokeTests: SmokeTestDefinition[] = [
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
