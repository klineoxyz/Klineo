import { Router } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseService: SupabaseClient | null = null;
let supabaseAnon: SupabaseClient | null = null;

function getSupabaseService(): SupabaseClient | null {
  if (supabaseService) return supabaseService;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  supabaseService = createClient(url, key);
  return supabaseService;
}

function getSupabaseAnon(): SupabaseClient | null {
  if (supabaseAnon) return supabaseAnon;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  supabaseAnon = createClient(url, key);
  return supabaseAnon;
}

export const selfTestRouter: Router = Router();

// Production kill switch: return 404 in production unless explicitly enabled
selfTestRouter.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SELF_TEST_ENDPOINT !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// All self-test routes require authentication + admin role
selfTestRouter.use(verifySupabaseJWT);
selfTestRouter.use(requireAdmin);

/**
 * GET /api/self-test/rls
 * RLS and backend isolation self-test (admin-only)
 */
selfTestRouter.get('/rls', async (req: AuthenticatedRequest, res) => {
  const requestId = (req as any).requestId || 'unknown';
  const checks: Array<{
    name: string;
    pass: boolean;
    details: Record<string, unknown>;
  }> = [];

  try {
    // Check 1: Auth sanity
    if (!req.user?.id || !req.user?.email || !req.user?.role) {
      checks.push({
        name: 'auth_sanity',
        pass: false,
        details: { error: 'Missing user info in request' }
      });
      return res.status(500).json({
        status: 'fail',
        timestamp: new Date().toISOString(),
        request_id: requestId,
        checks
      });
    }

    checks.push({
      name: 'auth_sanity',
      pass: true,
      details: {
        // Never expose PII - only role and minimal metadata
        role: req.user.role,
        authenticated: true
      }
    });

    // Check 2: RLS enforced for anon client
    const anonClient = getSupabaseAnon();
    if (!anonClient) {
      checks.push({
        name: 'rls_user_profiles_self_row',
        pass: false,
        details: { error: 'Supabase anon client not configured' }
      });
      checks.push({
        name: 'rls_user_profiles_other_row_behavior',
        pass: false,
        details: { error: 'Supabase anon client not configured' }
      });
      return res.status(503).json({
        status: 'fail',
        timestamp: new Date().toISOString(),
        request_id: requestId,
        checks,
        error: 'Service unavailable - configuration missing'
      });
    } else {
      // Get Bearer token from request (never log it)
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace(/^Bearer\s+/i, '');
      if (!token) {
        checks.push({
          name: 'rls_user_profiles_self_row',
          pass: false,
          details: { error: 'No Bearer token in request' }
        });
      } else {
        // Create authenticated anon client with user's token
        const authenticatedAnonClient = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        );

        // Test 2a: Query own row (should return exactly 1)
        // Only select role, never expose id or email
        const { data: selfData, error: selfError, count: selfCount } = await authenticatedAnonClient
          .from('user_profiles')
          .select('role', { count: 'exact' })
          .eq('id', req.user.id)
          .limit(1);

        if (selfError || selfCount === 0) {
          checks.push({
            name: 'rls_user_profiles_self_row',
            pass: false,
            details: { error: selfError?.message || 'No data returned' }
          });
        } else {
          checks.push({
            name: 'rls_user_profiles_self_row',
            pass: true,
            details: {
              found: true,
              row_count: selfCount || 1
            }
          });
        }

        // Test 2b: Query other user's row (behavior depends on RLS policy)
        // Only count, never expose actual row data
        const { count: otherCount, error: otherError } = await authenticatedAnonClient
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .neq('id', req.user.id)
          .limit(1);

        const otherRowCount = otherCount || 0;
        const isAdmin = req.user.role === 'admin';

        if (otherError) {
          checks.push({
            name: 'rls_user_profiles_other_row_behavior',
            pass: false,
            details: { error: otherError.message }
          });
        } else if (otherRowCount === 0) {
          // RLS policy: users only read own
          checks.push({
            name: 'rls_user_profiles_other_row_behavior',
            pass: true,
            details: {
              mode: 'users_only',
              other_rows_found: 0,
              note: 'RLS correctly blocks access to other users'
            }
          });
        } else if (otherRowCount > 0 && isAdmin) {
          // RLS policy: admins can read all
          checks.push({
            name: 'rls_user_profiles_other_row_behavior',
            pass: true,
            details: {
              mode: 'admin_can_read_all',
              other_rows_found: otherRowCount,
              note: 'RLS allows admin to read all profiles (expected)'
            }
          });
        } else {
          // Unexpected: non-admin can read other rows
          checks.push({
            name: 'rls_user_profiles_other_row_behavior',
            pass: false,
            details: {
              mode: 'unexpected',
              other_rows_found: otherRowCount,
              error: 'Non-admin user can read other profiles (RLS policy issue)'
            }
          });
        }
      }
    }

    // Check 3: Service role visibility (backend isolation check)
    const serviceClient = getSupabaseService();
    if (!serviceClient) {
      checks.push({
        name: 'service_role_visibility_expected',
        pass: false,
        details: { error: 'Service role client not configured' }
      });
    } else {
      // Service role bypasses RLS, so it can see all rows
      // Only count, never expose actual row data
      const { count: serviceCount, error: serviceError } = await serviceClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .neq('id', req.user.id)
        .limit(1);

      if (serviceError) {
        checks.push({
          name: 'service_role_visibility_expected',
          pass: false,
          details: { error: serviceError.message }
        });
      } else {
        const serviceRowCount = serviceCount || 0;
        checks.push({
          name: 'service_role_visibility_expected',
          pass: true,
          details: {
            other_rows_visible: serviceRowCount > 0,
            other_rows_count: serviceRowCount,
            note: 'Service role can see other rows (expected). Endpoint is admin-only, so this capability is not exposed to non-admins.'
          }
        });
      }
    }

    // Check 4: Admin gate (requireAdmin middleware already enforced)
    checks.push({
      name: 'admin_gate',
      pass: true,
      details: {
        note: 'Endpoint reached (requireAdmin middleware passed)'
      }
    });

    // Determine overall status
    const allPass = checks.every(c => c.pass);
    const status = allPass ? 'ok' : 'fail';

    res.json({
      status,
      timestamp: new Date().toISOString(),
      request_id: requestId,
      checks
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    checks.push({
      name: 'unexpected_error',
      pass: false,
      details: {
        error: process.env.NODE_ENV === 'production' ? 'Internal error' : errorMessage
      }
    });

    res.status(500).json({
      status: 'fail',
      timestamp: new Date().toISOString(),
      request_id: requestId,
      checks
    });
  }
});
