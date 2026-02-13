/**
 * Simple email sending via Resend.
 * Set RESEND_API_KEY to enable.
 * Uses Resend's default sender (onboarding@resend.dev) so no domain verification is required.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = 'KLINEO <onboarding@resend.dev>';

if (!RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
  console.warn('[email] RESEND_API_KEY is not set. Master Trader application notification emails will not be sent. Add RESEND_API_KEY to your backend environment (e.g. .env or Railway).');
}

export async function sendMasterTraderApplicationCopy(params: {
  /** One or more recipient emails (e.g. always include klineoxyz@gmail.com) */
  to: string | string[];
  formData: {
    fullName: string;
    email: string;
    country: string;
    telegram: string | null;
    primaryExchange: string;
    yearsExperience: number;
    tradingStyle: string;
    preferredMarkets: string;
    avgMonthlyReturn: string | null;
    strategyDescription: string;
    whyMasterTrader: string;
    profileUrl: string | null;
  };
  proofUrl: string | null;
  applicationId: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set; skipping Master Trader application copy.');
    return { ok: false, error: 'Email not configured' };
  }

  const { formData, proofUrl, applicationId } = params;
  const toList = Array.isArray(params.to) ? params.to : [params.to];
  const tradingStyleLabels: Record<string, string> = {
    day: 'Day Trading',
    swing: 'Swing Trading',
    scalping: 'Scalping',
    position: 'Position Trading',
  };
  const marketsLabels: Record<string, string> = {
    spot: 'Spot Only',
    futures: 'Futures Only',
    both: 'Both Spot & Futures',
  };

  const rows = [
    ['Full Name', formData.fullName],
    ['Email', formData.email],
    ['Country', formData.country],
    ['Telegram', formData.telegram || '—'],
    ['Primary Exchange', formData.primaryExchange],
    ['Years of Experience', `${formData.yearsExperience} yrs`],
    ['Primary Trading Style', tradingStyleLabels[formData.tradingStyle] ?? formData.tradingStyle],
    ['Preferred Markets', marketsLabels[formData.preferredMarkets] ?? formData.preferredMarkets],
    ['Average Monthly Return (%)', formData.avgMonthlyReturn != null ? `${formData.avgMonthlyReturn}%` : '—'],
    ['TradingView / Profile URL', formData.profileUrl ? `<a href="${escapeHtml(formData.profileUrl)}">${escapeHtml(formData.profileUrl)}</a>` : '—'],
    ['Trading History Screenshot', proofUrl ? `<a href="${escapeHtml(proofUrl)}">View screenshot</a>` : '—'],
  ]
    .map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#666;">${escapeHtml(String(label))}</td><td style="padding:6px 0;">${value}</td></tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Master Trader Application</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px;">
  <h2 style="margin-top:0;">New Master Trader Application</h2>
  <p style="color:#666;">Application ID: ${escapeHtml(applicationId)}</p>
  <table style="width:100%;border-collapse:collapse;">${rows}</table>
  <h3 style="margin-top:24px;">Describe Your Trading Strategy *</h3>
  <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">${escapeHtml(formData.strategyDescription)}</p>
  <h3 style="margin-top:24px;">Why Do You Want to Become a Master Trader? *</h3>
  <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">${escapeHtml(formData.whyMasterTrader)}</p>
  ${proofUrl ? `<p style="margin-top:24px;"><a href="${escapeHtml(proofUrl)}">Open trading history screenshot</a></p>` : ''}
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: DEFAULT_FROM,
        to: toList,
        subject: `[KLINEO] Master Trader application: ${formData.fullName}`,
        html,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      console.error('[email] Resend error:', res.status, data);
      return { ok: false, error: (data as { message?: string }).message ?? 'Send failed' };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email] Send failed:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * Send a test Master Trader notification email to klineoxyz@gmail.com (for verifying Resend).
 * Uses sample form data so you can confirm the email layout and delivery.
 */
export async function sendMasterTraderTestEmail(): Promise<{ ok: boolean; error?: string }> {
  return sendMasterTraderApplicationCopy({
    to: 'klineoxyz@gmail.com',
    formData: {
      fullName: 'Test Applicant',
      email: 'test@example.com',
      country: 'United States',
      telegram: '@testuser',
      primaryExchange: 'Binance',
      yearsExperience: 3,
      tradingStyle: 'swing',
      preferredMarkets: 'futures',
      avgMonthlyReturn: '15',
      strategyDescription: 'This is a test application to verify that Master Trader notification emails are delivered to klineoxyz@gmail.com via Resend.',
      whyMasterTrader: 'Testing the email pipeline. You can ignore this message.',
      profileUrl: 'https://www.klineo.xyz',
    },
    proofUrl: null,
    applicationId: 'test-' + Date.now(),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
