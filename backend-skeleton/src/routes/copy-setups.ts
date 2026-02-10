import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { requireJoiningFeeOrAdmin, requireActiveAllowanceOrAdmin, fetchEntitlement } from '../middleware/requireEntitlement.js';
import { validate, uuidParam, statusBody } from '../middleware/validation.js';
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

export const copySetupsRouter: Router = Router();

// All copy setup routes require authentication
copySetupsRouter.use(verifySupabaseJWT);

/**
 * GET /api/copy-setups
 * List current user's copy setups
 */
copySetupsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { data: setups, error } = await client
      .from('copy_setups')
      .select(`
        id,
        trader_id,
        allocation_pct,
        max_position_pct,
        status,
        created_at,
        updated_at,
        traders (
          id,
          display_name,
          slug,
          avatar_url,
          status
        )
      `)
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching copy setups:', error);
      return res.status(500).json({ error: 'Failed to fetch copy setups' });
    }

    // PnL per copy setup: sum unrealized_pnl from positions (open + closed) for this user
    const setupIds = (setups || []).map((s: any) => s.id).filter(Boolean);
    const pnlBySetup: Record<string, number> = {};
    if (setupIds.length > 0) {
      const { data: positions } = await client
        .from('positions')
        .select('copy_setup_id, unrealized_pnl')
        .eq('user_id', req.user!.id)
        .in('copy_setup_id', setupIds);
      for (const p of positions || []) {
        const id = p.copy_setup_id;
        if (!id) continue;
        const val = parseFloat(String(p.unrealized_pnl ?? 0));
        pnlBySetup[id] = (pnlBySetup[id] ?? 0) + val;
      }
    }

    const result = setups?.map((setup: any) => {
      // Handle traders relation (can be object or array, but should be single object for this relation)
      const traderData = Array.isArray(setup.traders) ? setup.traders[0] : setup.traders;
      
      return {
        id: setup.id,
        traderId: setup.trader_id,
        trader: traderData ? {
          id: traderData.id,
          name: traderData.display_name,
          slug: traderData.slug,
          avatarUrl: traderData.avatar_url,
          status: traderData.status,
        } : null,
        allocationPct: parseFloat(setup.allocation_pct?.toString() || '100'),
        maxPositionPct: setup.max_position_pct ? parseFloat(setup.max_position_pct.toString()) : null,
        status: setup.status,
        createdAt: setup.created_at,
        updatedAt: setup.updated_at,
        pnlUsd: Math.round((pnlBySetup[setup.id] ?? 0) * 100) / 100,
      };
    }) || [];

    res.json({ copySetups: result });
  } catch (err) {
    console.error('Copy setups list error:', err);
    res.status(500).json({ error: 'Failed to fetch copy setups' });
  }
});

/**
 * POST /api/copy-setups
 * Create a new copy setup (requires joining fee + active allowance)
 */
copySetupsRouter.post('/',
  requireJoiningFeeOrAdmin,
  requireActiveAllowanceOrAdmin,
  validate([
    body('traderId').isUUID().withMessage('traderId must be a valid UUID'),
    body('allocationPct').optional().isFloat({ min: 0, max: 100 }).withMessage('allocationPct must be between 0 and 100'),
    body('maxPositionPct').optional().isFloat({ min: 0, max: 100 }).withMessage('maxPositionPct must be between 0 and 100'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { traderId, allocationPct, maxPositionPct } = req.body;

      // Verify trader exists and is approved
      const { data: trader, error: traderError } = await client
        .from('traders')
        .select('id, status')
        .eq('id', traderId)
        .single();

      if (traderError || !trader) {
        return res.status(404).json({ error: 'Trader not found' });
      }

      if (trader.status !== 'approved') {
        return res.status(403).json({ error: 'Cannot copy unapproved trader' });
      }

      // Check if user already has an active copy setup for this trader
      const { data: existing } = await client
        .from('copy_setups')
        .select('id')
        .eq('user_id', req.user!.id)
        .eq('trader_id', traderId)
        .eq('status', 'active')
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Active copy setup already exists for this trader' });
      }

      // Create copy setup
      const { data: setup, error } = await client
        .from('copy_setups')
        .insert({
          user_id: req.user!.id,
          trader_id: traderId,
          allocation_pct: allocationPct || 100,
          max_position_pct: maxPositionPct || null,
          status: 'active',
        })
        .select(`
          id,
          trader_id,
          allocation_pct,
          max_position_pct,
          status,
          created_at,
          updated_at,
          traders (
            id,
            display_name,
            slug,
            avatar_url,
            status
          )
        `)
        .single();

      if (error) {
        console.error('Error creating copy setup:', error);
        return res.status(500).json({ error: 'Failed to create copy setup' });
      }

      // Handle traders relation (can be object or array, but should be single object for this relation)
      const traderData = Array.isArray(setup.traders) ? setup.traders[0] : setup.traders;

      res.status(201).json({
        id: setup.id,
        traderId: setup.trader_id,
        trader: traderData ? {
          id: traderData.id,
          name: traderData.display_name,
          slug: traderData.slug,
          avatarUrl: traderData.avatar_url,
          status: traderData.status,
        } : null,
        allocationPct: parseFloat(setup.allocation_pct?.toString() || '100'),
        maxPositionPct: setup.max_position_pct ? parseFloat(setup.max_position_pct.toString()) : null,
        status: setup.status,
        createdAt: setup.created_at,
        updatedAt: setup.updated_at,
      });
    } catch (err) {
      console.error('Copy setup create error:', err);
      res.status(500).json({ error: 'Failed to create copy setup' });
    }
  }
);

