/**
 * Strategy runner: cron, execute-tick, status, simulate-trade-result (admin).
 * CRUD for runner strategies table (GET/POST /api/runner/strategies, GET/PUT /api/runner/strategies/:id).
 * Gated by ENABLE_STRATEGY_RUNNER; simulate by ENABLE_RUNNER_ADMIN_ENDPOINTS.
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam } from '../middleware/validation.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { runStrategyTick, runDueStrategies } from '../lib/strategyRunner.js';
import { recordTradeResult } from '../lib/strategyRisk.js';
import { ALLOWED_TIMEFRAMES } from '../lib/timeframes.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

const ENABLE_RUNNER = process.env.ENABLE_STRATEGY_RUNNER === 'true';
const ENABLE_ADMIN_SIMULATE = process.env.ENABLE_RUNNER_ADMIN_ENDPOINTS === 'true';

function requireRunnerEnabled(req: AuthenticatedRequest, res: any, next: () => void) {
  if (!ENABLE_RUNNER) {
    return res.status(503).json({ error: 'Strategy runner is disabled', code: 'RUNNER_DISABLED' });
  }
  next();
}

export const strategiesRunnerRouter: Router = Router();

strategiesRunnerRouter.use(verifySupabaseJWT);
strategiesRunnerRouter.use(requireAdmin);

/**
 * POST /api/runner/execute-tick (admin) — run one strategy tick
 */
strategiesRunnerRouter.post(
  '/execute-tick',
  requireRunnerEnabled,
  validate([body('strategyId').isUUID().withMessage('strategyId required')]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    const requestId = (req as any).requestId || 'runner';
    const { strategyId } = req.body;
    const now = new Date();
    try {
      const result = await runStrategyTick(client, strategyId, now, { requestId });
      return res.json({ ...result, requestId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${requestId}] execute-tick error:`, msg);
      return res.status(500).json({ error: 'Execute tick failed', requestId });
    }
  }
);

/**
 * POST /api/runner/cron (admin) — run all due strategies
 */
strategiesRunnerRouter.post('/cron', requireRunnerEnabled, async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'runner';
  const now = new Date();
  try {
    const summary = await runDueStrategies(client, now, { requestId });
    return res.json({ summary, ranAt: now.toISOString(), requestId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[${requestId}] cron error:`, msg);
    return res.status(500).json({ error: 'Cron run failed', requestId });
  }
});

/**
 * GET /api/runner/status (admin) — counts and last run
 */
strategiesRunnerRouter.get('/status', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'runner';
  try {
    const { count: activeCount } = await client.from('strategies').select('id', { count: 'exact', head: true }).eq('status', 'active');
    const { data: lastRun } = await client
      .from('strategy_tick_runs')
      .select('scheduled_at, status')
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: pausedUsers } = await client
      .from('strategy_risk_state')
      .select('user_id, paused_reason, paused_until')
      .eq('is_paused', true);
    return res.json({
      enabled: ENABLE_RUNNER,
      activeStrategies: activeCount ?? 0,
      lastRunAt: lastRun?.scheduled_at ?? null,
      lastRunStatus: lastRun?.status ?? null,
      blockedUsersCount: pausedUsers?.length ?? 0,
      requestId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'Status failed', requestId });
  }
});

/**
 * POST /api/runner/simulate-trade-result (admin) — for testing risk gates
 */
strategiesRunnerRouter.post(
  '/simulate-trade-result',
  requireRunnerEnabled,
  validate([
    body('userId').isUUID().withMessage('userId required'),
    body('pnlDeltaUsdt').isFloat().withMessage('pnlDeltaUsdt required'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    if (!ENABLE_ADMIN_SIMULATE) {
      return res.status(403).json({ error: 'Simulate endpoint disabled', code: 'ADMIN_SIMULATE_DISABLED' });
    }
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    const requestId = (req as any).requestId || 'runner';
    const { userId, pnlDeltaUsdt } = req.body;
    const now = new Date();
    try {
      await recordTradeResult(client, userId, Number(pnlDeltaUsdt), now);
      return res.json({ message: 'Trade result recorded', requestId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({ error: 'Simulate failed', requestId });
    }
  }
);

// ---------- CRUD for runner strategies table ----------

function allowTimeframe(timeframe: string, isAdmin: boolean): boolean {
  if (ALLOWED_TIMEFRAMES.includes(timeframe as any)) {
    if (timeframe === '1m' && !isAdmin) return false;
    return true;
  }
  return false;
}

/**
 * GET /api/runner/strategies — list current user's strategies (runner table)
 */
strategiesRunnerRouter.get('/strategies', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'runner';
  try {
    const { data, error } = await client
      .from('strategies')
      .select('id, user_id, name, exchange, market_type, symbol, timeframe, status, side_mode, leverage, order_size_pct, take_profit_pct, stop_loss_pct, last_run_at, created_at, updated_at')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message, requestId });
    return res.json({ strategies: data ?? [], requestId });
  } catch (err) {
    return res.status(500).json({ error: 'List failed', requestId });
  }
});

/**
 * GET /api/runner/strategies/:id
 */
strategiesRunnerRouter.get('/strategies/:id', uuidParam('id'), async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'runner';
  const id = req.params.id;
  try {
    const { data, error } = await client
      .from('strategies')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Strategy not found', requestId });
    return res.json({ strategy: data, requestId });
  } catch (err) {
    return res.status(500).json({ error: 'Get failed', requestId });
  }
});

