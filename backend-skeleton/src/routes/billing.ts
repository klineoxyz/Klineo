import { Router } from 'express';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export const billingRouter: Router = Router();

/** Static plans response (credit-based model) */
const PLANS_RESPONSE = {
  joiningFee: { priceUsd: 100, currency: 'USD' },
  packages: [
    { id: 'entry_100', priceUsd: 100, multiplier: 3, profitAllowanceUsd: 300 },
    { id: 'pro_200', priceUsd: 200, multiplier: 5, profitAllowanceUsd: 1000 },
    { id: 'elite_500', priceUsd: 500, multiplier: 10, profitAllowanceUsd: 5000 },
  ],
  revenueSplit: { mlmPct: 50, platformPct: 20, marketingPct: 30 },
};

/**
 * GET /api/billing/plans
 * Returns joining fee, packages, and revenue split. Public (no auth required).
 */
billingRouter.get('/plans', (_req, res) => {
  res.json(PLANS_RESPONSE);
});

/**
 * POST /api/billing/joining-fee/checkout
 * Creates a checkout for the joining fee. MVP: stub that returns success.
 * Body: { method: "manual" | "crypto" | "stripe" }
 */
billingRouter.post(
  '/joining-fee/checkout',
  verifySupabaseJWT,
  validate([
    body('method')
      .optional()
      .isIn(['manual', 'crypto', 'stripe'])
      .withMessage('method must be manual, crypto, or stripe'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const method = (req.body?.method as string) || 'manual';
    res.status(200).json({
      status: 'ok',
      message: 'checkout_created',
      method,
    });
  }
);

/**
 * POST /api/billing/packages/checkout
 * Creates a checkout for a trading package. MVP: stub that returns success.
 * Body: { packageId: "entry_100"|"pro_200"|"elite_500", method?: "manual"|"crypto"|"stripe" }
 */
billingRouter.post(
  '/packages/checkout',
  verifySupabaseJWT,
  validate([
    body('packageId')
      .isIn(['entry_100', 'pro_200', 'elite_500'])
      .withMessage('packageId must be entry_100, pro_200, or elite_500'),
    body('method')
      .optional()
      .isIn(['manual', 'crypto', 'stripe'])
      .withMessage('method must be manual, crypto, or stripe'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const { packageId } = req.body;
    const method = (req.body?.method as string) || 'manual';
    res.status(200).json({
      status: 'ok',
      message: 'checkout_created',
      packageId,
      method,
    });
  }
);
