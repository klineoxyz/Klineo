/**
 * Spot DCA Grid execution engine.
 * Only runs for market='spot'. Futures are not executed.
 * Polls running bots, acquires per-bot lock, executes grid logic (entry, safety orders, TP), enforces risk controls.
 *
 * Exchange safety: min qty/step/notional from Binance getSpotSymbolFilters (Bybit uses defaults).
 * Idempotent orders: clientOrderId = klineo_dca_{botId}_{level}_{timestamp}.
 * Partial fills: state is set when we place orders; reconciliation from exchange fill events can be added later.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from './crypto.js';
import {
  getTickerPrice as binanceTicker,
  getSpotSymbolFilters,
  placeSpotOrder as binancePlaceOrder,
  type BinanceCredentials,
} from './binance.js';
import {
  getTickerPriceSpot as bybitTicker,
  placeSpotOrder as bybitPlaceOrder,
  type BybitCredentials,
} from './bybit.js';

const LOCK_TTL_SEC = 60;
const TICK_INTERVAL_SEC = 15;
const DEFAULT_STEP_DECIMALS = 8;

export interface DcaBotRow {
  id: string;
  user_id: string;
  name: string;
  exchange: string;
  market: string;
  pair: string;
  timeframe: string;
  status: string;
  config: Record<string, unknown>;
  last_tick_at: string | null;
  next_tick_at: string | null;
  last_tick_status: string | null;
  last_tick_error: string | null;
  is_locked: boolean;
  lock_expires_at: string | null;
}

export interface DcaBotStateRow {
  id: string;
  dca_bot_id: string;
  grid_level: number;
  safety_orders_filled: number;
  avg_entry_price: string | null;
  position_size: string | null;
  last_entry_order_id: string | null;
  last_tp_order_id: string | null;
  realized_pnl: string | null;
  updated_at: string;
}

export interface ProcessRunningDcaBotsOptions {
  limit?: number;
  now?: Date;
}

export interface BotTickResult {
  botId: string;
  status: 'ok' | 'skipped' | 'error' | 'blocked';
  reason?: string;
  error?: string;
}

function roundToStep(qty: number, stepSize: number): string {
  if (stepSize <= 0) return qty.toFixed(DEFAULT_STEP_DECIMALS);
  const precision = stepSize >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(stepSize)));
  const stepped = Math.floor(qty / stepSize) * stepSize;
  return stepped.toFixed(precision);
}

function normalizeSymbol(pair: string): string {
  return (pair || '').toUpperCase().replace(/\//g, '');
}

/**
 * Load exchange connection for user_id + exchange (first active).
 */
