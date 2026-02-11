/**
 * Public API — no auth. For SEO and logged-out users.
 * GET /api/public/top-bots: top 10 DCA bots by ROI (site-wide).
 */
import { Router, Request, Response } from 'express';
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

/** Approximate max exposure from config (base + safety orders). */
function getExposureFromConfig(config: Record<string, unknown> | null | undefined): number {
  if (!config) return 0;
  const base = Number(config.baseOrderSizeUsdt ?? 0);
  const max = Number(config.maxSafetyOrders ?? 0);
  const mult = Number(config.safetyOrderMultiplier ?? 1.2);
  if (base <= 0 || max <= 0) return 0;
  if (mult === 1) return base * max;
  const sum = (Math.pow(mult, max) - 1) / (mult - 1);
  return base * sum;
}

export const publicTopBotsRouter: Router = Router();

/**
 * GET /api/public/top-bots
 * Top 10 DCA bots across all users by ROI (then by realized PnL). Public, no auth.
 * Returns name, pair, timeframe, exchange, market, config (for copy), realizedPnl, roiPct.
 */
publicTopBotsRouter.get('/top-bots', async (_req: Request, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const { data: rows, error } = await client
      .from('dca_bots')
      .select('id, name, pair, timeframe, exchange, market, config, dca_bot_state(realized_pnl)')
      .not('config', 'is', null);
    if (error) {
      console.error('Public top-bots error:', error);
      return res.status(500).json({ error: 'Failed to fetch top bots' });
    }
    const list = (rows ?? []) as Array<{
      id: string;
      name: string;
      pair: string;
      timeframe: string;
      exchange: string;
      market: string;
      config?: Record<string, unknown> | null;
      dca_bot_state?: Array<{ realized_pnl?: number | string }> | { realized_pnl?: number | string } | null;
    }>;
    const withMetrics = list.map((b) => {
      const state = Array.isArray(b.dca_bot_state) ? b.dca_bot_state[0] : b.dca_bot_state;
      const realizedPnl = state?.realized_pnl != null ? Number(state.realized_pnl) : 0;
      const exposure = getExposureFromConfig(b.config);
      const roiPct = exposure > 0 ? (realizedPnl / exposure) * 100 : 0;
      return {
        id: b.id,
        name: b.name,
        pair: b.pair,
        timeframe: b.timeframe ?? '1h',
        exchange: (b.exchange === 'bybit' ? 'bybit' : 'binance') as 'binance' | 'bybit',
        market: (b.market === 'futures' ? 'futures' : 'spot') as 'spot' | 'futures',
        config: b.config ?? {},
        realizedPnl,
        roiPct,
      };
    });
    const top10 = withMetrics
      .sort((a, b) => {
        const roiA = a.roiPct;
        const roiB = b.roiPct;
        if (roiA !== roiB) return roiB - roiA;
        return b.realizedPnl - a.realizedPnl;
      })
      .slice(0, 10)
      .map(({ id, name, pair, timeframe, exchange, market, config, realizedPnl, roiPct }) => ({
        id,
        name,
        pair,
        timeframe,
        exchange,
        market,
        config,
        realizedPnl,
        roiPct,
      }));
    res.json({ topBots: top10 });
  } catch (err) {
    console.error('Public top-bots error:', err);
    res.status(500).json({ error: 'Failed to fetch top bots' });
  }
});
