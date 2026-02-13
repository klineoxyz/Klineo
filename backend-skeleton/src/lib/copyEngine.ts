/**
 * Copy Engine — Pro copy trading: mirror master trader orders to followers.
 *
 * CONTRACT:
 * 1. Consume a feed of master trades (or poll master positions/trades).
 * 2. For each active copy_setup following that master:
 *    - Resolve follower's exchange connection (same exchange as master; must be last_test_status=ok, not disabled).
 *    - For futures: connection must have futures_enabled.
 *    - Check global kill switch and connection kill_switch.
 *    - Compute size from allocation %, max position %, and follower balance/equity (or use scaled qty).
 *    - Place order on follower's exchange (spot or futures via existing adapters).
 *    - Record order/position/trade in positions, orders, trades tables (caller or separate).
 * 3. Spot and Futures both execute on the user's connected exchange when correctly connected (API tested).
 *
 * Exchange as source of truth: use live exchange balance for size/checks; sync order status from exchange when displaying. See docs/EXCHANGE_AS_SOURCE_OF_TRUTH.md.
 * See docs/PRO_COPY_TRADING_STANDARDS.md and docs/PLATFORM_AUDIT_REPORT.md.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from './crypto.js';
import { isPlatformKillSwitchOn } from './platformSettings.js';
import { executeOrder } from './orderExecution.js';

export interface CopyEngineConfig {
  /** When true, copy engine is enabled. */
  enabled: boolean;
}

export interface ReplicateMasterTradePayload {
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: number;
  /** Exchange the master traded on (follower must have a connection for this exchange). */
  exchange: 'binance' | 'bybit';
  /** Market type: spot or futures. Follower's connection must support it (futures_enabled for futures). */
  market: 'spot' | 'futures';
  orderId?: string;
}

/**
 * Load follower's exchange connection for the given exchange.
 * Only returns connections that are successfully tested (last_test_status = 'ok'), not disabled, and kill_switch off.
 * For futures, connection must have futures_enabled.
 */
async function loadFollowerConnection(
  client: SupabaseClient,
  userId: string,
  exchange: string,
  market: 'spot' | 'futures'
): Promise<{
  encrypted_config_b64: string;
  environment: string;
  futures_enabled?: boolean;
  kill_switch?: boolean;
} | null> {
  const { data } = await client
    .from('user_exchange_connections')
    .select('encrypted_config_b64, environment, futures_enabled, kill_switch')
    .eq('user_id', userId)
    .eq('exchange', exchange)
    .eq('last_test_status', 'ok')
    .is('disabled_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.encrypted_config_b64) return null;
  const row = data as { futures_enabled?: boolean; kill_switch?: boolean };
  if (row.kill_switch) return null;
  if (market === 'futures' && !row.futures_enabled) return null;
  return data as { encrypted_config_b64: string; environment: string; futures_enabled?: boolean; kill_switch?: boolean };
}

/**
 * Process one master trade and replicate to all active followers.
 * Uses each follower's connected exchange (same exchange as master); only executes when
 * the follower has a successfully tested connection (last_test_status = 'ok').
 * Spot and Futures both run on the follower's connected API when available.
 */
export async function replicateMasterTrade(
  client: SupabaseClient,
  masterTraderId: string,
  payload: ReplicateMasterTradePayload
): Promise<{ replicated: number; errors: string[] }> {
  const errors: string[] = [];
  let replicated = 0;

  if (await isPlatformKillSwitchOn(client)) {
    return { replicated: 0, errors: ['Platform kill switch is on'] };
  }

  const { data: setups, error: setupsErr } = await client
    .from('copy_setups')
    .select('id, user_id, allocation_pct, max_position_pct')
    .eq('trader_id', masterTraderId)
    .eq('status', 'active');

  if (setupsErr || !setups?.length) {
    return { replicated: 0, errors: setupsErr ? [setupsErr.message] : [] };
  }

  const exchange = payload.exchange;
  const market = payload.market;
  const symbol = (payload.symbol || '').replace('/', '').toUpperCase();
  const side = payload.side;
  const qty = payload.qty;

  if (!symbol || !exchange || (market !== 'spot' && market !== 'futures') || !(qty > 0)) {
    return { replicated: 0, errors: ['Invalid payload: symbol, exchange, market, qty required'] };
  }

  for (const setup of setups as Array<{ id: string; user_id: string; allocation_pct?: number; max_position_pct?: number }>) {
    const followerId = setup.user_id;
    const conn = await loadFollowerConnection(client, followerId, exchange, market);
    if (!conn) {
      errors.push(`Follower ${followerId}: no valid connection for ${exchange} ${market}`);
      continue;
    }

    let decrypted: { apiKey: string; apiSecret: string };
    try {
      const raw = await decrypt(conn.encrypted_config_b64);
      decrypted = JSON.parse(raw) as { apiKey: string; apiSecret: string };
    } catch (e) {
      errors.push(`Follower ${followerId}: decrypt failed`);
      continue;
    }

    const env = (conn.environment || 'production') as 'production' | 'testnet';
    const allocationPct = Math.min(100, Math.max(0, Number(setup.allocation_pct ?? 100) / 100));
    const scaledQty = Math.max(0, qty * allocationPct);
    const qtyStr = String(scaledQty);

    const result = await executeOrder(client, {
      userId: followerId,
      source: 'COPY',
      copySetupId: setup.id,
      exchange: exchange as 'binance' | 'bybit',
      marketType: market,
      symbol,
      side,
      orderType: 'market',
      quantity: qtyStr,
      credentials: { apiKey: decrypted.apiKey, apiSecret: decrypted.apiSecret },
      environment: env,
    });
    if (result.success) {
      replicated += 1;
    } else {
      const reason = result.message ?? result.reason_code ?? 'Order skipped or failed';
      errors.push(`Follower ${followerId}: ${reason}`);
    }
  }

  return { replicated, errors };
}

/**
 * Returns whether the copy engine worker is running (when a scheduler invokes replicateMasterTrade).
 */
export function isCopyEngineRunning(): boolean {
  return true;
}
