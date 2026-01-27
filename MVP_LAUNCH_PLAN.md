# KLINEO MVP Launch Plan

**Goal**: Ship MVP that supports real users safely with signup/login, roles/admin, profile settings, marketplace + trader profiles, copy setup persistence, basic portfolio/positions/orders/trades read, notifications, and admin management.

**Date**: January 26, 2026

---

## ✅ What is DONE

### Security (Fixed)
- ✅ CORS hard fail with FRONTEND_URL validation
- ✅ Rate limiting (apiLimiter, authLimiter, adminLimiter)
- ✅ Input validation middleware (uuidParam, statusBody, etc.)
- ✅ Sanitized logs (no tokens/secrets)
- ✅ JWT verification via Supabase
- ✅ Admin role check (database-driven with ADMIN_EMAILS fallback)

### Backend Infrastructure
- ✅ Express server with TypeScript
- ✅ Health check endpoint (`GET /health`)
- ✅ Auth middleware (`verifySupabaseJWT`, `requireAdmin`)
- ✅ Admin routes file exists with many endpoints
- ✅ Server binds to `0.0.0.0` and `PORT`
- ✅ Body size limit: 10mb
- ✅ Error handling middleware

### Database (Supabase)
- ✅ All migrations exist in `supabase/migrations/`
- ✅ RLS policies configured for all tables
- ✅ Tables: user_profiles, traders, trader_performance, copy_setups, positions, orders, trades, notifications, subscriptions, payments, referrals, audit_logs, coupons
- ✅ Auto-create profile trigger on signup

### Frontend
- ✅ Vite + React SPA
- ✅ Supabase auth integration
- ✅ API client (`src/lib/api.ts`) with Bearer token
- ✅ UI components for all screens
- ✅ Loading/error states infrastructure

---

## ❌ What is MISSING (Blocking MVP)

### Backend API Endpoints
- ❌ `GET /api/traders` (public, approved only)
- ❌ `GET /api/traders/:id` (public)
- ❌ `GET /api/me/profile` (auth) - partial (only returns id/email/role)
- ❌ `PUT /api/me/profile` (auth)
- ❌ `POST /api/copy-setups` (auth)
- ❌ `GET /api/copy-setups` (auth)
- ❌ `GET /api/portfolio/summary` (auth)
- ❌ `GET /api/positions` (auth)
- ❌ `GET /api/orders` (auth)
- ❌ `GET /api/trades` (auth)
- ❌ `GET /api/notifications` (auth)
- ❌ `POST /api/notifications/read` (auth)
- ❌ `PUT /api/admin/users/:id/role` (admin) - for role changes

### Admin Model
- ❌ Admin bootstrap script to promote `mmxinthi@gmail.com` to `role=admin`
- ❌ Audit log entries for admin role changes
- ❌ Admin role is currently email-based fallback only (needs DB-first)

### Frontend Wiring
- ❌ Marketplace: Replace mock `traders` array with `/api/traders`
- ❌ TraderProfile: Load from `/api/traders/:id`
- ❌ CopySetup: Create copy setup via `POST /api/copy-setups`
- ❌ CopyTrading: List copy setups via `GET /api/copy-setups`
- ❌ Settings/Profile: Load/save via `/api/me/profile` (currently uses direct Supabase)
- ❌ Notifications: Load from `/api/notifications` + mark read
- ❌ Admin: Wire role changes to `PUT /api/admin/users/:id/role`

### Seed Data
- ❌ Seed script for 5 demo traders + performance points
- ❌ Package.json script: `pnpm run seed` (dev only)

### Operational
- ❌ Request IDs (`X-Request-ID` header + logs)
- ❌ Production build check: Ensure Quick Dev Login / UI States Demo cannot appear

---

## 📋 Acceptance Criteria for MVP Launch

