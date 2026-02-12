/**
 * Central order execution layer — ALL order placements (DCA, Grid, Copy, Terminal) MUST go through here.
 * - Pre-flight checks (min notional, balance, symbol, etc.)
 * - Single exchange call path
 * - Every attempt written to order_execution_audit (PLACED | SKIPPED | FAILED)
 * No silent failures. No success without exchange_order_id.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import * as binance from './binance.js';
import * as bybit from './bybit.js';
import * as binanceFutures from './binance-futures.js';
import * as bybitFutures from './bybit-futures.js';

export type OrderSource = 'DCA' | 'GRID' | 'COPY' | 'TERMINAL';
export type MarketType = 'spot' | 'futures';
export type AuditStatus = 'PLACED' | 'SKIPPED' | 'FAILED';

/** Default fee buffer for spot balance check (e.g. 0.002 = 0.2%). Env FEE_BUFFER_PERCENT overrides. */
const DEFAULT_FEE_BUFFER_PERCENT = 0.2;
/** Default leverage for futures required-margin estimate when not provided. */
const DEFAULT_FUTURES_LEVERAGE = 10;

export interface PreflightResult {
  allowed: boolean;
  reason_code: string;
  human_message: string;
  minNotional?: number;
  availableBalance?: number;
  requiredBalance?: number;
  feeBufferUsed?: number;
  filters?: { minQty: number; stepSize: number; minNotional: number; maxQty?: number };
}

export interface ExecuteOrderParams {
  userId: string;
  source: OrderSource;
  botId?: string | null;
  copySetupId?: string | null;
  exchange: 'binance' | 'bybit';
  marketType: MarketType;
  symbol: string;
  side: 'buy' | 'sell' | 'BUY' | 'SELL';
  orderType: 'market' | 'limit' | 'MARKET' | 'LIMIT';
  quantity: string;
  price?: string | number | null;
  leverage?: number | null;
  /** Spot: quote (e.g. USDT) amount for notional check. */
  requestedQuote?: number | null;
  credentials: { apiKey: string; apiSecret: string };
  environment: 'production' | 'testnet';
  clientOrderId?: string | null;
}

export interface ExecuteOrderResult {
  success: boolean;
  status: AuditStatus;
  reason_code?: string;
  message?: string;
  exchange_order_id?: string;
}

const SYM = (s: string) => (s || '').replace('/', '').toUpperCase();

/** Parse symbol like BTCUSDT into base and quote assets. */
function parseBaseQuote(symbol: string): { base: string; quote: string } {
  const s = SYM(symbol);
  const knownQuotes = ['USDT', 'BUSD', 'USD', 'BTC', 'ETH'];
  for (const q of knownQuotes) {
    if (s.endsWith(q)) return { base: s.slice(0, -q.length), quote: q };
  }
  return { base: s.slice(0, -4), quote: 'USDT' };
}

function getFeeBufferPercent(): number {
  const v = process.env.FEE_BUFFER_PERCENT;
  if (v == null || v === '') return DEFAULT_FEE_BUFFER_PERCENT;
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FEE_BUFFER_PERCENT;
}

/** Spot: get free balance for base and quote. Used for preflight only; no secrets in return. */
async function getSpotBalanceBinance(
  credentials: { apiKey: string; apiSecret: string },
  symbol: string,
  environment: 'production' | 'testnet'
): Promise<{ baseFree: number; quoteFree: number }> {
  const creds: binance.BinanceCredentials = { apiKey: credentials.apiKey, apiSecret: credentials.apiSecret, environment };
  const account = await binance.getAccountInfo(creds);
  const { base, quote } = parseBaseQuote(symbol);
  const b = account.balances?.find((x) => x.asset === base);
  const q = account.balances?.find((x) => x.asset === quote);
  const baseFree = b ? parseFloat(b.free) + parseFloat(b.locked) : 0;
  const quoteFree = q ? parseFloat(q.free) + parseFloat(q.locked) : 0;
  return { baseFree, quoteFree };
}

