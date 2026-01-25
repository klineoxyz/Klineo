# KLINEO MVP Roadmap — Complete Guide

**Goal:** Finish MVP, connect Supabase, start onboarding users  
**Timeline:** Step-by-step, production-ready

---

## Step 1: Stop Railway from Building This Frontend Repo

### Option A: Via Railway Dashboard (Recommended)

1. **Go to Railway Dashboard:** https://railway.app/dashboard
2. **Find the service** that's building this `KLINEO` repo
3. **Settings** → **Disconnect** or **Delete** the service
4. **Or:** Settings → **Source** → **Disconnect Repository**

### Option B: Via Railway CLI

```bash
railway unlink
```

### Option C: Remove Railway from GitHub Integration

1. **GitHub** → Your repo → **Settings** → **Integrations** → **Railway**
2. **Remove** or **Disconnect** Railway integration

**Result:** Railway stops building this frontend. This repo deploys to **Vercel only**.

---

## Step 2: Create Backend Service (Railway)

### 2.1 Create Backend Repo

**Option A: Separate Repo (Recommended)**

```bash
# Create new directory
mkdir klineo-backend
cd klineo-backend
git init
```

**Option B: Monorepo (Alternative)**

```bash
# In KLINEO root
mkdir -p services/engine
cd services/engine
```

### 2.2 Initialize Backend Project

```bash
npm init -y
npm install express cors dotenv
npm install -D @types/express @types/cors @types/node typescript tsx
```

### 2.3 Create Backend Structure

**`package.json`:**
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
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
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

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`src/index.ts`:**
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';

dotenv.config();

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
  console.log(`🚀 KLINEO Backend running on port ${PORT}`);
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
    service: 'klineo-backend',
    version: '1.0.0'
  });
});
```

**`src/routes/auth.ts`:**
```typescript
import { Router } from 'express';

export const authRouter = Router();

// Placeholder - will verify Supabase JWT when integrated
authRouter.get('/me', async (req, res) => {
  res.json({ 
    message: 'Auth endpoint - Supabase integration pending',
    note: 'This will verify Supabase JWT and return user profile'
  });
});
```

**`.env.example`:**
```bash
PORT=3000
FRONTEND_URL=https://klineo.vercel.app
# Supabase (add after Step 3)
# SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=
```

**`.gitignore`:**
```
node_modules
dist
.env
.env.local
*.log
```

### 2.4 Deploy to Railway

1. **Push backend repo to GitHub**
2. **Railway Dashboard** → **New Project** → **Deploy from GitHub**
3. **Select backend repo** (not the frontend KLINEO repo)
4. **Railway auto-detects** Node.js
5. **Add environment variables:**
   - `FRONTEND_URL` = `https://klineo.vercel.app` (or your Vercel URL)
6. **Deploy**

**Verify:** `curl https://your-backend.railway.app/health`

---

## Step 3: Set Up Supabase

### 3.1 Create Supabase Project

1. **Go to:** https://supabase.com
2. **New Project**
3. **Name:** `klineo`
4. **Database Password:** Save it securely
5. **Region:** Choose closest to your users
6. **Wait for setup** (~2 minutes)

### 3.2 Get Supabase Credentials

1. **Project Settings** → **API**
2. **Copy:**
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` (frontend-safe)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend-only, **NEVER frontend**)

### 3.3 Create Database Schema

**Go to:** SQL Editor → New Query

**Run this SQL:**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set initial admin (mmxinthi@gmail.com)
-- Run this AFTER creating the user in Supabase Auth
INSERT INTO public.user_profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'mmxinthi@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- RLS: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLS: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.4 Enable RLS

1. **Table Editor** → `user_profiles`
2. **Enable RLS** (Row Level Security)
3. **Policies are created** by the SQL above

---

## Step 4: Connect Supabase to Backend

### 4.1 Install Supabase Client

```bash
cd klineo-backend
npm install @supabase/supabase-js
```

### 4.2 Add Backend Auth Middleware

**`src/middleware/auth.ts`:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Backend only, never frontend
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export async function verifySupabaseJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
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
    role: (profile?.role as 'user' | 'admin') || 'user'
  };

  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

### 4.3 Update Auth Routes

**`src/routes/auth.ts`:**
```typescript
import { Router } from 'express';
import { verifySupabaseJWT, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

// Get current user profile
authRouter.get('/me', verifySupabaseJWT, async (req: AuthenticatedRequest, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role
  });
});