### Core User Flows
1. **Signup/Login**: User can sign up → profile auto-created → can log in → JWT works
2. **Profile**: User can view/edit profile (full_name, username, timezone, referral_wallet)
3. **Marketplace**: User can browse approved traders, see performance metrics, click to view details
4. **Trader Profile**: User can view trader details, performance history, start copy setup
5. **Copy Setup**: User can create copy setup with allocation/risk params, persists to DB
6. **Copy Trading**: User can view their active copy setups, pause/stop them
7. **Portfolio**: User can view portfolio summary (derived from positions/trades)
8. **Positions/Orders/Trades**: User can view their own positions, orders, trades
9. **Notifications**: User can view notifications, mark as read
10. **Admin**: Admin can view users, change roles, approve/reject traders, view audit logs

### Security
- ✅ All auth endpoints require valid Bearer token
- ✅ Users can only access their own data (RLS + backend checks)
- ✅ Public endpoints only return approved traders
- ✅ Admin endpoints require admin role (DB-driven)
- ✅ No secrets in logs/responses

### Data Integrity
- ✅ All MVP tables exist with RLS policies
- ✅ Copy setups persist and load correctly
- ✅ Profile updates persist
- ✅ Admin actions logged to audit_logs

### Performance
- ✅ Pagination on list endpoints (default limit: 50)
- ✅ Backend responds < 500ms for simple queries
- ✅ Frontend shows loading states

---

## 🔧 Required Environment Variables

### Railway (Backend)
```
FRONTEND_URL=https://klineo.xyz
NODE_ENV=production
PORT=3000 (auto-set by Railway)
SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
ADMIN_EMAILS=mmxinthi@gmail.com
```

### Vercel (Frontend)
```
VITE_API_BASE_URL=https://<railway-backend-url>.railway.app
VITE_SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

**Note**: `VITE_API_BASE_URL` must be set after Railway deployment.

---

## 🧪 How to Use Smoke Test (Entitlement / Gating)

The Smoke Test page lets admins validate entitlement, profit allowance, and gating end-to-end without real trading.

### Enable Smoke Test page in production

- **Frontend (Vercel)**: Set `VITE_ENABLE_SMOKE_TEST_PAGE=true` in the project env vars and redeploy.
- **Who can see it**: In production, the Smoke Test link appears only when **both** `VITE_ENABLE_SMOKE_TEST_PAGE=true` **and** the user has admin role. Non-admins who hit the route are redirected to the dashboard with an “Admin only” toast.
- **Development**: The Smoke Test route is always available in dev (no env flag required).

### Enable self-test endpoints in production

- **Backend (Railway)**: Set `ENABLE_SELF_TEST_ENDPOINT=true` in the backend env and redeploy.
- **Effect**: With this set, admin-only endpoints are enabled in prod:
  - `POST /api/self-test/simulate-profit` (increment `profit_used` for smoke tests)
  - `GET /api/self-test/mlm-summary?limit=5` (sanitized MLM distribution events)
- **Default**: In production, if `ENABLE_SELF_TEST_ENDPOINT` is not `true`, these endpoints respond with **404** (and the RLS self-test does too when the kill-switch runs).

### Run entitlement and gating tests safely

1. **As admin**, open the Smoke Test page (dev, or prod with `VITE_ENABLE_SMOKE_TEST_PAGE=true`).
2. **Entitlement**
   - The “Entitlement” section calls `GET /api/entitlements/me` and shows allowance / used / remaining / status.
   - Use “Refresh” to reload after changes.
3. **Simulate profit** (admin only, requires self-test enabled in prod)
   - Enter an amount (0 &lt; value ≤ 100000) and click “Simulate Profit”. This calls `POST /api/self-test/simulate-profit` and increases `profit_used` for your user.
   - Use sparingly; it persists to the DB. If self-test is disabled in prod, the UI shows “Self-test disabled in production”.
4. **Run Gating Test**
   - Click “Run Gating Test”. The suite will (if you have an active package) simulate enough profit to exceed the allowance, then call a gated endpoint (e.g. `POST /api/copy-setups`). It **expects 402** and `error: "ALLOWANCE_EXCEEDED"`. If you have no active package, the test is **SKIPPED** with “No active package to test allowance gating”.
5. **MLM Events**
   - The “MLM Events” panel calls `GET /api/self-test/mlm-summary?limit=5` and shows type, gross, distributed/platform/marketing totals, and created_at. No PII. If the endpoint is off in prod, the panel shows “No distribution events, or self-test disabled.”

**Security**: The Smoke Test UI and self-test endpoints never expose secrets, tokens, or emails. Responses use `request_id`, numeric totals, and status only.

---

## 🧪 Manual Test Plan (Before Launch)

### Pre-Launch Checklist
- [ ] Run all migrations in Supabase
- [ ] Run admin bootstrap script: `node scripts/bootstrap-admin.mjs`
- [ ] Run seed script (dev only): `pnpm run seed`
- [ ] Deploy backend to Railway
- [ ] Set `VITE_API_BASE_URL` in Vercel
- [ ] Deploy frontend to Vercel

### Test Flow 1: New User Signup
1. Go to `https://klineo.xyz`
2. Click "Sign Up"
3. Create account with email `test@example.com`
4. Verify profile auto-created in Supabase
5. Log in
6. Go to Settings → verify profile loads
7. Update full_name → save → verify persists
8. Go to Marketplace → verify traders load (should see 5 demo traders)
9. Click a trader → verify TraderProfile loads with data
10. Click "Start Copying" → verify CopySetup form loads
11. Fill form → submit → verify copy setup created
12. Go to Copy Trading → verify setup appears in list

