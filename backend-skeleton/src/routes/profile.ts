import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, optionalString } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    const { data: ent, error } = await client
      .from('user_entitlements')
      .select('joining_fee_paid, status, active_package_id, profit_allowance_usd, profit_used_usd')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching entitlement:', error);
      return res.status(500).json({ error: 'Failed to fetch entitlement' });
    }

    const joiningFeePaid = !!ent?.joining_fee_paid;
    const status = (ent?.status as 'inactive' | 'active' | 'exhausted') || 'inactive';
    const activePackageId = ent?.active_package_id ?? null;
    const profitAllowanceUsd = parseFloat(String(ent?.profit_allowance_usd ?? 0));
    const profitUsedUsd = parseFloat(String(ent?.profit_used_usd ?? 0));
    const remainingUsd = Math.max(0, profitAllowanceUsd - profitUsedUsd);

    res.json({
      joiningFeePaid,
      status,
      activePackageId,
      profitAllowanceUsd,
      profitUsedUsd,
      remainingUsd,
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
      .select('id, email, role, full_name, username, timezone, referral_wallet, status, created_at, updated_at')
      .eq('id', req.user!.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      fullName: profile.full_name,
      username: profile.username,
      timezone: profile.timezone || 'UTC',
      referralWallet: profile.referral_wallet,
      status: profile.status || 'active',
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (err) {
    console.error('Profile get error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
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
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { fullName, username, timezone, referralWallet } = req.body;

      // Build update object (only include provided fields)
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (fullName !== undefined) updates.full_name = fullName || null;
      if (username !== undefined) updates.username = username || null;
      if (timezone !== undefined) updates.timezone = timezone || 'UTC';
      if (referralWallet !== undefined) updates.referral_wallet = referralWallet || null;

      const { data: profile, error } = await client
        .from('user_profiles')
        .update(updates)
        .eq('id', req.user!.id)
        .select('id, email, role, full_name, username, timezone, referral_wallet, status, created_at, updated_at')
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
