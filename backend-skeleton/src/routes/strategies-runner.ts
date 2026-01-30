/**
 * Strategy runner: cron (cron-secret or admin JWT), execute-tick, status, simulate (admin only).
 * Operates on strategy_runs (Futures Go Live). No CRUD for strategies table; use /api/strategies for strategy_runs.
 * Gated by ENABLE_STRATEGY_RUNNER; simulate by ENABLE_RUNNER_ADMIN_ENDPOINTS.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam } from '../middleware/validation.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { runStrategyTick, runDueStrategies } from '../lib/strategyRunner.js';
import { recordTradeResult } from '../lib/strategyRisk.js';

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

function requireRunnerEnabled(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!ENABLE_RUNNER) {
    return res.status(503).json({ error: 'Strategy runner is disabled', code: 'RUNNER_DISABLED' });
  }
  next();
}

/**
 * Cron auth: if x-cron-secret matches RUNNER_CRON_SECRET, allow without JWT; else require admin JWT.
 * Never return secrets in responses.
 */
function cronOrAdminAuth(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-cron-secret'];
  const envSecret = process.env.RUNNER_CRON_SECRET;
  if (envSecret && typeof secret === 'string' && secret === envSecret) {
    return next();
  }
  verifySupabaseJWT(req as AuthenticatedRequest, res, (err?: unknown) => {
    if (err) return next(err);
    requireAdmin(req as AuthenticatedRequest, res, next);
  });
}

export const strategiesRunnerRouter: Router = Router();

/**
 * POST /api/runner/cron — run all due strategy_runs. Auth: x-cron-secret (RUNNER_CRON_SECRET) OR admin JWT.
 */
strategiesRunnerRouter.post('/cron', cronOrAdminAuth, requireRunnerEnabled, async (req: Request, res: Response) => {
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

// All routes below require JWT + admin
strategiesRunnerRouter.use(verifySupabaseJWT);
strategiesRunnerRouter.use(requireAdmin);

/**
 * POST /api/runner/execute-tick (admin) — run one strategy_run tick. Body: { strategyRunId: uuid }
 */
strategiesRunnerRouter.post(
  '/execute-tick',
  requireRunnerEnabled,
  validate([body('strategyRunId').isUUID().withMessage('strategyRunId required')]),
  async (req: AuthenticatedRequest, res: Response) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    const requestId = (req as any).requestId || 'runner';
    const { strategyRunId } = req.body;
    const now = new Date();
    try {
      const result = await runStrategyTick(client, strategyRunId, now, { requestId });
      return res.json({ ...result, requestId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${requestId}] execute-tick error:`, msg);
      return res.status(500).json({ error: 'Execute tick failed', requestId });
    }
  }
);

/**
 * GET /api/runner/status (admin) — counts from strategy_runs, last tick run, blocked users
 */
strategiesRunnerRouter.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'runner';
  try {
    const { count: activeCount } = await client
      .from('strategy_runs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
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
  async (req: AuthenticatedRequest, res: Response) => {
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
