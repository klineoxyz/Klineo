import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam, pageQuery, limitQuery } from '../middleware/validation.js';
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

export const tradersRouter: Router = Router();

/**
 * GET /api/traders
 * Public endpoint: List approved traders with pagination
 */
tradersRouter.get('/', 
  validate([pageQuery, limitQuery]),
  async (req, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100
      const offset = (page - 1) * limit;

      // Get approved traders only
      const { data: traders, error, count } = await client
        .from('traders')
        .select('id, display_name, slug, bio, avatar_url, status, exchange, verified_at, created_at', { count: 'exact' })
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching traders:', error);
        return res.status(500).json({ error: 'Failed to fetch traders' });
      }

      // Get performance data for each trader
      const traderIds = traders?.map((t) => t.id) || [];
      const { data: performance } = await client
        .from('trader_performance')
        .select('trader_id, pnl, pnl_pct, volume, drawdown_pct, period_start, period_end')
        .in('trader_id', traderIds)
        .order('period_start', { ascending: false });

      // Get follower count (active copy setups)
      const { data: copySetups } = await client
        .from('copy_setups')
        .select('trader_id')
        .in('trader_id', traderIds)
        .eq('status', 'active');

      // Calculate stats for each trader
      const result = traders?.map((trader) => {
        const perf = performance?.filter((p) => p.trader_id === trader.id) || [];
        const followers = copySetups?.filter((c) => c.trader_id === trader.id).length || 0;
        
        // Calculate total PnL and average ROI
        const totalPnl = perf.reduce((sum, p) => sum + parseFloat(p.pnl?.toString() || '0'), 0);
        const avgRoi = perf.length > 0
          ? perf.reduce((sum, p) => sum + parseFloat(p.pnl_pct?.toString() || '0'), 0) / perf.length
          : 0;
        
        // Max drawdown
        const maxDrawdown = perf.length > 0
          ? Math.min(...perf.map((p) => parseFloat(p.drawdown_pct?.toString() || '0')))
          : 0;

        // Days active (from first performance entry or created_at)
        const firstPerf = perf[perf.length - 1];
        const startDate = firstPerf?.period_start || trader.created_at;
        const daysActive = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: trader.id,
          name: trader.display_name,
          slug: trader.slug,
          bio: trader.bio,
          avatarUrl: trader.avatar_url,
          exchange: trader.exchange,
          verified: !!trader.verified_at,
          roi: Math.round(avgRoi * 10) / 10,
          drawdown: Math.round(maxDrawdown * 10) / 10,
          daysActive,
          followers,
          status: trader.status,
        };
      });

      res.json({
        traders: result || [],
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      });
    } catch (err) {
      console.error('Traders list error:', err);
      res.status(500).json({ error: 'Failed to fetch traders' });
    }
  }
);

/**
 * GET /api/traders/:id
 * Public endpoint: Get single trader details with performance history
 */
tradersRouter.get('/:id',
  validate([uuidParam('id')]),
  async (req, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { id } = req.params;

      // Get trader (must be approved, or own trader, or admin)
      const { data: trader, error: traderError } = await client
        .from('traders')
        .select('*')
        .eq('id', id)
        .single();

      if (traderError || !trader) {
        return res.status(404).json({ error: 'Trader not found' });
      }

      // Check if approved (public access) or if user is owner/admin (via RLS)
      // For public endpoint, we only allow approved traders
      if (trader.status !== 'approved') {
        return res.status(403).json({ error: 'Trader not available' });
      }

      // Get performance history
      const { data: performance } = await client
        .from('trader_performance')
        .select('*')
        .eq('trader_id', id)
        .order('period_start', { ascending: false })
        .limit(100);

      // Get follower count
      const { data: copySetups } = await client
        .from('copy_setups')
        .select('id')
        .eq('trader_id', id)
        .eq('status', 'active');

      // Calculate aggregate stats
      const totalPnl = performance?.reduce((sum, p) => sum + parseFloat(p.pnl?.toString() || '0'), 0) || 0;
      const avgRoi = performance && performance.length > 0
        ? performance.reduce((sum, p) => sum + parseFloat(p.pnl_pct?.toString() || '0'), 0) / performance.length
        : 0;
      const maxDrawdown = performance && performance.length > 0
        ? Math.min(...performance.map((p) => parseFloat(p.drawdown_pct?.toString() || '0')))
        : 0;
      const totalVolume = performance?.reduce((sum, p) => sum + parseFloat(p.volume?.toString() || '0'), 0) || 0;

      res.json({
        id: trader.id,
        name: trader.display_name,
        slug: trader.slug,
        bio: trader.bio,
        avatarUrl: trader.avatar_url,
        exchange: trader.exchange,
        verified: !!trader.verified_at,
        status: trader.status,
        followers: copySetups?.length || 0,
        stats: {
          totalPnl: Math.round(totalPnl * 100) / 100,
          avgRoi: Math.round(avgRoi * 10) / 10,
          maxDrawdown: Math.round(maxDrawdown * 10) / 10,
          totalVolume: Math.round(totalVolume * 100) / 100,
          performancePoints: performance?.length || 0,
        },
        performance: performance?.map((p) => ({
          periodStart: p.period_start,
          periodEnd: p.period_end,
          pnl: parseFloat(p.pnl?.toString() || '0'),
          pnlPct: parseFloat(p.pnl_pct?.toString() || '0'),
          volume: parseFloat(p.volume?.toString() || '0'),
          drawdownPct: parseFloat(p.drawdown_pct?.toString() || '0'),
        })) || [],
      });
    } catch (err) {
      console.error('Trader details error:', err);
      res.status(500).json({ error: 'Failed to fetch trader details' });
    }
  }
);
