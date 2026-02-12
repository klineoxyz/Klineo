/**
 * Master Trader Application routes.
 * - POST /api/master-trader-applications — submit application (auth required, no package required)
 * - Admin: GET/PATCH via /api/admin/master-trader-applications (in admin router)
 */

import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendMasterTraderApplicationCopy } from '../lib/email.js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export const masterTraderApplicationsRouter: ExpressRouter = Router();

/**
 * GET /api/master-trader-applications/me
 * Get the current user's latest Master Trader application (so they can see pending/approved/rejected).
 * Admins are always treated as approved Master Traders (MT badge, no "Become a Master Trader" CTA).
 */
masterTraderApplicationsRouter.get(
  '/me',
  verifySupabaseJWT,
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      if (isAdmin) {
        return res.json({
          application: {
            id: 'admin-mt',
            status: 'approved',
            message: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }

      const { data: row, error } = await client
        .from('master_trader_applications')
        .select('id, status, message, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Master trader application get me error:', error);
        return res.status(500).json({ error: 'Failed to fetch application' });
      }

      if (!row) {
        return res.json({ application: null });
      }

      res.json({
        application: {
          id: (row as any).id,
          status: (row as any).status,
          message: (row as any).message || null,
          createdAt: (row as any).created_at,
          updatedAt: (row as any).updated_at,
        },
      });
    } catch (err) {
      console.error('Master trader application get me error:', err);
      res.status(500).json({ error: 'Failed to fetch application' });
    }
  }
);

/**
 * POST /api/master-trader-applications
 * Submit Master Trader application. No entitlement/package required.
 */
masterTraderApplicationsRouter.post(
  '/',
  verifySupabaseJWT,
  validate([
    body('fullName').trim().isLength({ min: 1 }).withMessage('Full name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('country').trim().isLength({ min: 1 }).withMessage('Country required'),
    body('telegram').optional().trim(),
    body('primaryExchange').trim().isLength({ min: 1 }).withMessage('Primary exchange required'),
    body('yearsExperience').isInt({ min: 0 }).withMessage('Years of experience required'),
    body('tradingStyle').trim().isLength({ min: 1 }).withMessage('Trading style required'),
    body('preferredMarkets').trim().isLength({ min: 1 }).withMessage('Preferred markets required'),
    body('avgMonthlyReturn').optional(),
    body('strategyDescription').trim().isLength({ min: 1 }).withMessage('Strategy description required'),
    body('whyMasterTrader').trim().isLength({ min: 1 }).withMessage('Why Master Trader required'),
    body('profileUrl').optional().trim(),
    body('proofUrl').optional().trim().isString().isLength({ max: 2000 }).withMessage('proofUrl must be a string'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const userId = req.user!.id;
      const {
        fullName,
        email,
        country,
        telegram,
        primaryExchange,
        yearsExperience,
        tradingStyle,
        preferredMarkets,
        avgMonthlyReturn,
        strategyDescription,
        whyMasterTrader,
        profileUrl,
      } = req.body;

      // Check if user already has a pending application
      const { data: existing } = await client
        .from('master_trader_applications')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          error: 'You already have a pending application',
          message: 'Wait for the current application to be reviewed.',
        });
      }

      const formData = {
        fullName,
        email,
        country,
        telegram: telegram || null,
        primaryExchange,
        yearsExperience: Number(yearsExperience),
        tradingStyle,
        preferredMarkets,
        avgMonthlyReturn: avgMonthlyReturn != null ? String(avgMonthlyReturn) : null,
        strategyDescription,
        whyMasterTrader,
        profileUrl: profileUrl || null,
      };

      const proofUrl = (req.body.proofUrl as string)?.trim() || null;

      const { data: row, error } = await (client as any)
        .from('master_trader_applications')
        .insert({
          user_id: userId,
          status: 'pending',
          form_data: formData,
          proof_url: proofUrl,
          updated_at: new Date().toISOString(),
        })
        .select('id, status, created_at')
        .single();

      if (error) {
        console.error('Master trader application insert error:', error);
        return res.status(500).json({ error: 'Failed to submit application' });
      }

      const inserted = row as { id: string; status: string; created_at: string };
      const copyTo = process.env.MASTER_TRADER_COPY_TO_EMAIL || 'klineoxyz@gmail.com';
      let emailSent = false;
      try {
        const result = await sendMasterTraderApplicationCopy({
          to: copyTo,
          formData: {
            fullName,
            email,
            country,
            telegram: telegram || null,
            primaryExchange,
            yearsExperience: Number(yearsExperience),
            tradingStyle,
            preferredMarkets,
            avgMonthlyReturn: avgMonthlyReturn != null ? String(avgMonthlyReturn) : null,
            strategyDescription,
            whyMasterTrader,
            profileUrl: profileUrl || null,
          },
          proofUrl,
          applicationId: inserted.id,
        });
        emailSent = result.ok;
        if (!result.ok) {
          console.error('[Master Trader] Email copy not sent:', result.error, '- Set RESEND_API_KEY and optionally EMAIL_FROM, MASTER_TRADER_COPY_TO_EMAIL in backend env.');
        } else {
          console.log('[Master Trader] Application copy email sent to', copyTo);
        }
      } catch (emailErr) {
        console.error('[Master Trader] Email send failed:', emailErr);
      }

      res.status(201).json({
        id: inserted.id,
        status: inserted.status,
        createdAt: inserted.created_at,
        message: 'Application submitted. We will review within 2–5 business days.',
        emailSent,
      });
    } catch (err) {
      console.error('Master trader application error:', err);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  }
);
