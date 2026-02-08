#!/usr/bin/env node
/**
 * KLINEO Production Smoke Test
 * 
 * Tests all critical endpoints on production URLs.
 * 
 * Usage:
 *   node scripts/smoke-prod.mjs
 * 
 * Required env vars:
 *   BACKEND_URL=https://klineo-production-1dfe.up.railway.app
 *   FRONTEND_URL=https://www.klineo.xyz
 *   SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
 *   TEST_USER_EMAIL=test@example.com
 *   TEST_USER_PASSWORD=your-password
 *   ADMIN_EMAIL=mmxinthi@gmail.com
 *   ADMIN_PASSWORD=your-admin-password
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const BACKEND_URL = process.env.BACKEND_URL || 'https://klineo-production-1dfe.up.railway.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.klineo.xyz';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mmxinthi@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const results = {
  passed: [],
  failed: [],
  skipped: []
};

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'skip' ? '⏭️' : 'ℹ️';
  console.log(`${prefix} ${message}`);
}

async function test(name, fn) {
  try {
    await fn();
    results.passed.push(name);
    log(name, 'pass');
    return true;
  } catch (err) {
    results.failed.push({ name, error: err.message });
    log(`${name}: ${err.message}`, 'fail');
    return false;
  }
}

async function skip(name, reason) {
  results.skipped.push({ name, reason });
  log(`${name}: ${reason}`, 'skip');
}

// Initialize Supabase
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('\n🚀 KLINEO Production Smoke Test\n');
console.log(`Backend: ${BACKEND_URL}`);
console.log(`Frontend: ${FRONTEND_URL}`);
console.log(`Supabase: ${SUPABASE_URL}\n`);

// Test 1: Health check
await test('GET /health', async () => {
  const res = await fetch(`${BACKEND_URL}/health`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error('Status not ok');
  if (data.environment !== 'production') throw new Error('Not production environment');
});

// Test 2: Public traders endpoint
await test('GET /api/traders (public)', async () => {
  const res = await fetch(`${BACKEND_URL}/api/traders?limit=10`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.traders)) throw new Error('Invalid response format');
});

// Test 3: Authenticated endpoints (if test user provided)
let testUserToken = null;
if (TEST_USER_EMAIL && TEST_USER_PASSWORD) {
  await test('Login test user', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('No session');
    testUserToken = data.session.access_token;
  });

  if (testUserToken) {
    const headers = { Authorization: `Bearer ${testUserToken}` };

    await test('GET /api/me/profile', async () => {
      const res = await fetch(`${BACKEND_URL}/api/me/profile`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!data.id || !data.email) throw new Error('Invalid profile');
    });

    await test('GET /api/copy-setups', async () => {
      const res = await fetch(`${BACKEND_URL}/api/copy-setups`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.copySetups)) throw new Error('Invalid response');
    });

    await test('GET /api/positions', async () => {
      const res = await fetch(`${BACKEND_URL}/api/positions?page=1&limit=10`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.positions)) throw new Error('Invalid response');
    });

    await test('GET /api/orders', async () => {
      const res = await fetch(`${BACKEND_URL}/api/orders?page=1&limit=10`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.orders)) throw new Error('Invalid response');
    });

    await test('GET /api/trades', async () => {
      const res = await fetch(`${BACKEND_URL}/api/trades?page=1&limit=10`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.trades)) throw new Error('Invalid response');
    });

    await test('GET /api/notifications', async () => {
      const res = await fetch(`${BACKEND_URL}/api/notifications?limit=10`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.notifications)) throw new Error('Invalid response');
    });

    await test('GET /api/portfolio/summary', async () => {
      const res = await fetch(`${BACKEND_URL}/api/portfolio/summary`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (typeof data.totalEquity !== 'number') throw new Error('Invalid response');
    });

    // Payment intent flow: create -> submit (test user; admin approves later)
    await test('POST /api/payments/intents (create joining_fee)', async () => {
      const res = await fetch(`${BACKEND_URL}/api/payments/intents`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'joining_fee' }),
      });
      if (res.status === 503) throw new Error('Manual payments disabled');
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (!data.intent?.id) throw new Error('Invalid response');
      global.__smokeIntentId = data.intent.id;
    });

    await test('POST /api/payments/intents/:id/submit', async () => {
      const id = global.__smokeIntentId;
      if (!id) throw new Error('No intent from create step');
      const res = await fetch(`${BACKEND_URL}/api/payments/intents/${id}/submit`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_hash: '0x0000000000000000000000000000000000000000000000000000000000000001', from_wallet: '0x0000000000000000000000000000000000000001' }),
      });
      if (res.status === 503) throw new Error('Manual payments disabled');
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (data.status !== 'pending_review' && data.status !== 'flagged') throw new Error(`Expected pending_review, got ${data.status}`);
    });

    // Copy setup: create -> pause -> resume (requires trader + allowance)
    const tradersRes = await fetch(`${BACKEND_URL}/api/traders?limit=1`);
    const tradersData = tradersRes.ok ? await tradersRes.json() : { traders: [] };
    const traderId = tradersData.traders?.[0]?.id;
    if (traderId) {
      await test('POST /api/copy-setups (create)', async () => {
        const res = await fetch(`${BACKEND_URL}/api/copy-setups`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ traderId, allocationPct: 50 }),
        });
        if (res.status === 402) {
          global.__smokeCopySetupId = null;
          throw new Error('Allowance required (expected for new user; skip pause/resume)');
        }
        if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
        const data = await res.json();
        if (!data.id) throw new Error('Invalid response');
        global.__smokeCopySetupId = data.id;
      });
      const setupId = global.__smokeCopySetupId;
      if (setupId) {
        await test('PUT /api/copy-setups/:id (pause)', async () => {
          const res = await fetch(`${BACKEND_URL}/api/copy-setups/${setupId}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paused' }),
          });
          if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
        });
        await test('PUT /api/copy-setups/:id (resume)', async () => {
          const res = await fetch(`${BACKEND_URL}/api/copy-setups/${setupId}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' }),
          });
          if (res.status === 402) throw new Error('Allowance exhausted (expected)');
          if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
        });
      }
    } else {
      await skip('Copy setup flow', 'No approved trader');
    }

    // Test 403 for non-admin accessing admin endpoint
    await test('GET /api/admin/users (should 403 for non-admin)', async () => {
      const res = await fetch(`${BACKEND_URL}/api/admin/users`, { headers });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });
  }
} else {
  await skip('Authenticated endpoints', 'TEST_USER_EMAIL and TEST_USER_PASSWORD not set');
}

// Test 4: Admin endpoints (if admin credentials provided)
let adminToken = null;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  await test('Login admin user', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('No session');
    adminToken = data.session.access_token;
  });

  if (adminToken) {
    const headers = { Authorization: `Bearer ${adminToken}` };

    await test('GET /api/admin/users (admin)', async () => {
      const res = await fetch(`${BACKEND_URL}/api/admin/users?page=1&limit=10`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.users)) throw new Error('Invalid response');
    });

    await test('GET /api/admin/traders (admin)', async () => {
      const res = await fetch(`${BACKEND_URL}/api/admin/traders`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.traders)) throw new Error('Invalid response');
    });

    await test('GET /api/admin/stats (admin)', async () => {
      const res = await fetch(`${BACKEND_URL}/api/admin/stats`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (typeof data.totalUsers !== 'number') throw new Error('Invalid response');
    });

    // Admin approve payment intent (created by test user above; requires ENABLE_MANUAL_PAYMENTS)
    const intentId = global.__smokeIntentId;
    if (intentId) {
      await test('POST /api/admin/payments/intents/:id/approve', async () => {
        const res = await fetch(`${BACKEND_URL}/api/admin/payments/intents/${intentId}/approve`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: 'Smoke test' }),
        });
        if (res.status === 503) throw new Error('Manual payments disabled');
        if (res.status === 409) throw new Error('Intent already approved (race)');
        if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      });
    }

    // Exchange connections (admin can list for self; full flow uses test user)
    await test('GET /api/exchange-connections (admin)', async () => {
      const res = await fetch(`${BACKEND_URL}/api/exchange-connections`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.connections)) throw new Error('Invalid response');
    });

    // --- Kill switch E2E: admin enable → order/execute-tick return 423 → admin disable → no 423 ---
    await test('GET /api/admin/platform-settings/kill-switch-global', async () => {
      const res = await fetch(`${BACKEND_URL}/api/admin/platform-settings/kill-switch-global`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (typeof data.enabled !== 'boolean') throw new Error('Invalid response');
    });

    await test('PATCH /api/admin/platform-settings/kill-switch-global (enable)', async () => {
      const res = await fetch(`${BACKEND_URL}/api/admin/platform-settings/kill-switch-global`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (data.enabled !== true) throw new Error('Expected enabled true');
    });

    if (testUserToken) {
      await test('Futures order returns 423 when kill switch ON', async () => {
        const userHeaders = { Authorization: `Bearer ${testUserToken}` };
        const connRes = await fetch(`${BACKEND_URL}/api/exchange-connections`, { headers: userHeaders });
        const connData = connRes.ok ? await connRes.json() : { connections: [] };
        const connId = connData.connections?.[0]?.id;
        if (!connId) throw new Error('No exchange connection (need one to assert 423)');
        const res = await fetch(`${BACKEND_URL}/api/futures/order`, {
          method: 'POST',
          headers: { ...userHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: connId, symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quoteSizeUsdt: 1 }),
        });
        if (res.status !== 423) throw new Error(`Expected 423 when kill switch ON, got ${res.status}`);
      });

      await test('Execute-tick returns 423 when kill switch ON (or skip if no active strategy)', async () => {
        const userHeaders = { Authorization: `Bearer ${testUserToken}` };
        const listRes = await fetch(`${BACKEND_URL}/api/strategies`, { headers: userHeaders });
        const listData = listRes.ok ? await listRes.json() : { strategies: [] };
        const active = (listData.strategies || []).find((s) => s.status === 'active');
        const runId = active?.id;
        if (!runId) return;
        const res = await fetch(`${BACKEND_URL}/api/strategies/${runId}/execute-tick`, {
          method: 'POST',
          headers: userHeaders,
        });
        if (res.status !== 423) throw new Error(`Expected 423 when kill switch ON, got ${res.status}`);
      });
    } else {
      await skip('Kill switch 423 (futures/execute-tick)', 'TEST_USER credentials not set');
    }

    await test('PATCH /api/admin/platform-settings/kill-switch-global (disable)', async () => {
      const res = await fetch(`${BACKEND_URL}/api/admin/platform-settings/kill-switch-global`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (data.enabled !== false) throw new Error('Expected enabled false');
    });

    if (testUserToken) {
      await test('Futures order no longer returns 423 when kill switch OFF', async () => {
        const userHeaders = { Authorization: `Bearer ${testUserToken}` };
        const connRes = await fetch(`${BACKEND_URL}/api/exchange-connections`, { headers: userHeaders });
        const connData = connRes.ok ? await connRes.json() : { connections: [] };
        const connId = connData.connections?.[0]?.id;
        if (!connId) throw new Error('No exchange connection');
        const res = await fetch(`${BACKEND_URL}/api/futures/order`, {
          method: 'POST',
          headers: { ...userHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: connId, symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quoteSizeUsdt: 1 }),
        });
        if (res.status === 423) throw new Error('Unexpected 423 when kill switch OFF');
      });

      await test('Execute-tick no longer returns 423 when kill switch OFF (or skip if no active strategy)', async () => {
        const userHeaders = { Authorization: `Bearer ${testUserToken}` };
        const listRes = await fetch(`${BACKEND_URL}/api/strategies`, { headers: userHeaders });
        const listData = listRes.ok ? await listRes.json() : { strategies: [] };
        const active = (listData.strategies || []).find((s) => s.status === 'active');
        const runId = active?.id;
        if (!runId) return;
        const res = await fetch(`${BACKEND_URL}/api/strategies/${runId}/execute-tick`, {
          method: 'POST',
          headers: userHeaders,
        });
        if (res.status === 423) throw new Error('Unexpected 423 when kill switch OFF');
      });
    } else {
      await skip('Kill switch no 423 (futures/execute-tick)', 'TEST_USER credentials not set');
    }
  }
} else {
  await skip('Admin endpoints', 'ADMIN_EMAIL and ADMIN_PASSWORD not set');
}

// Summary
console.log('\n📊 Test Summary\n');
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⏭️  Skipped: ${results.skipped.length}\n`);

if (results.failed.length > 0) {
  console.log('❌ Failed Tests:');
  results.failed.forEach(({ name, error }) => {
    console.log(`   - ${name}: ${error}`);
  });
  console.log('');
}

if (results.failed.length > 0) {
  console.log('❌ Some tests failed');
  process.exit(1);
}
if (results.skipped.length > 0) {
  console.log('⚠️  Partial run: auth/admin tests skipped (set TEST_USER_EMAIL, TEST_USER_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD for full suite).');
  process.exit(0);
}
console.log('✅ All tests passed!');
process.exit(0);
