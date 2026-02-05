# Live Mode Audit — Data & Access Control

This document summarizes the Live mode implementation, backend user isolation, and access control for normal vs admin users.

## TopBar (Live mode)

When the user is in **Live** mode (not Demo):

| Element | Source | Backend |
|---------|--------|---------|
| **Active Copies** | `GET /api/copy-setups` → count of `status === "active"` | User-scoped by `user_id` |
| **Connection Status** | `GET /api/exchange-connections/balance` → `connected` | User-scoped by `user_id` |
| **Plan / Entitlement** | `GET /api/me/entitlement` → status, activePackageId, remainingUsd | User-scoped by `user_id` |
| **PAUSE ALL** | `PUT /api/copy-setups/:id` with `{ status: "paused" }` for each active setup | User-scoped; verifies `existing.user_id === req.user!.id` |

All data is fetched in `useTopBarLiveData` and refreshed every 30 seconds. Demo mode uses mock/context data.

## Backend User Isolation

All user-facing API routes enforce per-user isolation:

- **Profile / Entitlement**: `req.user!.id` from JWT
- **Copy setups**: `.eq('user_id', req.user!.id)`
- **Portfolio / Positions / Orders / Trades**: `.eq('user_id', req.user!.id)`
- **Exchange connections**: `.eq('user_id', req.user!.id)`
- **Referrals**: Own referrer/referred chains only

No route returns data for other users unless the caller is an admin on an admin-only endpoint.

## Admin Access Control

### Backend

- Admin routes: `/api/admin/*`, `/api/entitlements` (admin operations), `/api/self-test/*`
- All protected by `requireAdmin` after `verifySupabaseJWT`
- Normal users receive `403 Admin access required` for admin endpoints

### Frontend

- **Admin Panel**: `activeView === "admin" && !isAdmin` → redirect to dashboard
- **Sidebar / Mobile Nav**: Admin section only shown when `showAdminSection(!!isAdmin)` (i.e. `isAdmin === true`)
- **UI States Demo**: Production: admin only; Dev: everyone
- **Smoke Test**: Requires `isAdmin` and `VITE_ENABLE_SMOKE_TEST_PAGE=true`

### AuthContext

- `isAdmin` comes from `GET /api/auth/me` which reads `user_profiles.role`
- `ADMIN_EMAILS` env can elevate by email when `role !== 'admin'`

## Summary

- **Live mode**: TopBar, Dashboard, and other screens use real backend data for the logged-in user.
- **User isolation**: All user data is scoped by `user_id`; no cross-user leakage.
- **Admin access**: Admin-only routes and UI are protected; normal users cannot access them.
