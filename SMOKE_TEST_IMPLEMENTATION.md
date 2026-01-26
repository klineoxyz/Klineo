# Smoke Test Implementation Summary

**Date**: January 26, 2026  
**Status**: ✅ Complete

---

## What Was Built

### 1. Backend RLS Self-Test Endpoint ✅

**File**: `backend-skeleton/src/routes/self-test.ts`

**Endpoint**: `GET /api/self-test/rls`

**Features**:
- Admin-only (protected by `verifySupabaseJWT` + `requireAdmin`)
- Tests RLS policies for `user_profiles` table
- Tests backend isolation (service role visibility)
- Returns structured PASS/FAIL checks
- Never exposes secrets or user data

**Required Backend Env Var**:
- `SUPABASE_ANON_KEY` (separate from frontend, for RLS testing)

**Tests Performed**:
1. Auth sanity (user info exists)
2. RLS self-row access (user can read own profile)
3. RLS other-row behavior (detects policy mode: `users_only` vs `admin_can_read_all`)
4. Service role visibility (confirms service role can see all, but endpoint is admin-only)
5. Admin gate (confirms `requireAdmin` middleware works)

**Response Format**:
```json
{
  "status": "ok" | "fail",
  "timestamp": "ISO",
  "request_id": "...",
  "checks": [
    { "name": "auth_sanity", "pass": true, "details": {...} },
    { "name": "rls_user_profiles_self_row", "pass": true, "details": {...} },
    { "name": "rls_user_profiles_other_row_behavior", "pass": true, "details": { "mode": "admin_can_read_all" } },
    { "name": "service_role_visibility_expected", "pass": true, "details": {...} },
    { "name": "admin_gate", "pass": true, "details": {...} }
  ]
}
```

---

### 2. Frontend Smoke Test Page ✅

**File**: `src/app/components/screens/SmokeTest.tsx`

**Route**: `/#smoke-test`

**Access Control**:
- Dev-only by default (`!import.meta.env.PROD`)
- Can be enabled in production with `VITE_ENABLE_SMOKE_TEST_PAGE=true`
- Redirects to Dashboard if accessed in production without override

**Features**:
- Environment info display (masked URLs, user email/role)
- "Run All Tests" button with progress indicator
- Individual test buttons (each test can run separately)
- Results table with status, HTTP code, latency, message
- Expandable details panel per test (request path, response, errors)
- "Copy Report" button (copies JSON to clipboard)
- "Clear Results" button
- Overall status badge (ALL PASS / SOME FAIL / NOT RUN)

**Security**:
- Uses existing `src/lib/api.ts` for all calls (Bearer token + 401 logout)
- Never prints tokens to UI or console
- Sanitizes responses (removes tokens, secrets, passwords)
- Handles 401 by showing "Unauthorized, session expired" and stopping tests
- Shows SKIP for authed tests if user not logged in

**Tests Implemented** (15 total):

**Public** (2):
1. `GET /health` - Health check
2. `GET /api/traders?limit=5` - Public traders list

**Authenticated** (8):
3. `GET /api/auth/me` - Current user info
4. `GET /api/me/profile` - User profile
5. `GET /api/copy-setups` - Copy setups list
6. `GET /api/portfolio/summary` - Portfolio summary
7. `GET /api/positions?page=1&limit=5` - Positions
8. `GET /api/orders?page=1&limit=5` - Orders
9. `GET /api/trades?page=1&limit=5` - Trades
10. `GET /api/notifications?limit=5` - Notifications

**Admin** (5):
11. `GET /api/admin/stats` - Admin stats
12. `GET /api/admin/users?limit=5` - Admin users list
13. `GET /api/admin/traders?limit=5` - Admin traders list
14. `GET /api/admin/audit-logs?limit=5` - Admin audit logs
15. `GET /api/self-test/rls` - RLS self-test

**Admin Test Logic**:
- Admin user: 200 = PASS, 403 = FAIL
- Non-admin user: 403 = PASS, 200 = FAIL
- 401 = FAIL always

---

### 3. Smoke Test Library ✅

**File**: `src/lib/smokeTests.ts`

