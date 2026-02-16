/**
 * Spot DCA Grid execution engine.
 * Only runs for market='spot'. Futures are not executed.
 * Polls running bots, acquires per-bot lock, executes grid logic (entry, safety orders, TP), enforces risk controls.
 *
 * Exchange as source of truth: we reconcile position with exchange balance each tick, sync order status
 * from exchange (syncOpenOrders), and use actual base balance for TP sell quantity. See docs/EXCHANGE_AS_SOURCE_OF_TRUTH.md.
 *
 * Exchange safety: min qty/step/notional from Binance getSpotSymbolFilters (Bybit uses defaults).
 * Client order ID rules (same format for both exchanges):
 * - Binance newClientOrderId: ^[a-zA-Z0-9-_]{1,36}$
 * - Bybit orderLinkId: max 36 chars, numbers/letters (upper+lower)/dashes/underscores
 * We use makeDcaClientOrderId() for all DCA orders so both Binance and Bybit accept them.
 * Partial fills: state is set when we place orders; reconciliation from exchange fill events can be added later.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Binance & Bybit compliant client order ID: max 36 chars, only [a-zA-Z0-9-_]. */
function makeDcaClientOrderId(botId: string, type: string, timestamp: number, ladderIndex?: number): string {
  const id = (botId || '').replace(/-/g, '').slice(0, 20);
  const ts = String(timestamp).slice(-9);
  const t = ladderIndex !== undefined ? `t${ladderIndex}` : type;
  const tag = t.length >= 2 ? t.slice(0, 2) : t + '0';
  return `kdca${id}_${tag}${ts}`;
}

const MAX_CLIENT_ORDER_ID_LEN = 36;
const CLIENT_ORDER_ID_REGEX = /^[a-zA-Z0-9-_]+$/;

function assertDcaClientOrderId(s: string): void {
  if (s.length > MAX_CLIENT_ORDER_ID_LEN || !CLIENT_ORDER_ID_REGEX.test(s)) {
    throw new Error(`DCA clientOrderId must match ^[a-zA-Z0-9-_]{1,36}$ (Binance/Bybit). Got ${s.length} chars.`);
  }
}
import { decrypt } from './crypto.js';
import { toExchangeSymbol, roundToStep } from './symbols.js';
import {
  getTickerPrice as binanceTicker,
  getSpotSymbolFilters,
  getSpotOpenOrders as binanceGetSpotOpenOrders,
  getSpotOrder as binanceGetSpotOrder,
  cancelSpotOrder as binanceCancelSpotOrder,
  getMyTrades as binanceGetMyTrades,
  type BinanceCredentials,
} from './binance.js';
import {
  getTickerPrice as bybitTicker,
  getSpotSymbolFilters as bybitGetSpotSymbolFilters,
  getSpotOpenOrders as bybitGetSpotOpenOrders,
  getSpotOrder as bybitGetSpotOrder,
  cancelSpotOrder as bybitCancelSpotOrder,
  type BybitCredentials,
} from './bybit.js';
import { executeOrder, getSpotBaseBalance } from './orderExecution.js';

const LOCK_TTL_SEC = 60;
const TICK_INTERVAL_SEC = 15;
const TP_REPLACE_THRESHOLD_PCT = 0.2;

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
  status: 'ok' | 'skipped' | 'error' | 'blocked' | 'stopped';
  reason?: string;
  error?: string;
}

function normalizeSymbol(pair: string): string {
  return toExchangeSymbol(pair);
}

/**
 * Load exchange connection for user_id + exchange (first active, not disabled).
 * Uses connections where last_test_status is 'ok' OR null (e.g. newly connected, not yet tested).
 * Skips only when last_test_status = 'fail' so DCA runs for all users who have connected API.
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
    .or('last_test_status.eq.ok,last_test_status.is.null')
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
async function getSpotPrice(exchange: string, pair: string, environment: string = 'production'): Promise<number> {
  const sym = normalizeSymbol(pair);
  if (exchange === 'binance') {
    const r = await binanceTicker(sym);
    return parseFloat(r.price);
  }
  if (exchange === 'bybit') {
    const r = await bybitTicker(sym, environment as 'production' | 'testnet');
    return parseFloat(r.price);
  }
  throw new Error(`Unsupported exchange: ${exchange}`);
}

/**
 * Place spot order via central execution layer (audit + preflight). Records in dca_bot_orders only on PLACED.
 */
