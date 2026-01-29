/**
 * KLINEO: Human-readable explanation of referral earnings for a purchase.
 * For support, trust, and disputes. Read-only.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeAllocationAmounts, LEVEL_PCT } from './allocatePurchaseRevenue.js';

export type LevelExplanation = {
  level: number;
  percentage: number;
  expectedAmount: number;
  uplineExisted: boolean;
  recipient: 'user' | 'marketing';
  userId?: string;
  amount?: number;
};

export type PurchaseEarningsExplanation = {
  purchaseId: string;
  purchaseAmount: number;
  currency: string;
  status: string;
  communityPoolAmount: number;
  platformAmount: number;
  marketingAmount: number;
  levels: LevelExplanation[];
};

/**
 * Explain referral earnings for a purchase in plain language.
 * Returns purchase amount, community pool breakdown, and per-level: percentage, expected amount,
 * whether upline existed, who received it (user id) or if it went to marketing.
 */
export async function explainPurchaseEarnings(
  client: SupabaseClient,
  purchaseId: string
): Promise<{ ok: true; explanation: PurchaseEarningsExplanation } | { ok: false; error: string }> {
  const { data: purchase, error: purchaseError } = await client
    .from('eligible_purchases')
    .select('id, user_id, amount, currency, status')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    return { ok: false, error: 'Purchase not found' };
  }

  const amount = Number(purchase.amount);
  const currency = (purchase.currency as string) || 'USDT';
  if (amount <= 0 || !Number.isFinite(amount)) {
    return { ok: false, error: 'Invalid purchase amount' };
  }

  const { levelAmounts, platformAmount, marketingAmount } = computeAllocationAmounts(amount);
  const communityPoolAmount = levelAmounts.reduce((a, b) => a + b, 0);

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

  const { data: earnings } = await client
    .from('purchase_referral_earnings')
    .select('level, user_id, amount')
    .eq('purchase_id', purchaseId);

  const earningsByLevel = new Map<number, { user_id: string; amount: number }>();
  if (earnings && Array.isArray(earnings)) {
    for (const e of earnings) {
      earningsByLevel.set(e.level, { user_id: e.user_id, amount: Number(e.amount) });
    }
  }

  const levels: LevelExplanation[] = [];
  for (let level = 1; level <= 7; level++) {
    const userId = upline[level - 1];
    const expectedAmount = levelAmounts[level - 1];
    const ratePct = LEVEL_PCT[level - 1];
    const earned = earningsByLevel.get(level);
    const recipient: 'user' | 'marketing' = userId && earned ? 'user' : 'marketing';
    levels.push({
      level,
      percentage: ratePct,
      expectedAmount,
      uplineExisted: !!userId,
      recipient,
      ...(userId && { userId }),
      ...(earned && { amount: earned.amount }),
    });
  }

  const explanation: PurchaseEarningsExplanation = {
    purchaseId,
    purchaseAmount: amount,
    currency,
    status: purchase.status as string,
    communityPoolAmount,
    platformAmount,
    marketingAmount,
    levels,
  };

  return { ok: true, explanation };
}