**Exports**:
- `smokeTests`: Array of test definitions
- `runAllTests()`: Run all tests sequentially
- `runTestByName(name)`: Run a single test
- `SmokeTestResult`: TypeScript interface for results

**Features**:
- Latency measurement using `performance.now()`
- Request path extraction from response URL
- Response sanitization (removes tokens/secrets)
- 401 detection and early stopping
- Admin test logic (different PASS/FAIL for admin vs non-admin)

---

## Files Changed

### Backend
1. `backend-skeleton/src/routes/self-test.ts` (NEW)
2. `backend-skeleton/src/index.ts` (added route registration)

### Frontend
1. `src/app/components/screens/SmokeTest.tsx` (NEW)
2. `src/lib/smokeTests.ts` (NEW)
3. `src/app/App.tsx` (added route case)
4. `src/app/components/layout/Sidebar.tsx` (added sidebar link)

### Documentation
1. `MVP_LAUNCH_PLAN.md` (added RLS self-test section)

---

## Environment Variables

### Backend (Railway)
**New Required**:
- `SUPABASE_ANON_KEY` - Supabase anon key for RLS testing (separate from frontend)

**Existing** (already required):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`
- `ADMIN_EMAILS`
- `NODE_ENV`

### Frontend (Vercel)
**Optional** (for production access):
- `VITE_ENABLE_SMOKE_TEST_PAGE=true` - Enable smoke test page in production

**Existing** (already required):
- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Usage

### Access Smoke Test Page

**Development**:
- Navigate to `http://localhost:5173/#smoke-test`
- Or click "Smoke Test" in sidebar

**Production** (if enabled):
1. Set `VITE_ENABLE_SMOKE_TEST_PAGE=true` in Vercel
2. Navigate to `https://www.klineo.xyz/#smoke-test`
3. Or click "Smoke Test" in sidebar

### Run Tests

1. **Run All**: Click "Run All Tests" button
2. **Run Individual**: Click any test button in "Individual Tests" section
3. **View Details**: Click chevron icon in results table to expand details
4. **Copy Report**: Click "Copy Report" to copy JSON to clipboard

### RLS Self-Test (Backend)

**Via Frontend**:
- Use Smoke Test page, click "GET /api/self-test/rls" button

**Via cURL**:
```bash
curl -H "Authorization: Bearer <admin-token>" \
  https://klineo-production-1dfe.up.railway.app/api/self-test/rls
```

---

## Security Notes

✅ **No Secrets Exposed**:
- Tokens are never printed to UI or console
- Responses are sanitized before display
- Service role key never used in frontend

✅ **Proper Access Control**:
- Smoke test page is dev-only by default
- RLS endpoint is admin-only
- All tests use existing auth middleware

✅ **Safe Error Handling**:
- 401 triggers logout (existing behavior)
- Errors are sanitized (no stack traces in production)
- User data is masked in responses

---

## Testing Checklist

- [ ] Backend RLS endpoint works (admin login required)
- [ ] Frontend smoke test page loads (dev mode)
- [ ] All public tests pass
- [ ] Authenticated tests work (when logged in)
- [ ] Admin tests show correct PASS/FAIL for admin vs non-admin
- [ ] 401 handling works (triggers logout)
- [ ] Copy report works (JSON format)
- [ ] Production guard works (redirects if not enabled)
- [ ] Sidebar link appears/disappears correctly

---

## Next Steps

1. **Add `SUPABASE_ANON_KEY` to Railway**:
   - Go to Railway Dashboard → Service → Variables
   - Add: `SUPABASE_ANON_KEY=sb_publishable_gnt8XkZq8Dv16d9PQM5AjA_CmHAH62W`
   - (Same value as frontend `VITE_SUPABASE_ANON_KEY`)

2. **Test Locally**:
   - Start backend: `cd backend-skeleton && npm run dev`
   - Start frontend: `pnpm run dev`
   - Navigate to `/#smoke-test`
   - Run all tests

3. **Test in Production** (optional):
   - Set `VITE_ENABLE_SMOKE_TEST_PAGE=true` in Vercel
   - Navigate to production URL
   - Run tests

---

**Implementation Complete**: ✅  
**Ready for Testing**: ✅
