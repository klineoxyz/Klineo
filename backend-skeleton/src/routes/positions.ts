import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, pageQuery, limitQuery } from '../middleware/validation.js';
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

export const positionsRouter: Router = Router();

// All positions routes require authentication
positionsRouter.use(verifySupabaseJWT);

/**
 * GET /api/positions
 * List current user's positions with pagination
 */
positionsRouter.get('/',
  validate([pageQuery, limitQuery]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = (page - 1) * limit;

      const { data: positions, error, count } = await client
        .from('positions')
        .select(`
          id,
          copy_setup_id,
          symbol,
          side,
          size,
          entry_price,
          current_price,
          unrealized_pnl,
          exchange_order_id,
          opened_at,
          closed_at,
          created_at,
          updated_at,
          copy_setups (
            id,
            traders (
              id,
              display_name,
              slug
            )
          )
        `, { count: 'exact' })
        .eq('user_id', req.user!.id)
        .order('opened_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching positions:', error);
        return res.status(500).json({ error: 'Failed to fetch positions' });
      }

      const result = positions?.map((pos: any) => ({
        id: pos.id,
        copySetupId: pos.copy_setup_id,
        trader: pos.copy_setups?.traders ? {
          id: pos.copy_setups.traders.id,
          name: pos.copy_setups.traders.display_name,
          slug: pos.copy_setups.traders.slug,
        } : null,
        symbol: pos.symbol,
        side: pos.side,
        size: parseFloat(pos.size?.toString() || '0'),
        entryPrice: parseFloat(pos.entry_price?.toString() || '0'),
        currentPrice: pos.current_price ? parseFloat(pos.current_price.toString()) : null,
        unrealizedPnl: pos.unrealized_pnl ? parseFloat(pos.unrealized_pnl.toString()) : null,
        exchangeOrderId: pos.exchange_order_id,
        openedAt: pos.opened_at,
        closedAt: pos.closed_at,
        createdAt: pos.created_at,
        updatedAt: pos.updated_at,
      })) || [];

      res.json({
        positions: result,
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      });
    } catch (err) {
      console.error('Positions list error:', err);
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  }
);
