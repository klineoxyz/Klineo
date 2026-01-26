import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam } from '../middleware/validation.js';
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

export const notificationsRouter = Router();

// All notifications routes require authentication
notificationsRouter.use(verifySupabaseJWT);

/**
 * GET /api/notifications
 * List current user's notifications
 */
notificationsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const unreadOnly = req.query.unreadOnly === 'true';

    let query = client
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    const result = notifications?.map((notif: any) => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      read: !!notif.read_at,
      readAt: notif.read_at,
      createdAt: notif.created_at,
    })) || [];

    // Get unread count
    const { count: unreadCount } = await client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user!.id)
      .is('read_at', null);

    res.json({
      notifications: result,
      unreadCount: unreadCount || 0,
    });
  } catch (err) {
    console.error('Notifications list error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/notifications/read
 * Mark notification(s) as read
 */
notificationsRouter.post('/read',
  validate([
    body('notificationIds').isArray().withMessage('notificationIds must be an array'),
    body('notificationIds.*').isUUID().withMessage('Each notificationId must be a valid UUID'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    try {
      const { notificationIds } = req.body;

      // Verify all notifications belong to user
      const { data: notifications, error: checkError } = await client
        .from('notifications')
        .select('id')
        .eq('user_id', req.user!.id)
        .in('id', notificationIds);

      if (checkError || !notifications || notifications.length !== notificationIds.length) {
        return res.status(403).json({ error: 'Some notifications not found or access denied' });
      }

      // Mark as read
      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', req.user!.id)
        .in('id', notificationIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return res.status(500).json({ error: 'Failed to mark notifications as read' });
      }

      res.json({ success: true, count: notificationIds.length });
    } catch (err) {
      console.error('Notifications read error:', err);
      res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  }
);
