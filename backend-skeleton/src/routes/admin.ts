import crypto from 'crypto';
import { Router } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam, statusBody, optionalString, pageQuery, limitQuery, searchQuery } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { financialRatiosRouter, getMarketingSpend, postMarketingSpend } from './admin-financial-ratios.js';
import { getPackageProfitAllowanceUsd } from './payment-intents.js';

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

/** Generate a cryptographically random coupon code (10 chars, A-Z0-9). Collision-resistant; never overwrites another user's assignment. */
function generateSystemCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(10);
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(bytes[i]! % chars.length);
  }
  return code;
}

/** Generate prefixed coupon: OB (onboarding), 100/200/500 (packages). One coupon = one scope. */
function generatePrefixedCouponCode(prefix: string): string {
  const suffix = generateSystemCouponCode().slice(0, 8);
  return prefix + suffix;
}

export const adminRouter: Router = Router();

// All admin routes require authentication + admin role
adminRouter.use(verifySupabaseJWT);
adminRouter.use(requireAdmin);

// Admin Financial Ratios (KPIs, timeseries, top payers, refunds/fails)
adminRouter.use('/financial-ratios', financialRatiosRouter);
adminRouter.get('/marketing-spend', getMarketingSpend);
adminRouter.post('/marketing-spend',
  validate([
    body('period_start').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('period_start must be YYYY-MM-DD'),
    body('period_end').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('period_end must be YYYY-MM-DD'),
    body('spend_usdt').isFloat({ min: 0 }).withMessage('spend_usdt must be >= 0'),
    body('notes').optional().isString(),
  ]),
  postMarketingSpend
);

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
 * GET /api/admin/settings
 * Platform settings (fee percentages etc.)
 */
