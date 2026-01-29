/**
 * Strategy engine: RSI Oversold/Overbought template.
 * Long when RSI < 30, Short when RSI > 70.
 * Direction: long | short | both.
 * Enforces risk rules before placing orders; logs to strategy_events (no secrets).
 */

import type { IFuturesAdapter, FuturesOpenPosition } from './futures-adapter-types.js';
import { getKlines, computeRSI } from './candles.js';

const ALLOWED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const RSI_PERIOD = 14;
const RSI_OVERSOLD = 30;
const RSI_OVERBOUGHT = 70;
const MAX_CONSECUTIVE_FAILURES = 3;

export type Direction = 'long' | 'short' | 'both';

export interface StrategyRunRow {
  id: string;
  user_id: string;
  exchange_connection_id: string;
  exchange: string;
  symbol: string;
  timeframe: string;
  direction: Direction;
  leverage: number;
  margin_mode: string;
  position_mode: string;
  order_size_pct: number;
  initial_capital_usdt: number;
  take_profit_pct: number;
  stop_loss_pct: number;
  strategy_template: string;
  strategy_params: Record<string, unknown>;
  status: string;
}

export interface ConnectionRow {
  id: string;
  futures_enabled: boolean;
  kill_switch: boolean;
  max_leverage_allowed: number;
  max_notional_usdt: number;
  margin_mode: string;
  position_mode: string;
  default_leverage: number;
  environment: string;
}

export interface TickResult {
  signal: 'long' | 'short' | 'none';
  rsi: number | null;
  positionBefore: FuturesOpenPosition | null;
  orderPlaced: boolean;
  orderId?: string;
  error?: string;
  riskBlock?: string;
}

function normalizeSymbol(s: string): string {
  return s.replace('/', '').toUpperCase();
}

function isSymbolAllowed(symbol: string): boolean {
  return ALLOWED_SYMBOLS.includes(normalizeSymbol(symbol));
}

export async function runRsiTick(
  adapter: IFuturesAdapter,
  run: StrategyRunRow,
  connection: ConnectionRow,
  logEvent: (eventType: string, payload: Record<string, unknown>) => Promise<void>
): Promise<TickResult> {
  const symbol = normalizeSymbol(run.symbol);
  if (!isSymbolAllowed(symbol)) {
    await logEvent('risk_block', { reason: 'symbol_not_allowed', symbol });
    return { signal: 'none', rsi: null, positionBefore: null, orderPlaced: false, riskBlock: 'symbol_not_allowed' };
  }

  if (connection.kill_switch) {
    await logEvent('risk_block', { reason: 'kill_switch' });
    return { signal: 'none', rsi: null, positionBefore: null, orderPlaced: false, riskBlock: 'kill_switch' };
  }

  if (!connection.futures_enabled) {
    await logEvent('risk_block', { reason: 'futures_not_enabled' });
    return { signal: 'none', rsi: null, positionBefore: null, orderPlaced: false, riskBlock: 'futures_not_enabled' };
  }

  if (run.leverage > (connection.max_leverage_allowed ?? 10)) {
    await logEvent('risk_block', { reason: 'leverage_exceeds_max', leverage: run.leverage, max: connection.max_leverage_allowed });
    return { signal: 'none', rsi: null, positionBefore: null, orderPlaced: false, riskBlock: 'leverage_exceeds_max' };
  }

  const summary = await adapter.getAccountSummary();
  const availableUsdt = parseFloat(summary.availableBalanceUsdt || '0');
  const orderSizePct = Number(run.order_size_pct) || 100;
  const capital = Number(run.initial_capital_usdt) || availableUsdt;
  const notionalUsdt = (capital * (orderSizePct / 100)) * (run.leverage || 1);
  if (notionalUsdt > (connection.max_notional_usdt ?? 200)) {
    await logEvent('risk_block', { reason: 'notional_exceeds_max', notionalUsdt, max: connection.max_notional_usdt });
    return { signal: 'none', rsi: null, positionBefore: null, orderPlaced: false, riskBlock: 'notional_exceeds_max' };
  }

  const env = (connection.environment || 'production') as 'production' | 'testnet';
  const candles = await getKlines(
    run.exchange as 'binance' | 'bybit',
    run.symbol,
    run.timeframe,
    100,
    env
  );
  const closes = candles.map((c) => c.close);
  const rsi = computeRSI(closes, RSI_PERIOD);
  const lastClose = closes[closes.length - 1];
  if (lastClose == null) {
    await logEvent('error', { reason: 'no_candles' });
    return { signal: 'none', rsi: null, positionBefore: null, orderPlaced: false, error: 'no_candles' };
  }

  let signal: 'long' | 'short' | 'none' = 'none';
  if (rsi != null) {
    if (rsi < RSI_OVERSOLD && (run.direction === 'long' || run.direction === 'both')) signal = 'long';
    else if (rsi > RSI_OVERBOUGHT && (run.direction === 'short' || run.direction === 'both')) signal = 'short';
  }

  await logEvent('signal', { rsi: rsi ?? undefined, signal, close: lastClose });

  const positionBefore = await adapter.getOpenPosition(symbol);
  if (positionBefore && signal !== 'none') {
    const existingSide = positionBefore.side;
    if ((existingSide === 'LONG' && signal === 'long') || (existingSide === 'SHORT' && signal === 'short')) {
      return { signal, rsi: rsi ?? null, positionBefore, orderPlaced: false };
    }
  }

  if (signal === 'none') {
    return { signal: 'none', rsi: rsi ?? null, positionBefore, orderPlaced: false };
  }

  const qty = (notionalUsdt / lastClose).toFixed(4);
  const tpPct = Number(run.take_profit_pct) || 3;
  const slPct = Number(run.stop_loss_pct) || 1.5;
  const tpPrice = signal === 'long'
    ? (lastClose * (1 + tpPct / 100)).toFixed(2)
    : (lastClose * (1 - tpPct / 100)).toFixed(2);
  const slPrice = signal === 'long'
    ? (lastClose * (1 - slPct / 100)).toFixed(2)
    : (lastClose * (1 + slPct / 100)).toFixed(2);

  try {
    const side = signal === 'long' ? 'BUY' : 'SELL';
    const result = await adapter.placeOrder({
      symbol,
      side,
      qty,
      type: 'MARKET',
      reduceOnly: false,
      stopLoss: slPrice,
      takeProfit: tpPrice,
      positionSide: run.position_mode === 'hedge' ? (signal === 'long' ? 'LONG' : 'SHORT') : 'BOTH',
    });
    await logEvent('order_submit', { orderId: result.orderId, status: result.status, side, qty });
    return { signal, rsi: rsi ?? null, positionBefore, orderPlaced: true, orderId: result.orderId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEvent('error', { code: 'order_failed', message: message.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]') });
    return { signal, rsi: rsi ?? null, positionBefore, orderPlaced: false, error: message };
  }
}

export { ALLOWED_SYMBOLS, RSI_OVERSOLD, RSI_OVERBOUGHT, MAX_CONSECUTIVE_FAILURES };
