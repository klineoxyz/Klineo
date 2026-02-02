/**
 * Manual USDT (BEP20) payments to Safe. Ticketing + admin approval.
 * Feature flag: ENABLE_MANUAL_PAYMENTS=true. If false, GET returns 200 + featureDisabled; POST/submit return 503.
 */
import { Router, Response, Request } from 'express';
import { body, param, query } from 'express-validator';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TREASURY_SAFE_BSC = '0x0E60e94252F58aBb56604A8260492d96cf879007';
const SAFE_LINK = 'https://app.safe.global/home?safe=bnb:0x0E60e94252F58aBb56604A8260492d96cf879007';
const USDT_BSC = '0x55d398326f99059ff775485246999027b3197955';

const AMOUNTS: Record<string, number> = {
  joining_fee: 100,
  ENTRY_100: 100,
  LEVEL_200: 200,
  LEVEL_500: 500,
};

/** Package code (payment_intents) -> package id (coupons.package_ids) */
const PACKAGE_CODE_TO_ID: Record<string, string> = {
  ENTRY_100: 'entry_100',
  LEVEL_200: 'pro_200',
  LEVEL_500: 'elite_500',
};

function manualPaymentsEnabled(): boolean {
  return process.env.ENABLE_MANUAL_PAYMENTS === 'true';
}

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export type ValidateCouponResult =
  | { valid: true; discountPercent: number; originalAmountUsdt: number; amountUsdt: number; description?: string }
  | { valid: false; error: string };

/**
 * Validate a coupon for the given kind/package and return discounted amount.
 * Used by GET /api/payments/validate-coupon and POST /api/payments/intents.
 */
export async function validateCoupon(
  client: SupabaseClient,
  code: string,
  kind: 'joining_fee' | 'package',
  packageCode: string | null
): Promise<ValidateCouponResult> {
  const raw = (code || '').trim().toUpperCase();
  if (!raw) return { valid: false, error: 'Coupon code is required' };

  const { data: coupon, error } = await client
    .from('coupons')
    .select('id, code, discount_percent, applies_to, package_ids, max_redemptions, current_redemptions, expires_at, status, description')
    .eq('code', raw)
    .single();

  if (error || !coupon) return { valid: false, error: 'Invalid or expired coupon' };

  const status = (coupon as { status?: string }).status;
  if (status !== 'active') return { valid: false, error: 'This coupon is no longer active' };

  const expiresAt = (coupon as { expires_at?: string }).expires_at;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return { valid: false, error: 'This coupon has expired' };
  }

  const appliesTo = (coupon as { applies_to?: string }).applies_to || 'both';
  if (kind === 'joining_fee' && appliesTo === 'trading_packages') {
    return { valid: false, error: 'This coupon does not apply to the joining fee' };
  }
  if (kind === 'package') {
    if (appliesTo === 'onboarding') return { valid: false, error: 'This coupon does not apply to packages' };
    const packageIds = (coupon as { package_ids?: string[] }).package_ids;
    if (Array.isArray(packageIds) && packageIds.length > 0 && packageCode) {
      const packageId = PACKAGE_CODE_TO_ID[packageCode] || packageCode.toLowerCase().replace(/_/g, '_');
      if (!packageIds.includes(packageId)) {
        return { valid: false, error: 'This coupon does not apply to the selected package' };
      }
    }
  }

  const maxRedemptions = (coupon as { max_redemptions?: number }).max_redemptions;
  const currentRedemptions = (coupon as { current_redemptions?: number }).current_redemptions ?? 0;
  if (maxRedemptions != null && currentRedemptions >= maxRedemptions) {
    return { valid: false, error: 'This coupon has reached its redemption limit' };
  }

  const discountPercent = parseFloat((coupon as { discount_percent?: number }).discount_percent?.toString() || '0');
  if (discountPercent <= 0 || discountPercent > 100) return { valid: false, error: 'Invalid discount' };

  let originalAmountUsdt: number;
  if (kind === 'joining_fee') {
    originalAmountUsdt = AMOUNTS.joining_fee ?? 100;
  } else {
    const pc = packageCode || 'ENTRY_100';
    originalAmountUsdt = AMOUNTS[pc] ?? AMOUNTS.ENTRY_100 ?? 100;
  }
  const amountUsdt = Math.max(0, Math.round((originalAmountUsdt * (1 - discountPercent / 100)) * 100) / 100);

  return {
    valid: true,
    discountPercent,
    originalAmountUsdt,
    amountUsdt,
    description: (coupon as { description?: string }).description || undefined,
  };
}

