/**
 * Strategy runner: runStrategyTick (single), runDueStrategies (all due).
 * MVP: no real orders; signal='hold', status='ok'. Idempotent, locking, risk gating.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { shouldRunNow, getTimeframeMs } from './timeframes.js';
import { checkUserRiskGate } from './strategyRisk.js';
import { acquireStrategyLock, releaseStrategyLock } from './strategyLock.js';

const LOCK_TTL_MS = 2 * 60 * 1000; // 2 minutes
const COOLDOWN_AFTER_RUN_MS = 30 * 1000; // 30s min between runs per strategy

export interface StrategyRow {
  id: string;
  user_id: string;
  name: string;
  exchange: string;
  market_type: string;
  symbol: string;
  timeframe: string;
  status: string;
  side_mode: string;
  leverage: number;
  order_size_pct: number;
  take_profit_pct: number | null;
  stop_loss_pct: number | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunTickContext {
  requestId?: string;
}

export interface RunTickResult {
  status: 'ok' | 'skipped' | 'blocked' | 'error';
  reason?: string;
  signal: 'buy' | 'sell' | 'hold';
  latencyMs?: number;
  runId?: string;
}

/**
 * Run one tick for a strategy. MVP: no real orders; record run with signal='hold', status='ok'.
 */
export async function runStrategyTick(
  client: SupabaseClient,
  strategyId: string,
  now: Date,
  context: RunTickContext = {}
): Promise<RunTickResult> {
  const requestId = context.requestId ?? 'runner';
  const startedAt = now;

  const { data: strategy, error: fetchErr } = await client
    .from('strategies')
    .select('id, user_id, name, exchange, market_type, symbol, timeframe, status, side_mode, leverage, order_size_pct, take_profit_pct, stop_loss_pct, last_run_at, created_at, updated_at')
    .eq('id', strategyId)
    .single();

  if (fetchErr || !strategy) {
    return { status: 'error', reason: 'strategy_not_found', signal: 'hold' };
  }

  const row = strategy as unknown as StrategyRow;

  if (row.status !== 'active') {
    await recordRun(client, strategyId, row.user_id, now, 'skipped', 'strategy_not_active', 'hold', null, { requestId });
    return { status: 'skipped', reason: 'strategy_not_active', signal: 'hold' };
  }

  const acquired = await acquireStrategyLock(client, strategyId, LOCK_TTL_MS);
  if (!acquired) {
    await recordRun(client, strategyId, row.user_id, now, 'skipped', 'lock_not_acquired', 'hold', null, { requestId });
    return { status: 'skipped', reason: 'lock_not_acquired', signal: 'hold' };
  }

  try {
    const risk = await checkUserRiskGate(client, row.user_id, now);
    if (!risk.ok) {
      await recordRun(client, strategyId, row.user_id, now, 'blocked', risk.blockReason ?? 'risk', 'hold', null, { requestId });
      return { status: 'blocked', reason: risk.blockReason, signal: 'hold' };
    }

    const lastRunAt = row.last_run_at ? new Date(row.last_run_at) : null;
    if (lastRunAt) {
      const elapsed = now.getTime() - lastRunAt.getTime();
      if (elapsed < COOLDOWN_AFTER_RUN_MS) {
        await recordRun(client, strategyId, row.user_id, now, 'skipped', 'cooldown', 'hold', null, { requestId });
        return { status: 'skipped', reason: 'cooldown', signal: 'hold' };
      }
    }

    // MVP: no real orders; signal hold
    const finishedAt = new Date();
    const latencyMs = finishedAt.getTime() - startedAt.getTime();
    const runId = await recordRun(client, strategyId, row.user_id, now, 'ok', null, 'hold', latencyMs, { requestId });

    await client
      .from('strategies')
      .update({ last_run_at: finishedAt.toISOString(), updated_at: finishedAt.toISOString() })
      .eq('id', strategyId);

    return { status: 'ok', signal: 'hold', latencyMs, runId };
  } finally {
    await releaseStrategyLock(client, strategyId);
  }
}

async function recordRun(
  client: SupabaseClient,
  strategyId: string,
  userId: string,
  scheduledAt: Date,
  status: 'ok' | 'skipped' | 'blocked' | 'error',
  reason: string | null,
  signal: 'buy' | 'sell' | 'hold',
  latencyMs: number | null,
  meta: Record<string, unknown>
): Promise<string | undefined> {
  const now = new Date();
  const { data, error } = await client
    .from('strategy_tick_runs')
    .insert({
      strategy_id: strategyId,
      user_id: userId,
      scheduled_at: scheduledAt.toISOString(),
      started_at: now.toISOString(),
      finished_at: now.toISOString(),
      status,
      reason,
      signal,
      latency_ms: latencyMs,
      meta,
    })
    .select('id')
    .single();

  if (error) return undefined;
  return (data as { id: string })?.id;
}

export interface DueSummary {
  ran: number;
  skipped: number;
  blocked: number;
  errors: number;
  results: Array<{ strategyId: string; status: string; reason?: string }>;
}

/**
 * Run all strategies that are due (timeframe boundary + not in cooldown).
 */
export async function runDueStrategies(client: SupabaseClient, now: Date, context: RunTickContext = {}): Promise<DueSummary> {
  const summary: DueSummary = { ran: 0, skipped: 0, blocked: 0, errors: 0, results: [] };

  const { data: strategies, error } = await client
    .from('strategies')
    .select('id, user_id, timeframe, status, last_run_at')
    .eq('status', 'active');

  if (error || !strategies?.length) {
    return summary;
  }

  for (const s of strategies) {
    const lastRunAt = (s as { last_run_at?: string }).last_run_at ? new Date((s as { last_run_at: string }).last_run_at) : null;
    if (!shouldRunNow((s as { timeframe: string }).timeframe, now, lastRunAt)) {
      continue;
    }

    const result = await runStrategyTick(client, s.id, now, context);
    summary.results.push({ strategyId: s.id, status: result.status, reason: result.reason });
    if (result.status === 'ok') summary.ran++;
    else if (result.status === 'skipped') summary.skipped++;
    else if (result.status === 'blocked') summary.blocked++;
    else summary.errors++;
  }

  return summary;
}
