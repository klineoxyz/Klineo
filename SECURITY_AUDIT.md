# KLINEO — Full-Stack Security Audit
**Date:** 2026-01-25  
**Auditor:** AI Security Review  
**Context:** Real-money copy trading platform  
**Status:** ⚠️ **CRITICAL ISSUES FOUND** — Do not deploy to production without fixes

---

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

### 1. **CORS Fallback Allows Any Origin**
**File:** `backend-skeleton/src/index.ts:15`  
**Severity:** 🔴 CRITICAL  
**Issue:** If `FRONTEND_URL` is not set, CORS falls back to `'https://klineo.vercel.app'`, but this is a soft failure. An attacker could potentially exploit this if env var is misconfigured.

**Current Code:**
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://klineo.vercel.app',
  credentials: true
}));
```

**Fix:**
```typescript
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.error('FATAL: FRONTEND_URL environment variable is required');
  process.exit(1);
}

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
}));
```

**Impact:** Without this, if `FRONTEND_URL` is missing, the backend might accept requests from any origin in some configurations.

---

### 2. **No Rate Limiting**
**File:** `backend-skeleton/src/index.ts`  
**Severity:** 🔴 CRITICAL  
**Issue:** No rate limiting on any endpoints. Attackers can:
- Brute force `/api/auth/me` to enumerate users
- Spam admin endpoints
- DDoS the backend

**Fix Required:**
```bash
cd backend-skeleton
npm install express-rate-limit
```

**Add to `backend-skeleton/src/index.ts`:**
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
```

---

### 3. **Error Logging May Leak Sensitive Data**
**File:** `backend-skeleton/src/index.ts:40`, `backend-skeleton/src/middleware/auth.ts:84`  
**Severity:** 🔴 CRITICAL  
**Issue:** `console.error('Error:', err)` may log full error objects containing:
- Database connection strings
- User tokens
- Stack traces with file paths

**Current Code:**
```typescript
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

**Fix:**
```typescript
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log sanitized error (no sensitive data)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  res.status(500).json({ error: 'Internal server error' });
});
```

**Also fix in `auth.ts:84`:**
```typescript
} catch (err) {
  // Don't log the full error object (may contain tokens)
  console.error('JWT verification failed:', err instanceof Error ? err.message : 'Unknown error');
  return res.status(401).json({ error: 'Token verification failed' });
}
```

---

### 4. **No Input Validation**
**File:** `backend-skeleton/src/routes/admin.ts`  
**Severity:** 🔴 CRITICAL  
**Issue:** Admin endpoints accept user input without validation:
- `PUT /api/admin/users/:id` — `status` field not validated
- `PUT /api/admin/traders/:id` — `status` field not validated
- `POST /api/admin/coupons` — No validation on discount, maxRedemptions, etc.
- SQL injection risk in search queries (though Supabase client should protect)

**Fix Required:**
```bash
cd backend-skeleton
npm install express-validator zod
```

**Example fix for user suspension:**
```typescript
import { body, param, validationResult } from 'express-validator';

adminRouter.put('/users/:id', 
  param('id').isUUID(),
  body('status').isIn(['active', 'suspended', 'banned']),
  body('reason').optional().isString().isLength({ max: 500 }),
  async (req: AuthenticatedRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... rest of handler
  }
);
```

---

## 🟠 HIGH PRIORITY ISSUES

### 5. **ADMIN_EMAILS Bypass Could Be Risky**
**File:** `backend-skeleton/src/middleware/auth.ts:68-74`  
**Severity:** 🟠 HIGH  
**Issue:** If `ADMIN_EMAILS` env var contains `mmxinthi@gmail.com`, any user with that email gets admin access even if their DB role is 'user'. This is intentional but should be documented and audited.

**Recommendation:**
- Document this behavior clearly
- Add audit logging when email-based admin elevation occurs
- Consider removing this bypass and requiring DB role = 'admin' only

**Fix (optional — make email bypass explicit):**
```typescript
// Only elevate if explicitly configured AND user is not already admin
const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
  
