# Phase 1 Runbook — Auth + API Wiring

**Production-grade auth, backend role checks, profile load/save.**

---

## Required env vars

### Vercel (frontend)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** key only |
| `VITE_API_BASE_URL` | Railway backend URL (e.g. `https://xxx.up.railway.app`) |

### Railway (backend)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service_role** key |
| `FRONTEND_URL` | Vercel frontend URL (for CORS) |
| `NODE_ENV` | `production` |
| `ADMIN_EMAILS` | `mmxinthi@gmail.com` (comma-separated fallback admin emails) |

---

## Local setup

```bash
cd c:\Users\Muaz\Desktop\KLINEO
pnpm install
cp .env.example .env.local
# Edit .env.local: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
pnpm dev
```

Open **http://localhost:5173**.

---

## Production

- **Frontend:** Vercel (build `pnpm run build`, output `dist`).
- **Backend:** Railway (root `backend-skeleton`, build `pnpm run build`, start `pnpm start`).

Set env vars in each dashboard as above, then deploy.

---

## Test checklist

- [ ] **Sign up** — Create account (email, password, full name). User in Supabase Auth + `user_profiles` row.
- [ ] **Login** — Log in with that user. Session restored, redirect to dashboard.
- [ ] **Refresh persistence** — Refresh page while logged in. Still authenticated, same view.
- [ ] **`/api/auth/me`** — Settings → Connection Test. Shows `{ id, email, role }`. Role from backend.
- [ ] **Admin gating** — Log in as non-admin. No Admin in sidebar, cannot open admin view.
- [ ] **Admin access** — Log in as `mmxinthi@gmail.com` (admin in DB or `ADMIN_EMAILS`). Admin in sidebar, can open admin.
- [ ] **Logout** — TopBar → Logout. Session cleared, redirect to landing/login.
- [ ] **Settings save** — Profile tab: edit full name, username, timezone, referral wallet → Save. Toast success, reload profile to confirm persistence.
- [ ] **Protected route** — Log out, then navigate to a protected view (e.g. by manually changing state). Redirect to login.

---

## File tree changes (Phase 1)

```
+ src/lib/authEvents.ts
+ src/lib/api.ts
+ src/app/contexts/AuthContext.tsx
+ PHASE_1_RUNBOOK.md
M src/main.tsx
M src/app/App.tsx
M src/app/components/auth/LoginPage.tsx
M src/app/components/auth/SignUpPage.tsx
M src/app/components/layout/TopBar.tsx
M src/app/components/screens/Settings.tsx
M backend-skeleton/src/middleware/auth.ts
M backend-skeleton/.env.example
```

- **Supabase client:** `src/lib/supabase.ts` unchanged; used by AuthContext, api, Settings.
- **Dev shortcuts:** Quick Dev Login (LoginPage) and UI States Demo (Sidebar) gated with `!import.meta.env.PROD`.
- **.gitignore:** Already includes `.env`, `.env.*`, `dist/`, `.vercel/`.

---

## Quick reference

- **Supabase client:** `src/lib/supabase.ts` (unchanged).
- **Auth:** `useAuth()` from `AuthContext` — `user`, `session`, `isAuthenticated`, `isAdmin`, `loading`, `login`, `signup`, `logout`.
- **API:** `api.get(path)`, `api.post(path, body)` from `@/lib/api`. Auto Bearer, 401 → logout.
- **Connection test:** Settings → Profile → “Run Connection Test” calls `GET /api/auth/me`, shows result.
