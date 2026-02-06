import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 500 requests per 15 minutes per IP (configurable via API_RATE_LIMIT_MAX).
 * Admin routes are excluded so they only count against adminLimiter.
 * SPA navigation + TopBar + page data often triggers 10–20 requests per view.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Math.min(2000, Math.max(200, parseInt(process.env.API_RATE_LIMIT_MAX || '500', 10) || 500)),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/admin'),
});

/**
 * Stricter rate limiter for authentication endpoints
 * 20 requests per 15 minutes per IP for login/signup-style requests.
 * GET /api/auth/me (session check, "Test Connection") is skipped so it doesn't burn this limit.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes for POST/PUT/DELETE
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET', // GET /me and other read-only auth checks don't count
});

/**
 * Rate limiter for admin endpoints (dashboard: many tabs × multiple requests per tab)
 * Default 500/15min; override with ADMIN_RATE_LIMIT_MAX env. Discounts tab alone triggers 4+ parallel calls.
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.min(2000, Math.max(100, parseInt(process.env.ADMIN_RATE_LIMIT_MAX || '500', 10) || 500)),
  message: 'Too many admin requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for exchange connection attempts (test + save)
 * 10 attempts per 15 minutes per IP to prevent credential stuffing
 */
export const exchangeConnectionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many connection attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
