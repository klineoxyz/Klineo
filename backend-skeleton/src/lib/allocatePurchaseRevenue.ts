/**
 * KLINEO: Allocate purchase revenue (onboarding fee + package) to 7-level referral pool,
 * platform, and marketing. Idempotent per purchase.
 * Rounding: per-share to 2 decimals (cents); remainder → marketing.
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

export async function allocatePurchaseRevenue(
  client: SupabaseClient,
  purchaseId: string,
  logContext?: { requestId?: string }
): Promise<AllocationResult> {
  const reqId = logContext?.requestId ?? 'n/a';

  const { data: purchase, error: purchaseError } = await client
    .from('eligible_purchases')
    .select('id, user_id, amount, currency, status')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    if (logContext?.requestId) {
      console.warn(`[${reqId}] allocatePurchaseRevenue: purchase not found or error`, purchaseError?.message);
    }
    return { ok: true, allocated: false, reason: 'purchase_not_found' };
  }

  if (purchase.status !== 'completed') {
    return { ok: true, allocated: false, reason: 'purchase_not_completed' };
  }

  const { data: existing } = await client
    .from('purchase_allocation_runs')
    .select('purchase_id')
    .eq('purchase_id', purchaseId)
    .maybeSingle();

  if (existing) {
    return { ok: true, allocated: false, reason: 'already_allocated' };
  }

  const amount = Number(purchase.amount);
  const currency = (purchase.currency as string) || 'USDT';

  if (amount <= 0 || !Number.isFinite(amount)) {
    return { ok: false, error: 'Invalid purchase amount' };
  }

  // Resolve 7-level upline: L1 = referrer of purchaser, L2 = referrer of L1, ...
  const upline: (string | null)[] = [];
  let currentId: string | null = purchase.user_id as string;
  for (let level = 0; level < 7; level++) {
    const res = await client
      .from('referrals')
      .select('referrer_id')
      .eq('referred_id', currentId!)
      .maybeSingle();
    const row = res.data as { referrer_id?: string } | null;
    const referrerId: string | null = row?.referrer_id ?? null;
    upline.push(referrerId);
    currentId = referrerId;
  }

  const { levelAmounts: roundedReferral, platformAmount, marketingAmount: marketingTotal } =
    computeAllocationAmounts(amount);
  const marketingBaseAmount = Math.round((amount * MARKETING_PCT) / 100 * 100) / 100;
  const remainder = Math.round((marketingTotal - marketingBaseAmount) * 100) / 100;
  const levelPct = LEVEL_PCT;

  // Insert referral earnings for existing upline levels only; missing levels go to marketing
  for (let level = 1; level <= 7; level++) {
    const userId = upline[level - 1];
    const amt = roundedReferral[level - 1];
    const ratePct = levelPct[level - 1];
    if (userId && amt > 0) {
      const { error: insErr } = await client.from('purchase_referral_earnings').insert({
        purchase_id: purchaseId,
        level,
        user_id: userId,
        amount: amt,
        currency,
        rate_pct: ratePct,
      });
      if (insErr) {
        console.error(`[${reqId}] purchase_referral_earnings insert failed (level ${level}):`, insErr);
        return { ok: false, error: `Failed to record referral earning: ${insErr.message}` };
      }
    } else if (amt > 0) {
      const { error: ledErr } = await client.from('marketing_pool_ledger').insert({
        purchase_id: purchaseId,
        amount: amt,
        currency,
        source_type: 'missing_upline_reallocation',
        level_if_applicable: level,
      });
      if (ledErr) {
        console.error(`[${reqId}] marketing_pool_ledger insert failed (missing level ${level}):`, ledErr);
        return { ok: false, error: `Failed to record marketing reallocation: ${ledErr.message}` };
      }
    }
  }

  // Direct 10% to marketing_pool_ledger
  if (marketingBaseAmount > 0) {
    const { error: le } = await client.from('marketing_pool_ledger').insert({
      purchase_id: purchaseId,
      amount: marketingBaseAmount,
      currency,
      source_type: 'direct_10pct',
      level_if_applicable: null,
    });
    if (le) {
      console.error(`[${reqId}] marketing_pool_ledger direct_10pct failed:`, le);
      return { ok: false, error: `Failed to record marketing pool: ${le.message}` };
    }
  }
  if (remainder !== 0) {
    const { error: le2 } = await client.from('marketing_pool_ledger').insert({
      purchase_id: purchaseId,
      amount: remainder,
      currency,
      source_type: 'direct_10pct',
      level_if_applicable: null,
    });
    if (le2) {
      console.error(`[${reqId}] marketing_pool_ledger remainder failed:`, le2);
      return { ok: false, error: `Failed to record remainder: ${le2.message}` };
    }
  }

  const marketingFromSplits = marketingTotal;
  const { error: spPlatform } = await client.from('purchase_revenue_splits').insert({
    purchase_id: purchaseId,
    split_type: 'platform',
    amount: platformAmount,
    currency,
    source_detail: 'platform_20pct',
  });
  if (spPlatform) {
    console.error(`[${reqId}] purchase_revenue_splits platform failed:`, spPlatform);
    return { ok: false, error: `Failed to record platform split: ${spPlatform.message}` };
  }

  const { error: spMarketing } = await client.from('purchase_revenue_splits').insert({
    purchase_id: purchaseId,
    split_type: 'marketing',
    amount: marketingFromSplits,
    currency,
    source_detail: 'direct_10pct_plus_reallocations_and_remainder',
  });
  if (spMarketing) {
    console.error(`[${reqId}] purchase_revenue_splits marketing failed:`, spMarketing);
    return { ok: false, error: `Failed to record marketing split: ${spMarketing.message}` };
  }

  const { error: runErr } = await client.from('purchase_allocation_runs').insert({
    purchase_id: purchaseId,
  });
  if (runErr) {
    console.error(`[${reqId}] purchase_allocation_runs insert failed:`, runErr);
    return { ok: false, error: `Failed to record allocation run: ${runErr.message}` };
  }

  return { ok: true, allocated: true, purchaseId };
}
