/**
 * GET /api/candles/klines — historical OHLCV from connected exchange (Binance or Bybit Futures).
 * Used by Strategy Backtest and any UI that needs exchange-aligned data.
 * Auth required. Query: exchange, symbol, interval, limit, env (optional).
 */

import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import { getKlines, type ExchangeEnv } from '../lib/candles.js';
import { verifySupabaseJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const VALID_EXCHANGES = ['binance', 'bybit'];
const VALID_INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'];
const MAX_LIMIT = 500;

export const candlesRouter = Router();

candlesRouter.get(
  '/klines',
  verifySupabaseJWT,
  validate([
    query('exchange').isIn(VALID_EXCHANGES).withMessage('exchange must be binance or bybit'),
    query('symbol').isString().notEmpty().withMessage('symbol required (e.g. BTCUSDT)'),
    query('interval').optional().isIn(VALID_INTERVALS).withMessage(`interval one of: ${VALID_INTERVALS.join(', ')}`),
    query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).withMessage(`limit 1-${MAX_LIMIT}`),
    query('env').optional().isIn(['production', 'testnet']).withMessage('env must be production or testnet'),
  ]),
  async (req: Request, res: Response) => {
    const requestId = (req as any).requestId || 'unknown';
    const exchange = (req.query.exchange as string).toLowerCase() as 'binance' | 'bybit';
    const symbol = (req.query.symbol as string).replace('/', '').toUpperCase();
    const interval = (req.query.interval as string) || '1h';
    const limit = Math.min(parseInt(String(req.query.limit || 500), 10) || 500, MAX_LIMIT);
    const env = ((req.query.env as string) || 'production') as ExchangeEnv;

    try {
      const candles = await getKlines(exchange, symbol, interval, limit, env);
      res.json({
        exchange,
        symbol,
        interval,
        env,
        candles: candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
        requestId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const sanitized = msg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      console.error(`[${requestId}] GET /api/candles/klines error:`, sanitized);
      res.status(500).json({
        error: 'Failed to fetch klines',
        message: sanitized,
        requestId,
      });
    }
  }
);
