/**
 * Trading: execution logs (audit) and test-order for live verification.
 * GET /api/trading/execution-logs — last 100 order attempts for current user.
 * POST /api/trading/test-order — place smallest valid market order, write to audit, return exchange_order_id.
 */

import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from '../lib/crypto.js';
import { executeOrder } from '../lib/orderExecution.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

function encryptedConfigToBase64(raw: unknown): string {
  if (Buffer.isBuffer(raw)) return raw.toString('base64');
  if (typeof raw === 'string') {
    if (raw.startsWith('\\x') || raw.startsWith('0x')) {
      const hex = raw.replace(/^\\x|^0x/i, '');
      return Buffer.from(hex, 'hex').toString('base64');
    }
    return raw;
  }
  if (raw && typeof raw === 'object' && 'type' in (raw as object) && (raw as { type: string }).type === 'Buffer' && Array.isArray((raw as { data: number[] }).data)) {
    return Buffer.from((raw as { data: number[] }).data).toString('base64');
  }
  throw new Error('Invalid encrypted_config format');
}

export const tradingRouter: Router = Router();
tradingRouter.use(verifySupabaseJWT);

/** Last 100 order execution audit rows for current user. Optional filter by source. */
tradingRouter.get('/execution-logs', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const source = req.query.source as string | undefined;
    let query = client
      .from('order_execution_audit')
      .select('id, source, bot_id, copy_setup_id, exchange, market_type, symbol, side, order_type, requested_qty, requested_quote, status, error_code, error_message, exchange_order_id, min_notional, created_at')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (source && ['DCA', 'GRID', 'COPY', 'TERMINAL'].includes(source)) {
      query = query.eq('source', source);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Execution logs error:', error);
      return res.status(500).json({ error: 'Failed to fetch execution logs' });
    }
    return res.json({
      logs: (data ?? []).map((row: any) => ({
        id: row.id,
        source: row.source,
        bot_id: row.bot_id,
        copy_setup_id: row.copy_setup_id,
        exchange: row.exchange,
        market_type: row.market_type,
        symbol: row.symbol,
        side: row.side,
        order_type: row.order_type,
        requested_qty: row.requested_qty,
        requested_quote: row.requested_quote,
        status: row.status,
        error_code: row.error_code,
        error_message: row.error_message,
        exchange_order_id: row.exchange_order_id,
        min_notional: row.min_notional,
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    console.error('Execution logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch execution logs' });
  }
});

/**
 * POST /api/trading/test-order
 * Place smallest valid market order for selected pair (spot). Uses first connected exchange for user.
 * Writes to order_execution_audit. Returns exchange_order_id on success.
 * Body: { connectionId: string, symbol: string } e.g. { connectionId: "uuid", symbol: "ETHUSDT" }
 */
tradingRouter.post(
  '/test-order',
  validate([
    body('connectionId').isUUID().withMessage('connectionId required'),
    body('symbol').trim().notEmpty().withMessage('symbol required'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });
    const userId = req.user!.id;
    const { connectionId, symbol } = req.body as { connectionId: string; symbol: string };
    const normalizedSymbol = symbol.replace('/', '').toUpperCase();

    try {
      const { data: connection, error: connErr } = await client
        .from('user_exchange_connections')
        .select('id, exchange, environment, encrypted_config_b64')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .single();

      if (connErr || !connection?.encrypted_config_b64) {
        return res.status(404).json({
          success: false,
          status: 'FAILED',
          reason_code: 'CONNECTION_NOT_FOUND',
          message: 'Connection not found',
        });
      }

      const raw = await decrypt(encryptedConfigToBase64(connection.encrypted_config_b64));
      const parsed = JSON.parse(raw) as { apiKey: string; apiSecret: string };
      const env = (connection.environment || 'production') as 'production' | 'testnet';

      const result = await executeOrder(client, {
        userId,
        source: 'TERMINAL',
        exchange: connection.exchange as 'binance' | 'bybit',
        marketType: 'spot',
        symbol: normalizedSymbol,
        side: 'buy',
        orderType: 'market',
        quantity: '0.001',
        credentials: { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret },
        environment: env,
      });

      if (result.success && result.exchange_order_id) {
        return res.json({
          success: true,
          status: 'PLACED',
          exchange_order_id: result.exchange_order_id,
          message: 'Test order placed. Check exchange to confirm.',
        });
      }
      return res.status(result.status === 'SKIPPED' ? 400 : 500).json({
        success: false,
        status: result.status,
        reason_code: result.reason_code,
        message: result.message,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const sanitized = msg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      return res.status(500).json({
        success: false,
        status: 'FAILED',
        reason_code: 'EXCEPTION',
        message: sanitized,
      });
    }
  }
);
