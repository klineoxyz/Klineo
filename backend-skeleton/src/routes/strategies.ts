/**
 * Strategy lifecycle and execute-tick for Futures auto trading.
 * POST /api/strategies — create from backtest config
 * GET /api/strategies — list user strategies
 * PUT /api/strategies/:id/status — active | paused | stopped (preflight on activate)
 * GET /api/strategies/:id — details + latest events
 * POST /api/strategies/:id/execute-tick — one tick (internal/scheduler); enforces risk, logs events
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam } from '../middleware/validation.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from '../lib/crypto.js';
import { createBinanceFuturesAdapter } from '../lib/binance-futures.js';
import { createBybitFuturesAdapter } from '../lib/bybit-futures.js';
import { runRsiTick, MAX_CONSECUTIVE_FAILURES } from '../lib/strategy-engine.js';
import type { StrategyRunRow, ConnectionRow } from '../lib/strategy-engine.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export const strategiesRouter: Router = Router();
strategiesRouter.use(verifySupabaseJWT);

/**
 * POST /api/strategies
 * Create strategy_run from backtest config (same shape as UI).
 */
strategiesRouter.post(
  '/',
  validate([
    body('exchange_connection_id').isUUID().withMessage('exchange_connection_id required'),
    body('symbol').isString().notEmpty().withMessage('symbol required'),
    body('timeframe').isString().notEmpty().withMessage('timeframe required'),
    body('direction').isIn(['long', 'short', 'both']).withMessage('direction long|short|both'),
    body('leverage').isInt({ min: 1, max: 125 }).withMessage('leverage 1-125'),
    body('margin_mode').optional().isIn(['isolated', 'cross']),
    body('position_mode').optional().isIn(['one_way', 'hedge']),
    body('order_size_pct').optional().isFloat({ min: 0.1, max: 100 }),
    body('initial_capital_usdt').optional().isFloat({ min: 0 }),
    body('take_profit_pct').optional().isFloat({ min: 0 }),
    body('stop_loss_pct').optional().isFloat({ min: 0 }),
    body('strategy_template').optional().isString(),
    body('strategy_params').optional().isObject(),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    const requestId = (req as any).requestId || 'unknown';
    const userId = req.user!.id;

    try {
      const {
        exchange_connection_id,
        symbol,
        timeframe,
        direction,
        leverage,
        margin_mode = 'isolated',
        position_mode = 'one_way',
        order_size_pct = 100,
        initial_capital_usdt = 0,
        take_profit_pct = 3,
        stop_loss_pct = 1.5,
        strategy_template = 'rsi_oversold_overbought',
        strategy_params = {},
      } = req.body;

      const { data: conn, error: connErr } = await client
        .from('user_exchange_connections')
        .select('id, user_id, exchange, futures_enabled, max_leverage_allowed')
        .eq('id', exchange_connection_id)
        .eq('user_id', userId)
        .single();

      if (connErr || !conn) {
        return res.status(404).json({ error: 'Exchange connection not found', requestId });
      }
      if (!conn.futures_enabled) {
        return res.status(400).json({ error: 'Futures not enabled for this connection', requestId });
      }
      const maxLev = Number(conn.max_leverage_allowed ?? 10);
      if (Number(leverage) > maxLev) {
        return res.status(400).json({ error: `Leverage must be <= ${maxLev}`, requestId });
      }

      const { data: run, error: insertErr } = await client
        .from('strategy_runs')
        .insert({
          user_id: userId,
          exchange_connection_id,
          exchange: conn.exchange,
          market_type: 'futures',
          symbol: symbol.replace('/', ''),
          timeframe,
          direction,
          leverage: Number(leverage),
          margin_mode,
          position_mode,
          order_size_pct: Number(order_size_pct),
          initial_capital_usdt: Number(initial_capital_usdt),
          take_profit_pct: Number(take_profit_pct),
          stop_loss_pct: Number(stop_loss_pct),
          strategy_template,
          strategy_params: strategy_params || {},
          status: 'draft',
        })
        .select('id, status, symbol, timeframe, direction, leverage, created_at')
        .single();

      if (insertErr) {
        console.error(`[${requestId}] Strategy insert error:`, insertErr);
        return res.status(500).json({ error: 'Failed to create strategy', requestId });
      }
      res.status(201).json({ strategy: run, requestId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Internal server error', requestId });
    }
  }
);

/**
 * GET /api/strategies
 */
strategiesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'unknown';
  try {
    const { data: list, error } = await client
      .from('strategy_runs')
      .select('id, exchange_connection_id, exchange, symbol, timeframe, direction, leverage, status, last_signal_at, created_at, updated_at')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to list strategies', requestId });
    res.json({ strategies: list ?? [], requestId });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', requestId });
  }
});

/**
 * GET /api/strategies/:id
 */
strategiesRouter.get('/:id', uuidParam('id'), async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'unknown';
  const id = req.params.id;
  try {
    const { data: run, error } = await client
      .from('strategy_runs')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (error || !run) return res.status(404).json({ error: 'Strategy not found', requestId });

    const { data: events } = await client
      .from('strategy_events')
      .select('id, event_type, payload, created_at')
      .eq('strategy_run_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({ strategy: run, events: events ?? [], requestId });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', requestId });
  }
});

/**
 * PUT /api/strategies/:id/status
 * Body: { status: 'active' | 'paused' | 'stopped' }
 * On activate: preflight checks (connection futures_enabled, kill_switch, leverage, symbol).
 */
