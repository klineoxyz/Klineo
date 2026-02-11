/**
 * Marketplace strategies: backtest strategies that approved Master Traders can list.
 * - GET /api/marketplace-strategies — public, list strategies with status=listed
 * - GET /api/marketplace-strategies/my — auth, list current user's strategies
 * - POST /api/marketplace-strategies — auth, create (must be approved Master Trader)
 * - GET /api/marketplace-strategies/:id — public if listed, else owner/admin
 * - PATCH /api/marketplace-strategies/:id — auth, owner only
 * - DELETE /api/marketplace-strategies/:id — auth, owner only
 */

import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam, pageQuery, limitQuery } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Supabase not configured');
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
}

export const marketplaceStrategiesRouter: Router = Router();

/**
 * GET /api/marketplace-strategies
 * Public: list strategies with status=listed, with trader info
 */
marketplaceStrategiesRouter.get('/',
  validate([pageQuery, limitQuery]),
  async (req, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = (page - 1) * limit;

      const { data: rows, error, count } = await client
        .from('marketplace_strategies')
        .select(`
          id,
          trader_id,
          name,
          description,
          symbol,
          interval,
          config,
          backtest_summary,
          status,
          created_at,
          traders (
            id,
            display_name,
            slug
          )
        `, { count: 'exact' })
        .eq('status', 'listed')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Marketplace strategies list error:', error);
        return res.status(500).json({ error: 'Failed to fetch strategies' });
      }

      const strategies = (rows || []).map((s: any) => {
        const t = Array.isArray(s.traders) ? s.traders[0] : s.traders;
        const summary = s.backtest_summary || {};
        return {
          id: s.id,
          traderId: s.trader_id,
          trader: t ? { id: t.id, name: t.display_name, slug: t.slug } : null,
          name: s.name,
          description: s.description || null,
          symbol: s.symbol,
          interval: s.interval,
          config: s.config,
          backtestSummary: summary,
          roi: summary.roi != null ? Number(summary.roi) : null,
          winRate: summary.winRate != null ? Number(summary.winRate) : null,
          maxDrawdown: summary.maxDrawdown != null ? Number(summary.maxDrawdown) : null,
          totalTrades: summary.totalTrades != null ? Number(summary.totalTrades) : null,
          status: s.status,
          createdAt: s.created_at,
        };
      });

      res.json({
        strategies,
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      });
    } catch (err) {
      console.error('Marketplace strategies list error:', err);
      res.status(500).json({ error: 'Failed to fetch strategies' });
    }
  }
);

/**
 * GET /api/marketplace-strategies/my
 * Auth: list current user's strategies (via their approved trader_id)
 */
