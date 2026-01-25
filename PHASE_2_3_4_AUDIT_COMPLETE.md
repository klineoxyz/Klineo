# KLINEO Technical Audit & Fixes - Complete

**Date:** From codebase only  
**Status:** Phase 2 (Security Fixes) ✅ | Phase 3 (Architecture) ✅ | Phase 4 (Admin Model) ✅

---

## Phase 1 — Audit Summary

### ✅ What is correct

- **Frontend:** Vite + React SPA (not Next.js). Build: `vite build` → `dist`.
- **Deployment:** Vercel config correct (SPA rewrites, build command, output directory).
- **No serverless:** No `/api` routes or serverless functions. Long-running work belongs in backend.
- **No Supabase yet:** No premature coupling. Safe to add when backend exists.
- **Structure:** Clean component organization, form validation exists.

### ⚠️ What is risky or incomplete

- **All data mock:** No API client, no `VITE_API_BASE_URL` usage.
- **Analytics:** Module exists but `initAnalytics` was never called (now fixed).
- **Railway confusion:** Railway build logs show **this frontend repo** being built. Backend should be separate.

### ❌ What was fixed (Phase 2)

1. ✅ **Dev bypass** — Now gated behind `!import.meta.env.PROD`
2. ✅ **Dev login** — Button hidden in production
3. ✅ **isAdmin** — Defaults to `false`, `VITE_DEV_ADMIN` for local dev only
4. ✅ **.gitignore** — Updated for Vite project (`.env*`, `dist`, `.vercel`, etc.)
5. ✅ **Analytics** — `initAnalytics()` called in `main.tsx`
6. ✅ **UI States Demo** — Hidden in production

---

## 🧩 Changes Made (Phase 2)

### Files Changed

1. `src/app/App.tsx`
2. `src/app/components/auth/LoginPage.tsx`
3. `.gitignore`
4. `src/main.tsx`
5. `src/app/components/layout/Sidebar.tsx`

### Exact Diffs

See **`SECURITY_FIXES_APPLIED.md`** for full diffs.

**Summary:**
- Dev bypass only works when `!import.meta.env.PROD`
- `isAdmin = import.meta.env.PROD ? false : (import.meta.env.VITE_DEV_ADMIN === 'true')`
- Dev login button wrapped in `{!import.meta.env.PROD && ...}`
- `.gitignore` adds `.env*`, `dist/`, `.vercel/`, OS/IDE files
- `initAnalytics()` called in `main.tsx`
- UI States Demo button wrapped in `{!import.meta.env.PROD && ...}`

---

## Phase 3 — Architecture Correction

### Railway Deployment Status

**Current state:**
- Railway build logs show **this frontend repo** (Vite) being built.
- `vercel.json` exists → Frontend intended for **Vercel**.
- No Railway config files (`railway.json`, `railway.toml`, `Dockerfile`) in this repo.

**Conclusion:**
- **This repo = Frontend only** (Vercel)
- **Backend = Separate service** (Railway, not in this repo)
- Railway may be misconfigured to build this frontend. **Stop that.** Railway should only run the backend service.

### Backend Architecture Proposal

**Option A: Separate Backend Repo (Recommended)**

```
klineo-frontend/  (this repo, Vercel)
klineo-backend/   (separate repo, Railway)
```

**Option B: Monorepo**

```
klineo/
  ├── frontend/     (this repo, Vercel)
  └── services/
      └── engine/   (backend, Railway)
```

**Recommendation:** **Option A** (separate repos) for:
- Clear separation of concerns
- Independent deployments
- Easier team collaboration
- Railway can focus on backend only

### Minimal Backend Skeleton (Railway-ready)

**Structure:**
```
klineo-backend/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # Express setup
│   ├── routes/
│   │   ├── health.ts     # /health endpoint
│   │   └── auth.ts       # Auth routes (placeholder)
│   ├── middleware/
│   │   └── auth.ts       # JWT verification (for Supabase)
│   └── types/
│       └── index.ts      # TypeScript types
├── package.json
├── tsconfig.json
└── .env.example
```

**Minimal `src/index.ts`:**
```typescript
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://klineo.vercel.app',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);

// Start server
app.listen(PORT, () => {
  console.log(`KLINEO Backend running on port ${PORT}`);
});
```

**`src/routes/health.ts`:**
```typescript
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'klineo-backend'
  });
});
```

**`src/routes/auth.ts` (placeholder):**
```typescript
import { Router } from 'express';
// import { verifySupabaseJWT } from '../middleware/auth';

export const authRouter = Router();

// Placeholder - will verify Supabase JWT when integrated
authRouter.get('/me', async (req, res) => {
  // TODO: Verify Supabase JWT from Authorization header
  res.json({ message: 'Auth endpoint - Supabase integration pending' });
});
```

