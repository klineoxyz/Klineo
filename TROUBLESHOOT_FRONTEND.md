# Frontend Server Troubleshooting Guide

## Current Issue: `ERR_CONNECTION_REFUSED` on `http://localhost:5173`

This means the frontend dev server is **NOT running**.

---

## Step-by-Step Fix

### 1. Check Current Status

Open a **NEW** terminal in Cursor and run:

```powershell
# Check if anything is running on port 5173
netstat -ano | findstr :5173
```

**Expected**: Nothing (port should be free)  
**If something is there**: Note the PID and kill it: `taskkill /PID <pid> /F`

---

### 2. Navigate to Project

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
```

---

### 3. Verify Dependencies

```powershell
# Check if node_modules exists
Test-Path node_modules
```

**If FALSE**: Run `pnpm install` first

---

### 4. Start Frontend Server

```powershell
pnpm run dev
```

**What to look for:**

✅ **SUCCESS** - You should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

❌ **ERROR** - Common errors:

**Error 1: "Cannot find module"**
```
Error: Cannot find module 'vite'
```
**Fix**: Run `pnpm install`

**Error 2: "Port already in use"**
```
Error: Port 5173 is already in use
```
**Fix**: 
- Kill the process using port 5173
- OR change port in `vite.config.ts` (line 8: `port: 5174`)

**Error 3: Syntax/Import errors**
```
Failed to resolve import...
```
**Fix**: Check the error message - usually a missing file or typo

**Error 4: "EADDRINUSE"**
```
Error: listen EADDRINUSE: address already in use :::5173
```
**Fix**: Port is in use - kill the process or change port

---

### 5. If Server Starts Successfully

1. **Browser should auto-open** to `http://localhost:5173`
2. **If not**, manually open: `http://localhost:5173`
3. **You should see**: KLINEO landing page

---

## Alternative: Try Different Port

If port 5173 is blocked, change it:

1. Edit `vite.config.ts`:
   ```typescript
   server: {
     port: 5174,  // Change from 5173 to 5174
     open: true,
   },
   ```

2. Restart: `pnpm run dev`

3. Open: `http://localhost:5174`

---

## Verify Backend is Running

The frontend needs the backend to work properly:

```powershell
# In a separate terminal
cd c:\Users\Muaz\Desktop\KLINEO\backend-skeleton
npm run dev
```

**Backend should show:**
```
🚀 KLINEO Backend running on 0.0.0.0:3000
📍 Health check: http://localhost:3000/health
```

---

## Complete Setup Checklist

- [ ] Backend running on port 3000 ✅ (you have this)
- [ ] Frontend dependencies installed (`node_modules` exists)
- [ ] `.env.local` has `VITE_API_BASE_URL=http://localhost:3000`
- [ ] Frontend server started with `pnpm run dev`
- [ ] No errors in terminal
- [ ] Browser opens to `http://localhost:5173`

---

## Still Not Working?

### Check Terminal Output

Look for **red error messages** in the terminal where you ran `pnpm run dev`. Common issues:

1. **Missing dependencies**
   - Solution: `pnpm install`

2. **TypeScript errors**
   - Solution: Check the error, fix the code

3. **Port conflicts**
   - Solution: Change port or kill conflicting process

4. **Environment variable issues**
   - Solution: Check `.env.local` exists and has correct values

### Get Help

If you see specific errors, copy the **full error message** from the terminal and share it.

---

## Quick Test

Run this to verify everything is set up:

```powershell
cd c:\Users\Muaz\Desktop\KLINEO

# Check dependencies
if (Test-Path node_modules) { Write-Host "✅ Dependencies installed" } else { Write-Host "❌ Run: pnpm install" }

# Check env file
if (Test-Path .env.local) { Write-Host "✅ .env.local exists" } else { Write-Host "❌ .env.local missing" }

# Check main files
if (Test-Path src\main.tsx) { Write-Host "✅ main.tsx exists" } else { Write-Host "❌ main.tsx missing" }
if (Test-Path index.html) { Write-Host "✅ index.html exists" } else { Write-Host "❌ index.html missing" }
```

All should show ✅ if setup is correct.
