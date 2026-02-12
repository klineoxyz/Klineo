/**
 * Strategy runner: runStrategyTick (single), runDueStrategies (all due).
 * Operates on strategy_runs (Futures Go Live config). Uses locks, risk gates, real engine (candles -> RSI -> signal -> order).
 * Logs to strategy_tick_runs (audit) and strategy_events (immutable event log).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { shouldRunNow, getTimeframeMs } from './timeframes.js';
import { checkUserRiskGate } from './strategyRisk.js';
import { isPlatformKillSwitchOn } from './platformSettings.js';
import { acquireStrategyLock, releaseStrategyLock } from './strategyLock.js';
import { decrypt } from './crypto.js';
import { createBinanceFuturesAdapter } from './binance-futures.js';
import { createBybitFuturesAdapter } from './bybit-futures.js';
import { runRsiTick, MAX_CONSECUTIVE_FAILURES } from './strategy-engine.js';
import type { StrategyRunRow, ConnectionRow } from './strategy-engine.js';

const LOCK_TTL_MS = 2 * 60 * 1000; // 2 minutes
const COOLDOWN_AFTER_RUN_MS = 30 * 1000; // 30s min between runs per strategy

export interface StrategyRunForRunner {
  id: string;
  user_id: string;
  exchange_connection_id: string;
  exchange: string;
  symbol: string;
  timeframe: string;
  direction: string;
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
  last_run_at: string | null;
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

function signalToTick(s: 'long' | 'short' | 'none'): 'buy' | 'sell' | 'hold' {
  if (s === 'long') return 'buy';
  if (s === 'short') return 'sell';
  return 'hold';
}

/**
 * Run one tick for a strategy_run. Acquires lock, checks risk, runs real engine (candles -> RSI -> order), logs to tick_runs + strategy_events.
 */
