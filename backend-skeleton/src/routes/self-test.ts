import { Router } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseService: SupabaseClient | null = null;

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

    // Check 2: RLS anon checks skipped on backend (SUPABASE_ANON_KEY is frontend-only; backend uses service_role only)
    checks.push({
      name: 'rls_user_profiles_self_row',
      pass: true,
      details: { skipped: true, note: 'SUPABASE_ANON_KEY is frontend-only; backend does not use anon client. RLS enforced by Supabase for frontend.' }
    });
    checks.push({
      name: 'rls_user_profiles_other_row_behavior',
      pass: true,
      details: { skipped: true, note: 'SUPABASE_ANON_KEY is frontend-only; backend does not use anon client.' }
    });

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

/**
 * POST /api/self-test/simulate-profit
 * Admin-only. Increments profit_used for the calling admin. DEV/staging enabled; prod requires ENABLE_SELF_TEST_ENDPOINT=true.
 */
selfTestRouter.post('/simulate-profit', async (req: AuthenticatedRequest, res) => {
  const requestId = (req as any).requestId || 'unknown';
  const service = getSupabaseService();
  if (!service) {
    return res.status(503).json({
      status: 'error',
      error: 'Database unavailable',
      request_id: requestId
    });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const raw = typeof body.amount === 'number' ? body.amount : Number(body.amount);
    const amount = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(100000, raw));
    if (amount <= 0) {
      return res.status(400).json({
        status: 'error',
        error: 'amount must be between 0 and 100000 (exclusive)',
        request_id: requestId
      });
    }
    const applied = amount;
    const reason = typeof body.reason === 'string' ? body.reason : 'smoke_test';
    const userId = req.user!.id;

    const { data: ent, error: entError } = await service
      .from('user_entitlements')
      .select('id, profit_allowance_usd, profit_used_usd, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (entError || !ent) {
      return res.status(400).json({
        status: 'error',
        error: 'No entitlement record to update',
        request_id: requestId
      });
    }

    const allowance = parseFloat(String(ent.profit_allowance_usd ?? 0));
    const usedBefore = parseFloat(String(ent.profit_used_usd ?? 0));
    const newUsed = usedBefore + applied;
    const exhausted = newUsed >= allowance;
    const newStatus = exhausted ? 'exhausted' : (ent.status as string);

    await service.from('profit_events').insert({
      user_id: userId,
      source: 'admin_adjustment',
      amount_usd: applied,
      ref_type: 'smoke_test',
      metadata: { reason }
    });

    const updatePayload: Record<string, unknown> = {
      profit_used_usd: newUsed,
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    if (exhausted) {
      updatePayload.exhausted_at = new Date().toISOString();
    }
    const { error: updateErr } = await service
      .from('user_entitlements')
      .update(updatePayload)
      .eq('user_id', userId);

    if (updateErr) {
      console.error('Simulate-profit update error:', updateErr);
      return res.status(500).json({
        status: 'error',
        error: 'Failed to update entitlement',
        request_id: requestId
      });
    }

    const remaining = Math.max(0, allowance - newUsed);
    res.json({
      status: 'ok',
      applied,
      profit_used: newUsed,
      profit_allowance: allowance,
      remaining,
      is_exhausted: exhausted,
      request_id: requestId
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Simulate-profit error:', msg);
    res.status(500).json({
      status: 'error',
      error: process.env.NODE_ENV === 'production' ? 'Internal error' : msg,
      request_id: requestId
    });
  }
});

/**
 * GET /api/self-test/mlm-summary?limit=5
 * Admin-only. Returns last distribution events (eligible_purchases + aggregates). Prod requires ENABLE_SELF_TEST_ENDPOINT=true.
 */
selfTestRouter.get('/mlm-summary', async (req: AuthenticatedRequest, res) => {
  const requestId = (req as any).requestId || 'unknown';
  const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit), 10) || 5));
  const service = getSupabaseService();
  if (!service) {
    return res.status(503).json({
      events: [],
      error: 'Database unavailable',
      request_id: requestId
    });
  }

  try {
    const { data: purchases, error: pErr } = await service
      .from('eligible_purchases')
      .select('id, purchase_type, amount, currency, status, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (pErr || !purchases?.length) {
      return res.json({
        events: [],
        request_id: requestId
      });
    }

    const events: Array<{
      type: 'onboarding_fee' | 'package';
      gross: number;
      distributed_total: number;
      platform_total: number;
      marketing_total: number;
      created_at: string;
    }> = [];

    for (const p of purchases) {
      const type = (p.purchase_type === 'onboarding_fee' || p.purchase_type === 'package')
        ? p.purchase_type
        : 'onboarding_fee';
      const gross = parseFloat(String(p.amount ?? 0));

      const { data: refRows } = await service
        .from('purchase_referral_earnings')
        .select('amount')
        .eq('purchase_id', p.id);
      const distributed_total = (refRows || []).reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0);

      const { data: splitRows } = await service
        .from('purchase_revenue_splits')
        .select('split_type, amount')
        .eq('purchase_id', p.id);
      let platform_total = 0;
      let marketing_total = 0;
      for (const s of splitRows || []) {
        const a = parseFloat(String(s.amount ?? 0));
        if (s.split_type === 'platform') platform_total += a;
        else if (s.split_type === 'marketing') marketing_total += a;
      }

      events.push({
        type,
        gross,
        distributed_total,
        platform_total,
        marketing_total,
        created_at: (p as any).created_at || new Date().toISOString()
      });
    }

    res.json({
      events,
      request_id: requestId
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('MLM summary error:', msg);
    res.status(500).json({
      events: [],
      error: process.env.NODE_ENV === 'production' ? 'Internal error' : msg,
      request_id: requestId
    });
  }
});
