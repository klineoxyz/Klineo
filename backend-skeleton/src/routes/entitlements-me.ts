/**
 * GET /api/entitlements/me — auth required, returns entitlement state (no PII).
 * Used by Smoke Test and UI to show allowance/used/remaining/status.
 */
import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

const PACKAGE_NAMES: Record<string, string> = {
  entry_100: 'Entry $100',
  pro_200: 'Level 2 $200',
  elite_500: 'Level 3 $500',
};

export const entitlementsMeRouter: Router = Router();
entitlementsMeRouter.use(verifySupabaseJWT);

entitlementsMeRouter.get('/me', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  const requestId = (req as any).requestId || 'unknown';

  if (!client) {
    return res.status(503).json({
      error: 'Database unavailable',
      request_id: requestId,
    });
  }

  try {
    const { data: ent, error } = await client
      .from('user_entitlements')
      .select('active_package_id, profit_allowance_usd, profit_used_usd, status')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (error) {
      console.error('Entitlements me fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch entitlement',
        request_id: requestId,
      });
    }

    const allowance = parseFloat(String(ent?.profit_allowance_usd ?? 0));
    const used = parseFloat(String(ent?.profit_used_usd ?? 0));
    const remaining = Math.max(0, allowance - used);
    const rawStatus = (ent?.status as string) || 'inactive';
    const status: 'active' | 'exhausted' | 'none' =
      rawStatus === 'active' ? 'active' : rawStatus === 'exhausted' ? 'exhausted' : 'none';
    const packageId = ent?.active_package_id ?? null;
    const packageName = packageId ? (PACKAGE_NAMES[packageId] ?? packageId) : null;

    res.json({
      user: { role: req.user!.role || 'user' },
      entitlement: {
        package_id: packageId,
        package_name: packageName,
        profit_allowance: allowance,
        profit_used: used,
        remaining,
        status,
      },
      request_id: requestId,
    });
  } catch (err) {
    console.error('Entitlements me error:', err);
    res.status(500).json({
      error: 'Internal server error',
      request_id: requestId,
    });
  }
});