// Admin-only endpoint example
authRouter.get('/admin/users', verifySupabaseJWT, requireAdmin, async (req, res) => {
  res.json({ message: 'Admin endpoint - user list coming soon' });
});
```

### 4.4 Add Environment Variables to Railway

1. **Railway Dashboard** → Your backend service → **Variables**
2. **Add:**
   - `SUPABASE_URL` = (from Supabase dashboard)
   - `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase dashboard, **service_role** key)
3. **Redeploy**

---

## Step 5: Connect Frontend to Backend + Supabase

### 5.1 Install Supabase Client (Frontend)

```bash
cd c:\Users\Muaz\Desktop\KLINEO
pnpm add @supabase/supabase-js
```

### 5.2 Create Supabase Client

**`src/lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 5.3 Create API Client

**`src/lib/api.ts`:**
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  console.warn('VITE_API_BASE_URL not set - API calls will fail');
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  auth: {
    me: () => apiRequest('/api/auth/me'),
  },
};
```

**Import supabase in api.ts:**
```typescript
import { supabase } from './supabase';
```

### 5.4 Update App.tsx for Real Auth

**`src/app/App.tsx` changes:**

```typescript
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

// Replace mock auth with real Supabase
const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);

useEffect(() => {
  // Check for existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      setIsAuthenticated(true);
      // Fetch user role from backend
      api.auth.me()
        .then((user) => {
          setUserRole(user.role);
          setActiveView('dashboard');
        })
        .catch(() => {
          setIsAuthenticated(false);
        });
    }
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session) {
        setIsAuthenticated(true);
        const user = await api.auth.me();
        setUserRole(user.role);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);

// Use real role instead of hardcoded
const isAdmin = userRole === 'admin';
```

### 5.5 Update Login/SignUp Pages

**`src/app/components/auth/LoginPage.tsx`:**

```typescript
import { supabase } from '@/lib/supabase';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setError(error.message);
    setLoading(false);
    return;
  }

  // Auth state change will trigger App.tsx useEffect
  onLogin(email, password); // Can be simplified
};
```

**`src/app/components/auth/SignUpPage.tsx`:** Similar pattern with `supabase.auth.signUp()`

### 5.6 Add Environment Variables to Vercel

1. **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. **Add:**
   - `VITE_API_BASE_URL` = `https://your-backend.railway.app`
   - `VITE_SUPABASE_URL` = (from Supabase)
   - `VITE_SUPABASE_ANON_KEY` = (from Supabase, **anon** key only)
3. **Redeploy**

---

## Step 6: Create Initial Admin User

### 6.1 Sign Up Admin in Supabase Auth

1. **Supabase Dashboard** → **Authentication** → **Users**
2. **Add User** → **Email:** `mmxinthi@gmail.com`
3. **Set Password** (or send invite email)
4. **User is created** in `auth.users`

### 6.2 Set Admin Role

**SQL Editor:**
```sql
-- Set mmxinthi@gmail.com as admin
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'mmxinthi@gmail.com';
```

**Or:** The trigger should auto-create profile, then run:
```sql
UPDATE public.user_profiles SET role = 'admin' WHERE email = 'mmxinthi@gmail.com';
```

---

## Step 7: MVP Checklist

### Core Features for MVP

- [ ] **User Authentication** (Supabase Auth)
  - [x] Login page
  - [x] Sign up page
  - [ ] Password reset (optional for MVP)

