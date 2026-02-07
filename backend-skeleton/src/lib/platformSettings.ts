/**
 * Platform settings helpers. Used for global kill switch and other admin-configurable flags.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns true if platform-wide kill switch is ON (no orders should be placed).
 * Used by strategy runner, execute-tick, and manual futures order routes.
 */
export async function isPlatformKillSwitchOn(client: SupabaseClient): Promise<boolean> {
  const { data } = await client.from('platform_settings').select('value').eq('key', 'kill_switch_global').maybeSingle();
  return data != null && String((data as { value: string }).value).toLowerCase() === 'true';
}
