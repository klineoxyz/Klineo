/**
 * POST /api/futures/order — manual futures market order (MVP).
 * Accepts qty (base) or quoteSizeUsdt; converts USDT to base using mark price.
 * Authenticated; checks connection futures_enabled, kill_switch, symbol whitelist, max_notional_usdt.
 * 409 if futures OFF; 423 if kill switch. Never returns secrets; errors sanitized.
 */

import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from '../lib/crypto.js';
import { isPlatformKillSwitchOn } from '../lib/platformSettings.js';
import * as binanceFutures from '../lib/binance-futures.js';
import * as bybitFutures from '../lib/bybit-futures.js';

const ALLOWED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

/** Base quantity decimal precision by symbol (MVP). */
function baseQtyPrecision(symbol: string): number {
  const s = symbol.replace('/', '').toUpperCase();
  if (s === 'BTCUSDT') return 5;
  if (s === 'ETHUSDT') return 4;
  if (s === 'SOLUSDT') return 3;
  return 4;
}

function roundDownToPrecision(value: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  const rounded = Math.floor(value * factor) / factor;
  return rounded.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

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
 * Body: { connectionId, symbol, side, type: 'MARKET', qty? (base), quoteSizeUsdt? }
 * Provide either qty (base asset) or quoteSizeUsdt (USDT size; we convert using mark price).
 */
futuresRouter.post(
  '/order',
  validate([
    body('connectionId').isUUID().withMessage('connectionId required'),
    body('symbol').isString().notEmpty().withMessage('symbol required'),
    body('side').isIn(['BUY', 'SELL']).withMessage('side must be BUY or SELL'),
    body('qty').optional().isString(),
    body('quoteSizeUsdt').optional().isFloat({ min: 0.01 }),
    body('type').equals('MARKET').withMessage('type must be MARKET'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable', requestId: (req as any).requestId });
    }
    const requestId = (req as any).requestId || 'unknown';
    const body_ = req.body as { connectionId: string; symbol: string; side: 'BUY' | 'SELL'; qty?: string; quoteSizeUsdt?: number; type: string };

    const normalizedSymbol = body_.symbol.replace('/', '').toUpperCase();
    if (!ALLOWED_SYMBOLS.includes(normalizedSymbol)) {
      return res.status(400).json({ error: 'Symbol not allowed', allowed: ALLOWED_SYMBOLS, requestId });
    }

    const hasQty = body_.qty != null && String(body_.qty).trim() !== '';
    const quoteUsdt = body_.quoteSizeUsdt != null ? Number(body_.quoteSizeUsdt) : NaN;
    const hasQuote = !Number.isNaN(quoteUsdt) && quoteUsdt > 0;

    if (!hasQty && !hasQuote) {
      return res.status(400).json({ error: 'Provide qty (base) or quoteSizeUsdt', requestId });
    }
    if (hasQty && hasQuote) {
      return res.status(400).json({ error: 'Provide only one of qty or quoteSizeUsdt', requestId });
    }

    try {
      const { data: connection, error: fetchError } = await client
        .from('user_exchange_connections')
        .select('id, exchange, environment, encrypted_config_b64, futures_enabled, kill_switch, max_leverage_allowed, max_notional_usdt')
        .eq('id', body_.connectionId)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchError || !connection) {
        return res.status(404).json({ error: 'Connection not found', requestId });
      }
      if (!connection.futures_enabled) {
        return res.status(409).json({ error: 'Futures is OFF. Enable futures first.', requestId });
      }
      if (connection.kill_switch) {
        return res.status(423).json({ error: 'Kill switch enabled.', requestId });
      }
      if (await isPlatformKillSwitchOn(client)) {
        return res.status(423).json({ error: 'Platform kill switch enabled.', requestId });
      }

      const hasB64 = typeof connection.encrypted_config_b64 === 'string' && connection.encrypted_config_b64.length > 0;
      if (!hasB64) {
        return res.status(400).json({ error: 'Credentials need to be re-saved', requestId });
      }

      let qtyStr: string;
      if (hasQuote) {
        const maxNotional = Number(connection.max_notional_usdt ?? 200);
        if (quoteUsdt > maxNotional) {
          return res.status(400).json({ error: `quoteSizeUsdt exceeds max notional (${maxNotional} USDT)`, requestId });
        }
        const env = (connection.environment || 'production') as 'production' | 'testnet';
        let markPrice: number;
        if (connection.exchange === 'bybit') {
          markPrice = await bybitFutures.getMarkPrice(env, normalizedSymbol);
        } else {
          markPrice = await binanceFutures.getMarkPrice(env, normalizedSymbol);
        }
        const qtyBase = quoteUsdt / markPrice;
        const precision = baseQtyPrecision(normalizedSymbol);
        qtyStr = roundDownToPrecision(qtyBase, precision);
        const qtyNum = parseFloat(qtyStr);
        if (qtyNum <= 0) {
          return res.status(400).json({ error: 'quoteSizeUsdt too small to produce valid base qty', requestId });
        }
      } else {
        const qtyNum = parseFloat(String(body_.qty).trim());
        if (Number.isNaN(qtyNum) || qtyNum <= 0) {
          return res.status(400).json({ error: 'qty must be a positive number', requestId });
        }
        qtyStr = String(qtyNum);
      }

      const env = (connection.environment || 'production') as 'production' | 'testnet';
      const decryptedJson = await decrypt(encryptedConfigToBase64(connection.encrypted_config_b64));
      const parsed = JSON.parse(decryptedJson);

      if (connection.exchange === 'bybit') {
        const creds: bybitFutures.BybitFuturesCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
        const result = await bybitFutures.placeOrder(creds, {
          symbol: normalizedSymbol,
          side: body_.side,
          qty: qtyStr,
          type: 'MARKET',
        });
        return res.json({ orderId: result.orderId, status: result.status, requestId });
      } else {
        const creds: binanceFutures.BinanceFuturesCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
        const result = await binanceFutures.placeOrder(creds, {
          symbol: normalizedSymbol,
          side: body_.side,
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