### Test Flow 2: Portfolio & Trading Data
1. Log in as test user
2. Go to Portfolio → verify summary loads (may be empty initially)
3. Go to Positions → verify list loads (may be empty)
4. Go to Orders → verify list loads
5. Go to Trade History → verify trades load

### Test Flow 3: Notifications
1. Log in
2. Go to Notifications → verify list loads
3. Click "Mark as Read" on a notification → verify updates

### Test Flow 4: Admin Access
1. Log in as `mmxinthi@gmail.com` (should be admin)
2. Go to Admin dashboard
3. Verify stats load (users, traders, revenue)
4. Go to Users tab → verify user list loads
5. Find test user → change role to admin → verify audit log created
6. Go to Traders tab → verify traders list
7. Approve/reject a trader → verify status updates
8. Go to Audit Logs → verify actions appear

### Test Flow 5: Security
1. Try accessing `/api/admin/users` without token → should 401
2. Try accessing `/api/admin/users` with user token → should 403
3. Try accessing `/api/positions` with another user's ID → should only see own
4. Verify CORS: frontend can call backend, external cannot

---

## 🔄 Rollback Plan (If Backend Breaks)

### Immediate Actions
1. **Railway Rollback**:
   - Go to Railway dashboard → Deployments
   - Click "Rollback" to previous working version
   - Verify health check: `curl https://<railway-url>/health`

2. **Frontend Fallback** (if backend completely down):
   - Update Vercel env var: `VITE_API_BASE_URL=""` (empty)
   - Frontend will show "API not configured" errors (graceful degradation)
   - Users can still use Supabase direct (auth, profile via RLS)

3. **Database Rollback** (if migration broke):
   - Go to Supabase SQL Editor
   - Run rollback SQL (if provided)
   - Or restore from backup (Supabase dashboard → Database → Backups)

### Communication
- Update status page (if exists)
- Notify users via email/notification if critical

### Post-Rollback
1. Check Railway logs for errors
2. Check Supabase logs
3. Fix issue in local dev
4. Test thoroughly
5. Re-deploy

---

## 📊 Success Metrics

- ✅ All test flows pass
- ✅ No 500 errors in production logs
- ✅ Backend health check returns 200
- ✅ Admin can access admin dashboard
- ✅ Users can create copy setups
- ✅ Data persists correctly

---

## 🚀 Launch Order

1. **Cursor implements everything + commits**
2. **Deploy Railway (backend) first**
   - Push to GitHub
   - Railway auto-deploys
   - Verify health check works
