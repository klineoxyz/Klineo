/**
 * Platform settings helpers. Used for global kill switch and other admin-configurable flags.
 * Cached (5s TTL), with DB query timeout. Fail-closed: on error/timeout, treats kill switch as ON.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const KILL_SWITCH_CACHE_TTL_MS = 5000;
const KILL_SWITCH_DB_TIMEOUT_MS = 3000;

let killSwitchCache: { value: boolean; expiresAt: number } | null = null;

/**
 * Call after admin updates kill switch via PATCH to invalidate cache.
 */
export function invalidateKillSwitchCache(): void {
  killSwitchCache = null;
}

/**
 * Returns true if platform-wide kill switch is ON (no orders should be placed).
 * Cached 5s TTL. DB timeout 3s. Fail-closed: on error or timeout, returns true (blocks orders).
 */
export async function isPlatformKillSwitchOn(client: SupabaseClient): Promise<boolean> {
  const now = Date.now();
  if (killSwitchCache && killSwitchCache.expiresAt > now) {
    return killSwitchCache.value;
  }

  const fetchPromise = client
    .from('platform_settings')
    .select('value')
    .eq('key', 'kill_switch_global')
    .maybeSingle();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Kill switch lookup timeout')), KILL_SWITCH_DB_TIMEOUT_MS);
  });

  try {
    const { data } = await Promise.race([fetchPromise, timeoutPromise]);
    const enabled = data != null && String((data as { value: string }).value).toLowerCase() === 'true';
    killSwitchCache = { value: enabled, expiresAt: now + KILL_SWITCH_CACHE_TTL_MS };
    return enabled;
  } catch {
    return true;
  }
}
