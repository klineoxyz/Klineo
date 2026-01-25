# Step-by-Step: Connect Vercel to Supabase

**Complete guide to sync your Vercel frontend with Supabase (Part 1 of 2)**

**📖 Quick Links:**
- **Getting credentials?** See `GET_SUPABASE_CREDENTIALS.md` for exact locations
- **Entering in Vercel?** See `ENTER_CREDENTIALS_IN_VERCEL.md` for visual guide

---

## 📋 What You'll Do

1. Get Supabase credentials
2. Install Supabase client package
3. Create Supabase integration file
4. Create local `.env.local` file (not committed to Git)
5. Add environment variables to Vercel
6. Redeploy frontend
7. Test the connection
8. Verify authentication works

---

## Step 1: Get Supabase Credentials

### 1.1 Open Supabase Dashboard

1. **Go to:** https://supabase.com/dashboard
2. **Sign in** (if not already)
3. **Select your project** (or create one if you haven't)

### 1.2 Navigate to API Settings

1. **Click:** **Project Settings** (gear icon ⚙️ at bottom left)
2. **Click:** **API** (in the left sidebar)

### 1.3 Copy Your Credentials

You'll see a page with your project information. Find these two values:

#### A. Project URL
- **Location:** Top of the page, labeled "Project URL"
- **Looks like:** `https://xxxxxxxxxxxxx.supabase.co`
- **Copy this entire URL** (including `https://`)

#### B. Anon Public Key
- **Location:** Under "Project API keys" section
- **Find:** The key labeled `anon` → `public`
- **Looks like:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long string)
- **Click the eye icon** 👁️ to reveal it, then **copy the entire key**

**📝 Save these somewhere temporarily** (you'll paste them in Step 3)

---

## Step 2: Install Supabase Client

### 2.1 Install the Package

Open PowerShell or Command Prompt and go to your project:

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
pnpm add @supabase/supabase-js
```

**Expected output:** Package installed successfully.

---

## Step 3: Create Supabase Client File

### 3.1 Create the Integration File

Create a new file: `src/lib/supabase.ts`

**In your code editor:**
1. **Create:** `src/lib/supabase.ts`
2. **Paste this code:**

```typescript
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.error('Missing Supabase environment variables:');
    console.error('  - VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌ Missing');
    console.error('  - VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌ Missing');
    console.error('\nPlease add these to your .env.local file or Vercel environment variables.');
  }
  throw new Error('Missing Supabase environment variables');
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**✅ Save the file**

---

## Step 4: Create Local .env.local File

### 4.1 Navigate to Your Project

You should already be in the project directory from Step 2.1.

### 4.2 Copy the Example File

```powershell
copy .env.example .env.local
```

**Expected output:** `1 file(s) copied.`

### 4.3 Edit .env.local File

1. **Open:** `.env.local` in your code editor (VS Code, Cursor, etc.)
2. **Replace the placeholder values** with your actual Supabase credentials:

```bash
# Backend API URL (Railway) - leave as placeholder for now
VITE_API_BASE_URL=https://your-backend.railway.app

# Supabase (Frontend - use ANON key only)
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Analytics (Optional - leave as is for now)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_PLAUSIBLE_DOMAIN=klineo.com

# Development (Local only - does NOT work in production)
VITE_DEV_ADMIN=false
```

**Replace:**
- `https://xxxxxxxxxxxxx.supabase.co` → Your actual Supabase Project URL
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` → Your actual anon public key

### 4.4 Verify .env.local is NOT in Git

```powershell
git status
```

**✅ Good:** `.env.local` should NOT appear in the list (it's ignored)

**❌ Bad:** If `.env.local` shows up, it means it's being tracked. Run:
```powershell
git rm --cached .env.local
git commit -m "Remove .env.local from Git"
```

---

## Step 5: Add Environment Variables to Vercel

### 5.1 Open Vercel Dashboard

1. **Go to:** https://vercel.com/dashboard
2. **Sign in** (if not already)
3. **Select your KLINEO project** (or import it if you haven't)

### 5.2 Navigate to Environment Variables

1. **Click:** **Settings** (top navigation bar)
2. **Click:** **Environment Variables** (left sidebar)

### 5.3 Add Variable 1: Supabase URL

1. **Click:** **Add New** button
2. **Fill in:**
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** `https://xxxxxxxxxxxxx.supabase.co` (your Supabase Project URL)
   - **Environment:** Check all three boxes:
     - ☑️ Production
     - ☑️ Preview
     - ☑️ Development
3. **Click:** **Save**

**✅ You should see:** `VITE_SUPABASE_URL` added to the list

### 5.4 Add Variable 2: Supabase Anon Key

1. **Click:** **Add New** button again
2. **Fill in:**
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon public key)
   - **Environment:** Check all three boxes:
     - ☑️ Production
     - ☑️ Preview
     - ☑️ Development
3. **Click:** **Save**

**✅ You should see:** `VITE_SUPABASE_ANON_KEY` added to the list

### 5.5 Add Variable 3: Backend API URL (Optional for now)

1. **Click:** **Add New** button
2. **Fill in:**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://your-backend.railway.app` (we'll update this later when Railway is set up)
   - **Environment:** Check all three boxes
3. **Click:** **Save**

