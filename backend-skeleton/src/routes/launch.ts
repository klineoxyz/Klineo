/**
 * GET /api/launch/status — admin-only safe summary for launch readiness.
 * Never exposes env values, tokens, keys, or user emails.
 */

import { Router, Response } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export const launchRouter: Router = Router();

launchRouter.get(
  '/status',
  verifySupabaseJWT,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = (req as any).requestId || 'launch';
    const client = getSupabase();

    if (!client) {
      return res.status(200).json({
        ok: false,
        dbOk: false,
        runnerEnabled: RUNNER_CONFIG.ENABLE_STRATEGY_RUNNER,
        cronSecretSet: RUNNER_CONFIG.cronSecretConfigured,
        strategiesActive: 0,
        connectionsCount: 0,
        lastTickRunAt: null,
        recentErrorCount: 0,
        requestId,
      });
    }

    try {
      const [activeRes, lastRunRes, connectionsRes, errorsRes] = await Promise.all([
        client.from('strategy_runs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        client.from('strategy_tick_runs').select('scheduled_at, started_at').order('scheduled_at', { ascending: false }).limit(1).maybeSingle(),
        client.from('user_exchange_connections').select('id', { count: 'exact', head: true }),
        client.from('strategy_tick_runs').select('id', { count: 'exact', head: true }).eq('status', 'error').gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const activeCount = (activeRes as { count?: number }).count ?? 0;
      const connectionsCount = (connectionsRes as { count?: number }).count ?? 0;
      const recentErrors = (errorsRes as { count?: number }).count ?? 0;
      const lastRun = (lastRunRes as { data?: { scheduled_at?: string; started_at?: string } }).data;
      const lastTickRunAt = lastRun?.scheduled_at ?? lastRun?.started_at ?? null;

      return res.status(200).json({
        ok: true,
        dbOk: true,
        runnerEnabled: RUNNER_CONFIG.ENABLE_STRATEGY_RUNNER,
        cronSecretSet: RUNNER_CONFIG.cronSecretConfigured,
        strategiesActive: activeCount ?? 0,
        connectionsCount: connectionsCount ?? 0,
        lastTickRunAt,
        recentErrorCount: recentErrors ?? 0,
        requestId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({
        ok: false,
        dbOk: true,
        error: msg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]'),
        requestId,
      });
    }
  }
);
