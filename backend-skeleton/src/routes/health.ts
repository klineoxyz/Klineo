import { Router } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export const healthRouter: Router = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'klineo-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /health/runner
 * Optional ops endpoint: strategy runner status (last tick, active/total strategy runs).
 * No auth required; safe for internal monitoring.
 */
healthRouter.get('/runner', async (req, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({
      status: 'unavailable',
      runner: { error: 'Database not configured' },
      timestamp: new Date().toISOString()
    });
  }
  try {
    const [
      { data: runs, error: runsErr },
      { data: lastTick, error: tickErr }
    ] = await Promise.all([
      client.from('strategy_runs').select('id, status'),
      client.from('strategy_tick_runs').select('scheduled_at, started_at').order('scheduled_at', { ascending: false }).limit(1).maybeSingle()
    ]);
    if (runsErr || tickErr) {
      return res.status(500).json({
        status: 'error',
        runner: { error: runsErr?.message || tickErr?.message || 'Query failed' },
        timestamp: new Date().toISOString()
      });
    }
    const total = runs?.length ?? 0;
    const active = runs?.filter((r: { status: string }) => r.status === 'active').length ?? 0;
    res.json({
      status: 'ok',
      service: 'klineo-api',
      timestamp: new Date().toISOString(),
      runner: {
        strategy_runs_total: total,
        strategy_runs_active: active,
        last_tick_at: lastTick?.started_at ?? lastTick?.scheduled_at ?? null
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({
      status: 'error',
      runner: { error: msg },
      timestamp: new Date().toISOString()
    });
  }
});
