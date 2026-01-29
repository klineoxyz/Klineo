/**
 * Strategy risk gates: daily max loss, max trades/day, consecutive losses, cooldown.
 * Reset risk_state when day changes. Safe defaults; env overrides.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const DAILY_MAX_LOSS_USDT = Number(process.env.DAILY_MAX_LOSS_USDT) || 50;
const MAX_TRADES_PER_DAY = Number(process.env.MAX_TRADES_PER_DAY) || 20;
const MAX_CONSECUTIVE_LOSSES = Number(process.env.MAX_CONSECUTIVE_LOSSES) || 3;
const COOLDOWN_AFTER_TRADE_SEC = Number(process.env.COOLDOWN_AFTER_TRADE_SEC) || 30;
const PAUSE_DURATION_MIN = Number(process.env.PAUSE_DURATION_MIN) || 1440;

export const RISK_CONFIG = {
  DAILY_MAX_LOSS_USDT,
  MAX_TRADES_PER_DAY,
  MAX_CONSECUTIVE_LOSSES,
  COOLDOWN_AFTER_TRADE_SEC,
  PAUSE_DURATION_MIN,
};

export interface RiskGateResult {
  ok: boolean;
  blockReason?: string;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Ensure risk state row exists for user/day; return current state.
 */
async function getOrCreateRiskState(
  client: SupabaseClient,
  userId: string,
  day: string
): Promise<{
  realized_pnl_usdt: number;
  trades_count: number;
  consecutive_losses: number;
  is_paused: boolean;
  paused_reason: string | null;
  paused_until: string | null;
  last_trade_at: string | null;
}> {
  const { data, error } = await client
    .from('strategy_risk_state')
    .select('realized_pnl_usdt, trades_count, consecutive_losses, is_paused, paused_reason, paused_until, last_trade_at')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();

  if (error) throw new Error(`risk state fetch: ${error.message}`);
  if (data) {
    return {
      realized_pnl_usdt: Number(data.realized_pnl_usdt ?? 0),
      trades_count: Number(data.trades_count ?? 0),
      consecutive_losses: Number(data.consecutive_losses ?? 0),
      is_paused: Boolean(data.is_paused),
      paused_reason: data.paused_reason ?? null,
      paused_until: data.paused_until ?? null,
      last_trade_at: data.last_trade_at ?? null,
    };
  }

  await client.from('strategy_risk_state').insert({
    user_id: userId,
    day,
    realized_pnl_usdt: 0,
    trades_count: 0,
    consecutive_losses: 0,
    is_paused: false,
    updated_at: new Date().toISOString(),
  });
  return {
    realized_pnl_usdt: 0,
    trades_count: 0,
    consecutive_losses: 0,
    is_paused: false,
    paused_reason: null,
    paused_until: null,
    last_trade_at: null,
  };
}

/**
 * Check if user is allowed to run a tick that could place an order.
 */
export async function checkUserRiskGate(
  client: SupabaseClient,
  userId: string,
  now: Date
): Promise<RiskGateResult> {
  const day = toDateKey(now);
  const state = await getOrCreateRiskState(client, userId, day);

  if (state.is_paused && state.paused_until) {
    if (new Date(state.paused_until) > now) {
      return { ok: false, blockReason: `user_paused: ${state.paused_reason ?? 'risk'}` };
    }
  }

  if (state.realized_pnl_usdt <= -DAILY_MAX_LOSS_USDT) {
    return { ok: false, blockReason: 'daily_max_loss' };
  }

  if (state.trades_count >= MAX_TRADES_PER_DAY) {
    return { ok: false, blockReason: 'max_trades_per_day' };
  }

  if (state.consecutive_losses >= MAX_CONSECUTIVE_LOSSES) {
    return { ok: false, blockReason: 'max_consecutive_losses' };
  }

  if (state.last_trade_at) {
    const lastTrade = new Date(state.last_trade_at);
    const cooldownEnd = new Date(lastTrade.getTime() + COOLDOWN_AFTER_TRADE_SEC * 1000);
    if (now < cooldownEnd) {
      return { ok: false, blockReason: 'cooldown_after_trade' };
    }
  }

  return { ok: true };
}

/**
 * Record a trade result and update risk state (pnl delta, trades count, consecutive losses).
 */
export async function recordTradeResult(
  client: SupabaseClient,
  userId: string,
  pnlDeltaUsdt: number,
  now: Date
): Promise<void> {
  const day = toDateKey(now);
  const state = await getOrCreateRiskState(client, userId, day);

  let newConsecutive = state.consecutive_losses;
  if (pnlDeltaUsdt < 0) {
    newConsecutive = state.consecutive_losses + 1;
  } else {
    newConsecutive = 0;
  }

  const newPnl = state.realized_pnl_usdt + pnlDeltaUsdt;
  const newTradesCount = state.trades_count + 1;

  let isPaused = state.is_paused;
  let pausedReason = state.paused_reason;
  let pausedUntil = state.paused_until;

  if (newPnl <= -DAILY_MAX_LOSS_USDT) {
    isPaused = true;
    pausedReason = 'daily_max_loss';
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);
    pausedUntil = endOfDay.toISOString();
  } else if (newConsecutive >= MAX_CONSECUTIVE_LOSSES) {
    isPaused = true;
    pausedReason = 'max_consecutive_losses';
    const until = new Date(now.getTime() + PAUSE_DURATION_MIN * 60 * 1000);
    pausedUntil = until.toISOString();
  }

  const cooldownUntil = new Date(now.getTime() + COOLDOWN_AFTER_TRADE_SEC * 1000);

  await client
    .from('strategy_risk_state')
    .upsert(
      {
        user_id: userId,
        day,
        realized_pnl_usdt: newPnl,
        trades_count: newTradesCount,
        consecutive_losses: newConsecutive,
        is_paused: isPaused,
        paused_reason: pausedReason,
        paused_until: pausedUntil,
        last_trade_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id,day' }
    );
}

/**
 * Pause user (set is_paused, paused_reason, paused_until).
 */
export async function pauseUser(
  client: SupabaseClient,
  userId: string,
  reason: string,
  until?: Date
): Promise<void> {
  const now = new Date();
  const day = toDateKey(now);
  const state = await getOrCreateRiskState(client, userId, day);
  const pausedUntil = until ? until.toISOString() : new Date(now.getTime() + PAUSE_DURATION_MIN * 60 * 1000).toISOString();

  await client
    .from('strategy_risk_state')
    .upsert(
      {
        user_id: userId,
        day,
        realized_pnl_usdt: state.realized_pnl_usdt,
        trades_count: state.trades_count,
        consecutive_losses: state.consecutive_losses,
        is_paused: true,
        paused_reason: reason,
        paused_until: pausedUntil,
        last_trade_at: state.last_trade_at,
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id,day' }
    );
}