marketplaceStrategiesRouter.get('/my', verifySupabaseJWT, async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  try {
    const { data: trader } = await client
      .from('traders')
      .select('id')
      .eq('user_id', req.user!.id)
      .eq('status', 'approved')
      .maybeSingle();

    if (!trader) {
      return res.json({ strategies: [] });
    }

    const { data: rows, error } = await client
      .from('marketplace_strategies')
      .select('id, trader_id, name, description, symbol, interval, config, backtest_summary, status, created_at, updated_at')
      .eq('trader_id', trader.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Marketplace strategies my error:', error);
      return res.status(500).json({ error: 'Failed to fetch your strategies' });
    }

    const strategies = (rows || []).map((s: any) => ({
      id: s.id,
      traderId: s.trader_id,
      name: s.name,
      description: s.description || null,
      symbol: s.symbol,
      interval: s.interval,
      config: s.config,
      backtestSummary: s.backtest_summary || {},
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    res.json({ strategies });
  } catch (err) {
    console.error('Marketplace strategies my error:', err);
    res.status(500).json({ error: 'Failed to fetch your strategies' });
  }
});

/**
 * POST /api/marketplace-strategies
 * Auth: create a strategy (user must be approved Master Trader)
 */
marketplaceStrategiesRouter.post('/',
  verifySupabaseJWT,
  validate([
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('name required (max 200)'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('symbol').trim().isLength({ min: 1, max: 32 }),
    body('interval').optional().trim().isLength({ max: 8 }).default('1h'),
    body('config').isObject().withMessage('config must be an object'),
    body('backtestSummary').optional().isObject(),
    body('status').optional().isIn(['draft', 'listed']).withMessage('status must be draft or listed'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const { data: trader, error: traderErr } = await client
        .from('traders')
        .select('id')
        .eq('user_id', req.user!.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (traderErr || !trader) {
        return res.status(403).json({ error: 'Only approved Master Traders can list strategies' });
      }

      const { name, description, symbol, interval = '1h', config, backtestSummary, status = 'listed' } = req.body;

      const { data: row, error } = await client
        .from('marketplace_strategies')
        .insert({
          trader_id: trader.id,
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          symbol: String(symbol).trim(),
          interval: String(interval).trim() || '1h',
          config: config || {},
          backtest_summary: backtestSummary || null,
          status: status === 'draft' ? 'draft' : 'listed',
          updated_at: new Date().toISOString(),
        })
        .select('id, trader_id, name, description, symbol, interval, config, backtest_summary, status, created_at')
        .single();

      if (error) {
        console.error('Marketplace strategies create error:', error);
        return res.status(500).json({ error: 'Failed to create strategy' });
      }

      res.status(201).json({
        strategy: {
          id: row.id,
          traderId: row.trader_id,
          name: row.name,
          description: row.description,
          symbol: row.symbol,
          interval: row.interval,
          config: row.config,
          backtestSummary: row.backtest_summary || {},
          status: row.status,
          createdAt: row.created_at,
        },
      });
    } catch (err) {
      console.error('Marketplace strategies create error:', err);
      res.status(500).json({ error: 'Failed to create strategy' });
    }
  }
);

/**
 * GET /api/marketplace-strategies/:id
 * Public if listed; otherwise owner or admin only
 */
marketplaceStrategiesRouter.get('/:id', validate([uuidParam('id')]), async (req, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  try {
    const { id } = req.params;

    const { data: row, error } = await client
      .from('marketplace_strategies')
      .select(`
        id,
        trader_id,
        name,
        description,
        symbol,
        interval,
        config,
        backtest_summary,
        status,
        created_at,
        updated_at,
        traders (
          id,
          display_name,
          slug,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error || !row) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const t = Array.isArray(row.traders) ? row.traders[0] : row.traders;
    const summary = row.backtest_summary || {};

    res.json({
      id: row.id,
      traderId: row.trader_id,
      trader: t ? { id: t.id, name: t.display_name, slug: t.slug, avatarUrl: t.avatar_url } : null,
      name: row.name,
      description: row.description,
      symbol: row.symbol,
      interval: row.interval,
      config: row.config,
      backtestSummary: summary,
      roi: summary.roi != null ? Number(summary.roi) : null,
      winRate: summary.winRate != null ? Number(summary.winRate) : null,
      maxDrawdown: summary.maxDrawdown != null ? Number(summary.maxDrawdown) : null,
      totalTrades: summary.totalTrades != null ? Number(summary.totalTrades) : null,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error('Marketplace strategy get error:', err);
    res.status(500).json({ error: 'Failed to fetch strategy' });
  }
});

/**
 * PATCH /api/marketplace-strategies/:id
 * Auth: owner only (via trader_id -> user_id)
 */
marketplaceStrategiesRouter.patch('/:id',
  verifySupabaseJWT,
  validate([
    uuidParam('id'),
    body('name').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('status').optional().isIn(['draft', 'listed', 'unlisted']),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const { id } = req.params;

      const { data: strategy } = await client
        .from('marketplace_strategies')
        .select('id, trader_id')
        .eq('id', id)
        .single();

      if (!strategy) return res.status(404).json({ error: 'Strategy not found' });

      const { data: trader } = await client
        .from('traders')
        .select('id')
        .eq('id', strategy.trader_id)
        .eq('user_id', req.user!.id)
        .maybeSingle();

      if (!trader) return res.status(403).json({ error: 'You can only update your own strategies' });

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
      if (req.body.description !== undefined) updates.description = req.body.description ? String(req.body.description).trim() : null;
      if (req.body.status !== undefined) updates.status = req.body.status;

      const { data: updated, error } = await client
        .from('marketplace_strategies')
        .update(updates)
        .eq('id', id)
        .select('id, name, description, status, updated_at')
        .single();

      if (error) {
        console.error('Marketplace strategy patch error:', error);
        return res.status(500).json({ error: 'Failed to update strategy' });
      }

      res.json({ strategy: updated });
    } catch (err) {
      console.error('Marketplace strategy patch error:', err);
      res.status(500).json({ error: 'Failed to update strategy' });
    }
  }
);

/**
 * DELETE /api/marketplace-strategies/:id
 * Auth: owner only
 */
marketplaceStrategiesRouter.delete('/:id',
  verifySupabaseJWT,
  validate([uuidParam('id')]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const { id } = req.params;

      const { data: strategy } = await client
        .from('marketplace_strategies')
        .select('id, trader_id')
        .eq('id', id)
        .single();

      if (!strategy) return res.status(404).json({ error: 'Strategy not found' });

      const { data: trader } = await client
        .from('traders')
        .select('id')
        .eq('id', strategy.trader_id)
        .eq('user_id', req.user!.id)
        .maybeSingle();

      if (!trader) return res.status(403).json({ error: 'You can only delete your own strategies' });

      const { error } = await client.from('marketplace_strategies').delete().eq('id', id);

      if (error) {
        console.error('Marketplace strategy delete error:', error);
        return res.status(500).json({ error: 'Failed to delete strategy' });
      }

      res.status(204).send();
    } catch (err) {
      console.error('Marketplace strategy delete error:', err);
      res.status(500).json({ error: 'Failed to delete strategy' });
    }
  }
);
