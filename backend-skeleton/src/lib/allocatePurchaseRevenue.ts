/**
 * KLINEO: Allocate purchase revenue (onboarding fee + package) to 7-level referral pool,
 * platform, and marketing. Fully atomic via PostgreSQL function; no partial credits.
 * Idempotent per purchase. Rounding: per-share to 2 decimals; remainder → marketing.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const LEVEL_WEIGHTS = [30, 20, 10, 8, 6, 4, 2] as const; // sum = 80; 70% pool split
const WEIGHT_SUM = 80;
const POOL_PCT = 70;
const PLATFORM_PCT = 20;
const MARKETING_PCT = 10;

/** Level percentages of purchase (70% pool × weight/80). L1…L7. */
export const LEVEL_PCT = LEVEL_WEIGHTS.map((w) => (w / WEIGHT_SUM) * POOL_PCT);

/**
 * Compute rounded amounts for a purchase. Each share rounded to 2 decimals; remainder added to marketing.
 * Returns { levelAmounts, platformAmount, marketingAmount } where levelAmounts[0]=L1,…[6]=L7.
 * Used for display/explanation; allocation itself runs in DB (allocate_purchase_revenue).
 */
export function computeAllocationAmounts(purchaseAmount: number): {
  levelAmounts: number[];
  platformAmount: number;
  marketingAmount: number;
} {
  const levelAmounts = LEVEL_PCT.map((pct) => Math.round((purchaseAmount * pct) / 100 * 100) / 100);
  const platformAmount = Math.round((purchaseAmount * PLATFORM_PCT) / 100 * 100) / 100;
  const marketingBase = Math.round((purchaseAmount * MARKETING_PCT) / 100 * 100) / 100;
  const referralTotal = levelAmounts.reduce((a, b) => a + b, 0);
  const remainder = Math.round((purchaseAmount - referralTotal - platformAmount - marketingBase) * 100) / 100;
  return {
    levelAmounts,
    platformAmount,
    marketingAmount: marketingBase + remainder,
  };
}

export type AllocationResult =
  | { ok: true; allocated: true; purchaseId: string }
  | { ok: true; allocated: false; reason: 'already_allocated' | 'purchase_not_completed' | 'purchase_not_found' }
  | { ok: false; error: string };

/**
 * Allocate purchase revenue atomically via PostgreSQL function.
 * All inserts (referral earnings, marketing ledger, revenue splits, allocation run) run in one transaction.
 * If any step fails, everything rolls back; no partial credits.
 * Idempotent: duplicate calls for same purchase return already_allocated.
 */
export async function allocatePurchaseRevenue(
  client: SupabaseClient,
  purchaseId: string,
  logContext?: { requestId?: string }
): Promise<AllocationResult> {
  const reqId = logContext?.requestId ?? 'n/a';

  try {
    const { data: result, error } = await client.rpc('allocate_purchase_revenue', {
      p_purchase_id: purchaseId,
    });

    if (error) {
      console.error(`[${reqId}] allocate_purchase_revenue RPC error:`, error.message);
      return { ok: false, error: error.message };
    }

    const status = result as string | null;
    if (status === 'allocated') {
      return { ok: true, allocated: true, purchaseId };
    }
    if (status === 'already_allocated') {
      return { ok: true, allocated: false, reason: 'already_allocated' };
    }
    if (status === 'purchase_not_completed') {
      return { ok: true, allocated: false, reason: 'purchase_not_completed' };
    }
    if (status === 'purchase_not_found') {
      return { ok: true, allocated: false, reason: 'purchase_not_found' };
    }
    if (status === 'invalid_amount') {
      return { ok: false, error: 'Invalid purchase amount' };
    }

    console.warn(`[${reqId}] allocate_purchase_revenue unexpected result:`, status);
    return { ok: false, error: status ?? 'Unknown result' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${reqId}] allocate_purchase_revenue exception:`, message);
    return { ok: false, error: message };
  }
}
