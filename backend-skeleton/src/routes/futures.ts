/**
 * POST /api/futures/order — manual futures market order (MVP).
 * Authenticated; checks connection futures_enabled, kill_switch, symbol whitelist, leverage/notional.
 * Never returns secrets; errors sanitized.
 */

import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from '../lib/crypto.js';
import * as binanceFutures from '../lib/binance-futures.js';
import * as bybitFutures from '../lib/bybit-futures.js';

const ALLOWED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

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

export const futuresRouter: Router = Router();

futuresRouter.use(verifySupabaseJWT);

/**
 * POST /api/futures/order
 * Body: { connectionId, symbol, side, qty, type: 'MARKET' }
 * qty: base asset quantity (e.g. 0.001 for BTCUSDT).
 */
futuresRouter.post(
  '/order',
  validate([
    body('connectionId').isUUID().withMessage('connectionId required'),
    body('symbol').isString().notEmpty().withMessage('symbol required'),
    body('side').isIn(['BUY', 'SELL']).withMessage('side must be BUY or SELL'),
    body('qty').isString().notEmpty().withMessage('qty required'),
    body('type').equals('MARKET').withMessage('type must be MARKET'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable', requestId: (req as any).requestId });
    }
    const requestId = (req as any).requestId || 'unknown';
    const { connectionId, symbol, side, qty } = req.body as { connectionId: string; symbol: string; side: 'BUY' | 'SELL'; qty: string };

    const normalizedSymbol = symbol.replace('/', '').toUpperCase();
    if (!ALLOWED_SYMBOLS.includes(normalizedSymbol)) {
      return res.status(400).json({ error: 'Symbol not allowed', allowed: ALLOWED_SYMBOLS, requestId });
    }

    const qtyNum = parseFloat(qty);
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ error: 'qty must be a positive number', requestId });
    }

    try {
      const { data: connection, error: fetchError } = await client
        .from('user_exchange_connections')
        .select('id, exchange, environment, encrypted_config_b64, futures_enabled, kill_switch, max_leverage_allowed, max_notional_usdt')
        .eq('id', connectionId)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchError || !connection) {
        return res.status(404).json({ error: 'Connection not found', requestId });
      }
      if (!connection.futures_enabled) {
        return res.status(400).json({ error: 'Futures not enabled for this connection', requestId });
      }
      if (connection.kill_switch) {
        return res.status(400).json({ error: 'Kill switch is ON; no futures orders', requestId });
      }

      const hasB64 = typeof connection.encrypted_config_b64 === 'string' && connection.encrypted_config_b64.length > 0;
      if (!hasB64) {
        return res.status(400).json({ error: 'Credentials need to be re-saved', requestId });
      }

      const env = (connection.environment || 'production') as 'production' | 'testnet';
      const decryptedJson = await decrypt(encryptedConfigToBase64(connection.encrypted_config_b64));
      const parsed = JSON.parse(decryptedJson);
      const qtyStr = String(qtyNum);

      if (connection.exchange === 'bybit') {
        const creds: bybitFutures.BybitFuturesCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
        const result = await bybitFutures.placeOrder(creds, {
          symbol: normalizedSymbol,
          side,
          qty: qtyStr,
          type: 'MARKET',
        });
        return res.json({ orderId: result.orderId, status: result.status, requestId });
      } else {
        const creds: binanceFutures.BinanceFuturesCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
        const result = await binanceFutures.placeOrder(creds, {
          symbol: normalizedSymbol,
          side,
          qty: qtyStr,
          type: 'MARKET',
        });
        return res.json({ orderId: result.orderId, status: result.status, requestId });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const sanitized = msg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      console.error(`[${requestId}] Futures order error:`, sanitized);
      return res.status(500).json({ error: 'Order failed', message: sanitized, requestId });
    }
  }
);