/** Spot: get free balance for base and quote. */
async function getSpotBalanceBybit(
  credentials: { apiKey: string; apiSecret: string },
  symbol: string,
  environment: 'production' | 'testnet'
): Promise<{ baseFree: number; quoteFree: number }> {
  const creds: bybit.BybitCredentials = { apiKey: credentials.apiKey, apiSecret: credentials.apiSecret, environment };
  const { balances } = await bybit.getWalletBalance(creds);
  const { base, quote } = parseBaseQuote(symbol);
  const b = balances.find((x) => x.asset === base);
  const q = balances.find((x) => x.asset === quote);
  const baseFree = b ? parseFloat(b.free) + parseFloat(b.locked) : 0;
  const quoteFree = q ? parseFloat(q.free) + parseFloat(q.locked) : 0;
  return { baseFree, quoteFree };
}

/** Futures: get available balance in USDT. */
async function getFuturesBalanceBinance(
  credentials: { apiKey: string; apiSecret: string },
  environment: 'production' | 'testnet'
): Promise<number> {
  const creds: binanceFutures.BinanceFuturesCredentials = { apiKey: credentials.apiKey, apiSecret: credentials.apiSecret, environment };
  const summary = await binanceFutures.getAccountSummary(creds);
  return parseFloat(summary.availableBalanceUsdt ?? '0');
}

/** Futures: get available balance in USDT. */
async function getFuturesBalanceBybit(
  credentials: { apiKey: string; apiSecret: string },
  environment: 'production' | 'testnet'
): Promise<number> {
  const creds: bybitFutures.BybitFuturesCredentials = { apiKey: credentials.apiKey, apiSecret: credentials.apiSecret, environment };
  const summary = await bybitFutures.getAccountSummary(creds);
  return parseFloat(summary.availableBalanceUsdt ?? '0');
}

function sanitizeForAudit(obj: unknown): unknown {
  if (obj == null) return null;
  if (typeof obj !== 'object') return obj;
  const o = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const lower = k.toLowerCase();
    if (lower.includes('secret') || lower.includes('apikey') || lower === 'api_key') {
      out[k] = '[REDACTED]';
    } else {
      out[k] = typeof v === 'object' && v !== null ? sanitizeForAudit(v) : v;
    }
  }
  return out;
}

async function writeAudit(
  client: SupabaseClient,
  row: {
    user_id: string;
    source: OrderSource;
    bot_id?: string | null;
    copy_setup_id?: string | null;
    exchange: string;
    market_type: MarketType;
    symbol: string;
    side: string;
    order_type: string;
    requested_qty?: number | null;
    requested_quote?: number | null;
    price?: number | null;
    leverage?: number | null;
    min_notional?: number | null;
    available_balance?: number | null;
    required_balance?: number | null;
    precheck_result?: unknown;
    exchange_request_payload?: unknown;
    exchange_response?: unknown;
    exchange_order_id?: string | null;
    status: AuditStatus;
    error_code?: string | null;
    error_message?: string | null;
  }
): Promise<void> {
  await client.from('order_execution_audit').insert({
    user_id: row.user_id,
    source: row.source,
    bot_id: row.bot_id ?? null,
    copy_setup_id: row.copy_setup_id ?? null,
    exchange: row.exchange,
    market_type: row.market_type,
    symbol: row.symbol,
    side: row.side.toUpperCase(),
    order_type: row.order_type,
    requested_qty: row.requested_qty ?? null,
    requested_quote: row.requested_quote ?? null,
    price: row.price != null ? Number(row.price) : null,
    leverage: row.leverage ?? null,
    min_notional: row.min_notional ?? null,
    available_balance: row.available_balance ?? null,
    required_balance: row.required_balance ?? null,
    precheck_result: row.precheck_result ?? null,
    exchange_request_payload: row.exchange_request_payload != null ? sanitizeForAudit(row.exchange_request_payload) as object : null,
    exchange_response: row.exchange_response != null ? sanitizeForAudit(row.exchange_response) : null,
    exchange_order_id: row.exchange_order_id ?? null,
    status: row.status,
    error_code: row.error_code ?? null,
    error_message: row.error_message ?? null,
  });
}

