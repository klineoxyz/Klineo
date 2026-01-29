/**
 * CoinPayments checkout + IPN webhook for KLINEO.
 * Create charge (auth), IPN handler (HMAC verified), mock-ipn (dev only).
 */

import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createCoinPaymentsCharge, verifyIpnHmac, getIpnHmacHeader, IPN_HMAC_HEADER } from '../lib/coinpayments.js';
import { allocatePurchaseRevenue } from '../lib/allocatePurchaseRevenue.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

const BASE_URL = process.env.BASE_URL || process.env.FRONTEND_URL || 'https://klineo.xyz';

export const coinpaymentsRouter: Router = Router();

/**
 * POST /api/payments/coinpayments/create
 * Create a CoinPayments transaction and eligible_purchase (PENDING).
 * Auth required. Body: purchaseType ('ONBOARDING'|'PACKAGE'), usdAmount.
 * Returns payment_url and coinpayments txn id.
 */
coinpaymentsRouter.post(
  '/create',
  verifySupabaseJWT,
  validate([
    body('purchaseType').isIn(['ONBOARDING', 'PACKAGE']).withMessage('purchaseType must be ONBOARDING or PACKAGE'),
    body('usdAmount').isFloat({ min: 0.01 }).withMessage('usdAmount must be a positive number'),
    body('packageId').optional().isString().isLength({ max: 64 }).withMessage('packageId optional string'),
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const requestId = (req as any).requestId as string | undefined;
    const userId = req.user!.id;
    const email = req.user!.email;

    try {
      const { purchaseType, usdAmount, packageId } = req.body;
      const amount = Number(usdAmount);
      const typeForDb = purchaseType === 'ONBOARDING' ? 'onboarding_fee' : 'package';

      const { data: purchase, error: insertErr } = await client
        .from('eligible_purchases')
        .insert({
          user_id: userId,
          purchase_type: typeForDb,
          amount,
          currency: 'USDT',
          status: 'pending',
          metadata: packageId ? { packageId } : {},
        })
        .select('id, status, created_at')
        .single();

      if (insertErr || !purchase) {
        console.error(`[${requestId ?? 'n/a'}] eligible_purchases insert failed:`, insertErr);
        return res.status(500).json({ error: 'Failed to create purchase record' });
      }

      const backendUrl = process.env.BACKEND_URL || BASE_URL;
      const ipnUrl = `${backendUrl.replace(/\/$/, '')}/api/payments/coinpayments/ipn`;
      const { paymentUrl, txnId } = await createCoinPaymentsCharge({
        amount,
        currency: 'USD',
        ipnUrl,
        orderId: purchase.id,
        buyerEmail: email || undefined,
      });

      const { error: updateErr } = await client
        .from('eligible_purchases')
        .update({ coinpayments_txn_id: txnId, updated_at: new Date().toISOString() })
        .eq('id', purchase.id);

      if (updateErr) {
        console.error(`[${requestId ?? 'n/a'}] eligible_purchases update txn_id failed:`, updateErr);
        return res.status(500).json({ error: 'Failed to link payment' });
      }

      res.status(201).json({
        purchaseId: purchase.id,
        coinpaymentsTxnId: txnId,
        checkout_url: paymentUrl,
        payment_url: paymentUrl,
      });
    } catch (err: any) {
      console.error(`[${requestId ?? 'n/a'}] CoinPayments create error:`, err?.message || err);
      res.status(500).json({ error: err?.message || 'Failed to create payment' });
    }
  }
);

/**
 * GET /api/payments/coinpayments/ipn
 * So the URL is reachable when opened in a browser; IPN expects POST.
 */
coinpaymentsRouter.get('/ipn', (_req: Request, res: Response) => {
  res.status(405).json({ error: 'Method Not Allowed', message: 'IPN endpoint; CoinPayments sends POST here.' });
});

/**
 * POST /api/payments/coinpayments/ipn
 * IPN webhook: verify HMAC, then update purchase status and run allocation on confirmed.
 * No auth; authenticity via COINPAYMENTS_IPN_SECRET HMAC.
 * Idempotent: duplicate IPNs for same txn do not double-allocate.
 */
coinpaymentsRouter.post('/ipn', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId as string | undefined;

  const rawBody = (req as any).rawBody as Buffer | string | undefined;
  if (!rawBody) {
    return res.status(400).json({ error: 'Missing body' });
  }
  const signature = getIpnHmacHeader(req);
  if (!verifyIpnHmac(rawBody, signature)) {
    console.warn(`[${requestId ?? 'n/a'}] CoinPayments IPN: invalid HMAC`);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload: Record<string, string>;
  try {
    if (typeof rawBody === 'string') {
      payload = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>;
    } else {
      payload = Object.fromEntries(new URLSearchParams(rawBody.toString('utf8'))) as Record<string, string>;
    }
  } catch {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const txnId = payload.txn_id || payload.id;
  const status = parseInt(payload.status ?? '', 10);
  const amount = parseFloat(payload.amount ?? '0');
  const currency = (payload.currency ?? '').toUpperCase();

  if (!txnId) {
    return res.status(400).json({ error: 'Missing txn_id' });
  }

  const merchantId = process.env.COINPAYMENTS_MERCHANT_ID;
  if (merchantId && payload.merchant !== undefined && String(payload.merchant).trim() !== merchantId.trim()) {
    console.warn(`[${requestId ?? 'n/a'}] CoinPayments IPN: merchant mismatch`);
    return res.status(401).json({ error: 'Invalid merchant' });
  }

  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const { data: purchase, error: findErr } = await client
    .from('eligible_purchases')
    .select('id, user_id, amount, currency, status')
    .eq('coinpayments_txn_id', txnId)
    .maybeSingle();

  if (findErr || !purchase) {
    console.warn(`[${requestId ?? 'n/a'}] CoinPayments IPN: purchase not found for txn_id=${txnId}`);
    res.status(200).json({ received: true });
    return;
  }

  if (purchase.status === 'completed') {
    res.status(200).json({ received: true, already_processed: true });
    return;
  }

  const purchaseStatus = purchase.status as string;
  if (purchaseStatus !== 'pending') {
    console.warn(`[${requestId ?? 'n/a'}] INVARIANT: IPN attempted status change from non-pending purchase_id=${purchase.id} current_status=${purchaseStatus} txn_id=${txnId}`);
    res.status(200).json({ received: true });
    return;
  }

  const purchaseAmount = Number(purchase.amount);
  const amountOk = Number.isFinite(purchaseAmount) && purchaseAmount > 0 && Math.abs(amount - purchaseAmount) < 0.01;
  const currencyOk = !currency || currency === 'USD' || currency === 'USDT';

  if (status >= 100 || status === 2) {
    if (!amountOk || !currencyOk) {
      console.warn(`[${requestId ?? 'n/a'}] CoinPayments IPN: amount/currency mismatch txn_id=${txnId} expected=${purchaseAmount} got=${amount} currency=${currency}`);
      res.status(200).json({ received: true });
      return;
    }
    const { error: updateErr } = await client
      .from('eligible_purchases')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', purchase.id)
      .eq('status', 'pending');

    if (updateErr) {
      console.error(`[${requestId ?? 'n/a'}] IPN update purchase failed:`, updateErr);
      return res.status(500).json({ error: 'Update failed' });
    }

    const result = await allocatePurchaseRevenue(client, purchase.id, { requestId });
    if (!result.ok) {
      console.error(`[${requestId ?? 'n/a'}] IPN allocation failed:`, result.error);
    }
  } else if (status < 0) {
    await client
      .from('eligible_purchases')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', purchase.id)
      .eq('status', 'pending');
  }

  res.status(200).json({ received: true });
});

/**
 * POST /api/payments/coinpayments/mock-ipn
 * Dev-only: simulate IPN payload for local testing. Guarded by NODE_ENV or secret.
 */
coinpaymentsRouter.post('/mock-ipn', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_IPN !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  const secret = process.env.COINPAYMENTS_IPN_SECRET;
  const auth = req.headers['x-mock-ipn-secret'] as string | undefined;
  if (process.env.NODE_ENV === 'production' && auth !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { txn_id, status } = req.body || {};
  if (!txn_id) {
    return res.status(400).json({ error: 'txn_id required' });
  }

  const formBody = new URLSearchParams({
    txn_id: String(txn_id),
    status: String(status ?? 100),
    amount: String(req.body?.amount ?? '100'),
    currency: req.body?.currency ?? 'USD',
  }).toString();

  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  fetch(`${baseUrl}/api/payments/coinpayments/ipn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(secret && {
        [IPN_HMAC_HEADER]: require('crypto').createHmac('sha256', secret).update(formBody).digest('hex'),
      }),
    },
    body: formBody,
  }).catch(() => {});

  res.status(200).json({ message: 'Mock IPN dispatched', txn_id });
});