**Note:** This is a placeholder. You'll update it after connecting Railway.

### 5.6 Verify All Variables

You should now see three variables in your list:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_API_BASE_URL`

---

## Step 6: Redeploy Your Frontend

### 6.1 Trigger Redeploy

1. **Click:** **Deployments** tab (top navigation)
2. **Find:** Your latest deployment
3. **Click:** **⋯** (three dots menu) on the right
4. **Click:** **Redeploy**
5. **Confirm:** Click **Redeploy** in the popup

### 6.2 Wait for Deployment

- **Status:** "Building..." → "Deploying..." → "Ready"
- **Time:** Usually 1-3 minutes
- **Watch:** The deployment logs to ensure no errors

**✅ Success:** Deployment status shows "Ready" with a green checkmark

---

## Step 7: Test the Connection

### 7.1 Test Locally (Optional)

1. **Start dev server:**
   ```powershell
   cd c:\Users\Muaz\Desktop\KLINEO
   pnpm dev
   ```

2. **Open:** http://localhost:5173
3. **Open browser console** (F12 → Console tab)
4. **Check for errors:**
   - ✅ Should NOT see: "Missing Supabase environment variables"
   - ✅ Should NOT see: "VITE_SUPABASE_URL is not defined"

### 7.2 Test Production (Vercel)

1. **Visit:** Your Vercel deployment URL (e.g., `https://klineo.vercel.app`)
2. **Open browser console** (F12 → Console tab)
3. **Check for errors:**
   - ✅ Should NOT see Supabase connection errors
   - ✅ Should see normal app loading

### 7.3 Test Authentication (Sign Up)

1. **Click:** "Sign Up" or "Get Started"
2. **Fill in:**
   - Email: `test@example.com`
   - Password: `test123456`
3. **Submit**
4. **Check Supabase:**
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - ✅ You should see your test user appear

**✅ Success:** User created in Supabase!

### 7.4 Test Authentication (Login)

1. **Log out** (if logged in)
2. **Click:** "Log In"
3. **Enter:** Same email and password
4. **Submit**

**✅ Success:** You should be logged in and redirected to dashboard

---

## Step 8: Verify Database Connection

### 8.1 Check User Profile Created

1. **Supabase Dashboard** → **Table Editor**
2. **Select:** `user_profiles` table
3. **Check:** Your test user should have a profile row

**✅ Success:** Profile automatically created (trigger working)

### 8.2 Check RLS Policies

1. **Supabase Dashboard** → **Authentication** → **Policies**
2. **Verify:** Policies are active for `user_profiles`

---

## ✅ Checklist

Before moving to Railway, verify:

- [ ] `@supabase/supabase-js` package installed
- [ ] `src/lib/supabase.ts` file created
- [ ] Supabase credentials copied (URL + anon key)
- [ ] `.env.local` created locally with correct values
- [ ] `.env.local` NOT in Git (checked with `git status`)
- [ ] Vercel has `VITE_SUPABASE_URL` environment variable
- [ ] Vercel has `VITE_SUPABASE_ANON_KEY` environment variable
- [ ] Frontend redeployed on Vercel
- [ ] No errors in browser console
- [ ] Can sign up new user
- [ ] User appears in Supabase Authentication
- [ ] User profile created in `user_profiles` table
- [ ] Can log in with created user

---

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

**Fix:**
1. Check Vercel dashboard → Environment Variables
2. Verify variable names start with `VITE_`
3. Verify values are correct (no extra spaces)
4. Redeploy after adding variables

### Error: "Invalid API key"

**Fix:**
1. Verify you're using the **anon public** key (not service_role)
2. Copy the entire key (it's very long)
3. Check for extra spaces or line breaks
4. Re-add the variable in Vercel

### Error: "Failed to fetch" or CORS errors

**Fix:**
1. Check Supabase URL is correct (no trailing slash)
2. Verify Supabase project is active (not paused)
3. Check Supabase Dashboard → Settings → API → CORS settings

### User created but profile not created

**Fix:**
1. Check Supabase SQL Editor → Run `supabase-schema-fixed.sql` again
2. Verify trigger exists: `create_profile_for_new_user`
3. Check Supabase logs for errors

---

## 🎯 What's Next?

Once Vercel ↔ Supabase is working:

1. ✅ **Next:** Connect Railway (backend) to Supabase
2. ✅ **Then:** Connect Vercel to Railway API
3. ✅ **Finally:** Test full authentication flow

**See:** `SYNC_SUPABASE_TO_VERCEL_RAILWAY.md` for Railway setup (Part 2)

---

## 📝 Quick Reference

### Vercel Environment Variables Needed:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_BASE_URL=https://your-backend.railway.app (placeholder for now)
```

### Local .env.local File:

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_BASE_URL=https://your-backend.railway.app
```

**Remember:** `.env.local` is for local development only. Vercel uses its own environment variables.

---

## 🔒 Security Reminder

- ✅ **anon key** is safe for frontend (respects Row Level Security)
- ✅ **Never** put `service_role` key in Vercel (backend only)
- ✅ `.env.local` is in `.gitignore` (won't be committed)
- ✅ Only `.env.example` is committed (no secrets)

---

**Ready for Railway?** See `SYNC_SUPABASE_TO_VERCEL_RAILWAY.md` → Step 4
