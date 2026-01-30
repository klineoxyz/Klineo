#!/usr/bin/env node
/**
 * One-shot script for Railway Cron: POST to backend /api/runner/cron with x-cron-secret.
 * Set env: BACKEND_URL (default below), RUNNER_CRON_SECRET (from Railway backend env).
 * Railway Cron Schedule: */5 * * * * (every 5 min). Run and exit.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://klineo-production-1dfe.up.railway.app';
const SECRET = process.env.RUNNER_CRON_SECRET;

if (!SECRET || typeof SECRET !== 'string' || !SECRET.trim()) {
  console.error('RUNNER_CRON_SECRET is not set');
  process.exit(1);
}

const url = `${BACKEND_URL.replace(/\/$/, '')}/api/runner/cron`;

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': SECRET.trim(),
      },
      body: '{}',
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`cron failed ${res.status}: ${text}`);
      process.exit(1);
    }
    const data = JSON.parse(text || '{}');
    console.log('cron ok:', data.ok, 'summary:', data.summary ? JSON.stringify(data.summary) : '');
    process.exit(0);
  } catch (err) {
    console.error('cron request error:', err.message);
    process.exit(1);
  }
})();
