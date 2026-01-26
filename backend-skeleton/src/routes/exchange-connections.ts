import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { validate, uuidParam } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { encrypt, decrypt, maskApiKey } from '../lib/crypto.js';
import { testConnection, type BinanceCredentials } from '../lib/binance.js';

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

export const exchangeConnectionsRouter: Router = Router();

// All exchange connection routes require authentication
exchangeConnectionsRouter.use(verifySupabaseJWT);

/**
 * GET /api/exchange-connections
 * List current user's exchange connections (masked, no secrets)
 */
exchangeConnectionsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const requestId = (req as any).requestId || 'unknown';

  try {
    const { data: connections, error } = await client
      .from('user_exchange_connections')
      .select('id, exchange, label, environment, created_at, updated_at, last_tested_at, last_test_status, last_error_message')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${requestId}] Error fetching connections:`, error);
      return res.status(500).json({ error: 'Failed to fetch connections', requestId });
    }

    // Mask API keys if we have them (for display)
    const masked = (connections || []).map((conn: any) => {
      // If we have encrypted_config, we can't show masked key without decrypting
      // For now, just return the connection data
      return {
        ...conn,
        // Add masked key placeholder if needed (would require decryption, so skip for now)
      };
    });

    res.json({ connections: masked, requestId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[${requestId}] Unexpected error:`, errorMessage);
    res.status(500).json({ error: 'Internal server error', requestId });
  }
});

/**
 * POST /api/exchange-connections
 * Create or update exchange connection
 */
exchangeConnectionsRouter.post(
  '/',
  validate([
    body('exchange').isString().equals('binance').withMessage('Only binance is supported'),
    body('environment').optional().isIn(['production', 'testnet']).withMessage('Environment must be production or testnet'),
    body('label').optional().isString().isLength({ max: 40 }).withMessage('Label must be <= 40 characters'),
    body('apiKey').isString().isLength({ min: 10, max: 200 }).withMessage('API key must be 10-200 characters'),
    body('apiSecret').isString().isLength({ min: 10, max: 200 }).withMessage('API secret must be 10-200 characters'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const requestId = (req as any).requestId || 'unknown';
    const { exchange, environment = 'production', label, apiKey, apiSecret } = req.body;

    try {
      // Encrypt credentials
      const credentialsJson = JSON.stringify({ apiKey, apiSecret });
      const encryptedConfig = await encrypt(credentialsJson);
      const encryptedBuffer = Buffer.from(encryptedConfig, 'base64');

      // Check if connection already exists (upsert)
      const { data: existing } = await client
        .from('user_exchange_connections')
        .select('id')
        .eq('user_id', req.user!.id)
        .eq('exchange', exchange)
        .maybeSingle();

      const connectionData: any = {
        user_id: req.user!.id,
        exchange,
        environment,
        label: label || null,
        encrypted_config: encryptedBuffer,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existing) {
        // Update existing
        const { data, error } = await client
          .from('user_exchange_connections')
          .update(connectionData)
          .eq('id', existing.id)
          .eq('user_id', req.user!.id)
          .select('id, exchange, label, environment, created_at, updated_at')
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await client
          .from('user_exchange_connections')
          .insert(connectionData)
          .select('id, exchange, label, environment, created_at, updated_at')
          .single();

        if (error) throw error;
        result = data;
      }

      // Never return secrets
      res.json({
        connection: result,
        message: existing ? 'Connection updated' : 'Connection created',
        requestId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${requestId}] Error saving connection:`, errorMessage);
      // Don't log apiKey/apiSecret
      res.status(500).json({ error: 'Failed to save connection', requestId });
    }
  }
);

/**
 * POST /api/exchange-connections/:id/test
 * Test exchange connection by calling Binance API
 */
exchangeConnectionsRouter.post(
  '/:id/test',
  uuidParam('id'),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const requestId = (req as any).requestId || 'unknown';
    const connectionId = req.params.id;

    try {
      // Fetch connection
      const { data: connection, error: fetchError } = await client
        .from('user_exchange_connections')
        .select('id, exchange, environment, encrypted_config')
        .eq('id', connectionId)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchError || !connection) {
        return res.status(404).json({ error: 'Connection not found', requestId });
      }

      if (!connection.encrypted_config) {
        return res.status(400).json({ error: 'Connection has no credentials', requestId });
      }

      // Decrypt credentials
      let credentials: BinanceCredentials;
      try {
        const encryptedBase64 = Buffer.from(connection.encrypted_config).toString('base64');
        const decryptedJson = await decrypt(encryptedBase64);
        const parsed = JSON.parse(decryptedJson);
        credentials = {
          apiKey: parsed.apiKey,
          apiSecret: parsed.apiSecret,
          environment: (connection.environment || 'production') as 'production' | 'testnet',
        };
      } catch (decryptError) {
        console.error(`[${requestId}] Decryption failed:`, decryptError instanceof Error ? decryptError.message : 'Unknown');
        return res.status(500).json({ error: 'Failed to decrypt credentials', requestId });
      }

      // Test connection
      const testResult = await testConnection(credentials);

      // Update connection with test results
      const updateData: any = {
        last_tested_at: new Date().toISOString(),
        last_test_status: testResult.ok ? 'ok' : 'fail',
        last_error_message: testResult.error || null,
        updated_at: new Date().toISOString(),
      };

      await client
        .from('user_exchange_connections')
        .update(updateData)
        .eq('id', connectionId)
        .eq('user_id', req.user!.id);

      // Return test result (no secrets)
      res.json({
        ok: testResult.ok,
        latencyMs: testResult.latencyMs,
        message: testResult.message,
        requestId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${requestId}] Error testing connection:`, errorMessage);
      res.status(500).json({ error: 'Failed to test connection', requestId });
    }
  }
);

/**
 * DELETE /api/exchange-connections/:id
 * Delete exchange connection
 */
exchangeConnectionsRouter.delete(
  '/:id',
  uuidParam('id'),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const requestId = (req as any).requestId || 'unknown';
    const connectionId = req.params.id;

    try {
      const { error } = await client
        .from('user_exchange_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', req.user!.id);

      if (error) {
        console.error(`[${requestId}] Error deleting connection:`, error);
        return res.status(500).json({ error: 'Failed to delete connection', requestId });
      }

      res.json({ message: 'Connection deleted', requestId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${requestId}] Unexpected error:`, errorMessage);
      res.status(500).json({ error: 'Internal server error', requestId });
    }
  }
);
