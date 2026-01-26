# Security Note: Smoke Test & Self-Test Endpoints

## Overview

The KLINEO codebase includes diagnostic tools (Smoke Test UI and RLS Self-Test endpoint) that are **disabled by default in production** for security reasons.

## Why These Endpoints Are Gated

1. **Information Disclosure**: These tools can reveal system configuration, endpoint availability, and diagnostic data
2. **Attack Surface**: Exposing diagnostic endpoints can help attackers understand system architecture
3. **Production Safety**: Diagnostic tools should only be enabled when actively debugging issues

## Frontend Smoke Test Page

**Location**: `/#smoke-test`

**Default Behavior**:
- ✅ **Development**: Always accessible
- ❌ **Production**: Disabled by default

**How to Enable**:
1. Set `VITE_ENABLE_SMOKE_TEST_PAGE=true` in Vercel environment variables
2. User must be logged in as admin
3. Navigate to `/#smoke-test`

**Security Features**:
- Access control: dev OR (prod + env flag + admin)
- All responses are sanitized (no tokens, secrets, PII)
- URLs are masked (only hostname shown)
- Copy Report feature fully sanitizes all data
- Never displays Authorization headers or raw env vars

**Recommendation**: 
- ✅ Keep enabled in development
- ❌ Disable in production by default
- ⚠️ Only enable in production when actively debugging

## Backend RLS Self-Test Endpoint

**Endpoint**: `GET /api/self-test/rls`

**Default Behavior**:
- ✅ **Development/Staging**: Works by default (admin-only)
- ❌ **Production**: Returns 404 unless explicitly enabled

**How to Enable**:
1. Set `ENABLE_SELF_TEST_ENDPOINT=true` in Railway environment variables
2. Ensure `SUPABASE_ANON_KEY` is set (required for RLS checks)
3. Call with admin Bearer token

**Security Features**:
- Production kill switch: 404 unless env flag set
- Admin-only access (requires admin Bearer token)
- Zero PII in responses (no emails, user IDs, row contents)
- Only returns boolean pass/fail and numeric counts
- Never logs tokens or headers
- Returns 503 if configuration missing (safe error message)

**Recommendation**:
- ✅ Keep enabled in development/staging
- ❌ Disable in production by default
- ⚠️ Only enable in production when actively debugging RLS issues

## Environment Variables

### Frontend (Vercel)
- `VITE_ENABLE_SMOKE_TEST_PAGE` (optional): Set to `"true"` to enable smoke test page in production

### Backend (Railway)
- `ENABLE_SELF_TEST_ENDPOINT` (optional): Set to `"true"` to enable self-test endpoint in production
- `SUPABASE_ANON_KEY` (required if self-test enabled): Supabase anonymous key for RLS checks

## Best Practices

1. **Default to Disabled**: Both tools are disabled in production by default
2. **Enable Only When Needed**: Only enable when actively debugging issues
3. **Disable After Use**: Remove env flags after debugging is complete
4. **Monitor Access**: If enabled, monitor access logs for unusual activity
5. **Admin Only**: Both tools require admin access - ensure admin accounts are secure

## What Happens If Enabled Accidentally?

If these tools are accidentally enabled in production:

1. **Smoke Test Page**: 
   - Only accessible to admins
   - All data is sanitized
   - No secrets are exposed
   - Low risk, but still recommended to disable

2. **Self-Test Endpoint**:
   - Only accessible to admins
   - Returns zero PII
   - No secrets in responses
   - Low risk, but still recommended to disable

**Action**: If accidentally enabled, simply remove the env flags to disable.

## Summary

- ✅ Safe to keep in codebase (disabled by default)
- ✅ Safe even if deployed to production (requires explicit enable)
- ✅ Useful for debugging when enabled
- ❌ Should not be enabled in production unless actively debugging
- ⚠️ Always disable after debugging is complete
