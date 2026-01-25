# Publish the KLINEO Brand

**Status:** Ready to deploy. Config and brand meta are in place.

## What’s done

- **`vercel.json`** – SPA rewrites so routes like `/pricing`, `/about` work on refresh.
- **`index.html`** – Brand-ready:
  - Title: **KLINEO – Copy Trading for Crypto**
  - Meta description and Open Graph tags for sharing.

## Deploy to Vercel (≈5 min)

### 1. Install deps and build

```bash
pnpm install
pnpm run build
```

### 2. Deploy

**Option A – Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel --prod
```

**Option B – Vercel site**

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
3. Import the repo. Vercel detects Vite; use **Build** `npm run build`, **Output** `dist`.
4. Add env vars if needed (see `DEPLOYMENT_GUIDE.md`).
5. Click **Deploy**.

### 3. Optional – custom domain

In the Vercel project: **Settings** → **Domains** → add `klineo.com` (or your domain) and follow DNS instructions.

---

## Files touched for “publish the brand”

| File         | Change                                                |
|--------------|--------------------------------------------------------|
| `vercel.json`| New – SPA rewrites, build command, output directory   |
| `index.html` | Title, description, OG tags; removed “LOCKED” copy    |

## Next steps

- Add a favicon (e.g. in `public/favicon.png`) and link it in `index.html`.
- Set `VITE_*` env vars in Vercel for API, analytics, etc. (see `DEPLOYMENT_GUIDE.md`).

Once you run `pnpm install`, `pnpm run build`, and `vercel --prod`, the KLINEO brand is live.