/**
 * PUT /api/copy-setups/:id
 * Update copy setup (status, allocation, etc.)
 */
copySetupsRouter.put('/:id',
  validate([
    uuidParam('id'),
    body('status').optional().isIn(['active', 'paused', 'stopped']).withMessage('status must be active, paused, or stopped'),
    body('allocationPct').optional().isFloat({ min: 0, max: 100 }).withMessage('allocationPct must be between 0 and 100'),
    body('maxPositionPct').optional().isFloat({ min: 0, max: 100 }).withMessage('maxPositionPct must be between 0 and 100'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { id } = req.params;
      const { status, allocationPct, maxPositionPct } = req.body;

      // Verify setup belongs to user
      const { data: existing, error: existingError } = await client
        .from('copy_setups')
        .select('id, user_id, trader_id')
        .eq('id', id)
        .single();

      if (existingError || !existing) {
        return res.status(404).json({ error: 'Copy setup not found' });
      }

      if (existing.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Resuming/starting (status -> active) requires active allowance (admins bypass)
      if (status === 'active' && req.user?.role !== 'admin') {
        const ent = await fetchEntitlement(client, req.user!.id);
        const allowance = parseFloat(String(ent?.profit_allowance_usd ?? 0));
        const used = parseFloat(String(ent?.profit_used_usd ?? 0));
        const remaining = Math.max(0, allowance - used);
        if (!ent || ent.status !== 'active' || remaining <= 0) {
          const requestId = (req as any).requestId || 'unknown';
          return res.status(402).json({
            error: 'ALLOWANCE_EXCEEDED',
            message: 'Profit allowance exhausted. Please buy a new package.',
            request_id: requestId,
          });
        }
      }

      // Build update object
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (status !== undefined) updates.status = status;
      if (allocationPct !== undefined) updates.allocation_pct = allocationPct;
      if (maxPositionPct !== undefined) updates.max_position_pct = maxPositionPct || null;

      const { data: setup, error } = await client
        .from('copy_setups')
        .update(updates)
        .eq('id', id)
        .select(`
          id,
          trader_id,
          allocation_pct,
          max_position_pct,
          status,
          created_at,
          updated_at,
          traders (
            id,
            display_name,
            slug,
            avatar_url,
            status
          )
        `)
        .single();

      if (error) {
        console.error('Error updating copy setup:', error);
        return res.status(500).json({ error: 'Failed to update copy setup' });
      }

      if (status !== undefined) {
        if (client) {
          try {
            await client.from('audit_logs').insert({
              admin_id: req.user!.id,
              action_type: 'copy_setup_status_changed',
              entity_type: 'copy_setup',
              entity_id: id,
              details: { status, trader_id: existing?.trader_id ?? undefined },
            });
          } catch {
            /* non-fatal */
          }
        }
      }

      // Handle traders relation (can be object or array, but should be single object for this relation)
      const traderData = Array.isArray(setup.traders) ? setup.traders[0] : setup.traders;

      res.json({
        id: setup.id,
        traderId: setup.trader_id,
        trader: traderData ? {
          id: traderData.id,
          name: traderData.display_name,
          slug: traderData.slug,
          avatarUrl: traderData.avatar_url,
          status: traderData.status,
        } : null,
        allocationPct: parseFloat(setup.allocation_pct?.toString() || '100'),
        maxPositionPct: setup.max_position_pct ? parseFloat(setup.max_position_pct.toString()) : null,
        status: setup.status,
        createdAt: setup.created_at,
        updatedAt: setup.updated_at,
      });
    } catch (err) {
      console.error('Copy setup update error:', err);
      res.status(500).json({ error: 'Failed to update copy setup' });
    }
  }
);