async function loadConnection(
  client: SupabaseClient,
  userId: string,
  exchange: string
): Promise<{ encrypted_config_b64: string; environment: string } | null> {
  const { data } = await client
    .from('user_exchange_connections')
    .select('encrypted_config_b64, environment')
    .eq('user_id', userId)
    .eq('exchange', exchange)
    .is('disabled_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { encrypted_config_b64: string; environment: string } | null;
}

/**
 * Acquire lock on bot: set is_locked=true, lock_expires_at=now+TTL only if currently unlockable.
 * Returns true if lock acquired.
 */
async function acquireDcaLock(client: SupabaseClient, botId: string, now: Date): Promise<boolean> {
  const expiresAt = new Date(now.getTime() + LOCK_TTL_SEC * 1000);
  const nowIso = now.toISOString();
  const { data, error } = await client
    .from('dca_bots')
    .update({
      is_locked: true,
      lock_expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', botId)
    .or(`is_locked.eq.false,lock_expires_at.lt.${nowIso},lock_expires_at.is.null`)
    .select('id')
    .maybeSingle();
  return !error && !!data;
}

/**
 * Release lock and set last_tick_*, next_tick_at.
 */
async function releaseDcaLock(
  client: SupabaseClient,
  botId: string,
  update: {
    last_tick_at: string;
    last_tick_status: string;
    last_tick_error?: string | null;
    next_tick_at: string | null;
    is_locked?: boolean;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    last_tick_at: update.last_tick_at,
    last_tick_status: update.last_tick_status,
    last_tick_error: update.last_tick_error ?? null,
    next_tick_at: update.next_tick_at,
    updated_at: update.last_tick_at,
  };
  if (update.is_locked !== undefined) payload.is_locked = update.is_locked;
  await client.from('dca_bots').update(payload).eq('id', botId);
}

/**
 * Get current spot price for exchange + pair.
 */
async function getSpotPrice(exchange: string, pair: string): Promise<number> {
  const sym = normalizeSymbol(pair);
  if (exchange === 'binance') {
    const r = await binanceTicker(sym);
    return parseFloat(r.price);
  }
  if (exchange === 'bybit') {
    const r = await bybitTicker(sym);
    return parseFloat(r.lastPrice);
  }
  throw new Error(`Unsupported exchange: ${exchange}`);
}

/**
 * Place spot order and record in dca_bot_orders. Idempotent via clientOrderId when supported.
 */
async function placeDcaOrder(
  client: SupabaseClient,
  botId: string,
  exchange: string,
  credentials: BinanceCredentials | BybitCredentials,
  params: {
    pair: string;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    qty: string;
    price?: string;
    clientOrderId: string;
  }
): Promise<{ exchangeOrderId: string }> {
  const sym = normalizeSymbol(params.pair);
  let exchangeOrderId: string;

  if (exchange === 'binance') {
    const creds = credentials as BinanceCredentials;
    const res = await binancePlaceOrder(creds, {
      symbol: sym,
      side: params.side.toUpperCase() as 'BUY' | 'SELL',
      type: params.type.toUpperCase() as 'MARKET' | 'LIMIT',
      quantity: params.qty,
      price: params.price,
      newClientOrderId: params.clientOrderId,
      timeInForce: params.type === 'limit' ? 'GTC' : undefined,
    });
    exchangeOrderId = String(res.orderId);
  } else if (exchange === 'bybit') {
    const creds = credentials as BybitCredentials;
    const res = await bybitPlaceOrder(creds, {
      symbol: sym,
      side: params.side === 'buy' ? 'Buy' : 'Sell',
      orderType: params.type === 'market' ? 'Market' : 'Limit',
      qty: params.qty,
      price: params.price,
      orderLinkId: params.clientOrderId,
    });
    exchangeOrderId = res.orderId ?? res.orderLinkId ?? params.clientOrderId;
  } else {
    throw new Error(`Unsupported exchange: ${exchange}`);
  }

  await client.from('dca_bot_orders').insert({
    dca_bot_id: botId,
    exchange,
    pair: sym,
    side: params.side,
    type: params.type,
    price: params.price ? parseFloat(params.price) : null,
    qty: parseFloat(params.qty),
    exchange_order_id: exchangeOrderId,
    client_order_id: params.clientOrderId,
    status: 'submitted',
  });

  return { exchangeOrderId };
}

/**
 * Process one bot tick: validate, get price, state, run grid logic, update state and lock.
 */
async function processOneBot(
  client: SupabaseClient,
  bot: DcaBotRow,
  now: Date,
  requestId: string
): Promise<BotTickResult> {
  const config = (bot.config || {}) as Record<string, number | boolean | { pct: number; sharePct: number }[]>;
  const baseOrderUsdt = Number(config.baseOrderSizeUsdt ?? 0);
  const gridStepPct = Number(config.gridStepPct ?? 1);
  const maxSafetyOrders = Math.max(0, Number(config.maxSafetyOrders ?? 3));
  const safetyMultiplier = Number(config.safetyOrderMultiplier ?? 1);
  const maxCapPct = Number(config.maxTotalPositionCapPct ?? 100);
  const tpPct = Number(config.tpPct ?? 2);
  const tpLadder = !!config.tpLadder;
  const tpLadderLevels = (config.tpLadderLevels as { pct: number; sharePct: number }[] | undefined) ?? [];
  const dailyLossLimitPct = config.dailyLossLimitPct != null ? Number(config.dailyLossLimitPct) : null;
  const maxDrawdownStopPct = config.maxDrawdownStopPct != null ? Number(config.maxDrawdownStopPct) : null;
  const cooldownMinutes = Number(config.cooldownMinutes ?? 0);

  if (baseOrderUsdt <= 0 || gridStepPct <= 0) {
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'error',
      last_tick_error: 'Invalid config: baseOrderSizeUsdt or gridStepPct',
      next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
      is_locked: false,
    });
    return { botId: bot.id, status: 'error', error: 'Invalid config' };
  }

  const conn = await loadConnection(client, bot.user_id, bot.exchange);
  if (!conn?.encrypted_config_b64) {
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'blocked',
      last_tick_error: 'No exchange connection for ' + bot.exchange,
      next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
      is_locked: false,
    });
    return { botId: bot.id, status: 'blocked', reason: 'No connection' };
  }

  let creds: BinanceCredentials | BybitCredentials;
  try {
    const decrypted = await decrypt(conn.encrypted_config_b64);
    const parsed = JSON.parse(decrypted) as { apiKey: string; apiSecret: string };
    const env = (conn.environment || 'production') as 'production' | 'testnet';
    creds =
      bot.exchange === 'binance'
        ? ({ apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env } as BinanceCredentials)
        : ({ apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env } as BybitCredentials);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Decrypt failed';
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'error',
      last_tick_error: msg,
      next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
      is_locked: false,
    });
    return { botId: bot.id, status: 'error', error: msg };
  }

  let price: number;
  try {
    price = await getSpotPrice(bot.exchange, bot.pair);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ticker failed';
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'error',
      last_tick_error: msg,
      next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
      is_locked: false,
    });
    return { botId: bot.id, status: 'error', error: msg };
  }

  const { data: stateRow } = await client
    .from('dca_bot_state')
    .select('*')
    .eq('dca_bot_id', bot.id)
    .maybeSingle();

  const state = stateRow as DcaBotStateRow | null;
  const positionSize = state?.position_size != null ? parseFloat(String(state.position_size)) : 0;
  const avgEntry = state?.avg_entry_price != null ? parseFloat(String(state.avg_entry_price)) : 0;
  const safetyFilled = state?.safety_orders_filled ?? 0;
  const realizedPnl = state?.realized_pnl != null ? parseFloat(String(state.realized_pnl)) : 0;

  // Risk: daily loss limit (simplified: compare realized_pnl vs cap; we don't have daily window here, so we use total realized)
  if (dailyLossLimitPct != null && dailyLossLimitPct > 0 && realizedPnl < 0) {
    const cap = baseOrderUsdt * (dailyLossLimitPct / 100);
    if (-realizedPnl >= cap) {
      await client
        .from('dca_bots')
        .update({
          status: 'paused',
          last_tick_at: now.toISOString(),
          last_tick_status: 'blocked',
          last_tick_error: 'Daily loss limit reached',
          next_tick_at: cooldownMinutes > 0 ? new Date(now.getTime() + cooldownMinutes * 60 * 1000).toISOString() : null,
          is_locked: false,
          updated_at: now.toISOString(),
        })
        .eq('id', bot.id);
      return { botId: bot.id, status: 'blocked', reason: 'Daily loss limit' };
    }
  }

  // Risk: max drawdown stop
  if (maxDrawdownStopPct != null && maxDrawdownStopPct > 0 && positionSize > 0 && avgEntry > 0) {
    const drawdownPct = ((avgEntry - price) / avgEntry) * 100;
    if (drawdownPct >= maxDrawdownStopPct) {
      await client
        .from('dca_bots')
        .update({
          status: 'stopped',
          last_tick_at: now.toISOString(),
          last_tick_status: 'blocked',
          last_tick_error: 'Max drawdown stop',
          next_tick_at: cooldownMinutes > 0 ? new Date(now.getTime() + cooldownMinutes * 60 * 1000).toISOString() : null,
          is_locked: false,
          updated_at: now.toISOString(),
        })
        .eq('id', bot.id);
      return { botId: bot.id, status: 'blocked', reason: 'Max drawdown stop' };
    }
  }

  const sym = normalizeSymbol(bot.pair);
  let filters: { minQty: number; stepSize: number; minNotional: number } = {
    minQty: 1e-8,
    stepSize: 1e-8,
    minNotional: 1,
  };
  if (bot.exchange === 'binance') {
    try {
      const f = await getSpotSymbolFilters(sym);
      filters = { minQty: f.minQty, stepSize: f.stepSize, minNotional: f.minNotional };
    } catch {
      /* use defaults */
    }
  }

  // Entry: no position -> place base buy
  if (positionSize <= 0) {
    const qtyRaw = baseOrderUsdt / price;
    const qty = roundToStep(Math.max(qtyRaw, filters.minQty), filters.stepSize);
    const notional = parseFloat(qty) * price;
    if (notional < filters.minNotional) {
      await releaseDcaLock(client, bot.id, {
        last_tick_at: now.toISOString(),
        last_tick_status: 'skipped',
        last_tick_error: 'Base order below min notional',
        next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
        is_locked: false,
      });
      return { botId: bot.id, status: 'skipped', reason: 'Min notional' };
    }
    const clientOrderId = `klineo_dca_${bot.id}_base_${now.getTime()}`;
    try {
      const { exchangeOrderId } = await placeDcaOrder(client, bot.id, bot.exchange, creds, {
        pair: bot.pair,
        side: 'buy',
        type: 'market',
        qty,
        clientOrderId,
      });
      await client.from('dca_bot_state').upsert(
        {
          dca_bot_id: bot.id,
          grid_level: 1,
          safety_orders_filled: 0,
          avg_entry_price: price,
          position_size: qty,
          last_entry_order_id: exchangeOrderId,
          updated_at: now.toISOString(),
        },
        { onConflict: 'dca_bot_id' }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Place order failed';
      await releaseDcaLock(client, bot.id, {
        last_tick_at: now.toISOString(),
        last_tick_status: 'error',
        last_tick_error: msg,
        next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
        is_locked: false,
      });
      return { botId: bot.id, status: 'error', error: msg };
    }
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'ok',
      next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
      is_locked: false,
    });
    return { botId: bot.id, status: 'ok' };
  }

  // We have a position: ensure TP order(s) exist, optionally place next safety order
  const nextTickAt = new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString();

  // Count open buy orders (don't stack multiple safety orders before any fill)
  const { count: openBuyCount } = await client
    .from('dca_bot_orders')
    .select('id', { count: 'exact', head: true })
    .eq('dca_bot_id', bot.id)
    .eq('side', 'buy')
    .in('status', ['submitted', 'pending', 'open', 'new']);

  // Safety order: next level below avg_entry (only if no pending buy)
  if (safetyFilled < maxSafetyOrders && (openBuyCount ?? 0) === 0) {
    const level = safetyFilled + 1;
    const levelPrice = avgEntry * (1 - (gridStepPct / 100) * level);
    const sizeUsdt = baseOrderUsdt * Math.pow(safetyMultiplier, level);
    const qtyRaw = sizeUsdt / levelPrice;
    const qty = roundToStep(Math.max(qtyRaw, filters.minQty), filters.stepSize);
    const notional = parseFloat(qty) * levelPrice;
    if (notional >= filters.minNotional && price <= levelPrice * 1.001) {
      const clientOrderId = `klineo_dca_${bot.id}_s${level}_${now.getTime()}`;
      try {
        await placeDcaOrder(client, bot.id, bot.exchange, creds, {
          pair: bot.pair,
          side: 'buy',
          type: 'limit',
          qty,
          price: levelPrice.toFixed(2),
          clientOrderId,
        });
      } catch {
        /* may already exist or rate limit */
      }
    }
  }

  // TP: one or ladder
  const tpPriceSingle = avgEntry * (1 + tpPct / 100);
  const { data: openOrders } = await client
    .from('dca_bot_orders')
    .select('id')
    .eq('dca_bot_id', bot.id)
    .eq('side', 'sell')
    .in('status', ['submitted', 'pending', 'open', 'new']);
  const hasTpOrders = openOrders && openOrders.length > 0;
  if (!hasTpOrders && positionSize > 0) {
    const sellQty = roundToStep(positionSize, filters.stepSize);
    if (parseFloat(sellQty) >= filters.minQty) {
      const clientOrderId = `klineo_dca_${bot.id}_tp_${now.getTime()}`;
      try {
        if (tpLadder && tpLadderLevels.length >= 3) {
          const totalShare = tpLadderLevels.reduce((s, l) => s + (l.sharePct ?? 0), 0) || 100;
          for (let i = 0; i < tpLadderLevels.length; i++) {
            const level = tpLadderLevels[i];
            const pct = (level.sharePct ?? 33) / totalShare;
            const partQty = roundToStep(positionSize * pct, filters.stepSize);
            if (parseFloat(partQty) < filters.minQty) continue;
            const levelTpPrice = avgEntry * (1 + (level.pct ?? tpPct) / 100);
            await placeDcaOrder(client, bot.id, bot.exchange, creds, {
              pair: bot.pair,
              side: 'sell',
              type: 'limit',
              qty: partQty,
              price: levelTpPrice.toFixed(2),
              clientOrderId: `${clientOrderId}_${i}`,
            });
          }
        } else {
          await placeDcaOrder(client, bot.id, bot.exchange, creds, {
            pair: bot.pair,
            side: 'sell',
            type: 'limit',
            qty: sellQty,
            price: tpPriceSingle.toFixed(2),
            clientOrderId,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'TP order failed';
        await releaseDcaLock(client, bot.id, {
          last_tick_at: now.toISOString(),
          last_tick_status: 'error',
          last_tick_error: msg,
          next_tick_at: nextTickAt,
          is_locked: false,
        });
        return { botId: bot.id, status: 'error', error: msg };
      }
    }
  }

  await releaseDcaLock(client, bot.id, {
    last_tick_at: now.toISOString(),
    last_tick_status: 'ok',
    next_tick_at: nextTickAt,
    is_locked: false,
  });
  return { botId: bot.id, status: 'ok' };
}

/**
 * Process all running spot DCA bots that are due. Uses in-db lock per bot.
 */
export async function processRunningDcaBots(
  client: SupabaseClient,
  options: ProcessRunningDcaBotsOptions = {}
): Promise<{ processed: number; results: BotTickResult[] }> {
  const limit = options.limit ?? 10;
  const now = options.now ?? new Date();
  const results: BotTickResult[] = [];

  const { data: bots, error } = await client
    .from('dca_bots')
    .select('id, user_id, name, exchange, market, pair, timeframe, status, config, last_tick_at, next_tick_at, last_tick_status, last_tick_error, is_locked, lock_expires_at')
    .eq('status', 'running')
    .eq('market', 'spot')
    .or(`next_tick_at.is.null,next_tick_at.lte.${now.toISOString()}`)
    .order('next_tick_at', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error || !bots?.length) {
    return { processed: 0, results };
  }

  for (const bot of bots as DcaBotRow[]) {
    const acquired = await acquireDcaLock(client, bot.id, now);
    if (!acquired) {
      results.push({ botId: bot.id, status: 'skipped', reason: 'lock_not_acquired' });
      continue;
    }
    try {
      const result = await processOneBot(client, bot, now, 'dca-engine');
      results.push(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Tick failed';
      await releaseDcaLock(client, bot.id, {
        last_tick_at: now.toISOString(),
        last_tick_status: 'error',
        last_tick_error: msg,
        next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
        is_locked: false,
      });
      results.push({ botId: bot.id, status: 'error', error: msg });
    }
  }

  return { processed: results.length, results };
}
