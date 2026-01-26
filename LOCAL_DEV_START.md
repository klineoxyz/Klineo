# Local Development - Quick Start Guide

## Problem: Frontend UI Not Loading

If you see `ERR_CONNECTION_REFUSED` on `http://localhost:5173`, the frontend server isn't running.

## Solution: Start Frontend Manually

### Step 1: Open a NEW Terminal Window

In Cursor/VS Code:
- Press `` Ctrl + ` `` (backtick) to open terminal
- OR go to: Terminal → New Terminal

### Step 2: Navigate to Project Root

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
```

### Step 3: Start Frontend Server

```powershell
pnpm run dev
```

### Step 4: Wait for Server to Start

You should see output like:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 5: Open Browser

The browser should auto-open, OR manually go to:
```
http://localhost:5173
```

---

## Two Servers Required

You need **BOTH** servers running:

### Terminal 1: Backend (Port 3000)
```powershell
cd c:\Users\Muaz\Desktop\KLINEO\backend-skeleton
npm run dev
```
✅ Status: Already running (from your terminal)

### Terminal 2: Frontend (Port 5173)
```powershell
cd c:\Users\Muaz\Desktop\KLINEO
pnpm run dev
```
❌ Status: **YOU NEED TO START THIS**

---

## Troubleshooting

### If `pnpm run dev` fails:

1. **Install dependencies first:**
   ```powershell
   pnpm install
   ```

2. **Check if port 5173 is in use:**
   ```powershell
   netstat -ano | findstr :5173
   ```
   If something is using it, kill that process or change port in `vite.config.ts`

3. **Check for errors:**
   - Look for red error messages in terminal
   - Common issues: missing dependencies, syntax errors

### If still not working:

1. **Check `.env.local` exists:**
   - Should have `VITE_API_BASE_URL=http://localhost:3000`
   - Should have Supabase keys

2. **Try clearing cache:**
   ```powershell
   pnpm store prune
   pnpm install
   ```

3. **Check Node.js version:**
   ```powershell
   node --version
   ```
   Should be Node 18+ or 20+

---

## Quick Checklist

- [ ] Backend running on port 3000 ✅ (you have this)
- [ ] Frontend running on port 5173 ❌ (start this)
- [ ] `.env.local` has `VITE_API_BASE_URL=http://localhost:3000`
- [ ] Browser opens to `http://localhost:5173`

---

## Expected Result

Once both servers are running:
- Frontend UI loads at `http://localhost:5173`
- Frontend connects to backend at `http://localhost:3000`
- You can sign up, login, and use the app!
