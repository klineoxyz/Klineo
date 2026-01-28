import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { requireJoiningFee } from '../middleware/requireEntitlement.js';
import { validate, uuidParam } from '../middleware/validation.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { encrypt, decrypt, maskApiKey } from '../lib/crypto.js';
import { testConnection, getAccountInfo, type BinanceCredentials } from '../lib/binance.js';

let supabase: SupabaseClient | null = null;

/**
 * Normalize encrypted_config from DB to base64 string for decrypt().
 * Postgres bytea can be returned as Buffer, hex string (\x... or 0x...), base64 string, or JSON Buffer object.
 */
function encryptedConfigToBase64(raw: unknown): string {
  if (Buffer.isBuffer(raw)) {
    return raw.toString('base64');
  }
  if (typeof raw === 'string') {
    if (raw.startsWith('\\x') || raw.startsWith('0x')) {
      const hex = raw.replace(/^\\x|^0x/i, '');
      return Buffer.from(hex, 'hex').toString('base64');
    }
    return raw;
  }
  if (
    raw &&
    typeof raw === 'object' &&
    'type' in (raw as object) &&
    (raw as { type: string }).type === 'Buffer' &&
    Array.isArray((raw as { data: number[] }).data)
  ) {
    return Buffer.from((raw as { data: number[] }).data).toString('base64');
  }
  if (raw && typeof raw === 'object' && ArrayBuffer.isView(raw) && !Buffer.isBuffer(raw)) {
    return Buffer.from(raw as Uint8Array).toString('base64');
  }
  throw new Error('Invalid encrypted_config format');
}

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
 * Create or update exchange connection (requires joining fee paid)
 */
exchangeConnectionsRouter.post(
  '/',
  requireJoiningFee,
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
      // Encrypt credentials (store as base64 TEXT to avoid bytea serialization issues)
      const credentialsJson = JSON.stringify({ apiKey, apiSecret });
      const encryptedConfig = await encrypt(credentialsJson);

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
        encrypted_config_b64: encryptedConfig,
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
      // Fetch connection (prefer encrypted_config_b64 TEXT over bytea for reliable read)
      const { data: connection, error: fetchError } = await client
        .from('user_exchange_connections')
        .select('id, exchange, environment, encrypted_config_b64, encrypted_config')
        .eq('id', connectionId)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchError || !connection) {
        return res.status(404).json({ error: 'Connection not found', requestId });
      }

      const hasB64 = typeof connection.encrypted_config_b64 === 'string' && connection.encrypted_config_b64.length > 0;
      const hasBytea = connection.encrypted_config != null;
      if (!hasB64 && !hasBytea) {
        return res.status(400).json({ error: 'Connection has no credentials', requestId });
      }

      // Decrypt credentials (prefer base64 TEXT; fallback to bytea)
      let credentials: BinanceCredentials;
      try {
        const encryptedBase64 = hasB64
          ? connection.encrypted_config_b64
          : encryptedConfigToBase64(connection.encrypted_config);
        const decryptedJson = await decrypt(encryptedBase64);
        const parsed = JSON.parse(decryptedJson);
        credentials = {
          apiKey: parsed.apiKey,
          apiSecret: parsed.apiSecret,
          environment: (connection.environment || 'production') as 'production' | 'testnet',
        };
      } catch (decryptError) {
        const msg = decryptError instanceof Error ? decryptError.message : 'Unknown';
        console.error(`[${requestId}] Decryption failed:`, msg);
        return res.status(500).json({
          error: 'Failed to decrypt credentials',
          message: 'Credentials could not be decrypted. Ensure ENCRYPTION_KEY is set on the server and unchanged since the connection was saved. Try removing and re-adding the exchange in Settings.',
          requestId,
        });
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
 * GET /api/exchange-connections/balance
 * Fetch account balances from first Binance connection (for trading terminal).
 * Returns USDT and all asset balances so UI can show Available for buy/sell.
 */
exchangeConnectionsRouter.get('/balance', async (req: AuthenticatedRequest, res) => {
  const client = getSupabase();
  if (!client) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const requestId = (req as any).requestId || 'unknown';

  try {
    const { data: connections, error: listError } = await client
      .from('user_exchange_connections')
      .select('id, exchange, environment, encrypted_config_b64, encrypted_config')
      .eq('user_id', req.user!.id)
      .eq('exchange', 'binance')
      .order('created_at', { ascending: false })
      .limit(1);

    if (listError || !connections?.length) {
      return res.status(200).json({
        connected: false,
        exchange: null,
        connectionId: null,
        balances: {},
        requestId,
      });
    }

    const connection = connections[0];
    const hasB64 = typeof connection.encrypted_config_b64 === 'string' && connection.encrypted_config_b64.length > 0;
    const hasBytea = connection.encrypted_config != null;
    if (!hasB64 && !hasBytea) {
      return res.status(200).json({
        connected: false,
        exchange: 'binance',
        connectionId: connection.id,
        balances: {},
        requestId,
      });
    }

    let credentials: BinanceCredentials;
    try {
      const encryptedBase64 = hasB64
        ? connection.encrypted_config_b64
        : encryptedConfigToBase64(connection.encrypted_config);
      const decryptedJson = await decrypt(encryptedBase64);
      const parsed = JSON.parse(decryptedJson);
      credentials = {
        apiKey: parsed.apiKey,
        apiSecret: parsed.apiSecret,
        environment: (connection.environment || 'production') as 'production' | 'testnet',
      };
    } catch (decryptError) {
      console.error(`[${requestId}] Balance: decryption failed`);
      return res.status(500).json({
        error: 'Failed to decrypt credentials',
        message: 'Credentials could not be decrypted. Ensure ENCRYPTION_KEY is set on the server and unchanged since the connection was saved. Try removing and re-adding the exchange in Settings.',
        requestId,
      });
    }

    const account = await getAccountInfo(credentials);
    const balances: Record<string, { free: string; locked: string }> = {};
    for (const b of account.balances) {
      const free = parseFloat(b.free);
      const locked = parseFloat(b.locked);
      if (free > 0 || locked > 0) {
        balances[b.asset] = { free: b.free, locked: b.locked };
      }
    }

    res.json({
      connected: true,
      exchange: 'binance',
      connectionId: connection.id,
      balances,
      requestId,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[${requestId}] Balance error:`, errorMessage);
    res.status(500).json({
      error: 'Failed to fetch balance',
      message: errorMessage.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]'),
      requestId,
    });
  }
});

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
