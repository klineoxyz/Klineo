# Where to Get Supabase Credentials — Visual Guide

**Exact step-by-step instructions with what to look for**

---

## Step 1: Open Supabase Dashboard

1. **Go to:** https://supabase.com/dashboard
2. **Sign in** with your account (or create one if needed)
3. **You'll see:** A list of your projects (or "New Project" if you don't have any)

---

## Step 2: Select Your Project

1. **Click** on your KLINEO project (or create a new one if you haven't)
2. **You'll see:** The project dashboard with sidebar on the left

---

## Step 3: Navigate to Project Settings

1. **Look at the bottom left** of the screen
2. **Find:** A gear icon ⚙️ with text "Project Settings"
3. **Click:** "Project Settings"

**What you'll see:** The settings page opens with a left sidebar menu

---

## Step 4: Open API Settings

1. **In the left sidebar** (under Project Settings), you'll see:
   - General
   - API ← **Click this one**
   - Database
   - Auth
   - Storage
   - etc.

2. **Click:** "API"

**What you'll see:** The API settings page with your credentials

---

## Step 5: Find Your Credentials

The API page shows several sections. Here's what to look for:

### A. Project URL (Top Section)

**Location:** Usually at the very top of the page

**What it looks like:**
```
Project URL
https://abcdefghijklmnop.supabase.co
```

**What to do:**
1. **See the URL** (starts with `https://` and ends with `.supabase.co`)
2. **Click the copy icon** 📋 next to it (or select and copy manually)
3. **Save it** somewhere temporarily (you'll paste it in Vercel)

**Example:** `https://xyzabc123.supabase.co`

---

### B. Project API Keys (Lower Section)

**Location:** Scroll down to find "Project API keys" section

**What it looks like:**
```
Project API keys

┌─────────────────────────────────────────┐
│ anon                                    │
│ public                                  │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... │
│ [👁️ Reveal] [📋 Copy]                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ service_role                             │
│ secret                                   │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... │
│ [👁️ Reveal] [📋 Copy]                  │
└─────────────────────────────────────────┘
```

**What to do:**

1. **Find the "anon" key** (first box)
   - It says "anon" and "public"
   - The key is hidden (shows dots or asterisks)
   
2. **Click the eye icon** 👁️ to reveal the key
   - The key will appear (very long string starting with `eyJ`)
   
3. **Click the copy icon** 📋 to copy it
   - Or select the entire key and copy manually (Ctrl+C)

4. **Save it** somewhere temporarily

**⚠️ Important:** 
- You need the **anon** key (not service_role)
- The anon key is safe for frontend
- The service_role key is for backend only (don't use it here)

---

## Step 6: Verify You Have Both

You should now have:

✅ **Project URL:** `https://xxx.supabase.co`  
✅ **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long)

**Keep these handy** — you'll paste them into Vercel next!

---

## 📸 Visual Reference

**Supabase Dashboard → Project Settings → API**

```
┌─────────────────────────────────────────────┐
│ Supabase Dashboard                          │
├─────────────────────────────────────────────┤
│                                             │
│  [Sidebar]                                  │
│  • Dashboard                                │
│  • SQL Editor                               │
│  • Table Editor                             │
│  • Authentication                           │
│  • Storage                                  │
│  • ...                                      │
│  ⚙️ Project Settings ← Click here          │
│                                             │
│  [Main Area]                                │
│                                             │
│  Project URL                                │
│  https://xxx.supabase.co  [📋 Copy]        │
│                                             │
│  Project API keys                           │
│  ┌─────────────────────────────────────┐   │
│  │ anon / public                      │   │
│  │ eyJhbGc... [👁️ Reveal] [📋 Copy] │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 Quick Checklist

Before moving to Vercel, make sure you have:

- [ ] Opened Supabase Dashboard
- [ ] Selected your project
- [ ] Clicked "Project Settings" (gear icon)
- [ ] Clicked "API" in sidebar
- [ ] Copied Project URL
- [ ] Revealed and copied anon public key
- [ ] Saved both values somewhere safe

---

**Next:** See `ENTER_CREDENTIALS_IN_VERCEL.md` for where to paste these in Vercel!
