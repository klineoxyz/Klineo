/**
 * CoinPayments API and IPN verification for KLINEO.
 * Security: No secrets in logs; HMAC verification for IPN.
 */

import crypto from 'crypto';

const COINPAYMENTS_API_BASE = process.env.COINPAYMENTS_API_BASE || 'https://a-api.coinpayments.net/api';

/** Header names CoinPayments may use for IPN HMAC (check both). */
const IPN_HMAC_HEADERS = ['hmac', 'x-coins-signature'] as const;

/**
 * Verify IPN request authenticity using HMAC-SHA256.
 * CoinPayments signs the exact raw POST body (application/x-www-form-urlencoded).
 * Uses raw body as received; header may be "Hmac" or "X-Coins-Signature".
 */
export function verifyIpnHmac(rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.COINPAYMENTS_IPN_SECRET;
  if (!secret || !signatureHeader || typeof signatureHeader !== 'string') return false;
  const trimmed = String(signatureHeader).trim();
  if (!trimmed || !/^[a-fA-F0-9]+$/.test(trimmed)) return false;
  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const sigBuf = Buffer.from(trimmed, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Resolve HMAC signature from request (check Hmac and X-Coins-Signature).
 */
export function getIpnHmacHeader(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  for (const name of IPN_HMAC_HEADERS) {
    const v = req.headers[name];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v) && v[0]) return String(v[0]).trim();
  }
  return undefined;
}

export const IPN_HMAC_HEADER = 'x-coins-signature';

/**
 * Create a charge/transaction via CoinPayments API.
 * Returns { paymentUrl, txnId } or throws.
 * Env: COINPAYMENTS_CLIENT_ID, COINPAYMENTS_CLIENT_SECRET, BASE_URL (for ipn_url).
 */
export async function createCoinPaymentsCharge(params: {
  amount: number;
  currency: string;
  ipnUrl: string;
  orderId?: string;
  buyerEmail?: string;
}): Promise<{ paymentUrl: string; txnId: string }> {
  const clientId = process.env.COINPAYMENTS_CLIENT_ID;
  const clientSecret = process.env.COINPAYMENTS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('CoinPayments credentials not configured');
  }

  const payload = {
    amount: params.amount,
    currency: params.currency,
    ipn_url: params.ipnUrl,
    ...(params.orderId && { order_id: params.orderId }),
    ...(params.buyerEmail && { buyer_email: params.buyerEmail }),
  };

  const url = `${COINPAYMENTS_API_BASE}/v1/charges`;
  const timestamp = new Date().toISOString();
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update([body, timestamp, clientId, url, 'POST'].join(''))
    .digest('hex');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Coins-Client-Id': clientId,
      'X-Coins-Timestamp': timestamp,
      'X-Coins-Signature': signature,
    },
    body,
  });

  const data = (await res.json()) as { data?: { payment_url?: string; id?: string }; error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `CoinPayments API error: ${res.status}`);
  }
  const paymentUrl = data?.data?.payment_url;
  const txnId = data?.data?.id;
  if (!paymentUrl || !txnId) {
    throw new Error('CoinPayments response missing payment_url or id');
  }
  return { paymentUrl, txnId };
}