async function placeDcaOrder(
  client: SupabaseClient,
  userId: string,
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
  },
  env: string
): Promise<{ exchangeOrderId: string }> {
  const sym = normalizeSymbol(params.pair);
  const creds = credentials as { apiKey: string; apiSecret: string; environment?: string };
  const result = await executeOrder(client, {
    userId,
    source: 'DCA',
    botId,
    exchange: exchange as 'binance' | 'bybit',
    marketType: 'spot',
    symbol: sym,
    side: params.side,
    orderType: params.type,
    quantity: params.qty,
    price: params.price ?? null,
    credentials: { apiKey: creds.apiKey, apiSecret: creds.apiSecret },
    environment: (env || 'production') as 'production' | 'testnet',
    clientOrderId: params.clientOrderId,
  });
  if (!result.success || !result.exchange_order_id) {
    throw new Error(result.message ?? result.reason_code ?? 'Order not placed');
  }
  await client.from('dca_bot_orders').insert({
    dca_bot_id: botId,
    exchange,
    pair: sym,
    side: params.side,
    type: params.type,
    price: params.price ? parseFloat(params.price) : null,
    qty: parseFloat(params.qty),
    exchange_order_id: result.exchange_order_id,
    client_order_id: params.clientOrderId,
    status: 'submitted',
  });
  return { exchangeOrderId: result.exchange_order_id };
}

/**
 * Insert into unified orders table for DCA attribution (UI Orders/Trade History).
 * Returns the inserted order id, or null if insert failed (logged).
 */