/**
 * Validate a user-specific discount by code (system-generated code from user_discounts).
 * Code must belong to the given user and apply to the requested kind/package.
 */
export async function validateUserDiscountByCode(
  client: SupabaseClient,
  code: string,
  userId: string,
  kind: 'joining_fee' | 'package',
  packageCode: string | null
): Promise<ValidateCouponResult> {
  const raw = (code || '').trim().toUpperCase();
  if (!raw) return { valid: false, error: 'Coupon code is required' };

  const { data: ud, error } = await client
    .from('user_discounts')
    .select('id, user_id, scope, onboarding_discount_percent, onboarding_discount_fixed_usd, trading_discount_percent, trading_package_ids, trading_max_packages, trading_used_count, status')
    .eq('code', raw)
    .eq('user_id', userId)
    .in('status', ['active', 'paused'])
    .single();

  if (error || !ud) return { valid: false, error: 'Invalid or expired code' };

  const scope = (ud as { scope?: string }).scope;
  if (kind === 'joining_fee') {
    if (scope !== 'onboarding') return { valid: false, error: 'This code does not apply to the joining fee' };
    const pct = (ud as { onboarding_discount_percent?: number }).onboarding_discount_percent != null
      ? parseFloat((ud as { onboarding_discount_percent?: number }).onboarding_discount_percent!.toString())
      : 0;
    const fixed = (ud as { onboarding_discount_fixed_usd?: number }).onboarding_discount_fixed_usd != null
      ? parseFloat((ud as { onboarding_discount_fixed_usd?: number }).onboarding_discount_fixed_usd!.toString())
      : 0;
    const originalAmountUsdt = AMOUNTS.joining_fee ?? 100;
    const afterPercent = pct > 0 ? originalAmountUsdt * (1 - pct / 100) : originalAmountUsdt;
    const amountUsdt = Math.max(0, Math.round((afterPercent - fixed) * 100) / 100);
    return {
      valid: true,
      discountPercent: pct,
      originalAmountUsdt,
      amountUsdt,
      description: `User discount: ${pct}% off${fixed > 0 ? ` + $${fixed} off` : ''}`,
    };
  }

  if (scope !== 'trading_packages') return { valid: false, error: 'This code does not apply to packages' };
  const pct = (ud as { trading_discount_percent?: number }).trading_discount_percent != null
    ? parseFloat((ud as { trading_discount_percent?: number }).trading_discount_percent!.toString())
    : 0;
  if (pct <= 0 || pct > 100) return { valid: false, error: 'Invalid discount' };
  const packageIds = (ud as { trading_package_ids?: string[] }).trading_package_ids;
  if (Array.isArray(packageIds) && packageIds.length > 0 && packageCode) {
    const pkgId = PACKAGE_CODE_TO_ID[packageCode] || packageCode.toLowerCase();
    if (!packageIds.includes(pkgId)) {
      return { valid: false, error: 'This code does not apply to the selected package' };
    }
  }
  const originalAmountUsdt = AMOUNTS[packageCode || 'ENTRY_100'] ?? AMOUNTS.ENTRY_100 ?? 100;
  const amountUsdt = Math.max(0, Math.round((originalAmountUsdt * (1 - pct / 100)) * 100) / 100);
  return {
    valid: true,
    discountPercent: pct,
    originalAmountUsdt,
    amountUsdt,
    description: `User discount: ${pct}% off`,
  };
}

export const paymentIntentsRouter: Router = Router();

paymentIntentsRouter.use(verifySupabaseJWT);

/**
 * POST /api/payments/intents
 * Create a payment intent. Body: { kind, package_code? }. Returns intent + treasury_address + amount_usdt + instructions.
 */
