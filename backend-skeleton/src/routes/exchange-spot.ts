/**
 * Spot order validation (dry-run). No real orders placed.
 * POST /api/exchange/spot/validate-order — checks symbol, filters, rounds qty, returns normalized request.
 */
import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { toExchangeSymbol } from '../lib/symbols.js';
import { getSpotSymbolFilters } from '../lib/binance.js';
import { getSpotSymbolFilters as getBybitSpotFilters } from '../lib/bybit.js';
import { getTickerPrice as getBinanceTicker } from '../lib/binance.js';
import { getTickerPrice as getBybitTicker } from '../lib/bybit.js';
import { roundToStep, clampAndRoundQty } from '../lib/symbols.js';

export const exchangeSpotRouter = Router();
exchangeSpotRouter.use(verifySupabaseJWT);

exchangeSpotRouter.post(
  '/spot/validate-order',
  validate([
    body('exchange').isIn(['binance', 'bybit']).withMessage('exchange must be binance or bybit'),
    body('symbol').trim().notEmpty().withMessage('symbol or pair required'),
    body('side').isIn(['buy', 'sell']).withMessage('side must be buy or sell'),
    body('type').isIn(['market', 'limit']).withMessage('type must be market or limit'),
    body('quantity').optional().isFloat({ min: 0 }),
    body('quoteOrderQty').optional().isFloat({ min: 0 }),
    body('price').optional().isFloat({ min: 0 }),
  ]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const exchange = req.body.exchange as string;
      const symbol = toExchangeSymbol(req.body.symbol);
      const side = req.body.side as string;
      const type = req.body.type as string;
      const quantity = req.body.quantity != null ? Number(req.body.quantity) : undefined;
      const quoteOrderQty = req.body.quoteOrderQty != null ? Number(req.body.quoteOrderQty) : undefined;
      const price = req.body.price != null ? Number(req.body.price) : undefined;

      if (!quantity && !quoteOrderQty) {
        return res.status(400).json({
          valid: false,
          error: 'Provide quantity or quoteOrderQty (for market buy in quote)',
        });
      }

      let filters: { minQty: number; maxQty: number; stepSize: number; minNotional: number };
      try {
        if (exchange === 'binance') {
          filters = await getSpotSymbolFilters(symbol);
        } else {
          filters = await getBybitSpotFilters(symbol, 'production');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Symbol not found';
        return res.status(400).json({ valid: false, error: msg });
      }

      let currentPrice: number | undefined;
      try {
        if (exchange === 'binance') {
          const t = await getBinanceTicker(symbol);
          currentPrice = parseFloat(t.price);
        } else {
          const t = await getBybitTicker(symbol, 'production');
          currentPrice = parseFloat(t.price);
        }
      } catch {
        currentPrice = undefined;
      }

      const effectivePrice = price ?? currentPrice ?? 0;
      let qty: string | undefined;
      let notional: number | undefined;

      if (quantity != null && quantity > 0) {
        qty = clampAndRoundQty(quantity, filters.minQty, filters.maxQty, filters.stepSize);
        notional = parseFloat(qty) * effectivePrice;
      } else if (quoteOrderQty != null && quoteOrderQty > 0 && effectivePrice > 0) {
        const qtyRaw = quoteOrderQty / effectivePrice;
        qty = clampAndRoundQty(qtyRaw, filters.minQty, filters.maxQty, filters.stepSize);
        notional = parseFloat(qty) * effectivePrice;
      }

      if (qty && notional !== undefined && notional < filters.minNotional) {
        return res.status(200).json({
          valid: false,
          error: `Notional ${notional.toFixed(2)} below min notional ${filters.minNotional}`,
          filters: {
            minQty: filters.minQty,
            maxQty: filters.maxQty,
            stepSize: filters.stepSize,
            minNotional: filters.minNotional,
          },
        });
      }

      return res.json({
        valid: true,
        normalized: {
          symbol,
          side,
          type,
          quantity: qty,
          price: type === 'limit' && effectivePrice > 0 ? roundToStep(effectivePrice, 1e-2) : undefined,
          notional: notional != null ? Number(notional.toFixed(2)) : undefined,
        },
        filters: {
          minQty: filters.minQty,
          maxQty: filters.maxQty,
          stepSize: filters.stepSize,
          minNotional: filters.minNotional,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Validation failed';
      console.error('Spot validate-order error:', msg);
      return res.status(500).json({ valid: false, error: msg });
    }
  }
);