strategiesRouter.put(
  '/:id/status',
  uuidParam('id'),
  validate([body('status').isIn(['active', 'paused', 'stopped']).withMessage('status required')]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    const requestId = (req as any).requestId || 'unknown';
    const id = req.params.id;
    const status = req.body.status;

    try {
      const { data: run, error: fetchErr } = await client
        .from('strategy_runs')
        .select('id, user_id, exchange_connection_id, leverage, symbol')
        .eq('id', id)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchErr || !run) return res.status(404).json({ error: 'Strategy not found', requestId });

      if (status === 'active') {
        const { data: conn } = await client
          .from('user_exchange_connections')
          .select('futures_enabled, kill_switch, max_leverage_allowed')
          .eq('id', run.exchange_connection_id)
          .eq('user_id', req.user!.id)
          .single();

        if (!conn?.futures_enabled) {
          return res.status(400).json({ error: 'Futures not enabled for this connection', requestId });
        }
        if (conn.kill_switch) {
          return res.status(400).json({ error: 'Kill switch is ON', requestId });
        }
        const maxLev = Number(conn?.max_leverage_allowed ?? 10);
        if (Number(run.leverage) > maxLev) {
          return res.status(400).json({ error: `Leverage must be <= ${maxLev}`, requestId });
        }
      }

      const { error: updateErr } = await client
        .from('strategy_runs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', req.user!.id);

      if (updateErr) return res.status(500).json({ error: 'Failed to update status', requestId });
      res.json({ status, requestId });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error', requestId });
    }
  }
);

/**
 * POST /api/strategies/:id/execute-tick
 * One tick: fetch candles, compute signal, place order if needed. Enforces risk; logs strategy_events.
 */
strategiesRouter.post('/:id/execute-tick', uuidParam('id'), async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const requestId = (req as any).requestId || 'unknown';
  const id = req.params.id;
  const userId = req.user!.id;

  try {
    const { data: run, error: runErr } = await client
      .from('strategy_runs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (runErr || !run) return res.status(404).json({ error: 'Strategy not found', requestId });
    if (run.status !== 'active') {
      return res.status(400).json({ error: 'Strategy is not active', requestId });
    }

    const { data: conn, error: connErr } = await client
      .from('user_exchange_connections')
      .select('id, encrypted_config_b64, environment, futures_enabled, kill_switch, max_leverage_allowed, max_notional_usdt, margin_mode, position_mode, default_leverage')
      .eq('id', run.exchange_connection_id)
      .eq('user_id', userId)
      .single();

    if (connErr || !conn) return res.status(404).json({ error: 'Connection not found', requestId });

    const hasB64 = typeof conn.encrypted_config_b64 === 'string' && conn.encrypted_config_b64.length > 0;
    if (!hasB64) return res.status(400).json({ error: 'Credentials missing', requestId });

    let decrypted: string;
    try {
      decrypted = await decrypt(conn.encrypted_config_b64);
    } catch {
      return res.status(500).json({ error: 'Decryption failed', requestId });
    }
    const parsed = JSON.parse(decrypted) as { apiKey: string; apiSecret: string };
    const env = (conn.environment || 'production') as 'production' | 'testnet';

    const adapter = run.exchange === 'bybit'
      ? createBybitFuturesAdapter({ apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env })
      : createBinanceFuturesAdapter({ apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env });

    const connectionRow: ConnectionRow = {
      id: conn.id,
      futures_enabled: !!conn.futures_enabled,
      kill_switch: !!conn.kill_switch,
      max_leverage_allowed: Number(conn.max_leverage_allowed ?? 10),
      max_notional_usdt: Number(conn.max_notional_usdt ?? 200),
      margin_mode: conn.margin_mode ?? 'isolated',
      position_mode: conn.position_mode ?? 'one_way',
      default_leverage: Number(conn.default_leverage ?? 3),
      environment: conn.environment ?? 'production',
    };

    const logEvent = async (eventType: string, payload: Record<string, unknown>) => {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(payload)) {
        if (typeof v === 'string' && (v.toLowerCase().includes('key') || v.toLowerCase().includes('secret'))) continue;
        sanitized[k] = v;
      }
      await client.from('strategy_events').insert({
        strategy_run_id: id,
        user_id: userId,
        event_type: eventType,
        payload: sanitized,
      });
    };

    const result = await runRsiTick(
      adapter,
      run as unknown as StrategyRunRow,
      connectionRow,
      logEvent
    );

    if (result.orderPlaced || result.signal !== 'none') {
      await client
        .from('strategy_runs')
        .update({ last_signal_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);
    }

    if (result.error) {
      const { data: recent } = await client
        .from('strategy_events')
        .select('id')
        .eq('strategy_run_id', id)
        .eq('event_type', 'error')
        .order('created_at', { ascending: false })
        .limit(MAX_CONSECUTIVE_FAILURES + 1);
      if (recent && recent.length >= MAX_CONSECUTIVE_FAILURES) {
        await client
          .from('strategy_runs')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);
      }
    }

    res.json({
      signal: result.signal,
      rsi: result.rsi,
      orderPlaced: result.orderPlaced,
      orderId: result.orderId,
      riskBlock: result.riskBlock,
      error: result.error,
      requestId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[${requestId}] execute-tick error:`, msg);
    res.status(500).json({ error: 'Execute tick failed', requestId });
  }
});
