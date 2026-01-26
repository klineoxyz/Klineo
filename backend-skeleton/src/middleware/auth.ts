import { Request, Response, NextFunction } from 'express';
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

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

/**
 * Verify Supabase JWT token from Authorization header
 * Adds user info to req.user
 */
export async function verifySupabaseJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({
      error: 'Auth service unavailable',
      message: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    let role: 'user' | 'admin' = (profile?.role as 'user' | 'admin') || 'user';
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (role !== 'admin' && adminEmails.length > 0 && adminEmails.includes((user.email ?? '').toLowerCase())) {
      console.warn(`[SECURITY] Admin elevation via email for: ${user.email}`);
      role = 'admin';
    }

    req.user = {
      id: user.id,
      email: user.email!,
      role,
    };

    next();
  } catch (err) {
    // Don't log the full error object (may contain tokens)
    console.error('JWT verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return res.status(401).json({ error: 'Token verification failed' });
  }
}

/**
 * Require admin role - use after verifySupabaseJWT
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