export async function runStrategyTick(
  client: SupabaseClient,
  strategyRunId: string,
  now: Date,
  context: RunTickContext = {}
): Promise<RunTickResult> {
  const requestId = context.requestId ?? 'runner';
  const startedAt = now;

  const { data: run, error: fetchErr } = await client
    .from('strategy_runs')
    .select('id, user_id, exchange_connection_id, exchange, market_type, symbol, timeframe, direction, leverage, margin_mode, position_mode, order_size_pct, initial_capital_usdt, take_profit_pct, stop_loss_pct, strategy_template, strategy_params, status, last_run_at')
    .eq('id', strategyRunId)
    .single();

  if (fetchErr || !run) {
    return { status: 'error', reason: 'strategy_run_not_found', signal: 'hold' };
  }

  const row = run as unknown as StrategyRunForRunner;

  if (row.status !== 'active') {
    await recordRun(client, strategyRunId, row.user_id, now, 'skipped', 'strategy_not_active', 'hold', null, { requestId });
    return { status: 'skipped', reason: 'strategy_not_active', signal: 'hold' };
  }

  const acquired = await acquireStrategyLock(client, strategyRunId, LOCK_TTL_MS);
  if (!acquired) {
    await recordRun(client, strategyRunId, row.user_id, now, 'skipped', 'lock_not_acquired', 'hold', null, { requestId });
    return { status: 'skipped', reason: 'lock_not_acquired', signal: 'hold' };
  }

  try {
    const risk = await checkUserRiskGate(client, row.user_id, now);
    if (!risk.ok) {
      await recordRun(client, strategyRunId, row.user_id, now, 'blocked', risk.blockReason ?? 'risk', 'hold', null, { requestId });
      return { status: 'blocked', reason: risk.blockReason, signal: 'hold' };
    }

    // P0: Global platform kill switch (platform_settings.kill_switch_global = 'true')
    if (await isPlatformKillSwitchOn(client)) {
      await recordRun(client, strategyRunId, row.user_id, now, 'blocked', 'platform_kill_switch', 'hold', null, { requestId });
      return { status: 'blocked', reason: 'platform_kill_switch', signal: 'hold' };
    }

    const lastRunAt = row.last_run_at ? new Date(row.last_run_at) : null;
    if (lastRunAt) {
      const elapsed = now.getTime() - lastRunAt.getTime();
      if (elapsed < COOLDOWN_AFTER_RUN_MS) {
        await recordRun(client, strategyRunId, row.user_id, now, 'skipped', 'cooldown', 'hold', null, { requestId });
        return { status: 'skipped', reason: 'cooldown', signal: 'hold' };
      }
    }

    // Load connection (must be successfully tested and futures-enabled for strategy execution)
    const { data: conn, error: connErr } = await client
      .from('user_exchange_connections')
      .select('id, encrypted_config_b64, environment, futures_enabled, kill_switch, max_leverage_allowed, max_notional_usdt, margin_mode, position_mode, default_leverage, last_test_status')
      .eq('id', row.exchange_connection_id)
      .eq('user_id', row.user_id)
      .single();

    if (connErr || !conn) {
      await recordRun(client, strategyRunId, row.user_id, now, 'error', 'connection_not_found', 'hold', null, { requestId });
      return { status: 'error', reason: 'connection_not_found', signal: 'hold' };
    }

    if (conn.last_test_status !== 'ok') {
      await recordRun(client, strategyRunId, row.user_id, now, 'blocked', 'connection_not_tested', 'hold', null, { requestId });
      return { status: 'blocked', reason: 'connection_not_tested', signal: 'hold' };
    }

    const hasB64 = typeof conn.encrypted_config_b64 === 'string' && conn.encrypted_config_b64.length > 0;
    if (!hasB64) {
      await recordRun(client, strategyRunId, row.user_id, now, 'blocked', 'credentials_missing', 'hold', null, { requestId });
      return { status: 'blocked', reason: 'credentials_missing', signal: 'hold' };
    }

    let decrypted: string;
    try {
      decrypted = await decrypt(conn.encrypted_config_b64);
    } catch {
      await recordRun(client, strategyRunId, row.user_id, now, 'error', 'decryption_failed', 'hold', null, { requestId });
      return { status: 'error', reason: 'decryption_failed', signal: 'hold' };
    }

    const parsed = JSON.parse(decrypted) as { apiKey: string; apiSecret: string };
    const env = (conn.environment || 'production') as 'production' | 'testnet';
    const adapter = row.exchange === 'bybit'
      ? createBybitFuturesAdapter({ apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env })
      : createBinanceFuturesAdapter({ apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env });

    const connectionRow: ConnectionRow = {
      id: conn.id,
      futures_enabled: !!conn.futures_enabled,
      kill_switch: !!conn.kill_switch,
      max_leverage_allowed: Number(conn.max_leverage_allowed ?? 10),
      max_notional_usdt: Number(conn.max_notional_usdt ?? 200),
      margin_mode: conn.margin_mode ?? 'isolated',
      position_mode: conn.position_mode ?? 'one_way',
      default_leverage: Number(conn.default_leverage ?? 3),
      environment: conn.environment ?? 'production',
    };

    const logEvent = async (eventType: string, payload: Record<string, unknown>) => {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(payload)) {
        if (typeof v === 'string' && (v.toLowerCase().includes('key') || v.toLowerCase().includes('secret'))) continue;
        sanitized[k] = v;
      }
      await client.from('strategy_events').insert({
        strategy_run_id: strategyRunId,
        user_id: row.user_id,
        event_type: eventType,
        payload: sanitized,
      });
    };

    const result = await runRsiTick(
      adapter,
      run as unknown as StrategyRunRow,
      connectionRow,
      logEvent
    );

    const finishedAt = new Date();
    const latencyMs = finishedAt.getTime() - startedAt.getTime();
    const signalTick = signalToTick(result.signal);

    let tickStatus: 'ok' | 'skipped' | 'blocked' | 'error' = 'ok';
    if (result.riskBlock) tickStatus = 'blocked';
    else if (result.error) tickStatus = 'error';

    const runId = await recordRun(client, strategyRunId, row.user_id, now, tickStatus, result.error ?? result.riskBlock ?? null, signalTick, latencyMs, { requestId });

    await client
      .from('strategy_runs')
      .update({ last_run_at: finishedAt.toISOString(), updated_at: finishedAt.toISOString() })
      .eq('id', strategyRunId);

    if (result.orderPlaced || result.signal !== 'none') {
      await client
        .from('strategy_runs')
        .update({ last_signal_at: finishedAt.toISOString(), updated_at: finishedAt.toISOString() })
        .eq('id', strategyRunId);
    }

    if (result.error) {
      const { data: recent } = await client
        .from('strategy_events')
        .select('id')
        .eq('strategy_run_id', strategyRunId)
        .eq('event_type', 'error')
        .order('created_at', { ascending: false })
        .limit(MAX_CONSECUTIVE_FAILURES + 1);
      if (recent && recent.length >= MAX_CONSECUTIVE_FAILURES) {
        await client
          .from('strategy_runs')
          .update({ status: 'paused', updated_at: finishedAt.toISOString() })
          .eq('id', strategyRunId);
      }
    }

    return { status: tickStatus, signal: signalTick, latencyMs, runId };
  } finally {
    await releaseStrategyLock(client, strategyRunId);
  }
}

async function recordRun(
  client: SupabaseClient,
  strategyRunId: string,
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
      strategy_run_id: strategyRunId,
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
  results: Array<{ strategyRunId: string; status: string; reason?: string }>;
}

/**
 * Run all strategy_runs that are due (timeframe boundary + not in cooldown).
 */
export async function runDueStrategies(client: SupabaseClient, now: Date, context: RunTickContext = {}): Promise<DueSummary> {
  const summary: DueSummary = { ran: 0, skipped: 0, blocked: 0, errors: 0, results: [] };

  const { data: runs, error } = await client
    .from('strategy_runs')
    .select('id, user_id, timeframe, status, last_run_at')
    .eq('status', 'active');

  if (error || !runs?.length) {
    return summary;
  }

  for (const r of runs) {
    const lastRunAt = (r as { last_run_at?: string }).last_run_at ? new Date((r as { last_run_at: string }).last_run_at) : null;
    if (!shouldRunNow((r as { timeframe: string }).timeframe, now, lastRunAt)) {
      continue;
    }

    const result = await runStrategyTick(client, r.id, now, context);
    summary.results.push({ strategyRunId: r.id, status: result.status, reason: result.reason });
    if (result.status === 'ok') summary.ran++;
    else if (result.status === 'skipped') summary.skipped++;
    else if (result.status === 'blocked') summary.blocked++;
    else summary.errors++;
  }

  return summary;
}
