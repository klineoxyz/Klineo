# Copy Your Supabase Credentials — Right Now!

**You're on the correct page! Here's exactly what to do:**

---

## ✅ What You're Looking At

You're on the **"Connect to your project"** page in Supabase. This is exactly where you need to be!

You can see:
- **Project URL** field
- **Publishable Key** field (this is your anon key)
- **Anon Key (Legacy)** field (same as Publishable Key)

---

## Step 1: Copy Project URL

1. **Find:** The "Project URL" field (top field)
2. **Look for:** A grey box with your URL inside
3. **Click:** The **copy button** (📋 icon) next to the URL
   - OR select the entire URL and press `Ctrl+C`
4. **Save it** somewhere (notepad, text file, etc.)

**What it looks like:**
```
Project URL
┌─────────────────────────────────────────┐
│ https://xxxxxxxxxxxxx.supabase.co      │ [📋 Copy]
└─────────────────────────────────────────┘
```

**Example:** `https://abc123xyz.supabase.co`

---

## Step 2: Copy Publishable Key (Anon Key)

1. **Find:** The "Publishable Key" field (second field)
2. **Look for:** A grey box with a long string (starts with `eyJ`)
3. **Click:** The **copy button** (📋 icon) next to the key
   - OR select the entire key and press `Ctrl+C`
4. **Save it** somewhere (notepad, text file, etc.)

**What it looks like:**
```
Publishable Key
┌─────────────────────────────────────────┐
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... │ [📋 Copy]
└─────────────────────────────────────────┘
```

**⚠️ Important:** 
- This is a VERY long string (200+ characters)
- Make sure you copy the ENTIRE key
- It starts with `eyJ` and is one continuous string

---

## Step 3: Verify You Have Both

You should now have:

✅ **Project URL:** `https://xxx.supabase.co`  
✅ **Publishable Key:** `eyJhbGc...` (very long string)

**Keep these open** — you'll paste them into Vercel next!

---

## 🎯 What's Next?

Once you've copied both values:

1. **Open:** `ENTER_CREDENTIALS_IN_VERCEL.md`
2. **Follow:** The step-by-step guide to paste them into Vercel
3. **Or:** Continue below for quick steps

---

## Quick Vercel Steps (After Copying)

1. **Go to:** https://vercel.com/dashboard
2. **Select:** Your KLINEO project
3. **Click:** Settings → Environment Variables
4. **Add Variable 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: (paste your Project URL)
   - Check: Production, Preview, Development
   - Save
5. **Add Variable 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: (paste your Publishable Key)
   - Check: Production, Preview, Development
   - Save
6. **Redeploy:** Go to Deployments → Redeploy latest

---

## ✅ Checklist

Before moving to Vercel:

- [ ] Copied Project URL
- [ ] Copied Publishable Key (entire key, very long)
- [ ] Saved both values somewhere safe
- [ ] Ready to paste into Vercel

---

**Need detailed Vercel instructions?** See `ENTER_CREDENTIALS_IN_VERCEL.md`
