import { Router } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam, statusBody, optionalString, pageQuery, limitQuery, searchQuery } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export const adminRouter: Router = Router();

// All admin routes require authentication + admin role
adminRouter.use(verifySupabaseJWT);
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Dashboard statistics
 */
adminRouter.get('/stats', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const [usersResult, tradersResult, subscriptionsResult, feesResult, referralEarningsResult] = await Promise.all([
      client.from('user_profiles').select('*', { count: 'exact', head: true }),
      client.from('traders').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      client.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      client.from('fee_ledger').select('amount'),
      client.from('purchase_referral_earnings').select('amount'),
    ]);

    const totalFees = feesResult.data?.reduce((sum, f) => sum + parseFloat(f.amount?.toString() || '0'), 0) || 0;
    const totalReferralPayouts = referralEarningsResult.data?.reduce((sum, r) => sum + parseFloat(r.amount?.toString() || '0'), 0) || 0;

    // Monthly revenue (last 30 days subscriptions)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentPayments } = await client
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', thirtyDaysAgo.toISOString());
    const monthlyRevenue = recentPayments?.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0) || 0;

    res.json({
      totalUsers: usersResult.count || 0,
      activeTraders: tradersResult.count || 0,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      platformFees: Math.round(totalFees * 100) / 100,
      referralPayouts: Math.round(totalReferralPayouts * 100) / 100,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/entitlements
 * List entitlements for debugging (limit, page)
 */
adminRouter.get('/entitlements',
  validate([pageQuery, limitQuery]),
  async (req, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;

      const { data: rows, error } = await client
        .from('user_entitlements')
        .select('user_id, joining_fee_paid, joining_fee_paid_at, active_package_id, profit_allowance_usd, profit_used_usd, status, activated_at, exhausted_at, updated_at')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching entitlements:', error);
        return res.status(500).json({ error: 'Failed to fetch entitlements' });
      }

      const list = (rows || []).map((e: any) => ({
        userId: e.user_id,
        joiningFeePaid: !!e.joining_fee_paid,
        joiningFeePaidAt: e.joining_fee_paid_at,
        activePackageId: e.active_package_id,
        profitAllowanceUsd: parseFloat(String(e.profit_allowance_usd ?? 0)),
        profitUsedUsd: parseFloat(String(e.profit_used_usd ?? 0)),
        remainingUsd: Math.max(0, parseFloat(String(e.profit_allowance_usd ?? 0)) - parseFloat(String(e.profit_used_usd ?? 0))),
        status: e.status,
        activatedAt: e.activated_at,
        exhaustedAt: e.exhausted_at,
        updatedAt: e.updated_at,
      }));

      const { count } = await client.from('user_entitlements').select('*', { count: 'exact', head: true });
      res.json({
        entitlements: list,
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      });
    } catch (err) {
      console.error('Admin entitlements error:', err);
      res.status(500).json({ error: 'Failed to fetch entitlements' });
    }
  }
);

/**
 * GET /api/admin/users
 * List all users with pagination
 */
