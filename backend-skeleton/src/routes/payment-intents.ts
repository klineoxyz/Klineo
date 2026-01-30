/**
 * Manual USDT (BEP20) payments to Safe. Ticketing + admin approval.
 * Feature flag: ENABLE_MANUAL_PAYMENTS=true. If false, GET returns 200 + featureDisabled; POST/submit return 503.
 */
import { Router, Response } from 'express';
import { body, param } from 'express-validator';
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
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!manualPaymentsEnabled()) {
      return res.status(503).json({ error: 'Manual payments are disabled.', featureDisabled: true });
    }
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const userId = req.user!.id;
    const { kind, package_code } = req.body;

    let amountUsdt: number;
    if (kind === 'joining_fee') {
      amountUsdt = AMOUNTS.joining_fee ?? 100;
    } else {
      const code = (package_code as string) || 'ENTRY_100';
      amountUsdt = AMOUNTS[code] ?? AMOUNTS.ENTRY_100 ?? 100;
    }

    const { data: intent, error } = await client
      .from('payment_intents')
      .insert({
        user_id: userId,
        kind: kind as string,
        package_code: kind === 'package' ? (package_code || 'ENTRY_100') : null,
        amount_usdt: amountUsdt,
        chain: 'bsc',
        environment: 'production',
        treasury_address: TREASURY_SAFE_BSC,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .select('id, user_id, kind, package_code, amount_usdt, chain, treasury_address, status, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create intent' });
    }

    const instructions = `Send exactly ${amountUsdt} USDT (BEP20) to the Treasury Safe. Use BSC network. USDT contract: ${USDT_BSC}`;

    const { error: evErr } = await client.from('payment_events').insert({
      intent_id: intent.id,
      event_type: 'created',
      details: { kind: intent.kind, package_code: intent.package_code, amount_usdt: amountUsdt },
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
    });
  }
);

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
    body('tx_hash').trim().notEmpty().withMessage('tx_hash is required'),
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
    const { tx_hash, from_wallet } = req.body;

    const { data: intent, error: findErr } = await client
      .from('payment_intents')
      .select('id, user_id, status')
      .eq('id', intentId)
      .single();

    if (findErr || !intent || intent.user_id !== userId) {
      return res.status(404).json({ error: 'Intent not found' });
    }
    if (intent.status !== 'draft') {
      return res.status(400).json({ error: 'Intent already submitted' });
    }

    const { data: profile } = await client
      .from('user_profiles')
      .select('payment_wallet_bsc')
      .eq('id', userId)
      .single();

    const declaredFrom = (from_wallet as string)?.trim() || null;
    const savedWallet = (profile as { payment_wallet_bsc?: string } | null)?.payment_wallet_bsc?.trim().toLowerCase() || null;
    const declaredNorm = declaredFrom?.toLowerCase() || null;
    const mismatch = savedWallet && declaredNorm && savedWallet !== declaredNorm;
    const status = mismatch ? 'flagged' : 'pending_review';
    const mismatchReason = mismatch ? 'Declared from_wallet does not match saved payment_wallet_bsc' : null;

    const { error: updateErr } = await client
      .from('payment_intents')
      .update({
        tx_hash: (tx_hash as string).trim(),
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
      details: { tx_hash: (tx_hash as string).trim(), from_wallet: declaredFrom, status, mismatch_reason: mismatchReason },
    });
    if (evErr) {
      // non-fatal
    }

    return res.json({
      id: intentId,
      status,
      mismatch_reason: mismatchReason,
      message: mismatch ? 'Submitted but wallet mismatch; admin will review.' : 'Submitted for review.',
    });
  }
);
