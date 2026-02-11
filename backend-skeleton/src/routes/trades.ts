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

export const tradesRouter: Router = Router();

// All trades routes require authentication
tradesRouter.use(verifySupabaseJWT);

/**
 * GET /api/trades
 * List current user's trades with pagination.
 * Query: source = 'all' | 'copy' | 'dca'
 */
tradesRouter.get('/',
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
      const source = (req.query.source as string) || 'all';

      let query = client
        .from('trades')
        .select('*, dca_bots(name)', { count: 'exact' })
        .eq('user_id', req.user!.id)
        .order('executed_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (source === 'copy') query = query.eq('source', 'copy');
      else if (source === 'dca') query = query.eq('source', 'dca');

      const { data: trades, error, count } = await query;

      if (error) {
        console.error('Error fetching trades:', error);
        return res.status(500).json({ error: 'Failed to fetch trades' });
      }

      const result = trades?.map((trade: any) => ({
        id: trade.id,
        orderId: trade.order_id,
        positionId: trade.position_id,
        symbol: trade.symbol,
        side: trade.side,
        amount: parseFloat(trade.amount?.toString() || '0'),
        price: parseFloat(trade.price?.toString() || '0'),
        fee: parseFloat(trade.fee?.toString() || '0'),
        source: trade.source ?? 'copy',
        dcaBotId: trade.dca_bot_id ?? null,
        dcaBotName: trade.dca_bots?.name ?? null,
        executedAt: trade.executed_at,
        createdAt: trade.created_at,
      })) || [];

      res.json({
        trades: result,
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      });
    } catch (err) {
      console.error('Trades list error:', err);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  }
);