/** Pre-flight check for spot: symbol filters + optional balance. */
export async function preflightSpot(
  exchange: 'binance' | 'bybit',
  symbol: string,
  quantity: string,
  side: string,
  priceOrNotional: number,
  environment: 'production' | 'testnet'
): Promise<PreflightResult> {
  const sym = SYM(symbol);
  try {
    let minNotional: number;
    let minQty: number;
    let stepSize: number;
    let maxQty: number;
    if (exchange === 'binance') {
      const f = await binance.getSpotSymbolFilters(sym);
      minNotional = f.minNotional;
      minQty = f.minQty;
      stepSize = f.stepSize;
      maxQty = f.maxQty ?? 1e12;
    } else {
      const f = await bybit.getSpotSymbolFilters(sym, environment);
      minNotional = f.minNotional;
      minQty = f.minQty;
      stepSize = f.stepSize;
      maxQty = f.maxQty ?? 1e12;
    }
    const qtyNum = parseFloat(quantity);
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      return { allowed: false, reason_code: 'INVALID_QUANTITY', human_message: 'Invalid or zero quantity', filters: { minQty, stepSize, minNotional, maxQty } };
    }
    const notional = qtyNum * priceOrNotional;
    if (notional < minNotional) {
      return {
        allowed: false,
        reason_code: 'BELOW_MIN_NOTIONAL',
        human_message: `Notional ${notional.toFixed(2)} below min notional ${minNotional} for ${symbol}. Increase size or add funds.`,
        minNotional,
        filters: { minQty, stepSize, minNotional, maxQty },
      };
    }
    return {
      allowed: true,
      reason_code: 'OK',
      human_message: 'Pre-flight passed',
      minNotional,
      filters: { minQty, stepSize, minNotional, maxQty },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Pre-flight failed';
    return { allowed: false, reason_code: 'SYMBOL_OR_FILTERS_ERROR', human_message: msg };
  }
}

/** Pre-flight for futures: symbol allowed, qty > 0. (Balance/margin checked by exchange on place.) */
export async function preflightFutures(
  exchange: 'binance' | 'bybit',
  symbol: string,
  quantity: string
): Promise<PreflightResult> {
  const sym = SYM(symbol);
  const qtyNum = parseFloat(quantity);
  if (Number.isNaN(qtyNum) || qtyNum <= 0) {
    return { allowed: false, reason_code: 'INVALID_QUANTITY', human_message: 'Invalid or zero quantity' };
  }
  return { allowed: true, reason_code: 'OK', human_message: 'Pre-flight passed' };
}

/**
 * Execute a single order through the central layer. Runs preflight, then exchange, writes audit.
 * Returns success only when exchange_order_id is present.
 */
