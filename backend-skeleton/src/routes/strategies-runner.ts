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
import { RUNNER_CONFIG } from '../lib/runnerConfig.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

const ENABLE_RUNNER = RUNNER_CONFIG.ENABLE_STRATEGY_RUNNER;
const ENABLE_ADMIN_SIMULATE = process.env.ENABLE_RUNNER_ADMIN_ENDPOINTS === 'true';

function requireRunnerEnabled(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!ENABLE_RUNNER) {
    return res.status(503).json({
      ok: false,
      requestId: (req as any).requestId || 'runner',
      error: 'Strategy runner is disabled',
      code: 'RUNNER_DISABLED',
    });
  }
  next();
}

/**
 * Cron auth: if x-cron-secret matches RUNNER_CRON_SECRET, allow without JWT; else require admin JWT.
 * If x-cron-secret is provided but RUNNER_CRON_SECRET is not configured -> 503 (cron secret mode disabled).
 * Never return secrets in responses.
 */
function cronOrAdminAuth(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-cron-secret'];
  const hasHeader = typeof secret === 'string' && secret.length > 0;
  const cronSecretConfigured = RUNNER_CONFIG.cronSecretConfigured;

  if (hasHeader && !cronSecretConfigured) {
    return res.status(503).json({
      ok: false,
      requestId: (req as any).requestId || 'runner',
      error: 'Cron secret mode is not configured',
      code: 'CRON_SECRET_NOT_CONFIGURED',
    });
  }

  if (cronSecretConfigured && typeof secret === 'string' && secret === process.env.RUNNER_CRON_SECRET) {
    return next();
  }

  verifySupabaseJWT(req as AuthenticatedRequest, res, (err?: unknown) => {
    if (err) return next(err);
    requireAdmin(req as AuthenticatedRequest, res, next);
  });
}

function sanitizeMessage(msg: string): string {
  return msg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]').replace(/\s+/g, ' ').trim();
}

export const strategiesRunnerRouter: Router = Router();

/**
 * POST /api/runner/cron — run all due strategy_runs. Auth: x-cron-secret (RUNNER_CRON_SECRET) OR admin JWT.
 * Returns: { ok, requestId, startedAt, finishedAt, summary: { processed, ran, skipped, blocked, errored }, notes }.
 */
strategiesRunnerRouter.post('/cron', cronOrAdminAuth, requireRunnerEnabled, async (req: Request, res: Response) => {
  const client = getSupabase();
  const requestId = (req as any).requestId || 'runner';
  const startedAt = new Date();

  if (!client) {
    return res.status(503).json({
      ok: false,
      requestId,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      summary: { processed: 0, ran: 0, skipped: 0, blocked: 0, errored: 0 },
      notes: ['Database unavailable'],
    });
  }

  try {
    const summary = await runDueStrategies(client, startedAt, { requestId });
    const finishedAt = new Date();
    const processed = summary.ran + summary.skipped + summary.blocked + summary.errors;
    return res.json({
      ok: true,
      requestId,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      summary: {
        processed,
        ran: summary.ran,
        skipped: summary.skipped,
        blocked: summary.blocked,
        errored: summary.errors,
      },
      notes: [],
    });
  } catch (err) {
    const finishedAt = new Date();
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const safe = sanitizeMessage(msg);
    console.error(`[${requestId}] cron error:`, safe);
    return res.status(500).json({
      ok: false,
      requestId,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      summary: { processed: 0, ran: 0, skipped: 0, blocked: 0, errored: 0 },
      notes: [safe],
    });
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
      .select('scheduled_at, started_at, status')
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: pausedUsers } = await client
      .from('strategy_risk_state')
      .select('user_id, paused_reason, paused_until')
      .eq('is_paused', true);
    const lastBlockedReasons = (pausedUsers ?? []).map((u: { paused_reason?: string }) => u.paused_reason).filter(Boolean);
    return res.json({
      ok: true,
      enabled: ENABLE_RUNNER,
      activeStrategies: activeCount ?? 0,
      lastRunAt: lastRun?.scheduled_at ?? lastRun?.started_at ?? null,
      lastRunStatus: lastRun?.status ?? null,
      blockedUsersCount: pausedUsers?.length ?? 0,
      lastBlockedReasons: [...new Set(lastBlockedReasons)].slice(0, 5),
      requestId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ ok: false, error: sanitizeMessage(msg), requestId });
  }
});

/**
 * GET /api/runner/tick-runs?limit=20 (admin) — last N from strategy_tick_runs. No secrets; minimal user_id.
 */
strategiesRunnerRouter.get('/tick-runs', async (req: AuthenticatedRequest, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'runner';
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  try {
    const { data, error } = await client
      .from('strategy_tick_runs')
      .select('id, strategy_run_id, user_id, started_at, status, reason, latency_ms')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    const runs = (data ?? []).map((r: { id: string; strategy_run_id: string; user_id: string; started_at: string; status: string; reason: string | null; latency_ms: number | null }) => ({
      id: r.id,
      strategy_run_id: r.strategy_run_id,
      user_id: r.user_id,
      started_at: r.started_at,
      status: r.status,
      reason: r.reason ?? null,
      latency_ms: r.latency_ms ?? null,
    }));
    return res.json({ ok: true, tickRuns: runs, requestId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ ok: false, error: sanitizeMessage(msg), requestId });
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
