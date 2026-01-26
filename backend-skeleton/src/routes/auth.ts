import { Router } from 'express';

export const authRouter: Router = Router();

// Placeholder - will verify Supabase JWT when integrated
authRouter.get('/me', async (req, res) => {
  res.json({ 
    message: 'Auth endpoint - Supabase integration pending',
    note: 'This will verify Supabase JWT and return user profile',
    next: 'Install @supabase/supabase-js and add verifySupabaseJWT middleware'
  });
});
