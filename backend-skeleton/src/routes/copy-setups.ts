import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
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

export const copySetupsRouter = Router();

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

    const result = setups?.map((setup: any) => ({
      id: setup.id,
      traderId: setup.trader_id,
      trader: setup.traders ? {
        id: setup.traders.id,
        name: setup.traders.display_name,
        slug: setup.traders.slug,
        avatarUrl: setup.traders.avatar_url,
        status: setup.traders.status,
      } : null,
      allocationPct: parseFloat(setup.allocation_pct?.toString() || '100'),
      maxPositionPct: setup.max_position_pct ? parseFloat(setup.max_position_pct.toString()) : null,
      status: setup.status,
      createdAt: setup.created_at,
      updatedAt: setup.updated_at,
    })) || [];

    res.json({ copySetups: result });
  } catch (err) {
    console.error('Copy setups list error:', err);
    res.status(500).json({ error: 'Failed to fetch copy setups' });
  }
});

/**
 * POST /api/copy-setups
 * Create a new copy setup
 */
copySetupsRouter.post('/',
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

      res.status(201).json({
        id: setup.id,
        traderId: setup.trader_id,
        trader: setup.traders ? {
          id: setup.traders.id,
          name: setup.traders.display_name,
          slug: setup.traders.slug,
          avatarUrl: setup.traders.avatar_url,
          status: setup.traders.status,
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
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (existingError || !existing) {
        return res.status(404).json({ error: 'Copy setup not found' });
      }

      if (existing.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
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

      res.json({
        id: setup.id,
        traderId: setup.trader_id,
        trader: setup.traders ? {
          id: setup.traders.id,
          name: setup.traders.display_name,
          slug: setup.traders.slug,
          avatarUrl: setup.traders.avatar_url,
          status: setup.traders.status,
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
