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

export const ordersRouter = Router();

// All orders routes require authentication
ordersRouter.use(verifySupabaseJWT);

/**
 * GET /api/orders
 * List current user's orders with pagination
 */
ordersRouter.get('/',
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

      const { data: orders, error, count } = await client
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('user_id', req.user!.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).json({ error: 'Failed to fetch orders' });
      }

      const result = orders?.map((order: any) => ({
        id: order.id,
        positionId: order.position_id,
        symbol: order.symbol,
        side: order.side,
        orderType: order.order_type,
        amount: parseFloat(order.amount?.toString() || '0'),
        price: order.price ? parseFloat(order.price.toString()) : null,
        status: order.status,
        exchangeOrderId: order.exchange_order_id,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      })) || [];

      res.json({
        orders: result,
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      });
    } catch (err) {
      console.error('Orders list error:', err);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);
