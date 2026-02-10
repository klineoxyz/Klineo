/**
 * Referrals API: purchase earnings explanation, payout summary, payout request.
 */
import { Router, Response } from 'express';
import { param, body } from 'express-validator';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, optionalString } from '../middleware/validation.js';
import { requireAdmin } from '../middleware/auth.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { explainPurchaseEarnings } from '../lib/explainPurchaseEarnings.js';

const MIN_PAYOUT_USD = 50;
const REFERRAL_CODE_PREFIX = 'KLINEO-';
const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude I,O,0,1 for clarity
const REFERRAL_CODE_LEN = 8;

/** Generate collision-resistant referral code: KLINEO-XXXXXXXX */
function generateReferralCode(): string {
  let s = '';
  for (let i = 0; i < REFERRAL_CODE_LEN; i++) {
    s += REFERRAL_CODE_CHARS.charAt(Math.floor(Math.random() * REFERRAL_CODE_CHARS.length));
  }
  return REFERRAL_CODE_PREFIX + s;
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
 * GET /api/referrals/me
 * Returns user's referral code, link, earnings summary, payout wallet, payout requests.
 * Referral code and link are only generated/returned when the user has entered a referrer
 * (referred_by_user_id set). Without a referrer, users can use the platform but cannot
 * participate in referral campaigns or get their own link/code until they enter one.
 */
referralsRouter.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const userId = req.user!.id;
  const baseUrl = (process.env.FRONTEND_URL || 'https://www.klineo.xyz').replace(/\/$/, '');

  try {
    const { data: profile, error: profErr } = await client
      .from('user_profiles')
      .select('referral_code, referred_by_user_id')
      .eq('id', userId)
      .single();

    if (profErr) return res.status(500).json({ error: 'Failed to load profile' });

    const hasReferrer = !!(profile as { referred_by_user_id?: string } | null)?.referred_by_user_id;
    let referralCode: string | null = (profile as { referral_code?: string } | null)?.referral_code?.trim() || null;

    if (hasReferrer && !referralCode) {
      for (let attempt = 0; attempt < 10; attempt++) {
        referralCode = generateReferralCode();
        const { error: upErr } = await client
          .from('user_profiles')
          .update({ referral_code: referralCode, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .is('referral_code', null);
        if (!upErr) break;
        if (attempt === 9) return res.status(500).json({ error: 'Failed to generate referral code' });
      }
    }
    if (!hasReferrer) referralCode = null;

    const referralLink = referralCode ? `${baseUrl}/ref/${encodeURIComponent(referralCode)}` : null;
    const available = await getAvailableRewardsUsd(client, userId);
    const pendingApproved = await getPendingApprovedTotal(client, userId);
    const requestable = Math.max(0, available - pendingApproved);

    const { data: prof } = await client
      .from('user_profiles')
      .select('payout_wallet_address, referral_wallet')
      .eq('id', userId)
      .single();
    const p = prof as { payout_wallet_address?: string; referral_wallet?: string } | null;
    const payoutWallet = (p?.payout_wallet_address?.trim() || p?.referral_wallet?.trim() || null) ?? null;

    const { data: requests } = await client
      .from('payout_requests')
      .select('id, amount, currency, status, created_at, paid_at, rejection_reason, payout_tx_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const payoutRequests = (requests || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      amount: parseFloat(String(r.amount ?? 0)),
      currency: r.currency ?? 'USDT',
      status: r.status,
      createdAt: r.created_at,
      paidAt: r.paid_at ?? null,
      rejectionReason: r.rejection_reason ?? null,
      payoutTxId: r.payout_tx_id ?? null,
    }));

    const { data: earnings } = await client.from('purchase_referral_earnings').select('amount').eq('user_id', userId);
    const totalEarned = (earnings || []).reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const { data: paidRows } = await client.from('payout_requests').select('amount').eq('user_id', userId).eq('status', 'PAID');
    const totalPaidOut = (paidRows || []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

    return res.json({
      referralCode: referralCode || null,
      referralLink: referralLink || null,
      earningsSummary: {
        totalEarnedUsd: Math.round(totalEarned * 100) / 100,
        paidUsd: Math.round(totalPaidOut * 100) / 100,
        pendingUsd: Math.round(Math.max(0, totalEarned - totalPaidOut) * 100) / 100,
        availableUsd: Math.round(available * 100) / 100,
        requestableUsd: Math.round(requestable * 100) / 100,
        minPayoutUsd: MIN_PAYOUT_USD,
      },
      payoutWallet,
      payoutRequests,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/referrals/claim
 * Body: { code }. Claims referral attribution. Idempotent: cannot overwrite existing referred_by.
 * Self-referral blocked. Creates referrals row (referrer_id, referred_id) for upline.
 */
referralsRouter.post(
  '/claim',
  validate([body('code').trim().notEmpty().withMessage('code is required')]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const userId = req.user!.id;
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Referral code is required' });

    try {
      const { data: referrerProfile } = await client
        .from('user_profiles')
        .select('id, referral_code')
        .eq('referral_code', code)
        .maybeSingle();

      if (!referrerProfile || (referrerProfile.referral_code || '').toUpperCase() !== code) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
      const referrerId = referrerProfile.id as string;
      if (referrerId === userId) {
        return res.status(400).json({ error: 'Cannot use your own referral code' });
      }

      const { data: myProfile } = await client
        .from('user_profiles')
        .select('referred_by_user_id')
        .eq('id', userId)
        .single();
      const existingRef = (myProfile as { referred_by_user_id?: string } | null)?.referred_by_user_id;
      if (existingRef) {
        return res.json({ claimed: true, message: 'Already referred' });
      }

      await client.from('user_profiles').update({
        referred_by_user_id: referrerId,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      const { error: insErr } = await client.from('referrals').insert(
        { referrer_id: referrerId, referred_id: userId, tier: 1 }
      );
      if (insErr) {
        await client.from('user_profiles').update({
          referred_by_user_id: null,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
        return res.status(500).json({ error: 'Failed to create referral' });
      }

      return res.json({ claimed: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({ error: msg });
    }
  }
);

/** Mask email for display: u***@***.com */
function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '—';
  const at = email.indexOf('@');
  if (at <= 0) return '***@***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const showLocal = local.length <= 2 ? local[0] + '***' : local[0] + '***' + (local[local.length - 1] || '');
  const showDomain = domain.length <= 2 ? '***' : (domain[0] || '') + '***.' + (domain.split('.').pop() || '');
  return showLocal + '@' + showDomain;
}

/** Mask username: first 2 chars + *** */
function maskUsername(username: string | null | undefined): string {
  if (!username || typeof username !== 'string') return '';
  if (username.length <= 2) return username + '***';
  return username.slice(0, 2) + '***';
}

type Timeframe = '7d' | '30d' | '90d' | 'all';

function parseTimeframe(q: unknown): { from: Date | null; to: Date; label: string } {
  const to = new Date();
  let from: Date | null = null;
  let label = 'All time';
  const s = String(q || 'all').toLowerCase();
  if (s === '7d') {
    from = new Date(to);
    from.setDate(from.getDate() - 7);
    label = 'Last 7 days';
  } else if (s === '30d') {
    from = new Date(to);
    from.setDate(from.getDate() - 30);
    label = 'Last 30 days';
  } else if (s === '90d') {
    from = new Date(to);
    from.setDate(from.getDate() - 90);
    label = 'Last 90 days';
  }
  return { from, to, label };
}

/**
 * GET /api/referrals/my-referrals?timeframe=7d|30d|90d|all
 * Returns list of users the current user referred, with spend and earnings per referred user (in timeframe).
 */
referralsRouter.get('/my-referrals', async (req: AuthenticatedRequest, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const userId = req.user!.id;
  const { from: fromDate, to: toDate, label: timeframeLabel } = parseTimeframe(req.query.timeframe);
  const fromIso = fromDate ? fromDate.toISOString() : null;
  const toIso = toDate.toISOString();

  try {
    // 1) All referrals where current user is referrer
    const { data: referralRows, error: refErr } = await client
      .from('referrals')
      .select('id, referred_id, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (refErr) {
      return res.status(500).json({ error: 'Failed to load referrals' });
    }

    const refs = referralRows || [];
    if (refs.length === 0) {
      return res.json({
        totalReferrals: 0,
        timeframe: timeframeLabel,
        fromDate: fromIso,
        toDate: toIso,
        referrals: [],
        summary: { totalVolumeUsd: 0, totalEarningsUsd: 0 },
      });
    }

    const referredIds = refs.map((r) => r.referred_id);

    // 2) Profiles for referred users (masked display)
    const { data: profiles } = await client
      .from('user_profiles')
      .select('id, email, full_name, username')
      .in('id', referredIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        {
          display: maskUsername((p as { username?: string }).username) || maskEmail((p as { email?: string }).email),
          email: (p as { email?: string }).email,
        },
      ])
    );

    // 3) Purchases by referred users (for spend + earnings link)
    let purchasesQuery = client
      .from('eligible_purchases')
      .select('id, user_id, amount, created_at')
      .eq('status', 'completed')
      .in('user_id', referredIds);

    if (fromIso) {
      purchasesQuery = purchasesQuery.gte('created_at', fromIso).lte('created_at', toIso);
    }

    const { data: purchases } = await purchasesQuery;

    const purchaseByUser = new Map<string, { id: string; amount: number; created_at: string }[]>();
    for (const p of purchases || []) {
      const uid = p.user_id as string;
      if (!purchaseByUser.has(uid)) purchaseByUser.set(uid, []);
      purchaseByUser.get(uid)!.push({
        id: p.id,
        amount: Number(p.amount ?? 0),
        created_at: (p as { created_at?: string }).created_at || '',
      });
    }

    // 4) Your earnings from each purchase (current user as earner)
    const purchaseIds = (purchases || []).map((p) => p.id);
    let earningsByPurchase = new Map<string, number>();
    if (purchaseIds.length > 0) {
      let earningsQuery = client
        .from('purchase_referral_earnings')
        .select('purchase_id, amount')
        .eq('user_id', userId)
        .in('purchase_id', purchaseIds);

      if (fromIso) {
        earningsQuery = earningsQuery.gte('created_at', fromIso).lte('created_at', toIso);
      }

      const { data: earnings } = await earningsQuery;
      for (const e of earnings || []) {
        const pid = e.purchase_id as string;
        const amt = Number(e.amount ?? 0);
        earningsByPurchase.set(pid, (earningsByPurchase.get(pid) || 0) + amt);
      }
    }

    // 5) Build per-referred stats
    const referrals: Array<{
      referredId: string;
      referredDisplay: string;
      joinedAt: string;
      totalSpendUsd: number;
      yourEarningsFromThemUsd: number;
    }> = [];

    let totalVolumeUsd = 0;
    let totalEarningsUsd = 0;

    for (const r of refs) {
      const referredId = r.referred_id as string;
      const joinedAt = (r as { created_at?: string }).created_at || '';
      const display = profileMap.get(referredId)?.display ?? referredId.slice(0, 8) + '***';

      const userPurchases = purchaseByUser.get(referredId) || [];
      const totalSpendUsd = userPurchases.reduce((s, p) => s + p.amount, 0);
      let yourEarningsFromThemUsd = 0;
      for (const p of userPurchases) {
        yourEarningsFromThemUsd += earningsByPurchase.get(p.id) || 0;
      }

      totalVolumeUsd += totalSpendUsd;
      totalEarningsUsd += yourEarningsFromThemUsd;

      referrals.push({
        referredId,
        referredDisplay: display,
        joinedAt,
        totalSpendUsd: Math.round(totalSpendUsd * 100) / 100,
        yourEarningsFromThemUsd: Math.round(yourEarningsFromThemUsd * 100) / 100,
      });
    }

    return res.json({
      totalReferrals: refs.length,
      timeframe: timeframeLabel,
      fromDate: fromIso,
      toDate: toIso,
      referrals,
      summary: {
        totalVolumeUsd: Math.round(totalVolumeUsd * 100) / 100,
        totalEarningsUsd: Math.round(totalEarningsUsd * 100) / 100,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
});

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
    .select('payout_wallet_address, referral_wallet')
    .eq('id', userId)
    .single();

  const p = profile as { payout_wallet_address?: string | null; referral_wallet?: string | null } | null;
  const payoutWalletAddress = (p?.payout_wallet_address?.trim() || p?.referral_wallet?.trim() || null) ?? null;

  return res.json({
    availableRewardsUsd: Math.round(available * 100) / 100,
    requestableUsd: Math.round(requestable * 100) / 100,
    minPayoutUsd: MIN_PAYOUT_USD,
    payoutWalletAddress,
  });
});

/**
 * GET /api/referrals/my-payout-requests
 * List current user's payout requests (for Payout History on Referrals page).
 */
referralsRouter.get('/my-payout-requests', async (req: AuthenticatedRequest, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const userId = req.user!.id;
  const { data: requests, error } = await client
    .from('payout_requests')
    .select('id, amount, currency, status, created_at, approved_at, paid_at, rejection_reason, payout_tx_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch payout history' });
  }

  const list = (requests || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    amount: parseFloat(String(r.amount ?? 0)),
    currency: r.currency ?? 'USDT',
    status: r.status,
    createdAt: r.created_at,
    approvedAt: r.approved_at ?? null,
    paidAt: r.paid_at ?? null,
    rejectionReason: r.rejection_reason ?? null,
    payoutTxId: r.payout_tx_id ?? null,
  }));

  res.json({ payoutRequests: list });
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
  validate([
    param('id').isUUID().withMessage('Payout request ID must be a valid UUID'),
    optionalString('payoutTxId', 200),
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const id = req.params.id;
    const raw = (req.body?.payoutTxId as string);
    const payoutTxId = typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 200) : null;
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
    try {
      await client.from('audit_logs').insert({
        admin_id: req.user!.id,
        action_type: 'payout_request_marked_paid',
        entity_type: 'payout_requests',
        entity_id: id,
        details: { payout_tx_id: payoutTxId ?? null },
      });
    } catch { /* non-fatal */ }
    return res.json(data);
  }
);
