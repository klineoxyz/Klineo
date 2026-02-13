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
import { processOneBot } from '../lib/dcaEngine.js';

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
 * List current user's DCA bots with dca_bot_state (DCA progress, avg entry, realized PnL).
 */
dcaBotsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const { data, error } = await client
      .from('dca_bots')
      .select('*, dca_bot_state(safety_orders_filled, avg_entry_price, position_size, realized_pnl)')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('DCA bots list error:', error);
      return res.status(500).json({ error: 'Failed to fetch bots' });
    }
    const maxSafetyOrdersFromConfig = (config: Record<string, unknown> | undefined) =>
      Math.max(0, Number(config?.maxSafetyOrders ?? 0));
    const bots = (data ?? []).map((row: any) => {
      const state = Array.isArray(row.dca_bot_state) ? row.dca_bot_state[0] : row.dca_bot_state;
      const { dca_bot_state: _, ...bot } = row;
      const rawFilled = state?.safety_orders_filled ?? 0;
      const maxSafety = maxSafetyOrdersFromConfig(row.config);
      const safety_orders_filled = Math.min(Number(rawFilled), maxSafety);
      return {
        ...bot,
        safety_orders_filled: maxSafety > 0 ? safety_orders_filled : 0,
        avg_entry_price: state?.avg_entry_price != null ? Number(state.avg_entry_price) : null,
        position_size: state?.position_size != null ? Number(state.position_size) : null,
        realized_pnl: state?.realized_pnl != null ? Number(state.realized_pnl) : 0,
      };
    });
    res.json({ bots });
  } catch (err) {
    console.error('DCA bots list error:', err);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

/**
 * GET /api/dca-bots/featured
 * Top 3 bots by realized PnL (user's own bots; joins dca_bot_state).
 */
dcaBotsRouter.get('/featured', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const userId = req.user!.id;
    const { data: botsWithState, error } = await client
      .from('dca_bots')
      .select('id, name, pair, status, config, dca_bot_state(realized_pnl)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('DCA bots featured error:', error);
      return res.status(500).json({ error: 'Failed to fetch featured bots' });
    }
    const list = (botsWithState ?? []) as Array<{
      id: string;
      name: string;
      pair: string;
      status: string;
      config?: Record<string, unknown>;
      dca_bot_state?: Array<{ realized_pnl?: number | string }> | { realized_pnl?: number | string } | null;
    }>;
    const withPnl = list.map((b) => {
      const state = Array.isArray(b.dca_bot_state) ? b.dca_bot_state[0] : b.dca_bot_state;
      const realizedPnl = state?.realized_pnl != null ? Number(state.realized_pnl) : 0;
      return { ...b, realizedPnl };
    });
    const top3 = withPnl
      .sort((a, b) => b.realizedPnl - a.realizedPnl)
      .slice(0, 3)
      .map(({ id, name, pair, status, realizedPnl }) => ({ id, name, pair, status, realizedPnl }));
    res.json({ featured: top3 });
  } catch (err) {
    console.error('DCA bots featured error:', err);
    res.status(500).json({ error: 'Failed to fetch featured bots' });
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

      const now = new Date().toISOString();
      const payload: Record<string, string> = { status, updated_at: now };
      if (status === 'running') {
        payload.next_tick_at = now;
      }
      const { data, error } = await client
        .from('dca_bots')
        .update(payload)
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
 * POST /api/dca-bots/:id/trigger-tick
 * Run one tick for this bot now (for diagnosis). Returns success/error so user can see why trades aren't executing.
 */
dcaBotsRouter.post(
  '/:id/trigger-tick',
  validate([uuidParam('id')]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { data: bot, error: fetchError } = await client
        .from('dca_bots')
        .select('id, user_id, name, exchange, market, pair, timeframe, status, config, last_tick_at, next_tick_at, last_tick_status, last_tick_error, is_locked, lock_expires_at')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (fetchError || !bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }
      if (bot.status !== 'running') {
        return res.status(400).json({ error: 'Bot is not running', status: bot.status });
      }
      if (bot.market !== 'spot') {
        return res.status(400).json({ error: 'Only spot DCA bots can be ticked' });
      }
      const now = new Date();
      const result = await processOneBot(client, bot as Parameters<typeof processOneBot>[1], now, 'user-trigger');
      const success = result.status === 'ok';
      let errorMessage: string | undefined = 'error' in result ? result.error : ('reason' in result ? result.reason : null) ?? undefined;
      if (!success && !errorMessage) errorMessage = 'Tick failed';
      if (!success) {
        const { data: updated } = await client.from('dca_bots').select('last_tick_error').eq('id', id).maybeSingle();
        const detail = (updated as { last_tick_error?: string } | null)?.last_tick_error;
        if (detail) errorMessage = detail;
      }
      return res.json({
        success,
        status: result.status,
        error: errorMessage,
        message: success ? 'Tick completed' : errorMessage ?? 'Tick failed',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trigger tick failed';
      console.error('DCA trigger-tick error:', msg);
      return res.status(500).json({ error: 'Trigger tick failed', message: msg });
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
