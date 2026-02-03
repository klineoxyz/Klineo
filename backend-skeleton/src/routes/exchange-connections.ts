import { Router } from 'express';
import { verifySupabaseJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { requireJoiningFee } from '../middleware/requireEntitlement.js';
import { validate, uuidParam } from '../middleware/validation.js';
import { exchangeConnectionLimiter } from '../middleware/rateLimit.js';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { encrypt, decrypt, maskApiKey } from '../lib/crypto.js';
import { testConnection as binanceTestConnection, getAccountInfo as binanceGetAccountInfo, type BinanceCredentials } from '../lib/binance.js';
import { testConnection as bybitTestConnection, getWalletBalance as bybitGetWalletBalance, type BybitCredentials } from '../lib/bybit.js';
import * as binanceFutures from '../lib/binance-futures.js';
import * as bybitFutures from '../lib/bybit-futures.js';

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
 * POST /api/exchange-connections/test
 * Test credentials WITHOUT saving. Use before "Save Connection".
 * Body: { exchange, environment, apiKey, apiSecret }
 */
exchangeConnectionsRouter.post(
  '/test',
  exchangeConnectionLimiter,
  validate([
    body('exchange').isIn(['binance', 'bybit']).withMessage('Exchange must be binance or bybit'),
    body('environment').optional().isIn(['production', 'testnet']).withMessage('Environment must be production or testnet'),
    body('apiKey').isString().isLength({ min: 10, max: 200 }).withMessage('API key must be 10-200 characters'),
    body('apiSecret').isString().isLength({ min: 10, max: 200 }).withMessage('API secret must be 10-200 characters'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const requestId = (req as any).requestId || 'unknown';
    const { exchange, environment = 'production', apiKey, apiSecret } = req.body;

    try {
      let result: { ok: boolean; latencyMs: number; message: string; error?: string };
      if (exchange === 'binance') {
        result = await binanceTestConnection({
          apiKey,
          apiSecret,
          environment: environment as 'production' | 'testnet',
        });
      } else if (exchange === 'bybit') {
        result = await bybitTestConnection({
          apiKey,
          apiSecret,
          environment: environment as 'production' | 'testnet',
        });
      } else {
        return res.status(400).json({ error: 'Unsupported exchange', requestId });
      }

      if (result.ok) {
        return res.json({ success: true, ok: true, latencyMs: result.latencyMs, message: result.message, requestId });
      }
      return res.status(400).json({
        success: false,
        ok: false,
        message: result.message,
        error: result.error,
        requestId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const sanitized = errorMessage.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      console.error(`[${requestId}] Test connection error:`, sanitized);
      return res.status(500).json({ error: 'Connection test failed', message: sanitized, requestId });
    }
  }
);

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
      .select('id, exchange, label, environment, created_at, updated_at, last_tested_at, last_test_status, last_error_message, consecutive_failures, disabled_at, supports_futures, futures_enabled, futures_tested_at, futures_test_status, futures_last_error, default_leverage, max_leverage_allowed, margin_mode, position_mode, max_notional_usdt, kill_switch')
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
  exchangeConnectionLimiter,
  validate([
    body('exchange').isIn(['binance', 'bybit']).withMessage('Exchange must be binance or bybit'),
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
        supports_futures: exchange === 'binance' || exchange === 'bybit',
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
        .select('id, exchange, environment, encrypted_config_b64, encrypted_config, consecutive_failures, disabled_at')
        .eq('id', connectionId)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchError || !connection) {
        return res.status(404).json({ error: 'Connection not found', requestId });
      }

      const hasB64 = typeof connection.encrypted_config_b64 === 'string' && connection.encrypted_config_b64.length > 0;
      if (!hasB64) {
        return res.status(400).json({
          error: 'Credentials need to be re-saved',
          message: 'This connection was saved before a security update. Use **Update credentials** in Settings to re-enter your API key and secret, then run Test again.',
          code: 'UPDATE_CREDENTIALS_REQUIRED',
          requestId,
        });
      }

      // Decrypt credentials (only from encrypted_config_b64; old bytea is not used)
      const env = (connection.environment || 'production') as 'production' | 'testnet';
      let testResult: { ok: boolean; latencyMs: number; message: string; error?: string };
      try {
        const decryptedJson = await decrypt(connection.encrypted_config_b64);
        const parsed = JSON.parse(decryptedJson);
        if (connection.exchange === 'bybit') {
          const creds: BybitCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
          testResult = await bybitTestConnection(creds);
        } else {
          const creds: BinanceCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
          testResult = await binanceTestConnection(creds);
        }
      } catch (decryptError) {
        const msg = decryptError instanceof Error ? decryptError.message : 'Unknown';
        console.error(`[${requestId}] Decryption failed:`, msg);
        return res.status(500).json({
          error: 'Failed to decrypt credentials',
          message: 'Credentials could not be decrypted. Ensure ENCRYPTION_KEY is set on the server and unchanged. Use **Update credentials** in Settings to re-enter your API key and secret.',
          requestId,
        });
      }

      // testResult already set above

      // Update connection with test results; auto-disable after 5 consecutive failures
      const prevFailures = Number(connection.consecutive_failures ?? 0);
      const failures = testResult!.ok ? 0 : prevFailures + 1;
      const updateData: any = {
        last_tested_at: new Date().toISOString(),
        last_test_status: testResult!.ok ? 'ok' : 'fail',
        last_error_message: testResult!.error || null,
        consecutive_failures: failures,
        disabled_at: testResult!.ok ? null : (failures >= 5 ? new Date().toISOString() : (connection.disabled_at ?? null)),
        updated_at: new Date().toISOString(),
      };

      await client
        .from('user_exchange_connections')
        .update(updateData)
        .eq('id', connectionId)
        .eq('user_id', req.user!.id);

      // Return test result (no secrets); include error detail so UI can show Binance message (e.g. restricted location)
      res.json({
        ok: testResult.ok,
        latencyMs: testResult.latencyMs,
        message: testResult.message,
        error: testResult.error ?? undefined,
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
 * POST /api/exchange-connections/:id/futures/test
 * Test Futures API (no order placed). Updates futures_test_status, futures_last_error.
 */
exchangeConnectionsRouter.post(
  '/:id/futures/test',
  uuidParam('id'),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    const requestId = (req as any).requestId || 'unknown';
    const connectionId = req.params.id;

    try {
      const { data: connection, error: fetchError } = await client
        .from('user_exchange_connections')
        .select('id, exchange, environment, encrypted_config_b64, supports_futures')
        .eq('id', connectionId)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchError || !connection) {
        return res.status(404).json({ error: 'Connection not found', requestId });
      }
      const supportsFuturesTest = connection.supports_futures || connection.exchange === 'binance' || connection.exchange === 'bybit';
      if (!supportsFuturesTest) {
        return res.status(400).json({ error: 'Exchange does not support futures', requestId });
      }

      const hasB64 = typeof connection.encrypted_config_b64 === 'string' && connection.encrypted_config_b64.length > 0;
      if (!hasB64) {
        return res.status(400).json({ error: 'Credentials need to be re-saved', code: 'UPDATE_CREDENTIALS_REQUIRED', requestId });
      }

      const env = (connection.environment || 'production') as 'production' | 'testnet';
      const decryptedJson = await decrypt(connection.encrypted_config_b64);
      const parsed = JSON.parse(decryptedJson);

      let ok = false;
      let errorMsg: string | null = null;
      const start = Date.now();
      try {
        if (connection.exchange === 'bybit') {
          const creds: bybitFutures.BybitFuturesCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
          await bybitFutures.getAccountSummary(creds);
          ok = true;
        } else {
          const creds: binanceFutures.BinanceFuturesCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
          await binanceFutures.getAccountSummary(creds);
          ok = true;
        }
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : 'Unknown error';
        errorMsg = errorMsg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      }

      await client
        .from('user_exchange_connections')
        .update({
          futures_tested_at: new Date().toISOString(),
          futures_test_status: ok ? 'ok' : 'fail',
          futures_last_error: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', req.user!.id);

      res.json({
        ok,
        latencyMs: Date.now() - start,
        message: ok ? 'Futures API OK' : 'Futures test failed',
        error: errorMsg ?? undefined,
        requestId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${requestId}] Futures test error:`, msg);
      res.status(500).json({ error: 'Futures test failed', requestId });
    }
  }
);

/**
 * POST /api/exchange-connections/:id/futures/enable
 * Set leverage, margin mode, position mode for BTCUSDT (no order). Sets futures_enabled true.
 * Body: { default_leverage?, margin_mode?, position_mode? }
 */
exchangeConnectionsRouter.post(
  '/:id/futures/enable',
  uuidParam('id'),
  validate([
    body('default_leverage').optional().isInt({ min: 1, max: 125 }).withMessage('Leverage 1-125'),
    body('margin_mode').optional().isIn(['isolated', 'cross']).withMessage('isolated or cross'),
    body('position_mode').optional().isIn(['one_way', 'hedge']).withMessage('one_way or hedge'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    const requestId = (req as any).requestId || 'unknown';
    const connectionId = req.params.id;
    const { default_leverage, margin_mode, position_mode } = req.body;

    try {
      const { data: connection, error: fetchError } = await client
        .from('user_exchange_connections')
        .select('id, exchange, environment, encrypted_config_b64, supports_futures, max_leverage_allowed, default_leverage, margin_mode, position_mode')
        .eq('id', connectionId)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchError || !connection) {
        return res.status(404).json({ error: 'Connection not found', requestId });
      }
      const supportsFuturesEnable = connection.supports_futures || connection.exchange === 'binance' || connection.exchange === 'bybit';
      if (!supportsFuturesEnable) {
        return res.status(400).json({ error: 'Exchange does not support futures', requestId });
      }

      const hasB64 = typeof connection.encrypted_config_b64 === 'string' && connection.encrypted_config_b64.length > 0;
      if (!hasB64) {
        return res.status(400).json({ error: 'Credentials need to be re-saved', requestId });
      }

      const conn = connection as { default_leverage?: number; margin_mode?: string; position_mode?: string };
      const leverage = default_leverage ?? conn.default_leverage ?? 3;
      const maxAllowed = Number(connection.max_leverage_allowed ?? 10);
      if (leverage > maxAllowed) {
        return res.status(400).json({ error: `Leverage must be <= ${maxAllowed}`, requestId });
      }

      const env = (connection.environment || 'production') as 'production' | 'testnet';
      const decryptedJson = await decrypt(connection.encrypted_config_b64);
      const parsed = JSON.parse(decryptedJson);
      const symbol = 'BTCUSDT';
      const marginMode = (margin_mode ?? conn.margin_mode ?? 'isolated') as 'isolated' | 'cross';
      const posMode = (position_mode ?? conn.position_mode ?? 'one_way') as 'one_way' | 'hedge';

      if (connection.exchange === 'bybit') {
        const creds: bybitFutures.BybitFuturesCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
        await bybitFutures.setLeverage(creds, symbol, leverage);
        await bybitFutures.setMarginMode(creds, symbol, marginMode);
        await bybitFutures.setPositionMode(creds, posMode);
      } else {
        const creds: binanceFutures.BinanceFuturesCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
        await binanceFutures.setLeverage(creds, symbol, leverage);
        await binanceFutures.setMarginMode(creds, symbol, marginMode);
        await binanceFutures.setPositionMode(creds, posMode);
      }

      await client
        .from('user_exchange_connections')
        .update({
          futures_enabled: true,
          supports_futures: true,
          default_leverage: leverage,
          margin_mode: marginMode,
          position_mode: posMode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', req.user!.id);

      res.json({ message: 'Futures enabled', requestId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const sanitized = msg.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');
      console.error(`[${requestId}] Futures enable error:`, sanitized);
      const isRestricted =
        /451|restricted\s*location|eligibility|unavailable.*region/i.test(sanitized);
      const status = isRestricted ? 403 : 500;
      res.status(status).json({
        error: 'Futures enable failed',
        message: sanitized,
        code: isRestricted ? 'FUTURES_RESTRICTED' : undefined,
        requestId,
      });
    }
  }
);

/**
 * PATCH /api/exchange-connections/:id/kill-switch
 * Set kill_switch true (stops all futures strategies from placing orders).
 */
exchangeConnectionsRouter.patch(
  '/:id/kill-switch',
  uuidParam('id'),
  validate([body('enabled').isBoolean().withMessage('enabled must be boolean')]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    const requestId = (req as any).requestId || 'unknown';
    const connectionId = req.params.id;
    const enabled = req.body.enabled === true;

    try {
      const { error } = await client
        .from('user_exchange_connections')
        .update({ kill_switch: enabled, updated_at: new Date().toISOString() })
        .eq('id', connectionId)
        .eq('user_id', req.user!.id);

      if (error) {
        console.error(`[${requestId}] Kill switch update error:`, error);
        return res.status(500).json({ error: 'Failed to update kill switch', requestId });
      }
      res.json({ kill_switch: enabled, message: enabled ? 'Kill switch ON — no futures orders' : 'Kill switch OFF', requestId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Internal server error', requestId });
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
      .select('id, exchange, environment, encrypted_config_b64, encrypted_config, disabled_at')
      .eq('user_id', req.user!.id)
      .in('exchange', ['binance', 'bybit'])
      .is('disabled_at', null)
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
    if (!hasB64) {
      return res.status(200).json({
        connected: false,
        exchange: connection.exchange,
        connectionId: connection.id,
        balances: {},
        requestId,
      });
    }

    const env = (connection.environment || 'production') as 'production' | 'testnet';
    let balances: Record<string, { free: string; locked: string }> = {};
    try {
      const decryptedJson = await decrypt(connection.encrypted_config_b64);
      const parsed = JSON.parse(decryptedJson);
      if (connection.exchange === 'bybit') {
        const creds: BybitCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
        const wallet = await bybitGetWalletBalance(creds);
        for (const b of wallet.balances) {
          balances[b.asset] = { free: b.free, locked: b.locked };
        }
      } else {
        const creds: BinanceCredentials = { apiKey: parsed.apiKey, apiSecret: parsed.apiSecret, environment: env };
        const account = await binanceGetAccountInfo(creds);
        for (const b of account.balances) {
          const free = parseFloat(b.free);
          const locked = parseFloat(b.locked);
          if (free > 0 || locked > 0) {
            balances[b.asset] = { free: b.free, locked: b.locked };
          }
        }
      }
    } catch (decryptError) {
      console.error(`[${requestId}] Balance: decryption failed`);
      return res.status(500).json({
        error: 'Failed to decrypt credentials',
        message: 'Use **Update credentials** in Settings to re-enter your API key and secret.',
        requestId,
      });
    }

    res.json({
      connected: true,
      exchange: connection.exchange,
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
 * PUT /api/exchange-connections/:id/credentials
 * Re-save API key/secret for an existing connection (updates encrypted_config_b64).
 * Use this when Test fails with "decrypt" — re-enter keys and save to fix storage.
 */
exchangeConnectionsRouter.put(
  '/:id/credentials',
  uuidParam('id'),
  validate([
    body('apiKey').isString().isLength({ min: 10, max: 200 }).withMessage('API key must be 10-200 characters'),
    body('apiSecret').isString().isLength({ min: 10, max: 200 }).withMessage('API secret must be 10-200 characters'),
    body('environment').optional().isIn(['production', 'testnet']).withMessage('Environment must be production or testnet'),
  ]),
  async (req: AuthenticatedRequest, res) => {
    const client = getSupabase();
    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const requestId = (req as any).requestId || 'unknown';
    const connectionId = req.params.id;
    const { apiKey, apiSecret, environment } = req.body;

    try {
      const { data: connection, error: fetchError } = await client
        .from('user_exchange_connections')
        .select('id, exchange, environment')
        .eq('id', connectionId)
        .eq('user_id', req.user!.id)
        .single();

      if (fetchError || !connection) {
        return res.status(404).json({ error: 'Connection not found', requestId });
      }

      const credentialsJson = JSON.stringify({ apiKey, apiSecret });
      const encryptedConfig = await encrypt(credentialsJson);

      const updateData: any = {
        encrypted_config_b64: encryptedConfig,
        consecutive_failures: 0,
        disabled_at: null,
        updated_at: new Date().toISOString(),
      };
      if (environment) updateData.environment = environment;

      const { error: updateError } = await client
        .from('user_exchange_connections')
        .update(updateData)
        .eq('id', connectionId)
        .eq('user_id', req.user!.id);

      if (updateError) {
        console.error(`[${requestId}] Error updating credentials:`, updateError);
        return res.status(500).json({ error: 'Failed to update credentials', requestId });
      }

      res.json({ message: 'Credentials updated. Run Test to verify.', requestId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${requestId}] Update credentials error:`, errorMessage);
      res.status(500).json({ error: 'Failed to update credentials', requestId });
    }
  }
);

/**
 * PATCH /api/exchange-connections/:id/re-enable
 * Clear disabled_at and consecutive_failures so connection is used again for balance/orders.
 */
exchangeConnectionsRouter.patch(
  '/:id/re-enable',
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
        .update({
          consecutive_failures: 0,
          disabled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', req.user!.id);

      if (error) {
        console.error(`[${requestId}] Error re-enabling connection:`, error);
        return res.status(500).json({ error: 'Failed to re-enable connection', requestId });
      }

      res.json({ message: 'Connection re-enabled. Run Test to verify.', requestId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${requestId}] Re-enable error:`, errorMessage);
      res.status(500).json({ error: 'Internal server error', requestId });
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
