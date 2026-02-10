/**
 * Copy Engine — Pro copy trading: mirror master trader orders to followers.
 *
 * CONTRACT (when implemented):
 * 1. Consume a feed of master trades (or poll master positions/trades).
 * 2. For each active copy_setup following that master:
 *    - Resolve follower's exchange connection; check global kill switch and user risk limits.
 *    - Compute size from allocation %, max position %, and follower balance/equity.
 *    - Place order on follower's exchange (via existing futures/order adapter).
 *    - Record order/position/trade in positions, orders, trades tables.
 * 3. Must call isPlatformKillSwitchOn() before any order; respect user_risk_settings and copy_setup limits.
 *
 * STATUS: Stub only. copy_setups are configuration; no order placement runs here yet.
 * See docs/PRO_COPY_TRADING_STANDARDS.md and docs/PLATFORM_AUDIT_REPORT.md.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CopyEngineConfig {
  /** When true, copy engine is enabled (not yet implemented). */
  enabled: boolean;
}

/**
 * Placeholder: would process one master trade and replicate to all followers.
 * Not implemented; returns without placing orders.
 */
export async function replicateMasterTrade(
  _client: SupabaseClient,
  _masterTraderId: string,
  _payload: { symbol: string; side: 'BUY' | 'SELL'; qty: number; orderId?: string }
): Promise<{ replicated: number; errors: string[] }> {
  return { replicated: 0, errors: ['Copy engine not implemented'] };
}

/**
 * Placeholder: would return whether the copy engine worker is running.
 */
export function isCopyEngineRunning(): boolean {
  return false;
}
