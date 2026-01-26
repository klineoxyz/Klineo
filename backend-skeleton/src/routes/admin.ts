import { Router } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
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

export const adminRouter = Router();

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
    const [usersResult, tradersResult, subscriptionsResult, feesResult, referralsResult] = await Promise.all([
      client.from('user_profiles').select('*', { count: 'exact', head: true }),
      client.from('traders').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      client.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      client.from('fee_ledger').select('amount'),
      client.from('referral_earnings').select('amount'),
    ]);

    const totalFees = feesResult.data?.reduce((sum, f) => sum + parseFloat(f.amount?.toString() || '0'), 0) || 0;
    const totalReferralPayouts = referralsResult.data?.reduce((sum, r) => sum + parseFloat(r.amount?.toString() || '0'), 0) || 0;

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
 * GET /api/admin/users
 * List all users with pagination
 */
adminRouter.get('/users', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let query = client
      .from('user_profiles')
      .select('id, email, role, created_at, full_name, username')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,username.ilike.%${search}%`);
    }

    const { data: profiles, error } = await query.range(offset, offset + limit - 1);

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
        status: sub?.status === 'active' ? 'Active' : 'Inactive',
        joined: new Date(profile.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    });

    res.json({ users: users || [], page, limit });
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
        trades: perf.length,
        winRate: 0, // TODO: Calculate from trades table
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
adminRouter.put('/traders/:id', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

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
      .select('id, user_id, amount, currency, fee_type, created_at')
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fees:', error);
      return res.status(500).json({ error: 'Failed to fetch fees' });
    }

    const totalFees = fees?.reduce((sum, f) => sum + parseFloat(f.amount?.toString() || '0'), 0) || 0;

    // Get referral payouts (this month)
    const { data: referralEarnings } = await client
      .from('referral_earnings')
      .select('amount')
      .gte('created_at', startOfMonth.toISOString());
    const referralPayouts = referralEarnings?.reduce((sum, r) => sum + parseFloat(r.amount?.toString() || '0'), 0) || 0;

    const feeTransactions = fees?.map((fee) => ({
      userId: fee.user_id,
      trade: 'N/A', // TODO: Link to trades table
      profit: 0, // TODO: Calculate from trade
      fee: parseFloat(fee.amount?.toString() || '0'),
      date: new Date(fee.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      trader: 'N/A', // TODO: Link to trader via copy_setup
    }));

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
 * Referral earnings and payouts
 */
adminRouter.get('/referrals', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: earnings, error } = await client
      .from('referral_earnings')
      .select('id, referral_id, amount, currency, tier, rate_pct, created_at')
      .order('created_at', { ascending: false });

    // Get referral details
    const referralIds = [...new Set(earnings?.map((e) => e.referral_id).filter(Boolean) || [])];
    const { data: referrals } = await client
      .from('referrals')
      .select('id, referrer_id, referred_id')
      .in('id', referralIds);

    // Get user emails
    const allUserIds = [
      ...new Set([
        ...(referrals?.map((r) => r.referrer_id) || []),
        ...(referrals?.map((r) => r.referred_id) || []),
      ]),
    ];
    const { data: refUserProfiles } = await client
      .from('user_profiles')
      .select('id, email')
      .in('id', allUserIds);
    const refEmailMap = new Map(refUserProfiles?.map((u) => [u.id, u.email]) || []);
    const referralMap = new Map(referrals?.map((r) => [r.id, r]) || []);

    if (error) {
      console.error('Error fetching referrals:', error);
      return res.status(500).json({ error: 'Failed to fetch referrals' });
    }

    const totalCommissions = earnings?.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0) || 0;
    const pendingCount = earnings?.filter((e) => true).length || 0; // TODO: Add status field

    const referralPayouts = earnings?.map((earning) => {
      const ref = referralMap.get(earning.referral_id);
      const referrerEmail = ref ? refEmailMap.get(ref.referrer_id) || 'Unknown' : 'Unknown';
      const referredEmail = ref ? refEmailMap.get(ref.referred_id) || 'Unknown' : 'Unknown';

      return {
        userId: ref?.referred_id || '',
        referrer: referrerEmail,
        tier: `Tier ${earning.tier}`,
        commission: parseFloat(earning.amount?.toString() || '0'),
        status: 'Pending', // TODO: Add status field
        date: new Date(earning.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        referralFees: earning.rate_pct > 0
          ? parseFloat(earning.amount?.toString() || '0') / (earning.rate_pct / 100)
          : 0,
      };
    });

    res.json({
      summary: {
        totalCommissions: Math.round(totalCommissions * 100) / 100,
        pendingPayouts: referralPayouts?.filter((p) => p.status === 'Pending').length || 0,
        activeReferrers: new Set(referrals?.map((r) => r.referrer_id)).size,
      },
      payouts: referralPayouts || [],
    });
  } catch (err) {
    console.error('Admin referrals error:', err);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

/**
 * GET /api/admin/coupons
 * List all discount coupons
 */
adminRouter.get('/coupons', async (req, res) => {
  // TODO: Create coupons table or use subscription_plans with discount field
  // For now, return empty array
  res.json({ coupons: [] });
});

/**
 * POST /api/admin/coupons
 * Create a new discount coupon
 */
adminRouter.post('/coupons', async (req, res) => {
  // TODO: Implement coupon creation
  res.status(501).json({ error: 'Coupon creation not yet implemented' });
});

/**
 * PUT /api/admin/users/:id
 * Update user (suspend/reactivate)
 */
adminRouter.put('/users/:id', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { id } = req.params;
    const { action } = req.body; // 'suspend' | 'activate'

    // For now, we can't suspend users directly in user_profiles
    // This would require a status field or separate suspensions table
    res.status(501).json({ error: 'User suspension not yet implemented' });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});
