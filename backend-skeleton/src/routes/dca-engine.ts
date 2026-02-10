/**
 * DCA Engine trigger: POST /api/dca-bots/engine/tick
 * Protected by DCA_ENGINE_SECRET (header x-dca-engine-secret or Authorization: Bearer <secret>).
 * Calls processRunningDcaBots and returns processed count + per-bot statuses.
 */
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { processRunningDcaBots } from '../lib/dcaEngine.js';

const DCA_ENGINE_SECRET = process.env.DCA_ENGINE_SECRET || '';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function authEngine(req: Request): boolean {
  if (!DCA_ENGINE_SECRET) return false;
  const headerSecret = req.headers['x-dca-engine-secret'] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  return (headerSecret === DCA_ENGINE_SECRET) || (bearer === DCA_ENGINE_SECRET);
}

export const dcaEngineRouter = Router();

dcaEngineRouter.post('/tick', async (req: Request, res: Response) => {
  if (!authEngine(req)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid DCA_ENGINE_SECRET' });
  }
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }
  const limit = typeof req.body?.limit === 'number' ? Math.min(50, Math.max(1, req.body.limit)) : 10;
  try {
    const { processed, results } = await processRunningDcaBots(client, { limit });
    return res.json({ processed, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Engine tick failed';
    console.error('[dca-engine] tick error:', msg);
    return res.status(500).json({ error: 'Engine tick failed', message: msg });
  }
});