if (role !== 'admin' && adminEmails.length > 0 && adminEmails.includes((user.email ?? '').toLowerCase())) {
  console.warn(`[SECURITY] Admin elevation via email for: ${user.email}`);
  role = 'admin';
}
```

---

### 6. **Health Endpoint Exposes Service Name**
**File:** `backend-skeleton/src/routes/health.ts:8`  
**Severity:** 🟠 HIGH  
**Issue:** Returns `service: 'klineo-api'` which is fine, but ensure no secrets are ever added here.

**Current Code (OK, but document):**
```typescript
healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'klineo-api',
    timestamp: new Date().toISOString()
  });
});
```

**Recommendation:** Add comment that this endpoint must NEVER expose:
- Database URLs
- API keys
- Internal IPs
- Version numbers (security through obscurity)

---

### 7. **No Request Size Limits**
**File:** `backend-skeleton/src/index.ts:18`  
**Severity:** 🟠 HIGH  
**Issue:** `express.json()` has no size limit. Attackers could send huge payloads.

**Fix:**
```typescript
app.use(express.json({ limit: '10mb' })); // Set reasonable limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

---

### 8. **Frontend: Dev Login Button Visible in Production Build**
**File:** `src/app/components/auth/LoginPage.tsx:42`  
**Severity:** 🟠 HIGH  
**Issue:** While properly gated with `!import.meta.env.PROD`, if Vite build misconfigures `PROD`, button could appear.

**Current Code (OK, but verify):**
```typescript
const showQuickDevLogin = !import.meta.env.PROD && !!devEmail && !!devPassword;
```

**Recommendation:** Add explicit check:
```typescript
const showQuickDevLogin = 
  import.meta.env.MODE === 'development' && 
  !import.meta.env.PROD && 
  !!devEmail && 
  !!devPassword;
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. **No Request ID/Correlation Tracking**
**File:** `backend-skeleton/src/index.ts`  
**Severity:** 🟡 MEDIUM  
**Issue:** Hard to trace requests across logs without correlation IDs.

**Fix:**
```typescript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

---

### 10. **SQL Injection Risk in Search (Low, but verify)**
**File:** `backend-skeleton/src/routes/admin.ts:92`  
**Severity:** 🟡 MEDIUM  
**Issue:** Search query uses `.or()` with string interpolation. Supabase client should sanitize, but verify.

**Current Code:**
```typescript
if (search) {
  query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,username.ilike.%${search}%`);
}
```

**Recommendation:** Add input sanitization:
```typescript
if (search) {
  // Sanitize: remove special chars that could break query
  const sanitized = search.replace(/[%_\\]/g, '');
  if (sanitized.length > 0 && sanitized.length <= 100) {
    query = query.or(`email.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`);
  }
}
```

---

### 11. **No HTTPS Enforcement**
**File:** `backend-skeleton/src/index.ts`  
**Severity:** 🟡 MEDIUM  
**Issue:** Backend doesn't enforce HTTPS (Railway should handle this, but add middleware as defense-in-depth).

**Fix (if needed):**
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.status(403).json({ error: 'HTTPS required' });
    }
    next();
  });
}
```

---

### 12. **Frontend: API Base URL Not Validated**
**File:** `src/lib/api.ts:8`  
**Severity:** 🟡 MEDIUM  
**Issue:** If `VITE_API_BASE_URL` is set to a malicious URL, frontend would call it.

**Recommendation:** Add validation in production:
```typescript
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

if (import.meta.env.PROD) {
  // In production, ensure baseURL is from allowed domains
  const allowedDomains = ['https://klineo-api.railway.app', 'https://api.klineo.xyz'];
  if (baseURL && !allowedDomains.some(domain => baseURL.startsWith(domain))) {
    console.error('Invalid VITE_API_BASE_URL in production');
    throw new Error('API configuration error');
  }
}
```

---

## ✅ WHAT IS CORRECT

