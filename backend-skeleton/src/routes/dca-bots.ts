/**
 * DCA Bots API — list, create, update status, update config.
 * No execution logic; UI + draft records only. RLS enforces user_id.
 */
import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fetchEntitlement } from '../middleware/requireEntitlement.js';
import { getMaxDcaBots } from './profile.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export const dcaBotsRouter: Router = Router();
dcaBotsRouter.use(verifySupabaseJWT);

/**
 * GET /api/dca-bots
 * List current user's DCA bots
 */
dcaBotsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const { data, error } = await client
      .from('dca_bots')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('DCA bots list error:', error);
      return res.status(500).json({ error: 'Failed to fetch bots' });
    }
    res.json({ bots: data ?? [] });
  } catch (err) {
    console.error('DCA bots list error:', err);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

/**
 * POST /api/dca-bots
 * Create a new DCA bot (draft)
 */
dcaBotsRouter.post(
  '/',
  validate([
    body('name').trim().isLength({ min: 1 }).withMessage('Name required'),
    body('exchange').isIn(['binance', 'bybit']).withMessage('exchange must be binance or bybit'),
    body('market').optional().isIn(['spot', 'futures']),
    body('pair').trim().isLength({ min: 1 }).withMessage('Pair required'),
    body('timeframe').optional().trim(),
    body('config').optional().isObject(),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    try {
      const { name, exchange, market = 'spot', pair, timeframe = '1h', config = {} } = req.body;
      const { data, error } = await client
        .from('dca_bots')
        .insert({
          user_id: req.user!.id,
          name,
          exchange,
          market,
          pair,
          timeframe,
          status: 'stopped',
          config,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) {
        console.error('DCA bot create error:', error);
        return res.status(500).json({ error: 'Failed to create bot' });
      }
      res.status(201).json({ bot: data });
    } catch (err) {
      console.error('DCA bot create error:', err);
      res.status(500).json({ error: 'Failed to create bot' });
    }
  }
);

/**
 * PUT /api/dca-bots/:id/status
 * Update bot status (running | paused | stopped)
 */
dcaBotsRouter.put(
  '/:id/status',
  validate([
    uuidParam('id'),
    body('status').isIn(['running', 'paused', 'stopped']).withMessage('status must be running, paused, or stopped'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      if (status === 'running') {
        const [ent, currentBot, { count: runningSpotCount }] = await Promise.all([
          fetchEntitlement(client, userId),
          client.from('dca_bots').select('status, market').eq('id', id).eq('user_id', userId).maybeSingle(),
          client.from('dca_bots').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'running').eq('market', 'spot'),
        ]);
        const maxDca = getMaxDcaBots(ent?.active_package_id ?? null);
        const currentRow = currentBot?.data as { status?: string; market?: string } | null;
        const botIsSpot = (currentRow?.market ?? 'spot') === 'spot';
        const botWasRunning = currentRow?.status === 'running';
        const runningAfter = (runningSpotCount ?? 0) + (botIsSpot && !botWasRunning ? 1 : 0);
        if (maxDca > 0 && runningAfter > maxDca) {
          return res.status(403).json({
            code: 'DCA_BOT_LIMIT_REACHED',
            message: 'Your current package allows up to ' + maxDca + ' active DCA bots.',
          });
        }
      }

      const { data, error } = await client
        .from('dca_bots')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error || !data) {
        return res.status(error?.code === 'PGRST116' ? 404 : 500).json({ error: 'Bot not found or update failed' });
      }
      res.json({ bot: data });
    } catch (err) {
      console.error('DCA bot status update error:', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
);

/**
 * PUT /api/dca-bots/:id
 * Update bot config (and optionally name, pair, timeframe)
 */
dcaBotsRouter.put(
  '/:id',
  validate([
    uuidParam('id'),
    body('name').optional().trim().isLength({ min: 1 }),
    body('pair').optional().trim().isLength({ min: 1 }),
    body('timeframe').optional().trim(),
    body('config').optional().isObject(),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    try {
      const { id } = req.params;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.pair !== undefined) updates.pair = req.body.pair;
      if (req.body.timeframe !== undefined) updates.timeframe = req.body.timeframe;
      if (req.body.config !== undefined) updates.config = req.body.config;
      const { data, error } = await client
        .from('dca_bots')
        .update(updates)
        .eq('id', id)
        .eq('user_id', req.user!.id)
        .select()
        .single();
      if (error || !data) {
        return res.status(error?.code === 'PGRST116' ? 404 : 500).json({ error: 'Bot not found or update failed' });
      }
      res.json({ bot: data });
    } catch (err) {
      console.error('DCA bot update error:', err);
      res.status(500).json({ error: 'Failed to update bot' });
    }
  }
);

/**
 * DELETE /api/dca-bots/:id
 */
dcaBotsRouter.delete('/:id', validate([uuidParam('id')]), async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const { id } = req.params;
    const { error } = await client.from('dca_bots').delete().eq('id', id).eq('user_id', req.user!.id);
    if (error) return res.status(500).json({ error: 'Failed to delete bot' });
    res.status(204).send();
  } catch (err) {
    console.error('DCA bot delete error:', err);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});
