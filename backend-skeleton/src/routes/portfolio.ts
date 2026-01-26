import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
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

export const portfolioRouter = Router();

// All portfolio routes require authentication
portfolioRouter.use(verifySupabaseJWT);

/**
 * GET /api/portfolio/summary
 * Get portfolio summary (derived from positions/trades)
 */
portfolioRouter.get('/summary', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const userId = req.user!.id;

    // Get open positions
    const { data: openPositions } = await client
      .from('positions')
      .select('unrealized_pnl, size, entry_price, current_price')
      .eq('user_id', userId)
      .is('closed_at', null);

    // Get closed positions (for realized PnL)
    const { data: closedPositions } = await client
      .from('positions')
      .select('unrealized_pnl')
      .eq('user_id', userId)
      .not('closed_at', 'is', null);

    // Get all trades for volume calculation
    const { data: trades } = await client
      .from('trades')
      .select('amount, price')
      .eq('user_id', userId);

    // Calculate totals
    const unrealizedPnl = openPositions?.reduce((sum, p) => 
      sum + parseFloat(p.unrealized_pnl?.toString() || '0'), 0) || 0;
    
    const realizedPnl = closedPositions?.reduce((sum, p) => 
      sum + parseFloat(p.unrealized_pnl?.toString() || '0'), 0) || 0;
    
    const totalPnl = unrealizedPnl + realizedPnl;
    
    const totalVolume = trades?.reduce((sum, t) => 
      sum + (parseFloat(t.amount?.toString() || '0') * parseFloat(t.price?.toString() || '0')), 0) || 0;

    // Get active copy setups count
    const { data: copySetups } = await client
      .from('copy_setups')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    res.json({
      totalPnl: Math.round(totalPnl * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      openPositions: openPositions?.length || 0,
      activeCopySetups: copySetups?.length || 0,
    });
  } catch (err) {
    console.error('Portfolio summary error:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio summary' });
  }
});