adminRouter.get('/settings', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }
  try {
    const { data: rows, error } = await client
      .from('platform_settings')
      .select('key, value');
    if (error) {
      console.error('Admin settings get error:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
    const map = new Map((rows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    res.json({
      feeEntryPct: map.get('fee_entry_pct') ?? '20',
      feeProPct: map.get('fee_pro_pct') ?? '15',
      feeElitePct: map.get('fee_elite_pct') ?? '10',
      killSwitchGlobal: map.get('kill_switch_global') === 'true',
    });
  } catch (err) {
    console.error('Admin settings get error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/admin/settings
 * Update platform settings (fee percentages). Body: { feeEntryPct?, feeProPct?, feeElitePct? }
 */
adminRouter.put('/settings',
  validate([
    body('feeEntryPct').optional().isFloat({ min: 0, max: 100 }).withMessage('feeEntryPct must be 0-100'),
    body('feeProPct').optional().isFloat({ min: 0, max: 100 }).withMessage('feeProPct must be 0-100'),
    body('feeElitePct').optional().isFloat({ min: 0, max: 100 }).withMessage('feeElitePct must be 0-100'),
    body('killSwitchGlobal').optional().isBoolean().withMessage('killSwitchGlobal must be boolean'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    const { feeEntryPct, feeProPct, feeElitePct, killSwitchGlobal } = req.body as { feeEntryPct?: string | number; feeProPct?: string | number; feeElitePct?: string | number; killSwitchGlobal?: boolean };
    try {
      const updates: Array<{ key: string; value: string }> = [];
      if (feeEntryPct != null) updates.push({ key: 'fee_entry_pct', value: String(feeEntryPct) });
      if (feeProPct != null) updates.push({ key: 'fee_pro_pct', value: String(feeProPct) });
      if (feeElitePct != null) updates.push({ key: 'fee_elite_pct', value: String(feeElitePct) });
      if (killSwitchGlobal != null) updates.push({ key: 'kill_switch_global', value: killSwitchGlobal ? 'true' : 'false' });
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No settings to update' });
      }
      for (const { key, value } of updates) {
        const { error } = await client
          .from('platform_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) {
          console.error('Admin settings put error:', error);
          return res.status(500).json({ error: 'Failed to update settings' });
        }
      }
      const { data: rows } = await client.from('platform_settings').select('key, value');
      const map = new Map((rows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
      res.json({
        feeEntryPct: map.get('fee_entry_pct') ?? '20',
        feeProPct: map.get('fee_pro_pct') ?? '15',
        feeElitePct: map.get('fee_elite_pct') ?? '10',
        killSwitchGlobal: map.get('kill_switch_global') === 'true',
      });
    } catch (err) {
      console.error('Admin settings put error:', err);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

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
      .select('id, email, role, created_at, full_name, username, status, active_package_code')
      .order('created_at', { ascending: false });

    if (sanitized.length > 0) {
      query = query.or(`email.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`);
    }

    const { data: profiles, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Build profile list - need to re-fetch with active_package_code if not in range query
    const profileData = profiles || [];
    const userIds = profileData.map((p: any) => p.id);
    const { data: subscriptions } = await client
      .from('subscriptions')
      .select('user_id, status, subscription_plans(name)')
      .in('user_id', userIds);

    const users = profileData.map((profile: any) => {
      const sub = subscriptions?.find((s: any) => s.user_id === profile.id);
      const pkgCode = profile.active_package_code;
      const planFromPkg = pkgCode ? (PACKAGE_CODE_TO_PLAN[(pkgCode || '').trim()] || (pkgCode as string)) : null;
      const plan = planFromPkg || (sub?.subscription_plans as any)?.name || 'None';
      const hasActivePackage = !!pkgCode;
      const isSuspended = profile.status === 'suspended' || profile.status === 'banned';
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        username: profile.username,
        role: profile.role,
        plan,
        status: isSuspended ? 'Suspended' : hasActivePackage || sub?.status === 'active' ? 'Active' : 'Inactive',
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

/** Package code → plan label for Admin Subscriptions (Starter/Pro/Unlimited) */
const PACKAGE_CODE_TO_PLAN: Record<string, string> = {
  ENTRY_100: 'Starter',
  entry_100: 'Starter',
  LEVEL_200: 'Pro',
  pro_200: 'Pro',
  LEVEL_500: 'Unlimited',
  elite_500: 'Unlimited',
};

/**
 * GET /api/admin/subscriptions
 * List active package holders and payment history.
 * Uses user_profiles.active_package_code and payment_intents (approved packages), not the legacy subscriptions table.
 */
adminRouter.get('/subscriptions', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    // 1) Stats: count users with active_package_code by plan (Starter/Pro/Unlimited)
    const { data: profilesWithPackage, error: profilesError } = await client
      .from('user_profiles')
      .select('id, email, active_package_code, package_started_at')
      .not('active_package_code', 'is', null);

    if (profilesError) {
      console.error('Error fetching user_profiles for subscriptions:', profilesError);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    const packageCounts = { starter: 0, pro: 0, unlimited: 0 };
    for (const p of profilesWithPackage || []) {
      const code = (p.active_package_code || '').trim();
      const plan = PACKAGE_CODE_TO_PLAN[code] || null;
      if (plan === 'Starter') packageCounts.starter++;
      else if (plan === 'Pro') packageCounts.pro++;
      else if (plan === 'Unlimited') packageCounts.unlimited++;
    }

    // 2) Payment history: approved payment_intents with kind=package
    const { data: intents, error: intentsError } = await client
      .from('payment_intents')
      .select('id, user_id, package_code, amount_usdt, status, tx_hash, reviewed_at, created_at')
      .eq('kind', 'package')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (intentsError) {
      console.error('Error fetching payment_intents for subscriptions:', intentsError);
    }

    const userIds = [...new Set((intents || []).map((i) => i.user_id).filter(Boolean))];
    const { data: userProfiles } = await client
      .from('user_profiles')
      .select('id, email')
      .in('id', userIds);
    const emailMap = new Map(userProfiles?.map((u) => [u.id, u.email]) || []);

    const subscriptionPayments = (intents || []).map((intent) => {
      const code = (intent.package_code || '').trim();
      const planName = PACKAGE_CODE_TO_PLAN[code] || code || 'Package';
      const email = emailMap.get(intent.user_id as string) || '';

      return {
        userId: intent.user_id,
        email,
        plan: planName,
        amount: parseFloat(String(intent.amount_usdt ?? 0)),
        status: 'Paid',
        date: (intent.reviewed_at || intent.created_at)
          ? new Date((intent.reviewed_at || intent.created_at) as string).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—',
        nextRenewal: '—',
        txHash: (intent.tx_hash as string) || '—',
      };
    });

    res.json({
      subscriptionPayments,
      stats: {
        starter: packageCounts.starter,
        pro: packageCounts.pro,
        unlimited: packageCounts.unlimited,
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
 * GET /api/admin/payout-requests
 * List all user-requested referral payouts (PENDING → APPROVED → PAID or REJECTED). Admin processes here.
 */
adminRouter.get('/payout-requests', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: requests, error } = await client
      .from('payout_requests')
      .select('id, user_id, amount, currency, status, created_at, updated_at, approved_at, rejected_at, paid_at, rejection_reason, payout_tx_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payout_requests:', error);
      return res.status(500).json({ error: 'Failed to fetch payout requests' });
    }

    const userIds = [...new Set((requests || []).map((r: { user_id: string }) => r.user_id))];
    const { data: profiles } = await client
      .from('user_profiles')
      .select('id, email, payout_wallet_address')
      .in('id', userIds);
    const profileMap = new Map((profiles || []).map((p: { id: string; email?: string; payout_wallet_address?: string }) => [p.id, p]));

    const list = (requests || []).map((r: Record<string, unknown>) => {
      const profile = profileMap.get(r.user_id as string);
      return {
        id: r.id,
        userId: r.user_id,
        userEmail: (profile as { email?: string } | undefined)?.email ?? '—',
        payoutWalletAddress: (profile as { payout_wallet_address?: string } | undefined)?.payout_wallet_address ?? null,
        amount: parseFloat(String(r.amount ?? 0)),
        currency: r.currency ?? 'USDT',
        status: r.status,
        createdAt: r.created_at,
        approvedAt: r.approved_at ?? null,
        rejectedAt: r.rejected_at ?? null,
        paidAt: r.paid_at ?? null,
        rejectionReason: r.rejection_reason ?? null,
        payoutTxId: r.payout_tx_id ?? null,
      };
    });

    res.json({ payoutRequests: list });
  } catch (err) {
    console.error('Admin payout-requests error:', err);
    res.status(500).json({ error: 'Failed to fetch payout requests' });
  }
});

/**
 * PATCH /api/admin/referrals/:id/mark-paid
 * Admin marks a referral payout as paid and records transaction (e.g. tx hash).
 */
adminRouter.patch('/referrals/:id/mark-paid',
  validate([uuidParam('id'), optionalString('transactionId', 200)]),
  async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const { id } = req.params;
  const raw = (req.body as { transactionId?: string })?.transactionId;
  const transactionId = typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 200) : null;

  if (!id) {
    return res.status(400).json({ error: 'Missing payout id' });
  }

  try {
    const { data, error } = await client
      .from('purchase_referral_earnings')
      .update({
        payout_status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: transactionId,
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

    const adminId = (req as AuthenticatedRequest).user?.id;
    if (adminId) {
      try {
        await client.from('audit_logs').insert({
          admin_id: adminId,
          action_type: 'referral_payout_marked_paid',
          entity_type: 'purchase_referral_earnings',
          entity_id: id,
          details: { transaction_id: transactionId },
        });
      } catch { /* non-fatal */ }
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

    // Derive claim count from payment_intents (ground truth)
    const codeToIntentCount = new Map<string, number>();
    const codeToClaimedBy = new Map<string, string[]>();
    try {
      const codes = (coupons || []).map((c) => (c.code || '').toUpperCase()).filter(Boolean);
      if (codes.length > 0) {
        const { data: intents } = await client
          .from('payment_intents')
          .select('user_id, coupon_code')
          .not('coupon_code', 'is', null);
        const list = (intents || []) as { user_id?: string; coupon_code?: string }[];
        for (const i of list) {
          const raw = (i.coupon_code || '').toUpperCase().trim();
          if (!raw || !codes.includes(raw)) continue;
          const prev = codeToIntentCount.get(raw) || 0;
          codeToIntentCount.set(raw, prev + 1);
          const mask = i.user_id && i.user_id.length >= 8 ? 'user_****' + i.user_id.slice(-4) : 'user_****';
          const arr = codeToClaimedBy.get(raw) || [];
          if (!arr.includes(mask)) arr.push(mask);
          codeToClaimedBy.set(raw, arr);
        }
      }
    } catch {
      /* skip */
    }

    const formatted = coupons?.map((c) => {
      const codeUpper = (c.code || '').toUpperCase();
      const intentCount = codeToIntentCount.get(codeUpper) ?? 0;
      const dbCount = c.current_redemptions || 0;
      const effectiveCount = Math.max(dbCount, intentCount);
      const claimedBy = codeToClaimedBy.get(codeUpper) || [];
      return {
      id: c.id,
      code: c.code,
      discount: parseFloat(c.discount_percent?.toString() || '0'),
      appliesTo: c.applies_to || 'both',
      packageIds: c.package_ids || [],
      maxRedemptions: c.max_redemptions,
      currentRedemptions: effectiveCount,
      claimedBy,
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
    };
    });

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
    body('code').optional().trim().isString().isLength({ min: 0, max: 32 }).matches(/^[A-Z0-9]*$/).withMessage('code must be empty or uppercase alphanumeric'),
    body('discount').isFloat({ min: 0, max: 100 }).withMessage('discount must be between 0 and 100'),
    body('appliesTo').optional().isIn(['onboarding', 'trading_packages', 'both']).withMessage('appliesTo must be onboarding, trading_packages, or both'),
    body('packageIds').optional().isArray().withMessage('packageIds must be an array'),
    body('packageIds.*').optional().isString().isIn(['entry_100', 'pro_200', 'elite_500']).withMessage('packageIds must be entry_100, pro_200, or elite_500'),
    body('couponScope').optional().isIn(['OB', '100', '200', '500']).withMessage('couponScope for auto-generated code: OB=onboarding, 100/200/500=package'),
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
      let { code, discount, appliesTo, packageIds, maxRedemptions, durationMonths, expiresAt, description, couponScope } = req.body;
      if (!code || (code as string).trim() === '') {
        const prefix = couponScope && ['OB', '100', '200', '500'].includes(couponScope) ? couponScope : 'OB';
        for (let attempt = 0; attempt < 15; attempt++) {
          code = generatePrefixedCouponCode(prefix);
          const [{ data: existingCoupon }, { data: existingUd }] = await Promise.all([
            client.from('coupons').select('id').eq('code', code).maybeSingle(),
            client.from('user_discounts').select('id').eq('code', code).maybeSingle(),
          ]);
          if (!existingCoupon && !existingUd) break;
          if (attempt === 14) {
            return res.status(500).json({ error: 'Failed to generate unique coupon code. Please try again.' });
          }
        }
      } else {
        code = (code as string).trim().toUpperCase();
        if ((code as string).length < 3) {
          return res.status(400).json({ error: 'code must be at least 3 characters when provided' });
        }
      }

    const finalAppliesTo = appliesTo || (couponScope === 'OB' ? 'onboarding' : 'trading_packages');
    const finalPackageIds = Array.isArray(packageIds) && packageIds.length > 0 ? packageIds
      : couponScope === '100' ? ['entry_100']
      : couponScope === '200' ? ['pro_200']
      : couponScope === '500' ? ['elite_500']
      : null;

    const { data, error } = await client
      .from('coupons')
      .insert({
        code: (code as string).toUpperCase(),
        discount_percent: parseFloat(discount),
        applies_to: finalAppliesTo,
        package_ids: finalPackageIds,
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

    try {
      await client.from('audit_logs').insert({
        admin_id: req.user!.id,
        action_type: status === 'suspended' ? 'suspend_user' : status === 'banned' ? 'ban_user' : 'activate_user',
        entity_type: 'user',
        entity_id: id,
        reason: reason || null,
        details: { previous_status: data.status, new_status: status },
      });
    } catch { /* non-fatal */ }

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

      try {
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
      } catch { /* non-fatal */ }

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
 * GET /api/admin/master-trader-applications
 * List Master Trader applications (for admin review)
 */
adminRouter.get('/master-trader-applications', async (req, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const status = (req.query.status as string) || undefined;
    let q = client
      .from('master_trader_applications')
      .select('id, user_id, status, message, form_data, proof_url, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      q = q.eq('status', status);
    }
    const { data: rows, error } = await q;
    if (error) {
      console.error('Master trader applications list error:', error);
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }
    const userIds = [...new Set((rows || []).map((r: any) => r.user_id).filter(Boolean))];
    const emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await client.from('user_profiles').select('id, email, full_name').in('id', userIds);
      (profiles || []).forEach((p: any) => { emailMap[p.id] = p.email || '—'; });
    }
    const list = (rows || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: emailMap[r.user_id] || '—',
      status: r.status,
      message: r.message || null,
      formData: r.form_data || {},
      proofUrl: r.proof_url || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json({ applications: list });
  } catch (err) {
    console.error('Master trader applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * PATCH /api/admin/master-trader-applications/:id
 * Approve or reject application. Body: { status: 'approved' | 'rejected', message?: string }
 */
adminRouter.patch('/master-trader-applications/:id',
  validate([
    uuidParam('id'),
    body('status').isIn(['approved', 'rejected']).withMessage('status must be approved or rejected'),
    body('message').optional().trim().isString().isLength({ max: 500 }),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    try {
      const { id } = req.params;
      const { status, message } = req.body;
      const { data: row, error: fetchErr } = await client
        .from('master_trader_applications')
        .select('id, user_id, status, form_data')
        .eq('id', id)
        .single();
      if (fetchErr || !row) return res.status(404).json({ error: 'Application not found' });
      if (row.status !== 'pending') {
        return res.status(400).json({ error: `Application is already ${row.status}` });
      }
      const { error: updateErr } = await client
        .from('master_trader_applications')
        .update({
          status,
          message: message || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (updateErr) {
        console.error('Master trader application update error:', updateErr);
        return res.status(500).json({ error: 'Failed to update application' });
      }
      if (status === 'approved') {
        const { data: existingTrader } = await client.from('traders').select('id').eq('user_id', row.user_id).maybeSingle();
        if (!existingTrader) {
          const formData = (row as any).form_data || {};
          const displayName = formData.fullName || 'New Trader';
          const slugBase = (displayName.replace(/\s+/g, '-').toLowerCase() || 'trader').slice(0, 20);
          const { error: traderErr } = await client.from('traders').insert({
            user_id: row.user_id,
            display_name: displayName,
            slug: `${slugBase}-${row.user_id?.slice(0, 8)}`,
            status: 'approved',
          }).select('id').single();
          if (traderErr) console.warn('Could not auto-create trader entry:', traderErr);
        }
      }
      try {
        await client.from('audit_logs').insert({
          admin_id: req.user!.id,
          action_type: 'master_trader_application_reviewed',
          entity_type: 'master_trader_application',
          entity_id: id,
          details: { status, userId: row.user_id },
        });
      } catch { /* non-fatal */ }
      res.json({ status, message: status === 'approved' ? 'Application approved' : 'Application rejected' });
    } catch (err) {
      console.error('Master trader application patch error:', err);
      res.status(500).json({ error: 'Failed to update application' });
    }
  }
);

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
      .select('id, user_id, code, scope, onboarding_discount_percent, onboarding_discount_fixed_usd, trading_discount_percent, trading_package_ids, trading_max_packages, trading_used_count, status, created_by, created_at, updated_at')
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
      code: d.code || null,
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

      // System-generated coupon code (unique across user_discounts AND coupons — never overwrites another user's assignment)
      let code = generateSystemCouponCode();
      for (let attempt = 0; attempt < 15; attempt++) {
        const [{ data: existingUd }, { data: existingCoupon }] = await Promise.all([
          client.from('user_discounts').select('id').eq('code', code).maybeSingle(),
          client.from('coupons').select('id').eq('code', code).maybeSingle(),
        ]);
        if (!existingUd && !existingCoupon) break;
        code = generateSystemCouponCode();
        if (attempt === 14) {
          return res.status(500).json({ error: 'Failed to generate unique coupon code. Please try again.' });
        }
      }

      const insert: Record<string, unknown> = {
        user_id: userId,
        scope,
        status: 'active',
        created_by: req.user!.id,
        code,
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

      const summary =
        scope === 'onboarding'
          ? [
              data.onboarding_discount_percent != null ? `${data.onboarding_discount_percent}% off` : null,
              data.onboarding_discount_fixed_usd != null ? `$${data.onboarding_discount_fixed_usd} off` : null,
            ]
              .filter(Boolean)
              .join(' + ') || 'Onboarding discount'
          : [
              data.trading_discount_percent != null ? `${data.trading_discount_percent}% off` : null,
              data.trading_max_packages != null ? `up to ${data.trading_max_packages} package(s)` : null,
            ]
              .filter(Boolean)
              .join(' ') || 'Trading package discount';

      const baseUrl = process.env.FRONTEND_URL || 'https://www.klineo.xyz';
      const claimUrl = data.scope === 'onboarding'
        ? `${baseUrl.replace(/\/$/, '')}/payments?coupon=${data.code}`
        : `${baseUrl.replace(/\/$/, '')}/packages?coupon=${data.code}`;

      const notifBody = JSON.stringify({
        scope: data.scope,
        summary,
        code: data.code,
        claimUrl,
      });
      try {
        await client.from('notifications').insert({
          user_id: data.user_id,
          type: 'discount_assigned',
          title: 'You have a new discount',
          body: notifBody,
        });
      } catch { /* non-fatal */ }

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

function manualPaymentsEnabled(): boolean {
  return process.env.ENABLE_MANUAL_PAYMENTS === 'true';
}

/**
 * GET /api/admin/payments/intents
 * List payment intents (manual Safe payments). Query: status=...
 * When feature is disabled (ENABLE_MANUAL_PAYMENTS not set), returns 200 with intents: [] and featureDisabled: true so Admin UI can show a message without 503.
 */
adminRouter.get('/payments/intents', async (req: AuthenticatedRequest, res) => {
  if (!manualPaymentsEnabled()) return res.status(200).json({ intents: [], featureDisabled: true });
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  try {
    const status = req.query.status as string | undefined;
    let q = client
      .from('payment_intents')
      .select('id, user_id, kind, package_code, amount_usdt, coupon_code, discount_percent, status, tx_hash, declared_from_wallet, mismatch_reason, reviewed_by, reviewed_at, review_note, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (status && status.trim()) {
      q = q.eq('status', status.trim());
    }
    const { data, error } = await q;
    if (error) {
      return res.status(500).json({ error: 'Failed to list payment intents' });
    }
    res.json({ intents: data || [] });
  } catch (err) {
    console.error('Admin payment intents list error:', err);
    res.status(500).json({ error: 'Failed to list payment intents' });
  }
});

/**
 * POST /api/admin/payments/intents/:id/approve
 * Approve a payment intent. Body: { note? }. Updates user_profiles (member_active / active_package_code, package_started_at). Logs payment_events + audit_logs.
 */
adminRouter.post('/payments/intents/:id/approve',
  validate([uuidParam('id'), body('note').optional().trim().isString()]),
  async (req: AuthenticatedRequest, res) => {
    if (!manualPaymentsEnabled()) return res.status(503).json({ error: 'Payment intents feature is disabled', code: 'ENABLE_MANUAL_PAYMENTS' });
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const intentId = req.params.id;
    const adminId = req.user!.id;
    const note = (req.body?.note as string)?.trim() || null;

    const { data: intent, error: findErr } = await client
      .from('payment_intents')
      .select('id, user_id, kind, package_code, coupon_code, status')
      .eq('id', intentId)
      .single();

    if (findErr || !intent) return res.status(404).json({ error: 'Intent not found' });
    if ((intent.status as string) !== 'pending_review' && (intent.status as string) !== 'flagged') {
      return res.status(400).json({ error: 'Intent not in pending_review or flagged' });
    }

    const { data: updatedRows, error: updateErr } = await client
      .from('payment_intents')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', intentId)
      .in('status', ['pending_review', 'flagged'])
      .select('id');

    if (updateErr) return res.status(500).json({ error: 'Failed to approve intent' });
    if (!updatedRows || updatedRows.length === 0) {
      return res.status(409).json({ error: 'Intent was already approved or status changed. Refresh and retry.' });
    }

    const userId = intent.user_id as string;
    const kind = intent.kind as string;
    const packageCode = intent.package_code as string | null;

    const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (kind === 'joining_fee') {
      profileUpdates.member_active = true;
      const now = new Date().toISOString();
      await client.from('user_entitlements').upsert(
        { user_id: userId, joining_fee_paid: true, joining_fee_paid_at: now, updated_at: now },
        { onConflict: 'user_id' }
      );
    } else if (kind === 'package' && packageCode) {
      profileUpdates.active_package_code = packageCode;
      profileUpdates.package_started_at = new Date().toISOString();

      const allowanceUsd = getPackageProfitAllowanceUsd(packageCode);
      const now = new Date().toISOString();
      const { data: existingEnt } = await client
        .from('user_entitlements')
        .select('joining_fee_paid, joining_fee_paid_at, profit_used_usd')
        .eq('user_id', userId)
        .maybeSingle();
      await client.from('user_entitlements').upsert(
        {
          user_id: userId,
          joining_fee_paid: (existingEnt as { joining_fee_paid?: boolean } | null)?.joining_fee_paid ?? false,
          joining_fee_paid_at: (existingEnt as { joining_fee_paid_at?: string | null } | null)?.joining_fee_paid_at ?? null,
          active_package_id: packageCode,
          profit_allowance_usd: allowanceUsd,
          profit_used_usd: (existingEnt as { profit_used_usd?: number } | null)?.profit_used_usd ?? 0,
          status: 'active',
          activated_at: now,
          exhausted_at: null,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );

      // Increment user_discounts.trading_used_count when package approved with user-specific discount
      const couponCodeRaw = (intent as { coupon_code?: string | null }).coupon_code;
      if (couponCodeRaw?.trim()) {
        const { data: ud } = await client
          .from('user_discounts')
          .select('id, trading_used_count')
          .eq('code', couponCodeRaw.trim().toUpperCase())
          .eq('user_id', userId)
          .eq('scope', 'trading_packages')
          .maybeSingle();
        if (ud) {
          const cur = (ud as { trading_used_count?: number }).trading_used_count ?? 0;
          await client.from('user_discounts').update({ trading_used_count: cur + 1, updated_at: new Date().toISOString() }).eq('id', (ud as { id: string }).id);
        }
      }
    }

    const { error: profileErr } = await client
      .from('user_profiles')
      .update(profileUpdates)
      .eq('id', userId);
    if (profileErr) {
      // log but don't fail the approve
    }

    try {
      await client.from('payment_events').insert({
        intent_id: intentId,
        event_type: 'approved',
        details: { reviewed_by: adminId, note },
      });
      await client.from('audit_logs').insert({
        admin_id: adminId,
        action_type: 'payment_intent_approved',
        entity_type: 'payment_intent',
        entity_id: intentId,
        details: { user_id: userId, kind, package_code: packageCode },
        reason: note,
      });
    } catch { /* non-fatal */ }

    const { data: updated } = await client.from('payment_intents').select('id, status, reviewed_at, review_note').eq('id', intentId).single();
    res.json(updated);
  }
);

/**
 * POST /api/admin/payments/intents/:id/reject
 * Reject a payment intent. Body: { note? }. Logs payment_events + audit_logs.
 */
adminRouter.post('/payments/intents/:id/reject',
  validate([uuidParam('id'), body('note').optional().trim().isString()]),
  async (req: AuthenticatedRequest, res) => {
    if (!manualPaymentsEnabled()) return res.status(503).json({ error: 'Payment intents feature is disabled', code: 'ENABLE_MANUAL_PAYMENTS' });
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    const intentId = req.params.id;
    const adminId = req.user!.id;
    const note = (req.body?.note as string)?.trim() || null;

    const { data: intent, error: findErr } = await client
      .from('payment_intents')
      .select('id, user_id, kind, package_code, status')
      .eq('id', intentId)
      .single();

    if (findErr || !intent) return res.status(404).json({ error: 'Intent not found' });
    const statusStr = intent.status as string;
    if (statusStr !== 'pending_review' && statusStr !== 'flagged' && statusStr !== 'draft') {
      return res.status(400).json({ error: 'Intent can only be rejected when draft, pending_review, or flagged' });
    }

    const { error: updateErr } = await client
      .from('payment_intents')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', intentId);

    if (updateErr) return res.status(500).json({ error: 'Failed to reject intent' });

    try {
      await client.from('payment_events').insert({
        intent_id: intentId,
        event_type: 'rejected',
        details: { reviewed_by: adminId, note },
      });
      await client.from('audit_logs').insert({
        admin_id: adminId,
        action_type: 'payment_intent_rejected',
        entity_type: 'payment_intent',
        entity_id: intentId,
        details: { user_id: intent.user_id, kind: intent.kind, package_code: intent.package_code },
        reason: note,
      });
    } catch { /* non-fatal */ }

    const { data: updated } = await client.from('payment_intents').select('id, status, reviewed_at, review_note').eq('id', intentId).single();
    res.json(updated);
  }
);