adminRouter.get('/users', 
  validate([pageQuery, limitQuery, searchQuery]),
  async (req, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const search = (req.query.search as string) || '';
      
      // Sanitize search input
      const sanitized = search.replace(/[%_\\]/g, '').substring(0, 100);

    let query = client
      .from('user_profiles')
      .select('id, email, role, created_at, full_name, username, status')
      .order('created_at', { ascending: false });

    if (sanitized.length > 0) {
      query = query.or(`email.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`);
    }

    const { data: profiles, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Get subscription info for each user
    const userIds = profiles?.map((p) => p.id) || [];
    const { data: subscriptions } = await client
      .from('subscriptions')
      .select('user_id, status, subscription_plans(name)')
      .in('user_id', userIds);

    const users = profiles?.map((profile) => {
      const sub = subscriptions?.find((s) => s.user_id === profile.id);
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        username: profile.username,
        role: profile.role,
        plan: (sub?.subscription_plans as any)?.name || 'None',
        status: profile.status === 'suspended' || profile.status === 'banned' 
          ? 'Suspended' 
          : sub?.status === 'active' ? 'Active' : 'Inactive',
        userStatus: profile.status || 'active',
        joined: new Date(profile.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    });

    res.json({ 
      users: users || [], 
      page, 
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/traders
 * List all traders (approved/pending)
 */
adminRouter.get('/traders', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const status = req.query.status as string | undefined;
    let query = client
      .from('traders')
      .select('id, user_id, display_name, slug, status, created_at')
      .order('created_at', { ascending: false });

    // Get trades for win rate calculation (before filtering)
    const { data: allTrades } = await client
      .from('trades')
      .select('trader_id, pnl');

    if (status) {
      query = query.eq('status', status);
    }

    const { data: traders, error } = await query;

    if (error) {
      console.error('Error fetching traders:', error);
      return res.status(500).json({ error: 'Failed to fetch traders' });
    }

    // Get performance stats for each trader
    const traderIds = traders?.map((t) => t.id) || [];
    const { data: performance } = await client
      .from('trader_performance')
      .select('trader_id, pnl, pnl_pct, volume')
      .in('trader_id', traderIds)
      .order('period_start', { ascending: false });

    // Use trades we already fetched
    const trades = allTrades?.filter((t) => traderIds.includes(t.trader_id)) || [];

    // Get follower count (copy_setups referencing this trader)
    const { data: copySetups } = await client
      .from('copy_setups')
      .select('trader_id')
      .in('trader_id', traderIds)
      .eq('status', 'active');

    const result = traders?.map((trader) => {
      const perf = performance?.filter((p) => p.trader_id === trader.id) || [];
      const followers = copySetups?.filter((c) => c.trader_id === trader.id).length || 0;
      const totalPnl = perf.reduce((sum, p) => sum + parseFloat(p.pnl?.toString() || '0'), 0);
      const avgRoi = perf.length > 0
        ? perf.reduce((sum, p) => sum + parseFloat(p.pnl_pct?.toString() || '0'), 0) / perf.length
        : 0;

      // Calculate win rate from trades
      const traderTrades = trades?.filter((t) => t.trader_id === trader.id) || [];
      const winningTrades = traderTrades.filter((t) => parseFloat(t.pnl?.toString() || '0') > 0).length;
      const winRate = traderTrades.length > 0 
        ? Math.round((winningTrades / traderTrades.length) * 100 * 10) / 10 
        : 0;

      return {
        id: trader.id,
        name: trader.display_name,
        slug: trader.slug,
        status: trader.status,
        followers,
        roi: Math.round(avgRoi * 10) / 10,
        joined: new Date(trader.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        trades: traderTrades.length,
        winRate,
      };
    });

    res.json({ traders: result || [] });
  } catch (err) {
    console.error('Admin traders error:', err);
    res.status(500).json({ error: 'Failed to fetch traders' });
  }
});

/**
 * PUT /api/admin/traders/:id
 * Update trader status (approve/reject)
 */
adminRouter.put('/traders/:id', 
  validate([
    uuidParam('id'),
    statusBody('status', ['approved', 'rejected', 'pending'])
  ]),
  async (req, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

    const { data, error } = await client
      .from('traders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trader:', error);
      return res.status(500).json({ error: 'Failed to update trader' });
    }

    res.json({ trader: data });
  } catch (err) {
    console.error('Admin update trader error:', err);
    res.status(500).json({ error: 'Failed to update trader' });
  }
});

/**
 * GET /api/admin/subscriptions
 * List all subscriptions and payments
 */
adminRouter.get('/subscriptions', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: subscriptions, error: subError } = await client
      .from('subscriptions')
      .select('id, user_id, status, current_period_start, current_period_end, created_at, plan_id')
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    const { data: payments, error: payError } = await client
      .from('payments')
      .select('id, user_id, subscription_id, amount, currency, status, created_at, provider_payment_id')
      .order('created_at', { ascending: false });

    if (payError) {
      console.error('Error fetching payments:', payError);
    }

    // Get plan names
    const planIds = [...new Set(subscriptions?.map((s) => s.plan_id).filter(Boolean) || [])];
    const { data: plans } = await client
      .from('subscription_plans')
      .select('id, name')
      .in('id', planIds);
    const planMap = new Map(plans?.map((p) => [p.id, p.name]) || []);

    // Get user emails
    const userIds = [...new Set(subscriptions?.map((s) => s.user_id).filter(Boolean) || [])];
    const { data: userProfiles } = await client
      .from('user_profiles')
      .select('id, email')
      .in('id', userIds);
    const emailMap = new Map(userProfiles?.map((u) => [u.id, u.email]) || []);

    const subscriptionPayments = subscriptions?.map((sub) => {
      const payment = payments?.find((p) => p.subscription_id === sub.id);
      const planName = planMap.get(sub.plan_id) || 'Unknown';
      const email = emailMap.get(sub.user_id) || '';

      return {
        userId: sub.user_id,
        email,
        plan: planName,
        amount: payment ? parseFloat(payment.amount?.toString() || '0') : 0,
        status: payment?.status === 'succeeded' ? 'Paid' : payment?.status || 'Pending',
        date: payment
          ? new Date(payment.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : new Date(sub.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
        nextRenewal: sub.status === 'active'
          ? new Date(sub.current_period_end).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—',
        txHash: payment?.provider_payment_id || '—',
      };
    });

    // Count by plan
    const starterCount = subscriptions?.filter((s) => planMap.get(s.plan_id) === 'Starter' && s.status === 'active').length || 0;
    const proCount = subscriptions?.filter((s) => planMap.get(s.plan_id) === 'Pro' && s.status === 'active').length || 0;
    const unlimitedCount = subscriptions?.filter((s) => planMap.get(s.plan_id) === 'Premium' && s.status === 'active').length || 0;

    res.json({
      subscriptionPayments: subscriptionPayments || [],
      stats: {
        starter: starterCount,
        pro: proCount,
        unlimited: unlimitedCount,
      },
    });
  } catch (err) {
    console.error('Admin subscriptions error:', err);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * GET /api/admin/fees
 * Fee ledger summary and transactions
 */
adminRouter.get('/fees', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    // This month's fees
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: fees, error } = await client
      .from('fee_ledger')
      .select('id, user_id, amount, currency, fee_type, created_at, trade_id, trader_id')
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: false });

    // Get trades and traders for linking
    const tradeIds = [...new Set(fees?.map((f) => f.trade_id).filter(Boolean) || [])];
    const { data: feeTrades } = await client
      .from('trades')
      .select('id, symbol, pnl')
      .in('id', tradeIds);
    const tradeMap = new Map(feeTrades?.map((t) => [t.id, t]) || []);

    const traderIds = [...new Set(fees?.map((f) => f.trader_id).filter(Boolean) || [])];
    const { data: feeTraders } = await client
      .from('traders')
      .select('id, display_name')
      .in('id', traderIds);
    const traderMap = new Map(feeTraders?.map((t) => [t.id, t.display_name]) || []);

    if (error) {
      console.error('Error fetching fees:', error);
      return res.status(500).json({ error: 'Failed to fetch fees' });
    }

    const totalFees = fees?.reduce((sum, f) => sum + parseFloat(f.amount?.toString() || '0'), 0) || 0;

    // Community rewards (this month) — purchase-based referral system
    const { data: referralEarnings } = await client
      .from('purchase_referral_earnings')
      .select('amount')
      .gte('created_at', startOfMonth.toISOString());
    const referralPayouts = referralEarnings?.reduce((sum, r) => sum + parseFloat(r.amount?.toString() || '0'), 0) || 0;

    const feeTransactions = fees?.map((fee) => {
      const trade = fee.trade_id ? tradeMap.get(fee.trade_id) : null;
      const traderName = fee.trader_id ? traderMap.get(fee.trader_id) : null;
      const profit = trade ? parseFloat(trade.pnl?.toString() || '0') : 0;

      return {
        userId: fee.user_id,
        trade: trade?.symbol || 'N/A',
        profit,
        fee: parseFloat(fee.amount?.toString() || '0'),
        date: new Date(fee.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        trader: traderName || 'N/A',
      };
    });

    res.json({
      summary: {
        totalFees: Math.round(totalFees * 100) / 100,
        referralPayouts: Math.round(referralPayouts * 100) / 100,
        netRevenue: Math.round((totalFees - referralPayouts) * 100) / 100,
      },
      transactions: feeTransactions || [],
    });
  } catch (err) {
    console.error('Admin fees error:', err);
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
});

/**
 * GET /api/admin/referrals
 * Purchase-based referral system: community rewards from onboarding + package purchases (7-level upline).
 */
adminRouter.get('/referrals', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: earnings, error: earningsErr } = await client
      .from('purchase_referral_earnings')
      .select('id, purchase_id, level, user_id, amount, currency, rate_pct, created_at, payout_status, paid_at, transaction_id')
      .order('created_at', { ascending: false })
      .limit(500);

    if (earningsErr) {
      console.error('Error fetching purchase_referral_earnings:', earningsErr);
      return res.status(500).json({ error: 'Failed to fetch referral earnings' });
    }

    const purchaseIds = [...new Set(earnings?.map((e) => e.purchase_id).filter(Boolean) || [])];
    const referrerIds = [...new Set(earnings?.map((e) => e.user_id).filter(Boolean) || [])];

    const { data: purchases } = await client
      .from('eligible_purchases')
      .select('id, user_id, purchase_type, amount, created_at')
      .in('id', purchaseIds);
    const purchaseMap = new Map(purchases?.map((p) => [p.id, p]) || []);

    const allUserIds = [...new Set([...(purchases?.map((p) => p.user_id) || []), ...referrerIds])];
    const { data: profiles } = await client
      .from('user_profiles')
      .select('id, email')
      .in('id', allUserIds);
    const emailMap = new Map(profiles?.map((u) => [u.id, u.email]) || []);

    const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0) || 0;
    const activeReferrers = new Set(referrerIds).size;

    const payouts = (earnings || []).map((e) => {
      const purchase = purchaseMap.get(e.purchase_id);
      const referrerEmail = emailMap.get(e.user_id) || 'Unknown';
      const buyerEmail = purchase ? emailMap.get(purchase.user_id) || 'Unknown' : 'Unknown';
      const purchaseType = purchase?.purchase_type === 'onboarding_fee' ? 'Onboarding fee' : purchase?.purchase_type === 'package' ? 'Package' : purchase?.purchase_type || '—';

      return {
        id: e.id,
        referrer: referrerEmail,
        referrerId: e.user_id,
        level: e.level,
        purchaseType,
        buyerEmail,
        amount: parseFloat(e.amount?.toString() || '0'),
        ratePct: parseFloat(e.rate_pct?.toString() || '0'),
        date: new Date(e.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        payoutStatus: e.payout_status ?? 'pending',
        paidAt: e.paid_at ? new Date(e.paid_at).toISOString() : null,
        transactionId: e.transaction_id ?? null,
      };
    });

    res.json({
      summary: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        activeReferrers,
      },
      payouts,
    });
  } catch (err) {
    console.error('Admin referrals error:', err);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

/**
 * PATCH /api/admin/referrals/:id/mark-paid
 * Admin marks a referral payout as paid and records transaction (e.g. tx hash).
 */
adminRouter.patch('/referrals/:id/mark-paid', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { id } = req.params;
  const { transactionId } = req.body as { transactionId?: string };

  if (!id) {
    return res.status(400).json({ error: 'Missing payout id' });
  }

  try {
    const { data, error } = await client
      .from('purchase_referral_earnings')
      .update({
        payout_status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: typeof transactionId === 'string' && transactionId.trim() ? transactionId.trim() : null,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error('Admin mark-paid error:', error);
      return res.status(500).json({ error: 'Failed to update payout' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    res.json({ ok: true, id: data.id });
  } catch (err) {
    console.error('Admin mark-paid error:', err);
    res.status(500).json({ error: 'Failed to update payout' });
  }
});

/**
 * GET /api/admin/coupons
 * List all discount coupons
 */
adminRouter.get('/coupons', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: coupons, error } = await client
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      return res.status(500).json({ error: 'Failed to fetch coupons' });
    }

    const formatted = coupons?.map((c) => ({
      id: c.id,
      code: c.code,
      discount: parseFloat(c.discount_percent?.toString() || '0'),
      appliesTo: c.applies_to || 'both',
      packageIds: c.package_ids || [],
      maxRedemptions: c.max_redemptions,
      currentRedemptions: c.current_redemptions || 0,
      durationMonths: c.duration_months,
      expiresAt: c.expires_at 
        ? new Date(c.expires_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '—',
      expiresAtRaw: c.expires_at,
      status: c.status === 'expired' ? 'Expired' : c.status === 'disabled' ? 'Disabled' : 'Active',
      statusRaw: c.status,
      createdBy: c.created_by,
      createdAt: new Date(c.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      description: c.description || '',
    }));

    res.json({ coupons: formatted || [] });
  } catch (err) {
    console.error('Admin coupons error:', err);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

/**
 * POST /api/admin/coupons
 * Create a new discount coupon
 */
adminRouter.post('/coupons', 
  validate([
    body('code').isString().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9]+$/).withMessage('code must be 3-20 uppercase alphanumeric characters'),
    body('discount').isFloat({ min: 0, max: 100 }).withMessage('discount must be between 0 and 100'),
    body('appliesTo').optional().isIn(['onboarding', 'trading_packages', 'both']).withMessage('appliesTo must be onboarding, trading_packages, or both'),
    body('packageIds').optional().isArray().withMessage('packageIds must be an array'),
    body('packageIds.*').optional().isString().isIn(['entry_100', 'pro_200', 'elite_500']).withMessage('packageIds must be entry_100, pro_200, or elite_500'),
    body('maxRedemptions').optional().isInt({ min: 1 }).withMessage('maxRedemptions must be a positive integer'),
    body('durationMonths').isInt({ min: 1, max: 12 }).withMessage('durationMonths must be between 1 and 12'),
    body('expiresAt').optional().isISO8601().withMessage('expiresAt must be a valid ISO date'),
    optionalString('description', 500)
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { code, discount, appliesTo, packageIds, maxRedemptions, durationMonths, expiresAt, description } = req.body;

    const { data, error } = await client
      .from('coupons')
      .insert({
        code: code.toUpperCase(),
        discount_percent: parseFloat(discount),
        applies_to: appliesTo || 'both',
        package_ids: Array.isArray(packageIds) && packageIds.length > 0 ? packageIds : null,
        max_redemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        duration_months: parseInt(durationMonths),
        expires_at: expiresAt || null,
        description: description || null,
        created_by: req.user!.id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating coupon:', error);
      return res.status(500).json({ error: 'Failed to create coupon', details: error.message });
    }

    res.json({ coupon: data });
  } catch (err) {
    console.error('Admin create coupon error:', err);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

/**
 * PATCH /api/admin/coupons/:id
 * Update coupon status (active, disabled, or pause/re-enable)
 */
adminRouter.patch('/coupons/:id',
  validate([
    uuidParam('id'),
    body('status').isIn(['active', 'disabled']).withMessage('status must be active or disabled'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      const { data, error } = await client
        .from('coupons')
        .update({
          status: status === 'disabled' ? 'disabled' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating coupon:', error);
        return res.status(500).json({ error: 'Failed to update coupon' });
      }

      if (!data) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      res.json({ coupon: data });
    } catch (err) {
      console.error('Admin update coupon error:', err);
      res.status(500).json({ error: 'Failed to update coupon' });
    }
  }
);

/**
 * PUT /api/admin/users/:id
 * Update user (suspend/reactivate)
 */
adminRouter.put('/users/:id', 
  validate([
    uuidParam('id'),
    statusBody('status', ['active', 'suspended', 'banned']),
    optionalString('reason', 500)
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { id } = req.params;
      const { status, reason } = req.body;

    const { data, error } = await client
      .from('user_profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    // Log audit
    await client.from('audit_logs').insert({
      admin_id: req.user!.id,
      action_type: status === 'suspended' ? 'suspend_user' : status === 'banned' ? 'ban_user' : 'activate_user',
      entity_type: 'user',
      entity_id: id,
      reason: reason || null,
      details: { previous_status: data.status, new_status: status },
    });

    res.json({ user: data });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role (promote/demote admin)
 */
adminRouter.put('/users/:id/role',
  validate([
    uuidParam('id'),
    body('role').isIn(['user', 'admin']).withMessage('role must be user or admin'),
    optionalString('reason', 500)
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { id } = req.params;
      const { role, reason } = req.body;

      // Prevent self-demotion (safety check)
      if (id === req.user!.id && role === 'user') {
        return res.status(400).json({ error: 'Cannot demote yourself' });
      }

      // Get current role
      const { data: currentUser, error: fetchError } = await client
        .from('user_profiles')
        .select('role, email')
        .eq('id', id)
        .single();

      if (fetchError || !currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update role (service role bypasses RLS)
      const { data: updated, error } = await client
        .from('user_profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, email, role, created_at, updated_at')
        .single();

      if (error) {
        console.error('Error updating user role:', error);
        return res.status(500).json({ error: 'Failed to update user role' });
      }

      // Log audit
      await client.from('audit_logs').insert({
        admin_id: req.user!.id,
        action_type: role === 'admin' ? 'promote_admin' : 'demote_admin',
        entity_type: 'user',
        entity_id: id,
        reason: reason || null,
        details: { 
          previous_role: currentUser.role, 
          new_role: role,
          user_email: currentUser.email 
        },
      });

      res.json({ user: updated });
    } catch (err) {
      console.error('Admin update role error:', err);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
adminRouter.get('/audit-logs', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const { data: logs, error } = await client
      .from('audit_logs')
      .select('id, admin_id, action_type, entity_type, entity_id, details, reason, created_at, user_profiles!audit_logs_admin_id_fkey(email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    const formatted = logs?.map((log) => ({
      timestamp: new Date(log.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      admin: (log.user_profiles as any)?.email || 'Unknown',
      action: `${log.action_type.replace(/_/g, ' ')} ${log.entity_type} ${log.entity_id?.substring(0, 8) || ''}`.trim(),
      reason: log.reason || '—',
    }));

    res.json({ logs: formatted || [] });
  } catch (err) {
    console.error('Admin audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/admin/user-discounts
 * List all user-specific discounts (onboarding / trading packages)
 */
adminRouter.get('/user-discounts', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: discounts, error } = await client
      .from('user_discounts')
      .select('id, user_id, scope, onboarding_discount_percent, onboarding_discount_fixed_usd, trading_discount_percent, trading_package_ids, trading_max_packages, trading_used_count, status, created_by, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user discounts:', error);
      return res.status(500).json({ error: 'Failed to fetch user discounts' });
    }

    const userIds = [...new Set((discounts || []).map((d: any) => d.user_id).filter(Boolean))];
    const emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from('user_profiles')
        .select('id, email')
        .in('id', userIds);
      (profiles || []).forEach((p: any) => { emailMap[p.id] = p.email || '—'; });
    }

    const formatted = discounts?.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      userEmail: emailMap[d.user_id] || '—',
      scope: d.scope,
      onboardingDiscountPercent: d.onboarding_discount_percent != null ? parseFloat(d.onboarding_discount_percent) : null,
      onboardingDiscountFixedUsd: d.onboarding_discount_fixed_usd != null ? parseFloat(d.onboarding_discount_fixed_usd) : null,
      tradingDiscountPercent: d.trading_discount_percent != null ? parseFloat(d.trading_discount_percent) : null,
      tradingPackageIds: d.trading_package_ids || [],
      tradingMaxPackages: d.trading_max_packages,
      tradingUsedCount: d.trading_used_count || 0,
      status: d.status,
      createdAt: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: d.updated_at ? new Date(d.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    }));

    res.json({ userDiscounts: formatted || [] });
  } catch (err) {
    console.error('Admin user-discounts error:', err);
    res.status(500).json({ error: 'Failed to fetch user discounts' });
  }
});

/**
 * POST /api/admin/user-discounts
 * Create a user-specific discount (onboarding or trading packages)
 */
adminRouter.post('/user-discounts',
  validate([
    body('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('scope').isIn(['onboarding', 'trading_packages']).withMessage('scope must be onboarding or trading_packages'),
    body('onboardingDiscountPercent').optional().isFloat({ min: 0, max: 100 }),
    body('onboardingDiscountFixedUsd').optional().isFloat({ min: 0 }),
    body('tradingDiscountPercent').optional().isFloat({ min: 0, max: 100 }),
    body('tradingPackageIds').optional().isArray(),
    body('tradingPackageIds.*').optional().isString().isIn(['entry_100', 'pro_200', 'elite_500']),
    body('tradingMaxPackages').optional().isInt({ min: 1 }),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { userId, scope, onboardingDiscountPercent, onboardingDiscountFixedUsd, tradingDiscountPercent, tradingPackageIds, tradingMaxPackages } = req.body;

      const insert: Record<string, unknown> = {
        user_id: userId,
        scope,
        status: 'active',
        created_by: req.user!.id,
      };

      if (scope === 'onboarding') {
        if (onboardingDiscountPercent != null) insert.onboarding_discount_percent = parseFloat(onboardingDiscountPercent);
        if (onboardingDiscountFixedUsd != null) insert.onboarding_discount_fixed_usd = parseFloat(onboardingDiscountFixedUsd);
      } else {
        if (tradingDiscountPercent != null) insert.trading_discount_percent = parseFloat(tradingDiscountPercent);
        if (Array.isArray(tradingPackageIds) && tradingPackageIds.length > 0) insert.trading_package_ids = tradingPackageIds;
        if (tradingMaxPackages != null) insert.trading_max_packages = parseInt(tradingMaxPackages);
      }

      const { data, error } = await client
        .from('user_discounts')
        .insert(insert)
        .select()
        .single();

      if (error) {
        console.error('Error creating user discount:', error);
        return res.status(500).json({ error: 'Failed to create user discount', details: error.message });
      }

      res.json({ userDiscount: data });
    } catch (err) {
      console.error('Admin create user discount error:', err);
      res.status(500).json({ error: 'Failed to create user discount' });
    }
  }
);

/**
 * PATCH /api/admin/user-discounts/:id
 * Update user discount (status: active / paused / revoked, or change values)
 */
adminRouter.patch('/user-discounts/:id',
  validate([
    uuidParam('id'),
    body('status').optional().isIn(['active', 'paused', 'revoked']).withMessage('status must be active, paused, or revoked'),
    body('onboardingDiscountPercent').optional().isFloat({ min: 0, max: 100 }),
    body('onboardingDiscountFixedUsd').optional().isFloat({ min: 0 }),
    body('tradingDiscountPercent').optional().isFloat({ min: 0, max: 100 }),
    body('tradingPackageIds').optional().isArray(),
    body('tradingPackageIds.*').optional().isString().isIn(['entry_100', 'pro_200', 'elite_500']),
    body('tradingMaxPackages').optional().isInt({ min: 1 }),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { id } = req.params;
      const { status, onboardingDiscountPercent, onboardingDiscountFixedUsd, tradingDiscountPercent, tradingPackageIds, tradingMaxPackages } = req.body;

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (status != null) updates.status = status;
      if (onboardingDiscountPercent != null) updates.onboarding_discount_percent = parseFloat(onboardingDiscountPercent);
      if (onboardingDiscountFixedUsd != null) updates.onboarding_discount_fixed_usd = parseFloat(onboardingDiscountFixedUsd);
      if (tradingDiscountPercent != null) updates.trading_discount_percent = parseFloat(tradingDiscountPercent);
      if (Array.isArray(tradingPackageIds)) updates.trading_package_ids = tradingPackageIds.length > 0 ? tradingPackageIds : null;
      if (tradingMaxPackages != null) updates.trading_max_packages = parseInt(tradingMaxPackages);

      const { data, error } = await client
        .from('user_discounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user discount:', error);
        return res.status(500).json({ error: 'Failed to update user discount' });
      }

      if (!data) {
        return res.status(404).json({ error: 'User discount not found' });
      }

      res.json({ userDiscount: data });
    } catch (err) {
      console.error('Admin update user discount error:', err);
      res.status(500).json({ error: 'Failed to update user discount' });
    }
  }
);

/**
 * DELETE /api/admin/user-discounts/:id
 * Revoke a user-specific discount (soft: set status to revoked, or hard delete)
 */
adminRouter.delete('/user-discounts/:id',
  validate([uuidParam('id')]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { id } = req.params;

      const { data, error } = await client
        .from('user_discounts')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error revoking user discount:', error);
        return res.status(500).json({ error: 'Failed to revoke user discount' });
      }

      if (!data) {
        return res.status(404).json({ error: 'User discount not found' });
      }

      res.json({ userDiscount: data });
    } catch (err) {
      console.error('Admin revoke user discount error:', err);
      res.status(500).json({ error: 'Failed to revoke user discount' });
    }
  }
);