1. ✅ **Supabase Auth Integration:** Real auth, not mock
2. ✅ **Session Persistence:** `getSession()` on mount, `onAuthStateChange` listener
3. ✅ **Bearer Token Attach:** API client correctly attaches `Authorization: Bearer <token>`
4. ✅ **Protected Routes:** Unauthenticated users redirected to login
5. ✅ **Admin Gating:** Admin routes check `isAdmin` from backend
6. ✅ **Dev Bypasses Gated:** Quick Dev Login and UI States Demo only in dev
7. ✅ **Service Role Server-Only:** Never used in frontend
8. ✅ **RLS Enabled:** All tables have RLS policies
9. ✅ **.gitignore:** Properly excludes `.env*` files
10. ✅ **Server Binding:** Binds to `0.0.0.0` for Railway
11. ✅ **Error Handling:** 401 triggers logout, errors are caught

---

## 📋 GO-LIVE CHECKLIST

### Before Production Deployment:

- [ ] **Fix Critical Issues 1-4** (CORS, rate limiting, error logging, input validation)
- [ ] **Set Environment Variables:**
  - [ ] `FRONTEND_URL` = `https://klineo.xyz` (backend)
  - [ ] `VITE_API_BASE_URL` = Railway backend URL (frontend)
  - [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (frontend)
  - [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (backend)
  - [ ] `ADMIN_EMAILS` = `mmxinthi@gmail.com` (backend)
- [ ] **Verify CORS:** Test that only `https://klineo.xyz` can call backend
- [ ] **Test Rate Limiting:** Verify 100+ requests from same IP are blocked
- [ ] **Verify Admin Access:** Test that only `mmxinthi@gmail.com` with admin role can access `/api/admin/*`
- [ ] **Test Session Persistence:** Login, refresh page, verify still logged in
- [ ] **Test Logout:** Verify session cleared, redirect to login
- [ ] **Verify RLS:** Test that user A cannot read user B's profile via Supabase client
- [ ] **Check Logs:** Ensure no secrets appear in Railway/Vercel logs
- [ ] **Remove Dev Features:** Verify Quick Dev Login and UI States Demo not in production build
- [ ] **HTTPS:** Verify all requests use HTTPS
- [ ] **Backup:** Ensure Supabase database has backups enabled

---

## 🔧 EXACT FIXES (File Diffs)

### Fix 1: CORS Hard Failure

**File:** `backend-skeleton/src/index.ts`

```diff
--- a/backend-skeleton/src/index.ts
+++ b/backend-skeleton/src/index.ts
@@ -10,10 +10,16 @@ dotenv.config();
 const app = express();
 const PORT = process.env.PORT || 3000;
 
+// Validate required environment variables
+const FRONTEND_URL = process.env.FRONTEND_URL;
+if (!FRONTEND_URL) {
+  console.error('FATAL: FRONTEND_URL environment variable is required');
+  process.exit(1);
+}
+
 // Middleware
 app.use(cors({
-  origin: process.env.FRONTEND_URL || 'https://klineo.vercel.app',
+  origin: FRONTEND_URL,
   credentials: true,
+  optionsSuccessStatus: 200
 }));
```

### Fix 2: Add Rate Limiting

**File:** `backend-skeleton/package.json`

```diff
--- a/backend-skeleton/package.json
+++ b/backend-skeleton/package.json
@@ -16,6 +16,7 @@
     "@supabase/supabase-js": "^2.91.1",
     "cors": "^2.8.5",
     "dotenv": "^16.3.1",
+    "express-rate-limit": "^7.1.5",
     "express": "^4.18.2"
   },
```

**File:** `backend-skeleton/src/index.ts`

```diff
--- a/backend-skeleton/src/index.ts
+++ b/backend-skeleton/src/index.ts
@@ -1,5 +1,6 @@
 import express from 'express';
 import cors from 'cors';
+import rateLimit from 'express-rate-limit';
 import dotenv from 'dotenv';
 import { healthRouter } from './routes/health.js';
 import { authRouter } from './routes/auth-with-supabase.js';
@@ -18,6 +19,20 @@ app.use(cors({
   optionsSuccessStatus: 200
 }));
 app.use(express.json());
+
+// Rate limiting
+const apiLimiter = rateLimit({
+  windowMs: 15 * 60 * 1000, // 15 minutes
+  max: 100, // Limit each IP to 100 requests per windowMs
+  message: 'Too many requests from this IP, please try again later.',
+  standardHeaders: true,
+  legacyHeaders: false,
+});
+
+const authLimiter = rateLimit({
+  windowMs: 15 * 60 * 1000,
+  max: 20, // 20 requests per 15 minutes
+  message: 'Too many authentication attempts, please try again later.',
+});
+
+app.use('/api/auth', authLimiter);
+app.use('/api', apiLimiter);
```

### Fix 3: Sanitize Error Logging

**File:** `backend-skeleton/src/index.ts`

```diff
--- a/backend-skeleton/src/index.ts
+++ b/backend-skeleton/src/index.ts
@@ -38,7 +38,14 @@
 
 // Error handler
 app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
-  console.error('Error:', err);
+  // Log sanitized error (no sensitive data)
+  console.error('Error:', {
+    message: err.message,
+    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
+    path: req.path,
+    method: req.method,
+    timestamp: new Date().toISOString(),
+  });
   res.status(500).json({ error: 'Internal server error' });
 });
```

**File:** `backend-skeleton/src/middleware/auth.ts`

```diff
--- a/backend-skeleton/src/middleware/auth.ts
+++ b/backend-skeleton/src/middleware/auth.ts
@@ -81,7 +81,7 @@
     next();
   } catch (err) {
-    console.error('JWT verification error:', err);
+    console.error('JWT verification failed:', err instanceof Error ? err.message : 'Unknown error');
     return res.status(401).json({ error: 'Token verification failed' });
   }
 }
```

### Fix 4: Add Input Validation

**File:** `backend-skeleton/package.json`

```diff
--- a/backend-skeleton/package.json
+++ b/backend-skeleton/package.json
@@ -16,6 +16,7 @@
     "@supabase/supabase-js": "^2.91.1",
     "cors": "^2.8.5",
     "dotenv": "^16.3.1",
+    "express-validator": "^7.0.1",
     "express-rate-limit": "^7.1.5",
     "express": "^4.18.2"
   },
```

**File:** `backend-skeleton/src/routes/admin.ts`

```diff
--- a/backend-skeleton/src/routes/admin.ts
+++ b/backend-skeleton/src/routes/admin.ts
@@ -1,5 +1,6 @@
 import { Router } from 'express';
 import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
+import { body, param, validationResult } from 'express-validator';
 import { createClient, SupabaseClient } from '@supabase/supabase-js';
 
 // ... existing code ...
@@ -250,7 +251,12 @@
 /**
  * PUT /api/admin/traders/:id
  * Update trader status (approve/reject)
  */
-adminRouter.put('/traders/:id', async (req, res) => {
+adminRouter.put('/traders/:id', 
+  param('id').isUUID(),
+  body('status').isIn(['approved', 'rejected', 'pending']),
+  async (req, res) => {
+    const errors = validationResult(req);
+    if (!errors.isEmpty()) {
+      return res.status(400).json({ errors: errors.array() });
+    }
   const client = getSupabase();
   // ... rest of handler
 });
```

---

## 📊 SUMMARY

**Total Issues Found:** 12
- 🔴 **Critical:** 4 (must fix before production)
- 🟠 **High:** 4 (fix soon)
- 🟡 **Medium:** 4 (nice to have)

**Estimated Fix Time:** 2-3 hours

**Risk Level:** ⚠️ **HIGH** — Do not deploy to production without fixing Critical issues.

---

## 🚀 NEXT STEPS

1. Apply all Critical fixes (1-4)
2. Test fixes locally
3. Deploy to staging
4. Run go-live checklist
5. Deploy to production

---

**Audit Complete.** Review all findings and apply fixes before production deployment.
