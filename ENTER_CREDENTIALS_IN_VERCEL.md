# Where to Enter Supabase Credentials in Vercel — Visual Guide

**Exact step-by-step instructions with screenshots references**

---

## Prerequisites

✅ You have your Supabase credentials ready:
- Project URL: `https://xxx.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

✅ You have a Vercel account and your project connected

---

## Step 1: Open Vercel Dashboard

1. **Go to:** https://vercel.com/dashboard
2. **Sign in** with your account
3. **You'll see:** A list of your projects

---

## Step 2: Select Your KLINEO Project

1. **Find:** Your KLINEO project in the list
2. **Click** on the project name (or the project card)

**What you'll see:** The project overview page with tabs at the top

---

## Step 3: Navigate to Settings

1. **Look at the top navigation bar** (under the project name)
2. **You'll see tabs:**
   - Overview
   - Deployments
   - Analytics
   - **Settings** ← **Click this one**
   - etc.

3. **Click:** "Settings"

**What you'll see:** Settings page opens with a left sidebar menu

---

## Step 4: Open Environment Variables

1. **Look at the left sidebar** (under Settings)
2. **You'll see a menu:**
   - General
   - Domains
   - Integrations
   - **Environment Variables** ← **Click this one**
   - Git
   - Deploy Hooks
   - etc.

3. **Click:** "Environment Variables"

**What you'll see:** A page with a list of environment variables (may be empty if you haven't added any)

---

## Step 5: Add First Variable — Supabase URL

### 5.1 Click "Add New"

1. **Look for a button** that says:
   - "Add New" or
   - "+ Add" or
   - "New Variable"

2. **Click** that button

**What you'll see:** A form/modal appears with fields to fill

---

### 5.2 Fill in the Form

**You'll see three fields:**

1. **Key** (or "Name"):
   - **Type:** `VITE_SUPABASE_URL`
   - ⚠️ **Important:** Must start with `VITE_` (Vite requirement)
   - ⚠️ **Important:** Use exact spelling (case-sensitive)

2. **Value**:
   - **Paste:** Your Supabase Project URL
   - **Example:** `https://xyzabc123.supabase.co`
   - ⚠️ **Important:** No trailing slash (don't add `/` at the end)

3. **Environment** (checkboxes):
   - ☑️ **Production** — Check this
   - ☑️ **Preview** — Check this
   - ☑️ **Development** — Check this
   - **Why:** So it works in all environments

---

### 5.3 Save the Variable

1. **Click:** "Save" button (usually at bottom right of the form)
2. **Or:** Press Enter

**What you'll see:** 
- The form closes
- You're back to the environment variables list
- **New entry appears:** `VITE_SUPABASE_URL` with a green checkmark ✅

---

## Step 6: Add Second Variable — Supabase Anon Key

### 6.1 Click "Add New" Again

1. **Click:** "Add New" button again (same as Step 5.1)

**What you'll see:** The form appears again (empty)

---

### 6.2 Fill in the Form

1. **Key:**
   - **Type:** `VITE_SUPABASE_ANON_KEY`
   - ⚠️ **Important:** Exact spelling, case-sensitive

2. **Value:**
   - **Paste:** Your Supabase anon public key
   - **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **Important:** Copy the ENTIRE key (it's very long, usually 200+ characters)

3. **Environment:**
   - ☑️ **Production** — Check
   - ☑️ **Preview** — Check
   - ☑️ **Development** — Check

---

### 6.3 Save the Variable

1. **Click:** "Save" button

**What you'll see:**
- Form closes
- **New entry appears:** `VITE_SUPABASE_ANON_KEY` with a green checkmark ✅

---

## Step 7: Verify Both Variables Are Added

**Your environment variables list should now show:**

```
┌─────────────────────────────────────────────────────┐
│ Environment Variables                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ VITE_SUPABASE_URL                                    │
│ https://xxx.supabase.co                              │
│ Production ✅ Preview ✅ Development ✅              │
│ [Edit] [Delete]                                      │
│                                                      │
│ VITE_SUPABASE_ANON_KEY                              │
│ eyJhbGc... (hidden)                                  │
│ Production ✅ Preview ✅ Development ✅              │
│ [Edit] [Delete]                                      │
│                                                      │
│ [+ Add]                                              │
└─────────────────────────────────────────────────────┘
```

**✅ Success if you see:**
- Both variables listed
- Both have checkmarks for all environments
- No error messages

---

## Step 8: Redeploy Your Frontend

**⚠️ Important:** Environment variables only take effect after redeployment!

### 8.1 Go to Deployments

1. **Click:** "Deployments" tab (top navigation)

**What you'll see:** List of all deployments

---

### 8.2 Find Latest Deployment

1. **Look for:** The most recent deployment (usually at the top)
2. **You'll see:** Status (Ready, Building, Error, etc.)

---

### 8.3 Trigger Redeploy

1. **Find the three dots menu** (⋯) on the right side of the deployment row
2. **Click:** The three dots
3. **Click:** "Redeploy" from the dropdown menu
4. **Confirm:** Click "Redeploy" in the popup (if asked)

**What you'll see:**
- Status changes to "Building..."
- Then "Deploying..."
- Then "Ready" ✅ (usually 1-3 minutes)

---

## Step 9: Verify It Works

### 9.1 Check Deployment Logs

1. **Click** on the deployment (the row itself)
2. **Look at:** Build logs
3. **Check for errors:**
   - ✅ Should NOT see: "Missing Supabase environment variables"
   - ✅ Should NOT see: "VITE_SUPABASE_URL is not defined"
   - ✅ Build should complete successfully

---

### 9.2 Visit Your Site

1. **Click:** "Visit" button (or use the deployment URL)
2. **Open browser console** (F12 → Console tab)
3. **Check for errors:**
   - ✅ Should NOT see Supabase connection errors
   - ✅ Should see normal app loading

---

## 📸 Visual Reference

**Vercel Dashboard → Your Project → Settings → Environment Variables**

```
┌─────────────────────────────────────────────┐
│ Vercel Dashboard                             │
├─────────────────────────────────────────────┤
│  KLINEO                                      │
│  ┌───────────────────────────────────────┐  │
│  │ [Overview] [Deployments] [Settings] ← │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [Sidebar]                                  │
│  • General                                  │
│  • Domains                                  │
│  • Integrations                             │
│  • Environment Variables ← Click here       │
│  • Git                                      │
│  • ...                                      │
│                                             │
│  [Main Area]                                │
│  Environment Variables                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Key: VITE_SUPABASE_URL              │   │
│  │ Value: https://xxx.supabase.co      │   │
│  │ ☑️ Production ☑️ Preview ☑️ Dev     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Key: VITE_SUPABASE_ANON_KEY         │   │
│  │ Value: eyJhbGc... (hidden)           │   │
│  │ ☑️ Production ☑️ Preview ☑️ Dev     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [+ Add New]                                │
└─────────────────────────────────────────────┘
```

---

## 🎯 Quick Checklist

Before considering it done:

- [ ] Opened Vercel Dashboard
- [ ] Selected KLINEO project
- [ ] Clicked "Settings" tab
- [ ] Clicked "Environment Variables" in sidebar
- [ ] Added `VITE_SUPABASE_URL` with correct value
- [ ] Added `VITE_SUPABASE_ANON_KEY` with correct value
- [ ] Both variables checked for all environments (Production, Preview, Development)
- [ ] Redeployed frontend
- [ ] Deployment completed successfully
- [ ] No errors in browser console
- [ ] Site loads without Supabase errors

---

## 🐛 Common Mistakes to Avoid

### ❌ Wrong Variable Name

**Wrong:**
- `SUPABASE_URL` (missing `VITE_` prefix)
- `VITE_SUPABASE_ANON` (missing `_KEY`)

**Correct:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

### ❌ Wrong Key Type

**Wrong:**
- Using `service_role` key (this is for backend only!)

**Correct:**
- Using `anon` public key (safe for frontend)

---

### ❌ Forgot to Redeploy

**Problem:** Added variables but didn't redeploy

**Fix:** Always redeploy after adding environment variables

---

### ❌ Trailing Slash

**Wrong:**
- `https://xxx.supabase.co/` (has `/` at end)

**Correct:**
- `https://xxx.supabase.co` (no trailing slash)

---

### ❌ Incomplete Key

**Problem:** Copied only part of the anon key (it's very long!)

**Fix:** Make sure you copy the ENTIRE key (usually 200+ characters)

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Both variables show in Vercel dashboard
2. ✅ Deployment completes without errors
3. ✅ Browser console shows no Supabase errors
4. ✅ You can sign up/login (if auth is implemented)
5. ✅ Users appear in Supabase Authentication dashboard

---

## 📝 Quick Reference

**Vercel Environment Variables Needed:**

| Variable Name | Value | Where to Get |
|---------------|-------|--------------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (long string) | Supabase → Settings → API → anon public key |

**Navigation Path:**
```
Vercel Dashboard
  → Your Project
    → Settings (top tab)
      → Environment Variables (left sidebar)
        → Add New
```

---

**Need help getting the credentials?** See `GET_SUPABASE_CREDENTIALS.md`

**Ready to test?** See `VERCEL_SUPABASE_SETUP.md` → Step 7
