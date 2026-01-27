import { Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedRequest } from './auth.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export interface EntitlementRow {
  joining_fee_paid: boolean;
  joining_fee_paid_at: string | null;
  active_package_id: string | null;
  profit_allowance_usd: number;
  profit_used_usd: number;
  status: 'inactive' | 'active' | 'exhausted';
}

/**
 * Fetch entitlement for user. Returns null if no row or error.
 */
export async function fetchEntitlement(client: SupabaseClient, userId: string): Promise<EntitlementRow | null> {
  const { data, error } = await client
    .from('user_entitlements')
    .select('joining_fee_paid, joining_fee_paid_at, active_package_id, profit_allowance_usd, profit_used_usd, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as EntitlementRow;
}

/**
 * Require joining fee paid. Use after verifySupabaseJWT.
 * Returns 402 with JOINING_FEE_REQUIRED or 403 if DB unavailable.
 */
export async function requireJoiningFee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const client = getSupabase();
  const requestId = (req as any).requestId || 'unknown';

  if (!client) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Database unavailable',
      requestId,
    });
  }

  const ent = await fetchEntitlement(client, req.user!.id);
  if (!ent) {
    return res.status(402).json({
      error: 'JOINING_FEE_REQUIRED',
      message: 'Joining fee is required before you can connect an exchange or buy packages.',
      requestId,
    });
  }

  if (!ent.joining_fee_paid) {
    return res.status(402).json({
      error: 'JOINING_FEE_REQUIRED',
      message: 'Joining fee is required before you can connect an exchange or buy packages.',
      requestId,
    });
  }

  (req as any).entitlement = ent;
  next();
}

/**
 * Require active allowance (status=active and remainingUsd > 0). Use after verifySupabaseJWT.
 * Use for: creating copy setups, resuming/starting copy (status -> active).
 * Returns 402 ALLOWANCE_EXHAUSTED when exhausted or inactive.
 */
export async function requireActiveAllowance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const client = getSupabase();
  const requestId = (req as any).requestId || 'unknown';

  if (!client) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Database unavailable',
      request_id: requestId,
    });
  }

  const ent = await fetchEntitlement(client, req.user!.id);
  const allowance = parseFloat(String(ent?.profit_allowance_usd ?? 0));
  const used = parseFloat(String(ent?.profit_used_usd ?? 0));
  const remaining = Math.max(0, allowance - used);

  if (!ent || ent.status !== 'active' || remaining <= 0) {
    return res.status(402).json({
      error: 'ALLOWANCE_EXCEEDED',
      message: 'Profit allowance exhausted. Please buy a new package.',
      request_id: requestId,
    });
  }

  (req as any).entitlement = ent;
  next();
}
