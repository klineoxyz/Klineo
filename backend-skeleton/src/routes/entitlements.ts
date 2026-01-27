import { Router } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { body } from 'express-validator';
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

const PACKAGES: Record<string, { priceUsd: number; multiplier: number; profitAllowanceUsd: number }> = {
  entry_100: { priceUsd: 100, multiplier: 3, profitAllowanceUsd: 300 },
  pro_200: { priceUsd: 200, multiplier: 5, profitAllowanceUsd: 1000 },
  elite_500: { priceUsd: 500, multiplier: 10, profitAllowanceUsd: 5000 },
};

export const entitlementsRouter: Router = Router();

// All entitlement admin routes require auth + admin
entitlementsRouter.use(verifySupabaseJWT);
entitlementsRouter.use(requireAdmin);

/**
 * POST /api/entitlement/joining-fee/mark-paid
 * Admin-only. Mark user's joining fee as paid. Creates user_entitlements row if missing.
 */
entitlementsRouter.post(
  '/joining-fee/mark-paid',
  validate([
    body('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('reason max 500 chars'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    const requestId = (req as any).requestId || 'unknown';
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable', requestId });
    }

    const { userId, reason } = req.body;
    const now = new Date().toISOString();

    try {
      const { error: upsertErr } = await client.from('user_entitlements').upsert(
        {
          user_id: userId,
          joining_fee_paid: true,
          joining_fee_paid_at: now,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );
      if (upsertErr) {
        console.error('Entitlement upsert error:', upsertErr);
        return res.status(500).json({ error: 'Failed to update entitlement', requestId });
      }

      await client.from('audit_logs').insert({
        admin_id: req.user!.id,
        action_type: 'entitlement_joining_fee_mark_paid',
        entity_type: 'user_entitlements',
        entity_id: userId,
        details: { reason: reason || null },
        reason: reason || null,
      });

      return res.status(200).json({ status: 'ok', message: 'Joining fee marked paid', requestId });
    } catch (err) {
      console.error('Joining fee mark-paid error:', err);
      return res.status(500).json({ error: 'Internal server error', requestId });
    }
  }
);

/**
 * POST /api/entitlement/package/activate
 * Admin-only for MVP. Activate a package for a user. Requires joining_fee_paid.
 */
entitlementsRouter.post(
  '/package/activate',
  validate([
    body('userId').optional().isUUID().withMessage('userId must be a valid UUID'),
    body('packageId').isIn(['entry_100', 'pro_200', 'elite_500']).withMessage('packageId must be entry_100, pro_200, or elite_500'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('reason max 500 chars'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    const requestId = (req as any).requestId || 'unknown';
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable', requestId });
    }

    const targetUserId = (req.body.userId as string) || req.user!.id;
    const { packageId, reason } = req.body;
    const pkg = PACKAGES[packageId];
    if (!pkg) {
      return res.status(400).json({ error: 'Invalid packageId', requestId });
    }

    try {
      const { data: existing, error: fetchErr } = await client
        .from('user_entitlements')
        .select('joining_fee_paid')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (fetchErr) {
        return res.status(500).json({ error: 'Failed to fetch entitlement', requestId });
      }
      if (!existing || !existing.joining_fee_paid) {
        return res.status(402).json({
          error: 'JOINING_FEE_REQUIRED',
          message: 'User must have joining fee paid before activating a package.',
          requestId,
        });
      }

      const now = new Date().toISOString();
      const { data: row, error: upsertErr } = await client
        .from('user_entitlements')
        .upsert(
          {
            user_id: targetUserId,
            active_package_id: packageId,
            package_price_usd: pkg.priceUsd,
            multiplier: pkg.multiplier,
            profit_allowance_usd: pkg.profitAllowanceUsd,
            profit_used_usd: 0,
            status: 'active',
            activated_at: now,
            exhausted_at: null,
            updated_at: now,
          },
          { onConflict: 'user_id' }
        )
        .select('profit_allowance_usd, profit_used_usd, status, active_package_id')
        .single();

      if (upsertErr) {
        console.error('Package activate upsert error:', upsertErr);
        return res.status(500).json({ error: 'Failed to activate package', requestId });
      }

      const allowance = parseFloat(String(row?.profit_allowance_usd ?? 0));
      const used = parseFloat(String(row?.profit_used_usd ?? 0));

      if (targetUserId !== req.user!.id) {
        await client.from('audit_logs').insert({
          admin_id: req.user!.id,
          action_type: 'entitlement_package_activate',
          entity_type: 'user_entitlements',
          entity_id: targetUserId,
          details: { packageId, reason: reason || null },
          reason: reason || null,
        });
      }

      return res.status(200).json({
        status: 'ok',
        entitlement: {
          activePackageId: row?.active_package_id ?? packageId,
          profitAllowanceUsd: allowance,
          profitUsedUsd: used,
          remainingUsd: Math.max(0, allowance - used),
          status: row?.status ?? 'active',
        },
        requestId,
      });
    } catch (err) {
      console.error('Package activate error:', err);
      return res.status(500).json({ error: 'Internal server error', requestId });
    }
  }
);

/**
 * POST /api/entitlement/profit-events
 * Admin-only for MVP. Record profit event and increment profit_used; set exhausted when >= allowance.
 */
entitlementsRouter.post(
  '/profit-events',
  validate([
    body('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('amountUsd').isFloat({ min: 0 }).withMessage('amountUsd must be >= 0'),
    body('source').isIn(['manual', 'copy', 'trading', 'admin_adjustment']).withMessage('source must be manual|copy|trading|admin_adjustment'),
    body('refType').optional().isString().isLength({ max: 64 }).withMessage('refType max 64 chars'),
    body('refId').optional().isUUID().withMessage('refId must be a valid UUID'),
    body('metadata').optional().isObject().withMessage('metadata must be an object'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    const requestId = (req as any).requestId || 'unknown';
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable', requestId });
    }

    const { userId, amountUsd, source, refType, refId, metadata } = req.body;
    const amount = parseFloat(String(amountUsd));
    if (amount <= 0) {
      return res.status(200).json({
        status: 'ok',
        entitlement: null,
        message: 'No change for zero amount',
        requestId,
      });
    }

    try {
      const { data: ent, error: fetchErr } = await client
        .from('user_entitlements')
        .select('id, profit_allowance_usd, profit_used_usd, status')
        .eq('user_id', userId)
        .single();

      if (fetchErr || !ent) {
        return res.status(404).json({ error: 'Entitlement not found for user', requestId });
      }

      await client.from('profit_events').insert({
        user_id: userId,
        source,
        amount_usd: amount,
        ref_type: refType || null,
        ref_id: refId || null,
        metadata: metadata || {},
      });

      const usedBefore = parseFloat(String(ent.profit_used_usd ?? 0));
      const allowance = parseFloat(String(ent.profit_allowance_usd ?? 0));
      const newUsed = usedBefore + amount;
      const isExhausted = ent.status === 'active' && newUsed >= allowance;
      const now = new Date().toISOString();

      const { data: updated, error: upErr } = await client
        .from('user_entitlements')
        .update({
          profit_used_usd: newUsed,
          status: isExhausted ? 'exhausted' : ent.status,
          exhausted_at: isExhausted ? now : null,
          updated_at: now,
        })
        .eq('user_id', userId)
        .select('profit_allowance_usd, profit_used_usd, status, active_package_id')
        .single();

      if (upErr) {
        console.error('Entitlement update error:', upErr);
        return res.status(500).json({ error: 'Failed to update entitlement', requestId });
      }

      const pu = parseFloat(String(updated?.profit_used_usd ?? 0));
      const pa = parseFloat(String(updated?.profit_allowance_usd ?? 0));

      return res.status(200).json({
        status: 'ok',
        entitlement: {
          activePackageId: updated?.active_package_id ?? null,
          profitAllowanceUsd: pa,
          profitUsedUsd: pu,
          remainingUsd: Math.max(0, pa - pu),
          status: updated?.status ?? 'active',
        },
        requestId,
      });
    } catch (err) {
      console.error('Profit events error:', err);
      return res.status(500).json({ error: 'Internal server error', requestId });
    }
  }
);