3. **Update Vercel `VITE_API_BASE_URL`**
   - Get Railway URL
   - Set in Vercel env vars
4. **Deploy Vercel**
   - Push to GitHub (or Vercel auto-deploys)
   - Verify frontend loads
5. **Run manual test plan**
   - Follow all test flows above
   - Fix any issues
6. **Launch** 🎉

---

## Smoke Test & RLS Self-Test Endpoint

### Production Safety

Both the frontend Smoke Test page and backend RLS self-test endpoint are **disabled by default in production** for security.

### Frontend Smoke Test Page

**Location**: `/#smoke-test`

**Access Control**:
- ✅ **Development**: Always accessible
- ✅ **Production**: Only accessible if:
  - `VITE_ENABLE_SMOKE_TEST_PAGE=true` is set in Vercel env vars, AND
  - User is logged in as admin

**How to Enable in Production**:
1. Set `VITE_ENABLE_SMOKE_TEST_PAGE=true` in Vercel environment variables
2. Log in as admin user
3. Navigate to `/#smoke-test` (or use sidebar link if visible)

**Features**:
- Tests all backend endpoints (public, authenticated, admin)
- Sanitized responses (no tokens, secrets, or PII)
- Summary banner with pass/fail/skipped counts
- Copy Report feature (fully sanitized JSON)
- Stops early on 401 and marks remaining tests as SKIPPED

**Recommended**: Keep disabled in production unless actively debugging.

### Backend RLS Self-Test Endpoint

**Endpoint**: `GET /api/self-test/rls`

**Access Control**:
- ✅ **Development/Staging**: Works by default (admin-only)
- ✅ **Production**: Returns 404 unless `ENABLE_SELF_TEST_ENDPOINT=true` is set on Railway

**How to Enable in Production**:
1. Set `ENABLE_SELF_TEST_ENDPOINT=true` in Railway environment variables
2. Ensure `SUPABASE_ANON_KEY` is set (required for RLS checks)
3. Call endpoint with admin Bearer token

**Requirements**:
- Admin Bearer token (login as admin first)
- Backend env var `SUPABASE_ANON_KEY` must be set (separate from frontend)
- Backend env var `ENABLE_SELF_TEST_ENDPOINT=true` (production only)

**Usage**:
```bash
# Get admin token (login via frontend or Supabase)
curl -H "Authorization: Bearer <admin-token>" \
  https://<railway-backend-url>/api/self-test/rls
```

**Response Format**:
```json
{
  "status": "ok" | "fail",
  "timestamp": "ISO",
  "request_id": "...",
  "checks": [
    { "name": "auth_sanity", "pass": true, "details": {...} },
    { "name": "rls_user_profiles_self_row", "pass": true, "details": {...} },
    { "name": "rls_user_profiles_other_row_behavior", "pass": true, "details": { "mode": "admin_can_read_all" | "users_only" } },
    { "name": "service_role_visibility_expected", "pass": true, "details": {...} },
    { "name": "admin_gate", "pass": true, "details": {...} }
  ]
}
```

**Security Notes**:
- Response contains **zero PII** (no emails, user IDs, or row contents)
- Only boolean pass/fail and small numeric counts
- Never logs tokens or headers
- Returns 503 if `SUPABASE_ANON_KEY` is missing (safe error message)

**Interpretation**:
- All checks should be `"pass": true` for a healthy system
- `rls_user_profiles_other_row_behavior` mode indicates RLS policy type:
  - `"users_only"`: Users can only read own profiles (strict)
  - `"admin_can_read_all"`: Admins can read all profiles (expected if admin policy exists)
- `service_role_visibility_expected` confirms service role can see all rows (expected, endpoint is admin-only)

**Recommended**: Keep disabled in production unless actively debugging. See `SECURITY_NOTE.md` for details.

## 📝 Notes

- No exchange trading execution in MVP (copy setup + tracking only)
- Positions/orders/trades can be placeholder data for MVP
- Admin bootstrap is one-time (run manually after first migration)
- Seed script is dev-only (never runs in production)
