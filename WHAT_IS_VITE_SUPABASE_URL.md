# What is `VITE_SUPABASE_URL`?

**Simple explanation**

---

## Short answer

**`VITE_SUPABASE_URL`** is your **Supabase project URL** — the web address of your Supabase project.  
Your app uses it to connect to Supabase (auth, database, etc.).

**Your value:** `https://oyfeadnxwuazidfbjjfo.supabase.co`

---

## What it does

- Tells your app **where** your Supabase project lives
- Used by the Supabase client (`@supabase/supabase-js`) to send requests
- Needed for: Auth (login/signup), database queries, storage, etc.

---

## Why the `VITE_` prefix?

- Vite (your build tool) only exposes env vars that start with `VITE_` to the frontend
- So the name **must** be `VITE_SUPABASE_URL` (not `SUPABASE_URL`) for the browser to use it

---

## Where it comes from

- **Supabase Dashboard** → Project Settings → API  
- **“Project URL”** (or “Connect to your project” → API Keys)  
- Copy that URL → use it as `VITE_SUPABASE_URL`

---

## Summary

| Question | Answer |
|----------|--------|
| **What is it?** | Your Supabase project URL |
| **Example** | `https://oyfeadnxwuazidfbjjfo.supabase.co` |
| **Why `VITE_`?** | So Vite exposes it to the frontend |
| **Where to use it?** | `.env.local` (local) and Vercel Environment Variables (production) |
