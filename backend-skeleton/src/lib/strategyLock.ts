/**
 * Distributed lock per strategy using strategy_locks table.
 * Prevents double execution when multiple instances or overlapping cron.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const LOCK_OWNER = process.env.RUNNER_LOCK_OWNER || 'klineo-runner';

/**
 * Acquire lock for strategy if not currently locked or lock expired.
 * Returns true if acquired, false otherwise.
 */
export async function acquireStrategyLock(
  client: SupabaseClient,
  strategyId: string,
  ttlMs: number,
  owner: string = LOCK_OWNER
): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);

  const { data: existing } = await client
    .from('strategy_locks')
    .select('strategy_id, locked_until')
    .eq('strategy_id', strategyId)
    .maybeSingle();

  if (existing && new Date(existing.locked_until) > now) {
    return false;
  }

  const { error } = await client.from('strategy_locks').upsert(
    {
      strategy_id: strategyId,
      locked_until: lockedUntil.toISOString(),
      lock_owner: owner,
      updated_at: now.toISOString(),
    },
    { onConflict: 'strategy_id' }
  );

  if (error) return false;
  return true;
}

/**
 * Release lock (best-effort). Only if we own it.
 */
export async function releaseStrategyLock(
  client: SupabaseClient,
  strategyId: string,
  owner: string = LOCK_OWNER
): Promise<void> {
  const { data } = await client
    .from('strategy_locks')
    .select('lock_owner')
    .eq('strategy_id', strategyId)
    .maybeSingle();

  if (data && data.lock_owner === owner) {
    await client.from('strategy_locks').delete().eq('strategy_id', strategyId);
  }
}
