/**
 * Check trading permissions for an exchange + market type.
 * Calls a lightweight signed endpoint and maps errors to structured reason_code.
 * Used by POST /api/trading/check-permissions.
 */

import * as binance from './binance.js';
import * as bybit from './bybit.js';
import * as binanceFutures from './binance-futures.js';
import * as bybitFutures from './bybit-futures.js';

export type PermissionsCheckResult = {
  ok: boolean;
  reason_code?: string;
  message: string;
};

const sanitize = (s: string) => s.replace(/api[_-]?key/gi, '[REDACTED]').replace(/secret/gi, '[REDACTED]');

function binanceErrorToReasonCode(code: number, msg: string, httpStatus?: number): string {
  if (httpStatus === 429) return 'RATE_LIMIT';
  if (httpStatus === 451) return 'RESTRICTED_REGION';
  if (code === -1021) return 'TIMESTAMP_DESYNC';
  if (code === -1022) return 'INVALID_KEY';
  if (code === -2015 || /permission|invalid.*key/i.test(msg)) {
    return /ip|whitelist/i.test(msg) ? 'IP_WHITELIST_BLOCK' : 'INVALID_KEY';
  }
  if (/restricted|region|eligibility/i.test(msg)) return 'RESTRICTED_REGION';
  if (code === -1015) return 'RATE_LIMIT';
  return 'INVALID_KEY';
}

export async function checkPermissions(
  exchange: 'binance' | 'bybit',
  marketType: 'spot' | 'futures',
  credentials: { apiKey: string; apiSecret: string },
  environment: 'production' | 'testnet'
): Promise<PermissionsCheckResult> {
  if (exchange === 'binance' && marketType === 'spot') {
    try {
      const creds: binance.BinanceCredentials = {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        environment,
      };
      const account = await binance.getAccountInfo(creds);
      if (!account.canTrade) {
        return {
          ok: false,
          reason_code: 'API_READ_ONLY',
          message: 'Spot trading is disabled for this API key. Enable it in Binance API Management.',
        };
      }
      const hasSpot = Array.isArray(account.permissions) && account.permissions.some((p) => /SPOT|MARGIN/i.test(String(p)));
      if (!hasSpot && (account.permissions?.length ?? 0) > 0) {
        return {
          ok: false,
          reason_code: 'SPOT_NOT_ENABLED',
          message: 'Spot/Margin permission not found. Enable Reading and Spot trading in Binance API settings.',
        };
      }
      return { ok: true, message: 'Spot permissions OK' };
    } catch (e) {
      const err = e as Error;
      const msg = err.message ?? '';
      const codeMatch = msg.match(/Binance API error \((-?\d+)\)/);
      const code = codeMatch ? parseInt(codeMatch[1], 10) : 0;
      const reasonCode = binanceErrorToReasonCode(code, msg);
      return {
        ok: false,
        reason_code: reasonCode,
        message: sanitize(msg),
      };
    }
  }

  if (exchange === 'binance' && marketType === 'futures') {
    try {
      const creds: binanceFutures.BinanceFuturesCredentials = {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        environment,
      };
      await binanceFutures.getAccountSummary(creds);
      return { ok: true, message: 'Futures permissions OK' };
    } catch (e) {
      const err = e as Error;
      const msg = err.message ?? '';
      const codeMatch = msg.match(/Binance (?:API error|Futures) \((-?\d+)\)/);
      const code = codeMatch ? parseInt(codeMatch[1], 10) : 0;
      const reasonCode = binanceErrorToReasonCode(code, msg);
      if (reasonCode === 'INVALID_KEY' && /permission|trade|read|invalid/i.test(msg)) {
        return {
          ok: false,
          reason_code: 'FUTURES_NOT_ENABLED',
          message: 'Futures access denied. Enable Futures in Binance API Management and ensure this key can trade USD-M Futures.',
        };
      }
      return {
        ok: false,
        reason_code: reasonCode,
        message: sanitize(msg),
      };
    }
  }

  if (exchange === 'bybit' && marketType === 'spot') {
    try {
      const creds: bybit.BybitCredentials = {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        environment,
      };
      await bybit.getWalletBalance(creds);
      return { ok: true, message: 'Spot permissions OK' };
    } catch (e) {
      const err = e as Error & { bybitReasonCode?: string };
      const reasonCode = err.bybitReasonCode ?? 'INVALID_KEY';
      return {
        ok: false,
        reason_code: reasonCode === 'EXCHANGE_ERROR' ? 'INVALID_KEY' : reasonCode,
        message: sanitize(err.message ?? 'Connection failed'),
      };
    }
  }

  if (exchange === 'bybit' && marketType === 'futures') {
    try {
      const creds: bybitFutures.BybitFuturesCredentials = {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        environment,
      };
      await bybitFutures.getAccountSummary(creds);
      return { ok: true, message: 'Futures permissions OK' };
    } catch (e) {
      const err = e as Error & { bybitReasonCode?: string };
      const reasonCode = err.bybitReasonCode ?? 'INVALID_KEY';
      const mapped = reasonCode === 'PERMISSION_DENIED' || reasonCode === 'EXCHANGE_ERROR' ? 'FUTURES_NOT_ENABLED' : reasonCode;
      return {
        ok: false,
        reason_code: mapped === 'EXCHANGE_ERROR' ? 'INVALID_KEY' : mapped,
        message: sanitize(err.message ?? 'Connection failed'),
      };
    }
  }

  return { ok: false, reason_code: 'INVALID_KEY', message: 'Unsupported exchange or market type' };
}
