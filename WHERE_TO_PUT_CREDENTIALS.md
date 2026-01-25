# Where to Put Your Supabase Credentials

**Safe places to store your real Supabase credentials**

---

## ✅ Safe Places (Where to Put Credentials)

### 1. Local Development — `.env.local` File

**Location:** In your project folder

**Steps:**
1. **Open:** `c:\Users\Muaz\Desktop\KLINEO\.env.example`
2. **Copy it** to `.env.local`:
   ```powershell
   cd c:\Users\Muaz\Desktop\KLINEO
   copy .env.example .env.local
   ```
3. **Edit `.env.local`** and paste your real credentials:
   ```bash
   VITE_SUPABASE_URL=https://your-real-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-real-key
   ```

**✅ Safe because:**
- `.env.local` is in `.gitignore` (won't be committed to GitHub)
- Only exists on your computer
- Used for local development

---

### 2. Vercel (Production) — Environment Variables

**Location:** Vercel Dashboard (cloud)

**Steps:**
1. **Go to:** https://vercel.com/dashboard
2. **Select:** Your KLINEO project
3. **Click:** Settings → Environment Variables
4. **Add:**
   - Key: `VITE_SUPABASE_URL`
   - Value: (paste your real Project URL)
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: (paste your real anon key)

**✅ Safe because:**
- Stored securely in Vercel (encrypted)
- Only accessible to you (project owner)
- Never exposed in code or GitHub

---

### 3. Railway (Backend) — Environment Variables

**Location:** Railway Dashboard (cloud)

**Steps:**
1. **Go to:** https://railway.app/dashboard
2. **Select:** Your backend service
3. **Click:** Variables tab
4. **Add:**
   - Key: `SUPABASE_URL`
   - Value: (paste your real Project URL)
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (paste your real service_role key - different from anon!)

**✅ Safe because:**
- Stored securely in Railway (encrypted)
- Only accessible to you
- Never exposed in code

---

## ❌ NEVER Share Credentials Here

### 1. GitHub / Git Repository

**❌ DON'T:**
- Commit `.env.local` to Git
- Put credentials in `.md` files
- Put credentials in code files
- Push secrets to GitHub

**Why:** Anyone with access to your repo can see them

---

### 2. Public Files

**❌ DON'T:**
- Share in chat/messages
- Post in public forums
- Include in screenshots (without blurring)
- Email in plain text

**Why:** Public exposure = security risk

---

### 3. Code Comments

**❌ DON'T:**
```typescript
// VITE_SUPABASE_URL=https://xxx.supabase.co  ← DON'T DO THIS
// VITE_SUPABASE_ANON_KEY=eyJhbGc...  ← DON'T DO THIS
```

**Why:** Code comments can be committed to Git

---

## 📋 Quick Reference: Where Credentials Go

| Location | What Goes There | Safe? |
|----------|----------------|-------|
| `.env.local` (local) | Real credentials for local dev | ✅ Yes (protected by .gitignore) |
| Vercel Environment Variables | Real credentials for production | ✅ Yes (private, encrypted) |
| Railway Environment Variables | Real credentials for backend | ✅ Yes (private, encrypted) |
| `.env.example` | Placeholders only | ✅ Yes (no real secrets) |
| `.md` files | Examples only | ✅ Yes (no real secrets) |
| GitHub | ❌ NEVER | ❌ No |

---

## 🔒 Security Checklist

Before sharing/committing anything:

- [ ] `.env.local` is NOT in Git (check with `git status`)
- [ ] No real credentials in `.md` files (only examples)
- [ ] No credentials in code files
- [ ] Credentials only in:
  - ✅ `.env.local` (local)
  - ✅ Vercel dashboard (cloud)
  - ✅ Railway dashboard (cloud)

---

## 🎯 Summary

**Put real credentials in:**
1. ✅ `.env.local` (for local development)
2. ✅ Vercel Environment Variables (for production frontend)
3. ✅ Railway Environment Variables (for production backend)

**Never put real credentials in:**
1. ❌ Git/GitHub
2. ❌ Code files
3. ❌ Public documentation
4. ❌ Chat/messages

---

## 📝 Example: What Goes Where

### `.env.local` (Local - Real Credentials)
```bash
VITE_SUPABASE_URL=https://abc123xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyM3h5eiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### `.env.example` (Template - Placeholders Only)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Notice:** `.env.example` has placeholders, `.env.local` has real values.

---

**Need help setting them up?**
- **Local:** See `VERCEL_SUPABASE_SETUP.md` → Step 4
- **Vercel:** See `ENTER_CREDENTIALS_IN_VERCEL.md`
- **Railway:** See `SYNC_SUPABASE_TO_VERCEL_RAILWAY.md` → Step 4
