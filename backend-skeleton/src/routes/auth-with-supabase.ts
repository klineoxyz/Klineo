import { Router } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter: Router = Router();

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
authRouter.get('/me', verifySupabaseJWT, async (req: AuthenticatedRequest, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role
  });
});

/**
 * GET /api/auth/admin/users
 * Admin-only endpoint example
 * Returns list of all users (admin only)
 */
authRouter.get('/admin/users', verifySupabaseJWT, requireAdmin, async (req, res) => {
  // TODO: Implement user list endpoint
  res.json({ 
    message: 'Admin endpoint - user list coming soon',
    note: 'This endpoint requires admin role'
  });
});