**`package.json` (minimal):**
```json
{
  "name": "klineo-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

**Railway Configuration:**
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:**
  - `PORT` (auto-set by Railway)
  - `FRONTEND_URL` (Vercel URL)
  - `SUPABASE_URL` (when Supabase added)
  - `SUPABASE_SERVICE_ROLE_KEY` (when Supabase added, **NEVER expose to frontend**)

---

## Phase 4 — Admin Model Design

### Admin Identification

**Admin email:** `mmxinthi@gmail.com`

### Architecture (Supabase Auth)

**Database Schema (Supabase Postgres):**

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set initial admin
INSERT INTO public.user_profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'mmxinthi@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- RLS Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**Backend Verification (Node.js):**

```typescript
// src/middleware/auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Backend only, never frontend
);

export async function verifySupabaseJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get user role from database
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  req.user = {
    id: user.id,
    email: user.email!,
    role: profile?.role || 'user'
  };

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

**Frontend Role Check (UI only):**

```typescript
// src/app/App.tsx (after backend integration)
const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);

// After login, fetch user profile from backend
useEffect(() => {
  if (isAuthenticated) {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setUserRole(data.role))
      .catch(() => setUserRole('user'));
  }
}, [isAuthenticated]);

const isAdmin = userRole === 'admin';
```

**Key Principles:**
1. ✅ **Admin email NOT hardcoded in frontend** — stored in database
2. ✅ **Backend enforces admin access** — JWT verification + role check
3. ✅ **Frontend role check is UI-only** — backend always verifies
4. ✅ **RLS policies** — Database-level security
5. ✅ **Service role key** — Backend only, never exposed to frontend

---

## Dead Code Identified

**Unused files (can be removed or marked for future use):**
- `src/app/components/screens/TradingTerminal.tsx` — Replaced by `TradingTerminalNew.tsx`
- `src/app/components/screens/PortfolioLoading.tsx` — Never imported
- `src/app/components/screens/PositionsLoading.tsx` — Never imported

**Recommendation:** Remove these files or clearly mark as deprecated.

---

## 📋 Exact Next Steps to Safely Introduce Supabase

### Step 1: Backend Service (Railway)

1. **Create separate backend repo** (or monorepo `/services/engine`)
2. **Implement minimal skeleton** (see Phase 3 above)
3. **Deploy to Railway** with `/health` endpoint working
4. **Verify:** `curl https://your-backend.railway.app/health`

### Step 2: Supabase Setup

1. **Create Supabase project**
2. **Run schema SQL** (see Phase 4 above):
   - `user_profiles` table
   - Initial admin (`mmxinthi@gmail.com`)
   - RLS policies
3. **Get credentials:**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (frontend-safe)
   - `SUPABASE_SERVICE_ROLE_KEY` (backend-only, **NEVER frontend**)

### Step 3: Backend Supabase Integration

1. **Install Supabase client** in backend: `npm install @supabase/supabase-js`
2. **Add JWT verification middleware** (see Phase 4)
3. **Add admin check middleware** (`requireAdmin`)
4. **Test:** Verify JWT from Supabase Auth works

### Step 4: Frontend API Client

1. **Add env vars:**
   - `VITE_API_BASE_URL=https://your-backend.railway.app`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...` (anon key only, not service role)
2. **Create API client** (`src/lib/api.ts`):
   ```typescript
   const API_BASE = import.meta.env.VITE_API_BASE_URL;
   
   export const api = {
     auth: {
       me: () => fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' }),
       // ... other endpoints
     }
   };
   ```
3. **Replace mock login** with Supabase Auth + backend API calls

### Step 5: Admin Access Flow

1. **User signs up/logs in** via Supabase Auth (frontend)
2. **Frontend gets JWT** from Supabase
3. **Frontend sends JWT** to backend `/api/auth/me` (Authorization header)
4. **Backend verifies JWT** + fetches role from `user_profiles`
5. **Backend returns** `{ id, email, role }`
6. **Frontend sets** `isAdmin = role === 'admin'` (UI only)
7. **All admin endpoints** require `requireAdmin` middleware (backend enforces)

### Step 6: Testing

1. **Create test user** in Supabase Auth
2. **Verify non-admin** cannot access admin routes
3. **Set `mmxinthi@gmail.com` as admin** in database
4. **Verify admin** can access admin routes
5. **Verify RLS** prevents unauthorized DB access

---

## Summary

✅ **Security fixes applied** — Dev bypass, isAdmin, .gitignore, analytics, UI States Demo  
✅ **Architecture clarified** — Frontend (Vercel) + Backend (Railway, separate)  
✅ **Backend skeleton proposed** — Minimal Node.js + Express + TypeScript  
✅ **Admin model designed** — Database-driven, backend-enforced, no hardcoding  

**Next:** Create backend repo/service, implement skeleton, then add Supabase Auth + Postgres.

---

**Files changed:** See `SECURITY_FIXES_APPLIED.md` for exact diffs.