/**
 * POST /api/runner/strategies — create strategy (runner table). Default timeframe 5m; 1m only for admin.
 */
strategiesRunnerRouter.post(
  '/strategies',
  validate([
    body('name').isString().notEmpty().withMessage('name required'),
    body('exchange').isIn(['binance', 'bybit']).withMessage('exchange binance or bybit'),
    body('market_type').optional().isIn(['spot', 'futures']),
    body('symbol').isString().notEmpty().withMessage('symbol required'),
    body('timeframe').optional().isIn(['1m', '5m', '15m', '1h']),
    body('status').optional().isIn(['active', 'paused', 'stopped']),
    body('side_mode').optional().isIn(['long', 'short', 'both']),
    body('leverage').optional().isInt({ min: 1, max: 125 }),
    body('order_size_pct').optional().isFloat({ min: 0.1, max: 100 }),
    body('take_profit_pct').optional().isFloat(),
    body('stop_loss_pct').optional().isFloat(),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    const requestId = (req as any).requestId || 'runner';
    const isAdmin = req.user!.role === 'admin';
    const timeframe = (req.body.timeframe as string) || '5m';
    if (!allowTimeframe(timeframe, isAdmin)) {
      return res.status(400).json({ error: 'timeframe 1m is admin-only; use 5m, 15m, or 1h', requestId });
    }
    try {
      const row = {
        user_id: req.user!.id,
        name: req.body.name,
        exchange: req.body.exchange,
        market_type: req.body.market_type || 'futures',
        symbol: String(req.body.symbol).replace('/', '').toUpperCase(),
        timeframe,
        status: req.body.status || 'active',
        side_mode: req.body.side_mode || 'both',
        leverage: Math.min(125, Math.max(1, Number(req.body.leverage) || 1)),
        order_size_pct: Math.min(100, Math.max(0.1, Number(req.body.order_size_pct) || 10)),
        take_profit_pct: req.body.take_profit_pct != null ? Number(req.body.take_profit_pct) : null,
        stop_loss_pct: req.body.stop_loss_pct != null ? Number(req.body.stop_loss_pct) : null,
      };
      const { data, error } = await client.from('strategies').insert(row).select('id, name, symbol, timeframe, status, created_at').single();
      if (error) return res.status(500).json({ error: error.message, requestId });
      return res.status(201).json({ strategy: data, requestId });
    } catch (err) {
      return res.status(500).json({ error: 'Create failed', requestId });
    }
  }
);

/**
 * PUT /api/runner/strategies/:id — update strategy (timeframe validation: 1m admin-only)
 */
strategiesRunnerRouter.put(
  '/strategies/:id',
  uuidParam('id'),
  validate([
    body('name').optional().isString().notEmpty(),
    body('timeframe').optional().isIn(['1m', '5m', '15m', '1h']),
    body('status').optional().isIn(['active', 'paused', 'stopped']),
    body('side_mode').optional().isIn(['long', 'short', 'both']),
    body('leverage').optional().isInt({ min: 1, max: 125 }),
    body('order_size_pct').optional().isFloat({ min: 0.1, max: 100 }),
    body('take_profit_pct').optional().isFloat(),
    body('stop_loss_pct').optional().isFloat(),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    const requestId = (req as any).requestId || 'runner';
    const id = req.params.id;
    const isAdmin = req.user!.role === 'admin';
    const timeframe = req.body.timeframe as string | undefined;
    if (timeframe != null && !allowTimeframe(timeframe, isAdmin)) {
      return res.status(400).json({ error: 'timeframe 1m is admin-only', requestId });
    }
    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (req.body.name != null) updates.name = req.body.name;
      if (req.body.timeframe != null) updates.timeframe = req.body.timeframe;
      if (req.body.status != null) updates.status = req.body.status;
      if (req.body.side_mode != null) updates.side_mode = req.body.side_mode;
      if (req.body.leverage != null) updates.leverage = Math.min(125, Math.max(1, Number(req.body.leverage)));
      if (req.body.order_size_pct != null) updates.order_size_pct = Math.min(100, Math.max(0.1, Number(req.body.order_size_pct)));
      if (req.body.take_profit_pct !== undefined) updates.take_profit_pct = req.body.take_profit_pct == null ? null : Number(req.body.take_profit_pct);
      if (req.body.stop_loss_pct !== undefined) updates.stop_loss_pct = req.body.stop_loss_pct == null ? null : Number(req.body.stop_loss_pct);
      const { data, error } = await client.from('strategies').update(updates).eq('id', id).eq('user_id', req.user!.id).select('id, name, symbol, timeframe, status, updated_at').single();
      if (error) return res.status(500).json({ error: error.message, requestId });
      if (!data) return res.status(404).json({ error: 'Strategy not found', requestId });
      return res.json({ strategy: data, requestId });
    } catch (err) {
      return res.status(500).json({ error: 'Update failed', requestId });
    }
  }
);
