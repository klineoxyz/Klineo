import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
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
import { apiLimiter, authLimiter, adminLimiter } from './middleware/rateLimit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
const FRONTEND_URL = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : undefined);
if (!FRONTEND_URL) {
  console.error('FATAL: FRONTEND_URL environment variable is required');
  console.error('For local development, create backend-skeleton/.env with:');
  console.error('  FRONTEND_URL=http://localhost:5173');
  console.error('  SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

// Support both www and non-www domains for CORS
// If FRONTEND_URL is https://klineo.xyz, also allow https://www.klineo.xyz
const corsOrigins: string[] = [FRONTEND_URL];
if (FRONTEND_URL.startsWith('https://') && !FRONTEND_URL.includes('www.')) {
  // Add www version
  corsOrigins.push(FRONTEND_URL.replace('https://', 'https://www.'));
} else if (FRONTEND_URL.startsWith('https://www.')) {
  // Add non-www version
  corsOrigins.push(FRONTEND_URL.replace('https://www.', 'https://'));
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
app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 KLINEO Backend running on ${HOST}:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
