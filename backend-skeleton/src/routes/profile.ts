import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, optionalString } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPackageProfitAllowanceUsd } from './payment-intents.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Supabase not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
}

export const profileRouter: Router = Router();

// All profile routes require authentication
profileRouter.use(verifySupabaseJWT);

/**
 * GET /api/me/entitlement
 * Get current user's entitlement (joining fee + package allowance state)
 */
profileRouter.get('/entitlement', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const userId = req.user!.id;
    const [{ data: ent, error }, { data: profile }] = await Promise.all([
      client
        .from('user_entitlements')
        .select('joining_fee_paid, status, active_package_id, profit_allowance_usd, profit_used_usd')
        .eq('user_id', userId)
        .maybeSingle(),
      client
        .from('user_profiles')
        .select('member_active, active_package_code, package_started_at, referred_by_user_id')
        .eq('id', userId)
        .single(),
    ]);

    if (error) {
      console.error('Error fetching entitlement:', error);
      return res.status(500).json({ error: 'Failed to fetch entitlement' });
    }

    type ProfileRow = { member_active?: boolean; active_package_code?: string | null; package_started_at?: string | null } | null;
    const profileRow = profile as ProfileRow;
    const memberActive = !!profileRow?.member_active;
    const joiningFeePaid = !!ent?.joining_fee_paid || memberActive;
    // Prefer user_entitlements; fall back to user_profiles (set when admin approves package payment intent)
    const activePackageId = ent?.active_package_id ?? profileRow?.active_package_code ?? null;
    const entStatus = ent?.status as 'inactive' | 'active' | 'exhausted' | undefined;
    // If user has an active package, show Active unless entitlement is explicitly exhausted
    const status = activePackageId && entStatus !== 'exhausted' ? 'active' : (entStatus || 'inactive');

    let profitAllowanceUsd = parseFloat(String(ent?.profit_allowance_usd ?? 0));
    const profitUsedUsd = parseFloat(String(ent?.profit_used_usd ?? 0));
    // When package was set via admin approve (profile only), entitlement may have 0 allowance; use package code → allowance map
    if (activePackageId && profitAllowanceUsd <= 0) {
      profitAllowanceUsd = getPackageProfitAllowanceUsd(activePackageId);
    }
    const remainingUsd = Math.max(0, profitAllowanceUsd - profitUsedUsd);

    const hasReferral = !!(profile as { referred_by_user_id?: string } | null)?.referred_by_user_id;

    res.json({
      joiningFeePaid,
      status,
      activePackageId,
      profitAllowanceUsd,
      profitUsedUsd,
      remainingUsd,
      hasReferral,
    });
  } catch (err) {
    console.error('Entitlement get error:', err);
    res.status(500).json({ error: 'Failed to fetch entitlement' });
  }
});

/**
 * GET /api/me/profile
 * Get current user's profile
 */
profileRouter.get('/profile', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: profile, error } = await client
      .from('user_profiles')
      .select('id, email, role, full_name, username, timezone, referral_wallet, payout_wallet_address, payment_wallet_bsc, avatar_url, status, referred_by_user_id, created_at, updated_at')
      .eq('id', req.user!.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let referralCode: string | null = null;
    let referrerName: string | null = null;
    if (profile.referred_by_user_id) {
      const { data: referrer } = await client
        .from('user_profiles')
        .select('referral_code, full_name, username, email')
        .eq('id', profile.referred_by_user_id)
        .single();
      if (referrer) {
        referralCode = (referrer as { referral_code?: string | null }).referral_code ?? null;
        const r = referrer as { full_name?: string | null; username?: string | null; email?: string | null };
        referrerName = (r.full_name && r.full_name.trim()) || (r.username && r.username.trim()) || r.email || null;
      }
    }

    res.json({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      fullName: profile.full_name,
      username: profile.username,
      timezone: profile.timezone || 'UTC',
      referralWallet: profile.referral_wallet,
      payoutWalletAddress: profile.payout_wallet_address,
      paymentWalletBsc: profile.payment_wallet_bsc,
      avatarUrl: profile.avatar_url ?? null,
      status: profile.status || 'active',
      hasReferral: !!profile.referred_by_user_id,
      referralCode: referralCode ?? undefined,
      referrerName: referrerName ?? undefined,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (err) {
    console.error('Profile get error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/me/discounts
 * Get current user's assigned discounts (onboarding / trading packages)
 */
profileRouter.get('/discounts', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: discounts, error } = await client
      .from('user_discounts')
      .select('id, code, scope, onboarding_discount_percent, onboarding_discount_fixed_usd, trading_discount_percent, trading_package_ids, trading_max_packages, trading_used_count, status, created_at')
      .eq('user_id', req.user!.id)
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my discounts:', error);
      return res.status(500).json({ error: 'Failed to fetch your discounts' });
    }

    const formatted = (discounts || []).map((d: any) => ({
      id: d.id,
      code: d.code || null,
      scope: d.scope,
      onboardingDiscountPercent: d.onboarding_discount_percent != null ? parseFloat(d.onboarding_discount_percent) : null,
      onboardingDiscountFixedUsd: d.onboarding_discount_fixed_usd != null ? parseFloat(d.onboarding_discount_fixed_usd) : null,
      tradingDiscountPercent: d.trading_discount_percent != null ? parseFloat(d.trading_discount_percent) : null,
      tradingPackageIds: d.trading_package_ids || [],
      tradingMaxPackages: d.trading_max_packages,
      tradingUsedCount: d.trading_used_count || 0,
      status: d.status,
      createdAt: d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    }));

    res.json({ discounts: formatted });
  } catch (err) {
    console.error('My discounts get error:', err);
    res.status(500).json({ error: 'Failed to fetch your discounts' });
  }
});

/**
 * PUT /api/me/profile
 * Update current user's profile
 */
profileRouter.put('/profile',
  validate([
    optionalString('fullName', 200),
    optionalString('username', 50),
    optionalString('timezone', 50),
    optionalString('referralWallet', 200),
    optionalString('paymentWalletBsc', 200),
    optionalString('avatarUrl', 500),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { fullName, username, timezone, referralWallet, paymentWalletBsc, avatarUrl } = req.body;

      // Build update object (only include provided fields)
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (fullName !== undefined) updates.full_name = fullName || null;
      if (username !== undefined) updates.username = username || null;
      if (timezone !== undefined) updates.timezone = timezone || 'UTC';
      if (referralWallet !== undefined) {
        updates.referral_wallet = referralWallet || null;
        updates.payout_wallet_address = referralWallet || null;
      }
      if (paymentWalletBsc !== undefined) updates.payment_wallet_bsc = paymentWalletBsc || null;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl && String(avatarUrl).trim() ? String(avatarUrl).trim() : null;

      const { data: profile, error } = await client
        .from('user_profiles')
        .update(updates)
        .eq('id', req.user!.id)
        .select('id, email, role, full_name, username, timezone, referral_wallet, payout_wallet_address, payment_wallet_bsc, avatar_url, status, created_at, updated_at')
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      res.json({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.full_name,
        username: profile.username,
        timezone: profile.timezone || 'UTC',
        referralWallet: profile.referral_wallet,
        payoutWalletAddress: profile.payout_wallet_address,
        paymentWalletBsc: profile.payment_wallet_bsc,
        avatarUrl: profile.avatar_url ?? null,
        status: profile.status || 'active',
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);
