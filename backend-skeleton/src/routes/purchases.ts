import { Router } from 'express';
import { body } from 'express-validator';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { allocatePurchaseRevenue } from '../lib/allocatePurchaseRevenue.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Supabase not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
}

export const purchasesRouter: Router = Router();

purchasesRouter.use(verifySupabaseJWT);

/**
 * POST /api/purchases
 * Record an eligible purchase (onboarding fee or package) and run revenue allocation.
 * Auth required. Body: type, amount, currency (default USDT), metadata?, idempotency_key?
 */
purchasesRouter.post(
  '/',
  validate([
    body('type')
      .isIn(['onboarding_fee', 'package'])
      .withMessage('type must be onboarding_fee or package'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('amount must be a positive number'),
    body('currency')
      .optional({ values: 'null' })
      .isString()
      .isLength({ max: 10 })
      .withMessage('currency must be a string, max 10 chars'),
    body('metadata')
      .optional({ values: 'null' })
      .isObject()
      .withMessage('metadata must be an object'),
    body('idempotency_key')
      .optional({ values: 'null' })
      .isString()
      .isLength({ max: 256 })
      .withMessage('idempotency_key must be a string, max 256 chars'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const requestId = (req as any).requestId as string | undefined;

    try {
      const { type, amount, currency = 'USDT', metadata = {}, idempotency_key } = req.body;

      const { data: row, error } = await client
        .from('eligible_purchases')
        .insert({
          user_id: req.user!.id,
          purchase_type: type,
          amount: Number(amount),
          currency: currency || 'USDT',
          status: 'completed',
          idempotency_key: idempotency_key || null,
          metadata: metadata || {},
        })
        .select('id, user_id, purchase_type, amount, currency, status, created_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            error: 'Duplicate purchase',
            message: 'A purchase with this idempotency_key already exists',
          });
        }
        console.error(`[${requestId ?? 'n/a'}] eligible_purchases insert failed:`, error);
        return res.status(500).json({ error: 'Failed to record purchase' });
      }

      const result = await allocatePurchaseRevenue(client, row.id, { requestId });

      if (!result.ok) {
        console.error(`[${requestId ?? 'n/a'}] allocatePurchaseRevenue failed:`, result.error);
        return res.status(500).json({
          error: 'Purchase recorded but allocation failed',
          purchase: {
            id: row.id,
            userId: row.user_id,
            purchaseType: row.purchase_type,
            amount: Number(row.amount),
            currency: row.currency,
            status: row.status,
            createdAt: row.created_at,
          },
          allocation: 'failed',
          allocationError: result.error,
        });
      }

      const allocation = result.allocated ? 'completed' : 'skipped';
      const allocationReason = !result.allocated && 'reason' in result ? result.reason : undefined;

      return res.status(201).json({
        purchase: {
          id: row.id,
          userId: row.user_id,
          purchaseType: row.purchase_type,
          amount: Number(row.amount),
          currency: row.currency,
          status: row.status,
          createdAt: row.created_at,
        },
        allocation: result.allocated ? 'completed' : 'skipped',
        ...(allocationReason && { allocationReason }),
      });
    } catch (err) {
      console.error(`[${requestId ?? 'n/a'}] POST /api/purchases error:`, err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
