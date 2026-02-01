import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { runDueStrategies } from './lib/strategyRunner.js';
import { RUNNER_CONFIG, logRunnerConfig } from './lib/runnerConfig.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth-with-supabase.js';
import { adminRouter } from './routes/admin.js';
import { tradersRouter } from './routes/traders.js';
import { profileRouter } from './routes/profile.js';
import { copySetupsRouter } from './routes/copy-setups.js';
import { portfolioRouter } from './routes/portfolio.js';
import { positionsRouter } from './routes/positions.js';
import { ordersRouter } from './routes/orders.js';
import { tradesRouter } from './routes/trades.js';
import { notificationsRouter } from './routes/notifications.js';
import { selfTestRouter } from './routes/self-test.js';
import { exchangeConnectionsRouter } from './routes/exchange-connections.js';
import { strategiesRouter } from './routes/strategies.js';
import { strategiesRunnerRouter } from './routes/strategies-runner.js';
import { futuresRouter } from './routes/futures.js';
import { purchasesRouter } from './routes/purchases.js';
import { billingRouter } from './routes/billing.js';
import { entitlementsRouter } from './routes/entitlements.js';
import { entitlementsMeRouter } from './routes/entitlements-me.js';
import { coinpaymentsRouter } from './routes/coinpayments.js';
import { referralsRouter } from './routes/referrals.js';
import { paymentIntentsRouter, validateCouponHandler } from './routes/payment-intents.js';
import { launchRouter } from './routes/launch.js';
import { verifySupabaseJWT } from './middleware/auth.js';
import { apiLimiter, authLimiter, adminLimiter } from './middleware/rateLimit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Required backend environment variables (Railway). No values logged.
const FRONTEND_URL = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : undefined);
const runnerEnabled = process.env.ENABLE_STRATEGY_RUNNER === 'true';
const REQUIRED: Record<string, boolean> = {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
  FRONTEND_URL: !!FRONTEND_URL,
  NODE_ENV: !!process.env.NODE_ENV,
  ADMIN_EMAILS: !!process.env.ADMIN_EMAILS,
  ENABLE_MANUAL_PAYMENTS: !!process.env.ENABLE_MANUAL_PAYMENTS,
  ENABLE_STRATEGY_RUNNER: !!process.env.ENABLE_STRATEGY_RUNNER,
};
if (runnerEnabled) {
  REQUIRED.RUNNER_CRON_SECRET = !!process.env.RUNNER_CRON_SECRET;
}

const missing = Object.entries(REQUIRED).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.error('FATAL: Missing required environment variables:', missing.join(', '));
  console.error('Required (Railway): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY, FRONTEND_URL, NODE_ENV, ADMIN_EMAILS, ENABLE_MANUAL_PAYMENTS, ENABLE_STRATEGY_RUNNER');
  if (runnerEnabled) {
    console.error('When ENABLE_STRATEGY_RUNNER=true also required: RUNNER_CRON_SECRET');
  }
  process.exit(1);
}

// FRONTEND_URL is defined here (startup exits above if missing)
const frontendUrl: string = FRONTEND_URL!;

// Safe startup checklist (no secrets, no values)
console.log('[Config] Startup checklist (safe):');
console.log('  SUPABASE_URL: present');
console.log('  SUPABASE_SERVICE_ROLE_KEY: present');
console.log('  ENCRYPTION_KEY: present');
console.log('  FRONTEND_URL: present');
console.log('  NODE_ENV: present');
console.log('  ADMIN_EMAILS: present');
console.log('  ENABLE_MANUAL_PAYMENTS: present');
console.log('  ENABLE_STRATEGY_RUNNER: present');
if (runnerEnabled) {
  console.log('  RUNNER_CRON_SECRET: present');
}

logRunnerConfig();

// Support both www and non-www domains for CORS
const corsOrigins: string[] = [frontendUrl];
if (frontendUrl.startsWith('https://') && !frontendUrl.includes('www.')) {
  corsOrigins.push(frontendUrl.replace('https://', 'https://www.'));
} else if (frontendUrl.startsWith('https://www.')) {
  corsOrigins.push(frontendUrl.replace('https://www.', 'https://'));
}

// Request ID middleware (adds X-Request-ID header and includes in logs)
app.use((req, res, next) => {
  const requestId = randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Trust Railway proxy (for rate limiting to work correctly)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

// IPN webhook must verify HMAC using exact raw body; capture before global parsers consume it
app.use(
  '/api/payments/coinpayments/ipn',
  express.raw({ type: 'application/x-www-form-urlencoded', limit: '64kb' }),
  (req, res, next) => {
    (req as any).rawBody = req.body;
    next();
  }
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api', apiLimiter);

// Request logging (includes request ID)
app.use((req, res, next) => {
  const requestId = (req as any).requestId || 'unknown';
  const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/traders', tradersRouter);
app.use('/api/me', profileRouter);
app.use('/api/copy-setups', copySetupsRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/self-test', selfTestRouter);
app.use('/api/exchange-connections', exchangeConnectionsRouter);
app.use('/api/strategies', strategiesRouter);
app.use('/api/runner', strategiesRunnerRouter);
app.use('/api/futures', futuresRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/payments/coinpayments', coinpaymentsRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/launch', launchRouter);
app.get('/api/payments/validate-coupon', verifySupabaseJWT, ...validateCouponHandler);
app.use('/api/payments/intents', paymentIntentsRouter);
app.use('/api/entitlement', entitlementsRouter);
app.use('/api/entitlements', entitlementsMeRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = (req as any).requestId || 'unknown';
  // Log sanitized error (no sensitive data) with request ID
  console.error(`[${requestId}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  res.status(500).json({ error: 'Internal server error', requestId });
});

// Start server (bind 0.0.0.0 for Railway/Docker)
const HOST = '0.0.0.0';
let runnerScheduled = false;

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 KLINEO Backend running on ${HOST}:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  if (RUNNER_CONFIG.ENABLE_STRATEGY_RUNNER) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const runnerClient = createClient(url, key);
      const intervalMs = RUNNER_CONFIG.RUNNER_TICK_INTERVAL_SEC * 1000;
      setInterval(async () => {
        if (runnerScheduled) return;
        runnerScheduled = true;
        try {
          const now = new Date();
          const summary = await runDueStrategies(runnerClient, now, { requestId: 'scheduler' });
          if (summary.ran > 0 || summary.blocked > 0 || summary.errors > 0) {
            console.log(`[runner] due: ran=${summary.ran} skipped=${summary.skipped} blocked=${summary.blocked} errors=${summary.errors}`);
          }
        } catch (err) {
          console.error('[runner] tick error:', err instanceof Error ? err.message : 'Unknown error');
        } finally {
          runnerScheduled = false;
        }
      }, intervalMs);
      console.log(`[runner] scheduler enabled (interval ${RUNNER_CONFIG.RUNNER_TICK_INTERVAL_SEC}s)`);
    } else {
      console.warn('[runner] ENABLE_STRATEGY_RUNNER=true but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    }
  }
});