- [ ] **User Onboarding**
  - [x] Onboarding wizard UI
  - [ ] Connect exchange API key (backend validation)
  - [ ] Risk settings

- [ ] **Marketplace**
  - [x] Trader list UI
  - [ ] Real trader data from backend
  - [ ] Trader stats/performance

- [ ] **Copy Trading**
  - [x] Copy setup UI
  - [ ] Start/stop copy (backend)
  - [ ] Active copies list

- [ ] **Dashboard**
  - [x] Dashboard UI
  - [ ] Real portfolio data
  - [ ] Real PnL data

- [ ] **Admin Panel**
  - [x] Admin UI
  - [ ] Admin access (database-driven)
  - [ ] User management

### Backend Endpoints Needed

```
GET  /health
GET  /api/auth/me
POST /api/auth/login (optional, or use Supabase directly)
POST /api/auth/signup (optional, or use Supabase directly)

GET  /api/traders
GET  /api/traders/:id
GET  /api/traders/:id/stats

POST /api/copy/start
GET  /api/copy/active
PUT  /api/copy/:id
DELETE /api/copy/:id

GET  /api/portfolio
GET  /api/positions
GET  /api/orders
GET  /api/trade-history

GET  /api/fees
GET  /api/referrals

GET  /api/admin/users (admin only)
```

---

## Step 8: Test MVP

### 8.1 Test Authentication

1. **Sign up** new user
2. **Login** with credentials
3. **Verify** user profile created in Supabase
4. **Verify** role = 'user' (not admin)

### 8.2 Test Admin Access

1. **Login** as `mmxinthi@gmail.com`
2. **Verify** `isAdmin = true` in frontend
3. **Verify** Admin Panel visible
4. **Test** admin endpoint: `GET /api/auth/admin/users` (should work)

### 8.3 Test Non-Admin

1. **Login** as regular user
2. **Verify** Admin Panel NOT visible
3. **Test** admin endpoint (should return 403)

---

## Step 9: Deploy & Launch

### 9.1 Final Checks

- [ ] All environment variables set (Vercel + Railway)
- [ ] Admin user created (`mmxinthi@gmail.com`)
- [ ] RLS policies active
- [ ] Backend health check works
- [ ] Frontend connects to backend
- [ ] Supabase Auth working

### 9.2 Deploy

1. **Frontend:** Push to GitHub → Vercel auto-deploys
2. **Backend:** Push to GitHub → Railway auto-deploys
3. **Verify:** Both services healthy

### 9.3 Start Onboarding

1. **Share landing page** URL
2. **Users sign up** via Supabase Auth
3. **Users complete onboarding** (connect exchange API)
4. **Users start copying traders**

---

## Quick Reference

**Frontend (Vercel):**
- Repo: This `KLINEO` repo
- URL: `https://klineo.vercel.app` (or your domain)
- Env: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Backend (Railway):**
- Repo: Separate `klineo-backend` repo
- URL: `https://your-backend.railway.app`
- Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`

**Supabase:**
- URL: `https://your-project.supabase.co`
- Admin email: `mmxinthi@gmail.com`
- Database: Postgres with RLS

---

## Troubleshooting

**Railway still building frontend?**
- Check Railway dashboard → Disconnect this repo
- Only connect the backend repo

**Backend not connecting?**
- Check `FRONTEND_URL` in Railway env vars
- Check CORS settings in backend
- Verify backend health: `curl https://your-backend.railway.app/health`

**Supabase auth not working?**
- Verify env vars in Vercel (anon key, not service role)
- Check Supabase project is active
- Verify RLS policies are enabled

**Admin not working?**
- Check user exists in `auth.users`
- Check `user_profiles` has `role = 'admin'` for `mmxinthi@gmail.com`
- Verify JWT is sent in Authorization header

---

**Next:** Follow steps 1-9 in order. Each step builds on the previous one.