paymentIntentsRouter.post(
  '/',
  validate([
    body('kind').isIn(['joining_fee', 'package']).withMessage('kind must be joining_fee or package'),
    body('package_code').optional().isString().isLength({ max: 64 }),
    body('coupon_code').optional().trim().isString().isLength({ max: 32 }),
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!manualPaymentsEnabled()) {
      return res.status(503).json({ error: 'Manual payments are disabled.', featureDisabled: true });
    }
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const userId = req.user!.id;
    const { kind, package_code, coupon_code } = req.body;
    const pkgCode = kind === 'package' ? ((package_code as string) || 'ENTRY_100') : null;

    let amountUsdt: number;
    let couponApplied: { code: string; discountPercent: number } | null = null;

    if ((coupon_code as string)?.trim()) {
      const codeUpper = (coupon_code as string).trim().toUpperCase();
      let result = await validateCoupon(client, coupon_code as string, kind as 'joining_fee' | 'package', pkgCode);
      if (!result.valid) {
        result = await validateUserDiscountByCode(client, codeUpper, userId, kind as 'joining_fee' | 'package', pkgCode);
      }
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
      amountUsdt = result.amountUsdt;
      couponApplied = { code: codeUpper, discountPercent: result.discountPercent };
    } else {
      if (kind === 'joining_fee') {
        amountUsdt = AMOUNTS.joining_fee ?? 100;
      } else {
        const code = pkgCode || 'ENTRY_100';
        amountUsdt = AMOUNTS[code] ?? AMOUNTS.ENTRY_100 ?? 100;
      }
    }

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      kind: kind as string,
      package_code: pkgCode,
      amount_usdt: amountUsdt,
      chain: 'bsc',
      environment: 'production',
      treasury_address: TREASURY_SAFE_BSC,
      status: 'draft',
      updated_at: new Date().toISOString(),
    };
    if (couponApplied) {
      insertPayload.coupon_code = couponApplied.code;
      insertPayload.discount_percent = couponApplied.discountPercent;
    }
    const { data: intent, error } = await client
      .from('payment_intents')
      .insert(insertPayload)
      .select('id, user_id, kind, package_code, amount_usdt, chain, treasury_address, status, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create intent' });
    }

    const details: Record<string, unknown> = { kind: intent.kind, package_code: intent.package_code, amount_usdt: amountUsdt };
    if (couponApplied) {
      details.coupon_code = couponApplied.code;
      details.discount_percent = couponApplied.discountPercent;
      const { data: couponRow } = await client.from('coupons').select('id, current_redemptions').eq('code', couponApplied.code).single();
      if (couponRow) {
        const current = (couponRow as { current_redemptions?: number }).current_redemptions ?? 0;
        await client.from('coupons').update({ current_redemptions: current + 1, updated_at: new Date().toISOString() }).eq('id', (couponRow as { id: string }).id);
      }
    }

    const instructions = `Send exactly ${amountUsdt} USDT (BEP20) to the Treasury Safe. Use BSC network. USDT contract: ${USDT_BSC}`;

    const { error: evErr } = await client.from('payment_events').insert({
      intent_id: intent.id,
      event_type: 'created',
      details,
    });
    if (evErr) {
      // non-fatal
    }

    return res.status(201).json({
      intent: {
        id: intent.id,
        kind: intent.kind,
        package_code: intent.package_code,
        amount_usdt: Number(intent.amount_usdt),
        status: intent.status,
        created_at: intent.created_at,
      },
      treasury_address: TREASURY_SAFE_BSC,
      amount_usdt: amountUsdt,
      instructions,
      safe_link: SAFE_LINK,
      ...(couponApplied && { coupon_applied: { code: couponApplied.code, discount_percent: couponApplied.discountPercent } }),
    });
  }
);

/**
 * GET /api/payments/validate-coupon
 * Query: code, kind (joining_fee | package), package_code (required when kind=package).
 * Returns { valid, discountPercent?, originalAmountUsdt?, amountUsdt?, error? }.
 */
export const validateCouponHandler = [
  validate([
    query('code').trim().notEmpty().withMessage('code is required'),
    query('kind').isIn(['joining_fee', 'package']).withMessage('kind must be joining_fee or package'),
    query('package_code').optional().trim().isString(),
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!manualPaymentsEnabled()) {
      return res.status(200).json({ valid: false, error: 'Manual payments are disabled' });
    }
    const client = getSupabase();
    if (!client) return res.status(503).json({ valid: false, error: 'Database unavailable' });

    const code = (req.query.code as string)?.trim() || '';
    const kind = (req.query.kind as 'joining_fee' | 'package') || 'joining_fee';
    const packageCode = kind === 'package' ? ((req.query.package_code as string) || 'ENTRY_100') : null;

    let result = await validateCoupon(client, code, kind, packageCode);
    if (!result.valid && req.user?.id) {
      result = await validateUserDiscountByCode(client, code.toUpperCase(), req.user.id, kind, packageCode);
    }
    if (result.valid) {
      return res.json({
        valid: true,
        discountPercent: result.discountPercent,
        originalAmountUsdt: result.originalAmountUsdt,
        amountUsdt: result.amountUsdt,
        description: result.description,
      });
    }
    return res.status(200).json({ valid: false, error: result.error });
  },
];

/**
 * GET /api/payments/intents
 * List current user's intents. When ENABLE_MANUAL_PAYMENTS is false, returns 200 with intents: [] and featureDisabled: true.
 */
paymentIntentsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!manualPaymentsEnabled()) {
    return res.status(200).json({ intents: [], featureDisabled: true });
  }
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const userId = req.user!.id;
  const { data, error } = await client
    .from('payment_intents')
    .select('id, kind, package_code, amount_usdt, status, tx_hash, declared_from_wallet, mismatch_reason, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to list intents' });
  return res.json({ intents: data || [] });
});

/**
 * POST /api/payments/intents/:id/submit
 * Submit tx hash and optional from_wallet. Compares to user payment_wallet_bsc; sets status pending_review or flagged.
 */
paymentIntentsRouter.post(
  '/:id/submit',
  validate([
    param('id').isUUID().withMessage('Intent ID must be a valid UUID'),
    body('tx_hash').optional().trim().isString(),
    body('from_wallet').optional().trim().isString(),
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!manualPaymentsEnabled()) {
      return res.status(503).json({ error: 'Manual payments are disabled.', featureDisabled: true });
    }
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const userId = req.user!.id;
    const intentId = req.params.id;
    const txHashRaw = (req.body.tx_hash as string)?.trim() || '';
    const from_wallet = req.body.from_wallet;

    const { data: intent, error: findErr } = await client
      .from('payment_intents')
      .select('id, user_id, status, amount_usdt')
      .eq('id', intentId)
      .single();

    if (findErr || !intent || intent.user_id !== userId) {
      return res.status(404).json({ error: 'Intent not found' });
    }
    if (intent.status !== 'draft') {
      return res.status(400).json({ error: 'Intent already submitted' });
    }

    const amountUsdt = Number(intent.amount_usdt ?? 0);
    const isZeroAmount = amountUsdt <= 0;
    if (!isZeroAmount && !txHashRaw) {
      return res.status(400).json({ error: 'tx_hash is required when amount is greater than 0' });
    }

    const declaredFrom = (from_wallet as string)?.trim() || null;
    let status: string;
    let mismatchReason: string | null = null;

    if (isZeroAmount && !txHashRaw) {
      status = 'pending_review';
    } else {
      const { data: profile } = await client
        .from('user_profiles')
        .select('payment_wallet_bsc')
        .eq('id', userId)
        .single();
      const savedWallet = (profile as { payment_wallet_bsc?: string } | null)?.payment_wallet_bsc?.trim().toLowerCase() || null;
      const declaredNorm = declaredFrom?.toLowerCase() || null;
      const mismatch = savedWallet && declaredNorm && savedWallet !== declaredNorm;
      status = mismatch ? 'flagged' : 'pending_review';
      mismatchReason = mismatch ? 'Declared from_wallet does not match saved payment_wallet_bsc' : null;
    }

    const { error: updateErr } = await client
      .from('payment_intents')
      .update({
        tx_hash: txHashRaw || null,
        declared_from_wallet: declaredFrom,
        status,
        mismatch_reason: mismatchReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', intentId);

    if (updateErr) {
      return res.status(500).json({ error: 'Failed to submit intent' });
    }

    const { error: evErr } = await client.from('payment_events').insert({
      intent_id: intentId,
      event_type: 'submitted',
      details: { tx_hash: txHashRaw || null, from_wallet: declaredFrom, status, mismatch_reason: mismatchReason, zero_amount: isZeroAmount },
    });
    if (evErr) {
      // non-fatal
    }

    return res.json({
      id: intentId,
      status,
      mismatch_reason: mismatchReason,
      message: mismatchReason ? 'Submitted but wallet mismatch; admin will review.' : (isZeroAmount ? 'Request submitted for admin approval.' : 'Submitted for review.'),
    });
  }
);

/**
 * DELETE /api/payments/intents/:id
 * Cancel (delete) a draft intent. Only the owner can delete; only draft status allowed.
 */
paymentIntentsRouter.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Intent ID must be a valid UUID')]),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!manualPaymentsEnabled()) {
      return res.status(503).json({ error: 'Manual payments are disabled.', featureDisabled: true });
    }
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const userId = req.user!.id;
    const intentId = req.params.id;

    const { data: intent, error: findErr } = await client
      .from('payment_intents')
      .select('id, user_id, status')
      .eq('id', intentId)
      .single();

    if (findErr || !intent || intent.user_id !== userId) {
      return res.status(404).json({ error: 'Intent not found' });
    }
    if (intent.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft intents can be cancelled' });
    }

    const { error: deleteErr } = await client.from('payment_intents').delete().eq('id', intentId);

    if (deleteErr) {
      return res.status(500).json({ error: 'Failed to cancel intent' });
    }
    return res.status(200).json({ id: intentId, message: 'Intent cancelled' });
  }
);
