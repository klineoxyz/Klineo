# Fix: Can't Open localhost:5173

## Problem
The frontend dev server won't start due to permissions error:
```
Error: spawn EPERM
```

This is usually caused by Windows Defender or antivirus blocking esbuild.

---

## Quick Fixes (Try in Order)

### Fix 1: Run as Administrator
1. Close Cursor/VS Code
2. Right-click Cursor → **Run as Administrator**
3. Open terminal and run:
   ```powershell
   cd c:\Users\Muaz\Desktop\KLINEO
   pnpm run dev
   ```

### Fix 2: Add Exception to Windows Defender
1. Open **Windows Security** (Windows Defender)
2. Go to **Virus & threat protection**
3. Click **Manage settings** under "Virus & threat protection settings"
4. Scroll down to **Exclusions**
5. Click **Add or remove exclusions**
6. Click **Add an exclusion** → **Folder**
7. Add: `C:\Users\Muaz\Desktop\KLINEO\node_modules\.pnpm\esbuild@*`
8. Also add: `C:\Users\Muaz\Desktop\KLINEO\node_modules\.pnpm\vite@*`

### Fix 3: Reinstall Dependencies
Sometimes corrupted node_modules causes this:
```powershell
cd c:\Users\Muaz\Desktop\KLINEO
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml
pnpm install
pnpm run dev
```

### Fix 4: Use PowerShell Script
Run the provided startup script:
```powershell
cd c:\Users\Muaz\Desktop\KLINEO
.\START_FRONTEND.ps1
```

### Fix 5: Check Antivirus
If you have third-party antivirus (Norton, McAfee, etc.):
- Temporarily disable it
- Try starting the server
- If it works, add exclusions in your antivirus settings

---

## Alternative: Use Different Port
If port 5173 is blocked, change it:

1. Edit `vite.config.ts`:
   ```typescript
   server: {
     port: 5174,  // Change from 5173
     open: true,
   },
   ```

2. Start server:
   ```powershell
   pnpm run dev
   ```

3. Open: `http://localhost:5174`

---

## Verify It's Working

When the server starts successfully, you should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Then open `http://localhost:5173` in your browser.

---

## Still Not Working?

1. **Check if backend is running** (required for API calls):
   ```powershell
   cd c:\Users\Muaz\Desktop\KLINEO\backend-skeleton
   npm run dev
   ```
   Should show: `Server running on port 3000`

2. **Check Node.js version**:
   ```powershell
   node --version
   ```
   Should be Node 18+ or 20+

3. **Check pnpm is installed**:
   ```powershell
   pnpm --version
   ```
   If not installed: `npm install -g pnpm`

---

## Quick Checklist

- [ ] Run Cursor as Administrator
- [ ] Add Windows Defender exclusions for node_modules
- [ ] Backend running on port 3000
- [ ] Frontend dependencies installed (`pnpm install`)
- [ ] `.env.local` file exists with correct values
- [ ] No antivirus blocking esbuild