async function insertDcaOrderIntoUnified(
  client: SupabaseClient,
  userId: string,
  botId: string,
  symbol: string,
  side: string,
  orderType: string,
  amount: number,
  price: number | null,
  exchangeOrderId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('orders')
    .insert({
      user_id: userId,
      dca_bot_id: botId,
      source: 'dca',
      symbol,
      side,
      order_type: orderType,
      amount,
      price,
      status: orderType === 'market' ? 'filled' : 'pending',
      exchange_order_id: exchangeOrderId,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) {
    console.error('[dca-engine] insertDcaOrderIntoUnified failed:', error.message, { userId, botId, symbol, side });
    return null;
  }
  const orderId = (data as { id?: string } | null)?.id ?? null;
  if (orderId && orderType === 'market') {
    const { error: tradeErr } = await client.from('trades').insert({
      user_id: userId,
      order_id: orderId,
      dca_bot_id: botId,
      source: 'dca',
      symbol,
      side,
      amount,
      price: price ?? 0,
      fee: 0,
      executed_at: new Date().toISOString(),
    });
    if (tradeErr) {
      console.warn('[dca-engine] insert DCA trade failed (order already in Orders):', tradeErr.message);
    }
  }
  return orderId;
}

/**
 * Cancel spot order on exchange and update dca_bot_orders row by id.
 */
async function cancelDcaOrder(
  client: SupabaseClient,
  botId: string,
  exchange: string,
  credentials: BinanceCredentials | BybitCredentials,
  params: {
    symbol: string;
    orderId?: string;
    origClientOrderId?: string;
    orderLinkId?: string;
    dcaOrderId?: string;
  }
): Promise<void> {
  const sym = normalizeSymbol(params.symbol);
  if (exchange === 'binance') {
    const creds = credentials as BinanceCredentials;
    await binanceCancelSpotOrder(creds, {
      symbol: sym,
      orderId: params.orderId != null ? Number(params.orderId) : undefined,
      origClientOrderId: params.origClientOrderId,
    });
  } else if (exchange === 'bybit') {
    const creds = credentials as BybitCredentials;
    await bybitCancelSpotOrder(creds, {
      symbol: sym,
      orderId: params.orderId,
      orderLinkId: params.orderLinkId,
    });
  }
  if (params.dcaOrderId) {
    await client.from('dca_bot_orders').update({ status: 'cancelled' }).eq('id', params.dcaOrderId);
  } else {
    const exId = params.orderId ?? params.origClientOrderId ?? params.orderLinkId ?? '';
    if (exId) {
      await client
        .from('dca_bot_orders')
        .update({ status: 'cancelled' })
        .eq('dca_bot_id', botId)
        .or(`exchange_order_id.eq.${exId},client_order_id.eq.${exId}`);
    }
  }
}

/**
 * Sync dca_bot_orders with exchange open orders: mark missing ones as filled/cancelled.
 * Also updates unified orders table and dca_bot_state on TP fill. Exported for manual sync from API.
 */
export async function syncOpenOrders(
  client: SupabaseClient,
  botId: string,
  exchange: string,
  symbol: string,
  credentials: BinanceCredentials | BybitCredentials
): Promise<void> {
  const sym = normalizeSymbol(symbol);
  let exchangeOpenIds: Set<string>;
  if (exchange === 'binance') {
    const creds = credentials as BinanceCredentials;
    const open = await binanceGetSpotOpenOrders(creds, sym);
    exchangeOpenIds = new Set(open.map((o) => String(o.orderId)));
  } else {
    const creds = credentials as BybitCredentials;
    const open = await bybitGetSpotOpenOrders(creds, sym);
    exchangeOpenIds = new Set(open.map((o) => o.orderId ?? o.orderLinkId ?? '').filter(Boolean));
  }
  const { data: ourOrders } = await client
    .from('dca_bot_orders')
    .select('id, exchange_order_id, client_order_id, side, qty, price')
    .eq('dca_bot_id', botId)
    .in('status', ['submitted', 'pending', 'open', 'new']);
  for (const row of ourOrders ?? []) {
    const exId = row.exchange_order_id ?? row.client_order_id;
    if (!exId || exchangeOpenIds.has(exId)) continue;
    let resolved: { status?: string; orderStatus?: string } | null = null;
    try {
      if (exchange === 'binance') {
        resolved = await binanceGetSpotOrder(credentials as BinanceCredentials, { symbol: sym, orderId: Number(exId) });
      } else {
        resolved = await bybitGetSpotOrder(credentials as BybitCredentials, { symbol: sym, orderId: exId });
      }
    } catch {
      resolved = null;
    }
    const statusStr = resolved?.status ?? resolved?.orderStatus ?? 'CANCELED';
    const lower = String(statusStr).toLowerCase();
    const mapped = lower === 'filled' || lower === 'partiallyfilled' ? 'filled' : 'cancelled';
    await client.from('dca_bot_orders').update({ status: mapped }).eq('id', row.id);

    if (mapped === 'filled') {
      await client.from('orders').update({ status: 'filled', updated_at: new Date().toISOString() }).eq('exchange_order_id', String(exId)).eq('source', 'dca');
      if (row.side === 'sell') {
        const { data: stateRow } = await client.from('dca_bot_state').select('avg_entry_price, position_size, realized_pnl').eq('dca_bot_id', botId).maybeSingle();
        const state = stateRow as { avg_entry_price?: string | null; position_size?: string | null; realized_pnl?: string | null } | null;
        const avgEntry = state?.avg_entry_price != null ? parseFloat(String(state.avg_entry_price)) : 0;
        const positionSize = state?.position_size != null ? parseFloat(String(state.position_size)) : 0;
        const realizedPnl = state?.realized_pnl != null ? parseFloat(String(state.realized_pnl)) : 0;
        const sellQty = row.qty != null ? parseFloat(String(row.qty)) : 0;
        const sellPrice = row.price != null ? parseFloat(String(row.price)) : 0;
        const pnl = sellQty > 0 && avgEntry > 0 ? (sellPrice - avgEntry) * sellQty : 0;
        await client
          .from('dca_bot_state')
          .update({
            position_size: 0,
            avg_entry_price: null,
            safety_orders_filled: 0,
            realized_pnl: realizedPnl + pnl,
            updated_at: new Date().toISOString(),
          })
          .eq('dca_bot_id', botId);
      }
    }
  }
}

/**
 * Ingest recent exchange spot trades for the symbol into orders/trades (Binance only).
 * Used so My Orders / Trade History reflect manual and bot fills. Call after syncOpenOrders.
 * One order row per exchange orderId; one trade row per order (aggregated qty).
 */
export async function ingestRecentTradesFromExchange(
  client: SupabaseClient,
  userId: string,
  exchange: string,
  symbol: string,
  credentials: BinanceCredentials | BybitCredentials,
  env: 'production' | 'testnet'
): Promise<void> {
  if (exchange !== 'binance') return;
  const sym = normalizeSymbol(symbol);
  const creds = credentials as BinanceCredentials;
  let trades: Array<{ orderId: number; id: number; qty: string; price: string; time: number; isBuyer: boolean }>;
  try {
    trades = await binanceGetMyTrades(creds, sym, 30);
  } catch {
    return;
  }
  if (!trades?.length) return;
  const byOrder = new Map<number, typeof trades>();
  for (const t of trades) {
    const list = byOrder.get(t.orderId) ?? [];
    list.push(t);
    byOrder.set(t.orderId, list);
  }
  for (const [orderId, list] of byOrder) {
    const exOrderId = String(orderId);
    const { data: existing } = await client
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .eq('exchange_order_id', exOrderId)
      .maybeSingle();
    if (existing) continue;
    const first = list[0]!;
    const totalQty = list.reduce((s, t) => s + parseFloat(t.qty), 0);
    const side = first.isBuyer ? 'buy' : 'sell';
    const price = first.price ? parseFloat(first.price) : 0;
    const { data: dcaRow } = await client
      .from('dca_bot_orders')
      .select('dca_bot_id')
      .eq('exchange_order_id', exOrderId)
      .limit(1)
      .maybeSingle();
    const botId = (dcaRow as { dca_bot_id?: string } | null)?.dca_bot_id ?? null;
    const { data: orderData, error: orderErr } = await client
      .from('orders')
      .insert({
        user_id: userId,
        symbol: sym,
        side,
        order_type: 'market',
        amount: totalQty,
        price,
        status: 'filled',
        exchange_order_id: exOrderId,
        source: 'dca',
        dca_bot_id: botId,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (orderErr || !orderData) continue;
    const orderIdUuid = (orderData as { id: string }).id;
    await client.from('trades').insert({
      user_id: userId,
      order_id: orderIdUuid,
      dca_bot_id: botId,
      source: 'dca',
      symbol: sym,
      side,
      amount: totalQty,
      price,
      fee: 0,
      executed_at: new Date(first.time).toISOString(),
    });
  }
}

/**
 * Sync order status from exchange for all running spot DCA bots of a user.
 * Updates dca_bot_orders and unified orders (and dca_bot_state on TP fill). Use for "Refresh from exchange".
 */
export async function syncDcaOrdersForUser(
  client: SupabaseClient,
  userId: string
): Promise<{ synced: number; errors: string[] }> {
  const { data: bots } = await client
    .from('dca_bots')
    .select('id, user_id, exchange, pair')
    .eq('user_id', userId)
    .eq('status', 'running')
    .eq('market', 'spot');
  const errors: string[] = [];
  let synced = 0;
  for (const bot of bots ?? []) {
    const conn = await loadConnection(client, bot.user_id, bot.exchange);
    if (!conn?.encrypted_config_b64) continue;
    let creds: BinanceCredentials | BybitCredentials;
    try {
      const decrypted = await decrypt(conn.encrypted_config_b64);
      const parsed = JSON.parse(decrypted) as { apiKey: string; apiSecret: string };
      const env = (conn.environment || 'production') as 'production' | 'testnet';
      creds =
        bot.exchange === 'binance'
          ? ({ apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env } as BinanceCredentials)
          : ({ apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env } as BybitCredentials);
    } catch {
      errors.push(`Bot ${bot.id}: decrypt failed`);
      continue;
    }
    try {
      await syncOpenOrders(client, bot.id, bot.exchange, bot.pair, creds);
      synced++;
    } catch (e) {
      errors.push(`Bot ${bot.id}: ${e instanceof Error ? e.message : 'sync failed'}`);
    }
  }
  return { synced, errors };
}

/**
 * Process one bot tick: validate, get price, state, run grid logic, update state and lock.
 * Exported for user-triggered "Run tick now" (single-bot diagnosis).
 */
export async function processOneBot(
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
    const errMsg = 'Invalid config: baseOrderSizeUsdt or gridStepPct';
    console.warn('[dca-engine] bot=%s status=error error=%s', bot.id, errMsg);
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'error',
      last_tick_error: errMsg,
      next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
      is_locked: false,
    });
    return { botId: bot.id, status: 'error', error: 'Invalid config' };
  }

  const conn = await loadConnection(client, bot.user_id, bot.exchange);
  if (!conn?.encrypted_config_b64) {
    const errMsg = 'No exchange connection for ' + bot.exchange;
    console.warn('[dca-engine] bot=%s status=blocked error=%s', bot.id, errMsg);
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'blocked',
      last_tick_error: errMsg,
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
    console.warn('[dca-engine] bot=%s status=error error=%s', bot.id, msg);
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'error',
      last_tick_error: msg,
      next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
      is_locked: false,
    });
    return { botId: bot.id, status: 'error', error: msg };
  }

  const env = (conn.environment || 'production') as string;
  let price: number;
  try {
    price = await getSpotPrice(bot.exchange, bot.pair, env);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ticker failed';
    console.warn('[dca-engine] bot=%s status=error error=%s', bot.id, msg);
    await releaseDcaLock(client, bot.id, {
      last_tick_at: now.toISOString(),
      last_tick_status: 'error',
      last_tick_error: msg,
      next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
      is_locked: false,
    });
    return { botId: bot.id, status: 'error', error: msg };
  }

  try {
    await syncOpenOrders(client, bot.id, bot.exchange, bot.pair, creds);
  } catch {
    /* non-fatal: continue with our state */
  }
  try {
    await ingestRecentTradesFromExchange(client, bot.user_id, bot.exchange, bot.pair, creds, env as 'production' | 'testnet');
  } catch {
    /* non-fatal */
  }

  const { data: stateRow } = await client
    .from('dca_bot_state')
    .select('*')
    .eq('dca_bot_id', bot.id)
    .maybeSingle();

  const state = stateRow as DcaBotStateRow | null;
  let positionSize = state?.position_size != null ? parseFloat(String(state.position_size)) : 0;
  let avgEntry = state?.avg_entry_price != null ? parseFloat(String(state.avg_entry_price)) : 0;
  const safetyFilled = state?.safety_orders_filled ?? 0;
  const realizedPnl = state?.realized_pnl != null ? parseFloat(String(state.realized_pnl)) : 0;

  const sym = normalizeSymbol(bot.pair);
  let filters: { minQty: number; stepSize: number; minNotional: number } = {
    minQty: 1e-8,
    stepSize: 1e-8,
    minNotional: 1,
  };
  try {
    if (bot.exchange === 'binance') {
      const f = await getSpotSymbolFilters(sym);
      filters = { minQty: f.minQty, stepSize: f.stepSize, minNotional: f.minNotional };
    } else {
      const f = await bybitGetSpotSymbolFilters(sym, env as 'production' | 'testnet');
      filters = { minQty: f.minQty, stepSize: f.stepSize, minNotional: f.minNotional };
    }
  } catch {
    /* use defaults */
  }

  // Reconcile position with exchange (source of truth): if user sold manually, our state may show more than they have
  if (positionSize > 0) {
    let actualBase: number;
    try {
      actualBase = await getSpotBaseBalance(bot.exchange as 'binance' | 'bybit', creds, sym, env as 'production' | 'testnet');
    } catch {
      actualBase = positionSize;
    }
    const tolerance = Math.max(filters.stepSize * 2, 1e-8);
    if (actualBase < positionSize - tolerance) {
      const reconciledSize = actualBase >= filters.minQty ? actualBase : 0;
      await client
        .from('dca_bot_state')
        .update({
          position_size: reconciledSize,
          avg_entry_price: reconciledSize > 0 ? state?.avg_entry_price : null,
          safety_orders_filled: reconciledSize > 0 ? (state?.safety_orders_filled ?? 0) : 0,
          updated_at: now.toISOString(),
        })
        .eq('dca_bot_id', bot.id);
      positionSize = reconciledSize;
      // Manual close detected: bot had position but exchange shows none -> stop bot with clear reason
      if (reconciledSize === 0 && state?.position_size != null && parseFloat(String(state.position_size)) > 0) {
        await client
          .from('dca_bots')
          .update({
            status: 'stopped',
            last_tick_at: now.toISOString(),
            last_tick_status: 'stopped',
            last_tick_error: 'Position closed manually on exchange. Bot stopped.',
            next_tick_at: null,
            is_locked: false,
            updated_at: now.toISOString(),
          })
          .eq('id', bot.id);
        return { botId: bot.id, status: 'stopped', reason: 'Position closed manually on exchange' };
      }
    }
  }

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

  const flattenOnStop = !!config.flattenOnStop;

  // Risk: max drawdown stop (optionally flatten position)
  if (maxDrawdownStopPct != null && maxDrawdownStopPct > 0 && positionSize > 0 && avgEntry > 0) {
    const drawdownPct = ((avgEntry - price) / avgEntry) * 100;
    if (drawdownPct >= maxDrawdownStopPct) {
      if (flattenOnStop) {
        try {
          const { data: tpRows } = await client.from('dca_bot_orders').select('id, exchange_order_id, client_order_id').eq('dca_bot_id', bot.id).eq('side', 'sell').in('status', ['submitted', 'pending', 'open', 'new']);
          for (const row of tpRows ?? []) {
            try {
              await cancelDcaOrder(client, bot.id, bot.exchange, creds, { symbol: bot.pair, orderId: row.exchange_order_id ?? undefined, orderLinkId: row.client_order_id ?? undefined, dcaOrderId: row.id });
            } catch { /* best effort */ }
          }
          const sellQty = roundToStep(positionSize, filters.stepSize);
          if (parseFloat(sellQty) >= filters.minQty) {
            const clientOrderId = makeDcaClientOrderId(bot.id, 'fl', now.getTime());
            assertDcaClientOrderId(clientOrderId);
            const { exchangeOrderId } = await placeDcaOrder(client, bot.user_id, bot.id, bot.exchange, creds, { pair: bot.pair, side: 'sell', type: 'market', qty: sellQty, clientOrderId }, env);
            await insertDcaOrderIntoUnified(client, bot.user_id, bot.id, sym, 'sell', 'market', parseFloat(sellQty), price, exchangeOrderId);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Flatten failed';
          await client.from('dca_bots').update({ last_tick_error: 'Max drawdown stop; flatten failed: ' + msg, updated_at: now.toISOString() }).eq('id', bot.id);
        }
      }
      await client
        .from('dca_bots')
        .update({
          status: 'stopped',
          last_tick_at: now.toISOString(),
          last_tick_status: 'blocked',
          last_tick_error: 'Max drawdown stop' + (flattenOnStop ? ' (position flattened)' : ''),
          next_tick_at: cooldownMinutes > 0 ? new Date(now.getTime() + cooldownMinutes * 60 * 1000).toISOString() : null,
          is_locked: false,
          updated_at: now.toISOString(),
        })
        .eq('id', bot.id);
      return { botId: bot.id, status: 'blocked', reason: 'Max drawdown stop' };
    }
  }

  // Entry: no position -> place base buy
  if (positionSize <= 0) {
    const qtyRaw = baseOrderUsdt / price;
    const qty = roundToStep(Math.max(qtyRaw, filters.minQty), filters.stepSize);
    const notional = parseFloat(qty) * price;
    if (notional < filters.minNotional) {
      const minUsd = Math.ceil(filters.minNotional * 100) / 100;
      const errMsg = `Base order below min notional (min $${minUsd} for ${bot.pair}). Increase base order size to at least $${minUsd} or add USDT on your exchange.`;
      await releaseDcaLock(client, bot.id, {
        last_tick_at: now.toISOString(),
        last_tick_status: 'skipped',
        last_tick_error: errMsg,
        next_tick_at: new Date(now.getTime() + TICK_INTERVAL_SEC * 1000).toISOString(),
        is_locked: false,
      });
      return { botId: bot.id, status: 'skipped', reason: 'Min notional' };
    }
    const clientOrderId = makeDcaClientOrderId(bot.id, 'ba', now.getTime());
    assertDcaClientOrderId(clientOrderId);
    try {
      const { exchangeOrderId } = await placeDcaOrder(client, bot.user_id, bot.id, bot.exchange, creds, {
        pair: bot.pair,
        side: 'buy',
        type: 'market',
        qty,
        clientOrderId,
      }, env);
      await insertDcaOrderIntoUnified(client, bot.user_id, bot.id, sym, 'buy', 'market', parseFloat(qty), price, exchangeOrderId);
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
      // Same-tick bracket: we now have a position; fall through to place TP limit sell below
      positionSize = parseFloat(qty);
      avgEntry = price;
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
    // Do not return here: fall through to "We have a position" to place TP sell in same tick
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
      const levelTag = level <= 9 ? `s${level}` : String(level).padStart(2, '0');
      const clientOrderId = makeDcaClientOrderId(bot.id, levelTag, now.getTime());
      assertDcaClientOrderId(clientOrderId);
      try {
        const { exchangeOrderId } = await placeDcaOrder(client, bot.user_id, bot.id, bot.exchange, creds, {
          pair: bot.pair,
          side: 'buy',
          type: 'limit',
          qty,
          price: levelPrice.toFixed(2),
          clientOrderId,
        }, env);
        await insertDcaOrderIntoUnified(client, bot.user_id, bot.id, sym, 'buy', 'limit', parseFloat(qty), levelPrice, exchangeOrderId);
      } catch {
        /* may already exist or rate limit */
      }
    }
  }

  // TP: cancel/replace if avg_entry changed > threshold
  const tpPriceSingle = avgEntry * (1 + tpPct / 100);
  const { data: openTpRows } = await client
    .from('dca_bot_orders')
    .select('id, exchange_order_id, client_order_id, price')
    .eq('dca_bot_id', bot.id)
    .eq('side', 'sell')
    .in('status', ['submitted', 'pending', 'open', 'new']);
  let shouldReplaceTp = false;
  if (openTpRows?.length && avgEntry > 0) {
    const expectedTp = avgEntry * (1 + tpPct / 100);
    for (const row of openTpRows) {
      const orderPrice = row.price != null ? parseFloat(String(row.price)) : expectedTp;
      const pctDiff = Math.abs(orderPrice - expectedTp) / orderPrice;
      if (pctDiff > TP_REPLACE_THRESHOLD_PCT / 100) {
        shouldReplaceTp = true;
        break;
      }
    }
  }
  if (shouldReplaceTp && openTpRows?.length) {
    for (const row of openTpRows) {
      try {
        await cancelDcaOrder(client, bot.id, bot.exchange, creds, {
          symbol: bot.pair,
          orderId: row.exchange_order_id ?? undefined,
          origClientOrderId: row.client_order_id ?? undefined,
          orderLinkId: row.client_order_id ?? undefined,
          dcaOrderId: row.id,
        });
      } catch {
        /* best effort */
      }
    }
  }
  const hasTpOrders = openTpRows && openTpRows.length > 0 && !shouldReplaceTp;
  if (!hasTpOrders && positionSize > 0) {
    let actualBaseForSell: number;
    let balanceFetchOk = false;
    try {
      actualBaseForSell = await getSpotBaseBalance(bot.exchange as 'binance' | 'bybit', creds, sym, env as 'production' | 'testnet');
      balanceFetchOk = true;
    } catch {
      actualBaseForSell = 0;
    }
    if (!balanceFetchOk) {
      await releaseDcaLock(client, bot.id, {
        last_tick_at: now.toISOString(),
        last_tick_status: 'skipped',
        last_tick_error: 'Could not verify exchange balance; skipping TP. Run tick again.',
        next_tick_at: nextTickAt,
        is_locked: false,
      });
      return { botId: bot.id, status: 'skipped', reason: 'Balance check unavailable' };
    }
    const sellQtyNum = Math.min(positionSize, actualBaseForSell);
    const sellQty = roundToStep(sellQtyNum, filters.stepSize);
    if (parseFloat(sellQty) >= filters.minQty) {
      try {
        if (tpLadder && tpLadderLevels.length >= 3) {
          const totalShare = tpLadderLevels.reduce((s, l) => s + (l.sharePct ?? 0), 0) || 100;
          const totalToSell = sellQtyNum;
          for (let i = 0; i < tpLadderLevels.length; i++) {
            const level = tpLadderLevels[i];
            const pct = (level.sharePct ?? 33) / totalShare;
            const partQty = roundToStep(totalToSell * pct, filters.stepSize);
            if (parseFloat(partQty) < filters.minQty) continue;
            const levelTpPrice = avgEntry * (1 + (level.pct ?? tpPct) / 100);
            const clientOrderId = makeDcaClientOrderId(bot.id, 'tp', now.getTime(), i);
            assertDcaClientOrderId(clientOrderId);
            const { exchangeOrderId } = await placeDcaOrder(client, bot.user_id, bot.id, bot.exchange, creds, {
              pair: bot.pair,
              side: 'sell',
              type: 'limit',
              qty: partQty,
              price: levelTpPrice.toFixed(2),
              clientOrderId,
            }, env);
            await insertDcaOrderIntoUnified(client, bot.user_id, bot.id, sym, 'sell', 'limit', parseFloat(partQty), levelTpPrice, exchangeOrderId);
          }
        } else {
          const clientOrderId = makeDcaClientOrderId(bot.id, 'tp', now.getTime());
          assertDcaClientOrderId(clientOrderId);
          const { exchangeOrderId } = await placeDcaOrder(client, bot.user_id, bot.id, bot.exchange, creds, {
            pair: bot.pair,
            side: 'sell',
            type: 'limit',
            qty: sellQty,
            price: tpPriceSingle.toFixed(2),
            clientOrderId,
          }, env);
          await insertDcaOrderIntoUnified(client, bot.user_id, bot.id, sym, 'sell', 'limit', parseFloat(sellQty), tpPriceSingle, exchangeOrderId);
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
    } else if (actualBaseForSell < filters.minQty) {
      await client
        .from('dca_bot_state')
        .update({
          position_size: 0,
          avg_entry_price: null,
          safety_orders_filled: 0,
          updated_at: now.toISOString(),
        })
        .eq('dca_bot_id', bot.id);
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

  if (error) {
    console.error('[dca-engine] fetch bots error:', error.message);
    return { processed: 0, results };
  }
  if (!bots?.length) {
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
      const err = 'error' in result ? result.error : ('reason' in result ? result.reason : null);
      if (result.status !== 'ok') {
        console.warn('[dca-engine] bot=%s status=%s %s', bot.id, result.status, err ?? '');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Tick failed';
      console.warn('[dca-engine] bot=%s status=error error=%s', bot.id, msg);
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