export async function executeOrder(
  client: SupabaseClient,
  params: ExecuteOrderParams
): Promise<ExecuteOrderResult> {
  const sym = SYM(params.symbol);
  const side = params.side.toUpperCase() as 'BUY' | 'SELL';
  const orderType = params.orderType.toUpperCase() as 'MARKET' | 'LIMIT';
  const qty = String(params.quantity);
  const price = params.price != null ? String(params.price) : undefined;
  const env = params.environment || 'production';
  const reqPayload = { symbol: sym, side, type: orderType, quantity: qty, price: params.price ?? undefined };

  const auditRow = {
    user_id: params.userId,
    source: params.source,
    bot_id: params.botId ?? null,
    copy_setup_id: params.copySetupId ?? null,
    exchange: params.exchange,
    market_type: params.marketType,
    symbol: sym,
    side,
    order_type: orderType,
    requested_qty: parseFloat(qty) || null,
    requested_quote: params.requestedQuote ?? null,
    price: params.price != null ? Number(params.price) : null,
    leverage: params.leverage ?? null,
    exchange_request_payload: reqPayload,
  };

  const demoMode = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';
  if (demoMode) {
    await writeAudit(client, {
      ...auditRow,
      status: 'SKIPPED',
      error_code: 'DEMO_MODE',
      error_message: 'Demo mode: order not sent to exchange',
    });
    return {
      success: false,
      status: 'SKIPPED',
      reason_code: 'DEMO_MODE',
      message: 'Demo mode: order not sent to exchange',
    };
  }

  if (params.marketType === 'spot') {
    let priceForNotional = 0;
    try {
      if (params.exchange === 'binance') {
        const t = await binance.getTickerPrice(sym);
        priceForNotional = parseFloat(t.price);
      } else {
        const t = await bybit.getTickerPrice(sym, env);
        priceForNotional = parseFloat(t.price);
      }
    } catch {
      await writeAudit(client, {
        ...auditRow,
        status: 'FAILED',
        error_code: 'TICKER_FAILED',
        error_message: 'Could not get price for pre-flight',
      });
      return { success: false, status: 'FAILED', reason_code: 'TICKER_FAILED', message: 'Could not get price for pre-flight' };
    }
    const preflight = await preflightSpot(params.exchange, sym, qty, side, priceForNotional, env);
    if (!preflight.allowed) {
      await writeAudit(client, {
        ...auditRow,
        min_notional: preflight.minNotional ?? null,
        status: 'SKIPPED',
        error_code: preflight.reason_code,
        error_message: preflight.human_message,
        precheck_result: preflight,
      });
      return {
        success: false,
        status: 'SKIPPED',
        reason_code: preflight.reason_code,
        message: preflight.human_message,
      };
    }
    const qtyNum = parseFloat(qty);
    const notional = qtyNum * priceForNotional;
    const feePct = getFeeBufferPercent();
    const feeMultiplier = 1 + feePct / 100;
    let requiredBalance: number;
    let availableBalance: number;
    try {
      if (params.exchange === 'binance') {
        const { baseFree, quoteFree } = await getSpotBalanceBinance(params.credentials, sym, env);
        if (side === 'BUY') {
          requiredBalance = (params.requestedQuote ?? notional) * feeMultiplier;
          availableBalance = quoteFree;
        } else {
          requiredBalance = qtyNum * feeMultiplier;
          availableBalance = baseFree;
        }
      } else {
        const { baseFree, quoteFree } = await getSpotBalanceBybit(params.credentials, sym, env);
        if (side === 'BUY') {
          requiredBalance = (params.requestedQuote ?? notional) * feeMultiplier;
          availableBalance = quoteFree;
        } else {
          requiredBalance = qtyNum * feeMultiplier;
          availableBalance = baseFree;
        }
      }
    } catch (balanceErr) {
      const msg = balanceErr instanceof Error ? balanceErr.message : 'Balance fetch failed';
      const sanitized = msg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      await writeAudit(client, {
        ...auditRow,
        status: 'FAILED',
        error_code: 'BALANCE_FETCH_FAILED',
        error_message: sanitized,
        precheck_result: { ...preflight, balanceError: 'fetch_failed' },
      });
      return { success: false, status: 'FAILED', reason_code: 'BALANCE_FETCH_FAILED', message: sanitized };
    }
    if (availableBalance < requiredBalance) {
      const precheckWithBalance = {
        ...preflight,
        availableBalance,
        requiredBalance,
        feeBufferUsed: feePct,
      };
      await writeAudit(client, {
        ...auditRow,
        status: 'SKIPPED',
        error_code: 'INSUFFICIENT_BALANCE',
        error_message: `Available ${availableBalance.toFixed(4)} < required ${requiredBalance.toFixed(4)} (incl. ${feePct}% fee buffer)`,
        available_balance: availableBalance,
        required_balance: requiredBalance,
        precheck_result: precheckWithBalance,
        min_notional: preflight.minNotional ?? null,
      });
      return {
        success: false,
        status: 'SKIPPED',
        reason_code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance. Available: ${availableBalance.toFixed(4)}, required: ${requiredBalance.toFixed(4)} (incl. ${feePct}% fee buffer).`,
      };
    }
    try {
      if (params.exchange === 'binance') {
        const creds: binance.BinanceCredentials = {
          apiKey: params.credentials.apiKey,
          apiSecret: params.credentials.apiSecret,
          environment: env,
        };
        const res = await binance.placeSpotOrder(creds, {
          symbol: sym,
          side,
          type: orderType as 'MARKET' | 'LIMIT',
          quantity: qty,
          price,
          newClientOrderId: params.clientOrderId ?? undefined,
          timeInForce: orderType === 'LIMIT' ? 'GTC' : undefined,
        });
        const orderId = String((res as { orderId?: number }).orderId ?? '');
        if (!orderId) {
          await writeAudit(client, {
            ...auditRow,
            status: 'FAILED',
            error_code: 'NO_ORDER_ID',
            error_message: 'Exchange did not return orderId',
            exchange_response: res,
          });
          return { success: false, status: 'FAILED', reason_code: 'NO_ORDER_ID', message: 'Exchange did not return orderId' };
        }
        await writeAudit(client, {
          ...auditRow,
          exchange_order_id: orderId,
          exchange_response: res,
          status: 'PLACED',
          min_notional: preflight.minNotional ?? null,
          available_balance: availableBalance,
          required_balance: requiredBalance,
          precheck_result: { ...preflight, feeBufferUsed: feePct },
        });
        return { success: true, status: 'PLACED', exchange_order_id: orderId, message: 'Order placed' };
      } else {
        const creds: bybit.BybitCredentials = {
          apiKey: params.credentials.apiKey,
          apiSecret: params.credentials.apiSecret,
          environment: env,
        };
        const res = await bybit.placeSpotOrder(creds, {
          symbol: sym,
          side: side === 'BUY' ? 'Buy' : 'Sell',
          orderType: orderType === 'LIMIT' ? 'Limit' : 'Market',
          qty,
          price,
          orderLinkId: params.clientOrderId ?? undefined,
        });
        const orderId = (res as { orderId?: string; orderLinkId?: string }).orderId ?? (res as { orderLinkId?: string }).orderLinkId ?? '';
        if (!orderId) {
          await writeAudit(client, {
            ...auditRow,
            status: 'FAILED',
            error_code: 'NO_ORDER_ID',
            error_message: 'Exchange did not return orderId',
            exchange_response: res,
          });
          return { success: false, status: 'FAILED', reason_code: 'NO_ORDER_ID', message: 'Exchange did not return orderId' };
        }
        await writeAudit(client, {
          ...auditRow,
          exchange_order_id: orderId,
          exchange_response: res,
          status: 'PLACED',
          min_notional: preflight.minNotional ?? null,
          available_balance: availableBalance,
          required_balance: requiredBalance,
          precheck_result: { ...preflight, feeBufferUsed: feePct },
        });
        return { success: true, status: 'PLACED', exchange_order_id: orderId, message: 'Order placed' };
      }
    } catch (e) {
      const err = e as Error & { bybitReasonCode?: string; retCode?: number };
      const errMsg = err.message || 'Place order failed';
      const sanitized = errMsg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      const reasonCode = err.bybitReasonCode ?? 'EXCHANGE_ERROR';
      await writeAudit(client, {
        ...auditRow,
        status: 'FAILED',
        error_code: reasonCode,
        error_message: sanitized,
      });
      return { success: false, status: 'FAILED', reason_code: reasonCode, message: sanitized };
    }
  } else {
    const preflight = await preflightFutures(params.exchange, sym, qty);
    if (!preflight.allowed) {
      await writeAudit(client, {
        ...auditRow,
        status: 'SKIPPED',
        error_code: preflight.reason_code,
        error_message: preflight.human_message,
        precheck_result: preflight,
      });
      return { success: false, status: 'SKIPPED', reason_code: preflight.reason_code, message: preflight.human_message };
    }
    const qtyNumF = parseFloat(qty);
    const leverage = params.leverage ?? DEFAULT_FUTURES_LEVERAGE;
    let markPrice: number;
    try {
      if (params.exchange === 'binance') {
        markPrice = await binanceFutures.getMarkPrice(env, sym);
      } else {
        markPrice = await bybitFutures.getMarkPrice(env, sym);
      }
    } catch (markErr) {
      const msg = markErr instanceof Error ? markErr.message : 'Mark price fetch failed';
      await writeAudit(client, {
        ...auditRow,
        status: 'FAILED',
        error_code: 'TICKER_FAILED',
        error_message: msg,
        precheck_result: { ...preflight, markPriceError: 'fetch_failed' },
      });
      return { success: false, status: 'FAILED', reason_code: 'TICKER_FAILED', message: msg };
    }
    const requiredMargin = (qtyNumF * markPrice) / (leverage >= 1 ? leverage : DEFAULT_FUTURES_LEVERAGE);
    let availableMargin: number;
    try {
      if (params.exchange === 'binance') {
        availableMargin = await getFuturesBalanceBinance(params.credentials, env);
      } else {
        availableMargin = await getFuturesBalanceBybit(params.credentials, env);
      }
    } catch (balanceErr) {
      const msg = balanceErr instanceof Error ? balanceErr.message : 'Balance fetch failed';
      const sanitized = msg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      await writeAudit(client, {
        ...auditRow,
        status: 'FAILED',
        error_code: 'BALANCE_FETCH_FAILED',
        error_message: sanitized,
        precheck_result: { ...preflight, balanceError: 'fetch_failed' },
      });
      return { success: false, status: 'FAILED', reason_code: 'BALANCE_FETCH_FAILED', message: sanitized };
    }
    if (availableMargin < requiredMargin) {
      const precheckWithBalance = { ...preflight, availableBalance: availableMargin, requiredBalance: requiredMargin };
      await writeAudit(client, {
        ...auditRow,
        status: 'SKIPPED',
        error_code: 'INSUFFICIENT_BALANCE',
        error_message: `Available margin ${availableMargin.toFixed(2)} USDT < required ~${requiredMargin.toFixed(2)} USDT (qty×markPrice/leverage)`,
        available_balance: availableMargin,
        required_balance: requiredMargin,
        precheck_result: precheckWithBalance,
      });
      return {
        success: false,
        status: 'SKIPPED',
        reason_code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient margin. Available: ${availableMargin.toFixed(2)} USDT, required ~${requiredMargin.toFixed(2)} USDT.`,
      };
    }
    try {
      if (params.exchange === 'binance') {
        const creds: binanceFutures.BinanceFuturesCredentials = {
          apiKey: params.credentials.apiKey,
          apiSecret: params.credentials.apiSecret,
          environment: env,
        };
        const res = await binanceFutures.placeOrder(creds, { symbol: sym, side, type: orderType as 'MARKET', qty });
        const orderId = String(res.orderId ?? '');
        if (!orderId) {
          await writeAudit(client, { ...auditRow, status: 'FAILED', error_code: 'NO_ORDER_ID', error_message: 'Exchange did not return orderId', exchange_response: res });
          return { success: false, status: 'FAILED', reason_code: 'NO_ORDER_ID', message: 'Exchange did not return orderId' };
        }
        await writeAudit(client, {
          ...auditRow,
          exchange_order_id: orderId,
          exchange_response: res,
          status: 'PLACED',
          available_balance: availableMargin,
          required_balance: requiredMargin,
          precheck_result: { ...preflight, availableBalance: availableMargin, requiredBalance: requiredMargin },
        });
        return { success: true, status: 'PLACED', exchange_order_id: orderId, message: 'Order placed' };
      } else {
        const creds: bybitFutures.BybitFuturesCredentials = {
          apiKey: params.credentials.apiKey,
          apiSecret: params.credentials.apiSecret,
          environment: env,
        };
        const res = await bybitFutures.placeOrder(creds, { symbol: sym, side, type: orderType as 'MARKET', qty });
        const orderId = res.orderId ?? '';
        if (!orderId) {
          await writeAudit(client, { ...auditRow, status: 'FAILED', error_code: 'NO_ORDER_ID', error_message: 'Exchange did not return orderId', exchange_response: res });
          return { success: false, status: 'FAILED', reason_code: 'NO_ORDER_ID', message: 'Exchange did not return orderId' };
        }
        await writeAudit(client, {
          ...auditRow,
          exchange_order_id: orderId,
          exchange_response: res,
          status: 'PLACED',
          available_balance: availableMargin,
          required_balance: requiredMargin,
          precheck_result: { ...preflight, availableBalance: availableMargin, requiredBalance: requiredMargin },
        });
        return { success: true, status: 'PLACED', exchange_order_id: orderId, message: 'Order placed' };
      }
    } catch (e) {
      const err = e as Error & { bybitReasonCode?: string };
      const errMsg = err.message || 'Place order failed';
      const sanitized = errMsg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      const reasonCode = err.bybitReasonCode ?? 'EXCHANGE_ERROR';
      await writeAudit(client, { ...auditRow, status: 'FAILED', error_code: reasonCode, error_message: sanitized });
      return { success: false, status: 'FAILED', reason_code: reasonCode, message: sanitized };
    }
  }
}
