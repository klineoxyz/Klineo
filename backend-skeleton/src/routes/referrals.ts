/**
 * Referrals API: purchase earnings explanation, payout summary, payout request.
 */
import { Router, Response } from 'express';
import { param, body } from 'express-validator';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { requireAdmin } from '../middleware/auth.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { explainPurchaseEarnings } from '../lib/explainPurchaseEarnings.js';

const MIN_PAYOUT_USD = 50;

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

async function getAvailableRewardsUsd(client: SupabaseClient, userId: string): Promise<number> {
  const { data: earnings } = await client
    .from('purchase_referral_earnings')
    .select('amount')
    .eq('user_id', userId);
  const earned = (earnings || []).reduce((s, r) => s + Number(r.amount), 0);

  const { data: paid } = await client
    .from('payout_requests')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'PAID');
  const paidOut = (paid || []).reduce((s, r) => s + Number(r.amount), 0);

  return Math.max(0, earned - paidOut);
}

async function getPendingApprovedTotal(client: SupabaseClient, userId: string): Promise<number> {
  const { data } = await client
    .from('payout_requests')
    .select('amount')
    .eq('user_id', userId)
    .in('status', ['PENDING', 'APPROVED']);
  return (data || []).reduce((s, r) => s + Number(r.amount), 0);
}

export const referralsRouter: Router = Router();
referralsRouter.use(verifySupabaseJWT);

/**
 * GET /api/referrals/purchases/:id/explanation
 * Human-readable explanation of referral earnings for a purchase.
 * Read-only. Caller must own the purchase or be admin.
 */
referralsRouter.get(
  '/purchases/:id/explanation',
  validate([param('id').isUUID().withMessage('Purchase ID must be a valid UUID')]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const purchaseId = req.params.id;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    const { data: purchase, error: findErr } = await client
      .from('eligible_purchases')
      .select('id, user_id')
      .eq('id', purchaseId)
      .single();

    if (findErr || !purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    if (purchase.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view this purchase' });
    }

    const result = await explainPurchaseEarnings(client, purchaseId);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result.explanation);
  }
);

/**
 * GET /api/referrals/payout-summary
 * Returns available amount, min threshold, payout wallet. Auth required.
 */
referralsRouter.get('/payout-summary', async (req: AuthenticatedRequest, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const userId = req.user!.id;
  const available = await getAvailableRewardsUsd(client, userId);
  const pendingApproved = await getPendingApprovedTotal(client, userId);
  const requestable = Math.max(0, available - pendingApproved);

  const { data: profile } = await client
    .from('user_profiles')
    .select('payout_wallet_address')
    .eq('id', userId)
    .single();

  return res.json({
    availableRewardsUsd: Math.round(available * 100) / 100,
    requestableUsd: Math.round(requestable * 100) / 100,
    minPayoutUsd: MIN_PAYOUT_USD,
    payoutWalletAddress: (profile as { payout_wallet_address?: string } | null)?.payout_wallet_address ?? null,
  });
});

/**
 * POST /api/referrals/payout-request
 * Create a PENDING payout request. Amount >= $50, <= requestable. One PENDING per user.
 */
referralsRouter.post(
  '/payout-request',
  validate([
    body('amount').isFloat({ min: MIN_PAYOUT_USD }).withMessage(`amount must be at least ${MIN_PAYOUT_USD}`),
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const userId = req.user!.id;
    const amount = Number(req.body.amount);

    const available = await getAvailableRewardsUsd(client, userId);
    const pendingApproved = await getPendingApprovedTotal(client, userId);
    const requestable = Math.max(0, available - pendingApproved);

    if (amount > requestable) {
      return res.status(400).json({
        error: 'Amount exceeds requestable balance',
        requestableUsd: Math.round(requestable * 100) / 100,
      });
    }

    const { data: existing } = await client
      .from('payout_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'You already have a pending payout request' });
    }

    const { data: row, error } = await client
      .from('payout_requests')
      .insert({
        user_id: userId,
        amount,
        currency: 'USDT',
        status: 'PENDING',
        updated_at: new Date().toISOString(),
      })
      .select('id, user_id, amount, currency, status, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create payout request' });
    }

    return res.status(201).json(row);
  }
);

/**
 * PUT /api/referrals/payout-requests/:id/approve
 * Admin: set status to APPROVED.
 */
referralsRouter.put(
  '/payout-requests/:id/approve',
  requireAdmin,
  validate([param('id').isUUID().withMessage('Payout request ID must be a valid UUID')]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const id = req.params.id;
    const { data, error } = await client
      .from('payout_requests')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString(), approved_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['PENDING'])
      .select('id, user_id, amount, status, approved_at')
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'Payout request not found or not pending' });
    }
    return res.json(data);
  }
);

/**
 * PUT /api/referrals/payout-requests/:id/reject
 * Admin: set status to REJECTED. Body: { reason? }
 */
referralsRouter.put(
  '/payout-requests/:id/reject',
  requireAdmin,
  validate([param('id').isUUID().withMessage('Payout request ID must be a valid UUID')]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const id = req.params.id;
    const reason = (req.body?.reason as string) || null;
    const { data, error } = await client
      .from('payout_requests')
      .update({
        status: 'REJECTED',
        updated_at: new Date().toISOString(),
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', id)
      .in('status', ['PENDING', 'APPROVED'])
      .select('id, user_id, amount, status, rejected_at')
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'Payout request not found or not pending/approved' });
    }
    return res.json(data);
  }
);

/**
 * PUT /api/referrals/payout-requests/:id/mark-paid
 * Admin: set status to PAID. Body: { payoutTxId? }. Payout is ledgered as debit (reduces available balance).
 */
referralsRouter.put(
  '/payout-requests/:id/mark-paid',
  requireAdmin,
  validate([param('id').isUUID().withMessage('Payout request ID must be a valid UUID')]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const id = req.params.id;
    const payoutTxId = (req.body?.payoutTxId as string) || null;
    const { data, error } = await client
      .from('payout_requests')
      .update({
        status: 'PAID',
        updated_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        payout_tx_id: payoutTxId,
      })
      .eq('id', id)
      .in('status', ['APPROVED'])
      .select('id, user_id, amount, status, paid_at, payout_tx_id')
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'Payout request not found or not approved' });
    }
    return res.json(data);
  }
);
