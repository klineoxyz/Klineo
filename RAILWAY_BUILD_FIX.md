# Railway Build Fix — figma:asset imports

## What failed
```
[vite]: Rollup failed to resolve import "figma:asset/27a5e37b3de43f564e5875751799a9ee08284de6.png" from "...LandingPage.tsx"
```

**Cause:** `figma:asset/...` is a Figma/Make-only protocol. Vite doesn't resolve it, so the production build failed on Railway.

## What was changed
All `figma:asset/...` imports in **source code** were replaced with **`@/assets/...`** paths:

| File | Before | After |
|------|--------|-------|
| `LandingPage.tsx` | `figma:asset/27a5e37...png` (hero) | `@/assets/27a5e37b3de43f564e5875751799a9ee08284de6.png` |
| `Logo.tsx` | `figma:asset/6c13e9a...png` (K logo) | `@/assets/6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png` |
| `PricingPage.tsx` | `figma:asset/8bf59ae1...png` | `@/assets/6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png` |
| `HowItWorksPage.tsx` | `figma:asset/8bf59ae1...png` | `@/assets/6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png` |

The `8bf59ae1...` asset wasn't in `src/assets/`, so both Pricing and HowItWorks now use the existing K logo (`6c13e9a...`).

## Assets used
- `src/assets/27a5e37b3de43f564e5875751799a9ee08284de6.png` — hero image (Landing)
- `src/assets/6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png` — K logo (Logo, Pricing, HowItWorks)

## Next step
Commit, push, and redeploy on Railway. The build should succeed.
