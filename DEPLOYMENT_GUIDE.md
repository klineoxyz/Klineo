# KLINEO DEPLOYMENT GUIDE 🚀
**Production Deployment - Step-by-Step Guide**  
**Last Updated: January 24, 2026**

---

## 📋 TABLE OF CONTENTS

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Build Process](#build-process)
4. [Hosting Options](#hosting-options)
5. [Domain & DNS Setup](#domain--dns-setup)
6. [SSL/HTTPS Configuration](#sslhttps-configuration)
7. [Environment Variables](#environment-variables)
8. [Backend Integration](#backend-integration)
9. [Payment Integration (CoinPayments)](#payment-integration)
10. [Exchange API Setup](#exchange-api-setup)
11. [Monitoring & Analytics](#monitoring--analytics)
12. [Post-Deployment Testing](#post-deployment-testing)
13. [Rollback Strategy](#rollback-strategy)
14. [Troubleshooting](#troubleshooting)

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before deploying to production, verify:

### **Code Quality**
- [ ] All TypeScript files compile without errors
- [ ] No console.error or console.warn in production code
- [ ] All components properly typed
- [ ] No unused imports or variables
- [ ] Code formatted consistently

### **Testing**
- [ ] All pages load correctly
- [ ] Navigation works on all routes
- [ ] Forms validate properly
- [ ] Mobile responsive on all pages
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)

### **Content**
- [ ] All text reviewed for typos
- [ ] Legal pages reviewed by lawyer
- [ ] Pricing accurate
- [ ] Contact information correct
- [ ] About page complete

### **Assets**
- [ ] All images optimized (compressed)
- [ ] Favicon created (16x16, 32x32, 180x180)
- [ ] Open Graph images created (1200x630)
- [ ] Logo variations exported

### **Security**
- [ ] No API keys in frontend code
- [ ] Environment variables properly configured
- [ ] CORS settings configured
- [ ] Rate limiting planned
- [ ] Content Security Policy defined

### **Performance**
- [ ] Lighthouse score > 90
- [ ] Bundle size < 1MB
- [ ] Images lazy loaded
- [ ] Code splitting implemented
- [ ] Unused code removed

---

## 🔧 ENVIRONMENT SETUP

### **1. Install Dependencies**

```bash
# Clone the repository (if using Git)
git clone https://github.com/your-org/klineo.git
cd klineo

# Install dependencies
npm install
# or
pnpm install
# or
yarn install
```

### **2. Environment Variables**

Create a `.env.production` file:

```bash
# API Configuration
VITE_API_BASE_URL=https://api.klineo.com
VITE_WS_URL=wss://ws.klineo.com

# CoinPayments
VITE_COINPAYMENTS_PUBLIC_KEY=your_public_key_here

# Exchange APIs (Backend handles these - not exposed to frontend)
# BINANCE_API_KEY=xxx (server-side only)
# BYBIT_API_KEY=xxx (server-side only)
# OKX_API_KEY=xxx (server-side only)

# Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_PLAUSIBLE_DOMAIN=klineo.com

# Feature Flags
VITE_ENABLE_CHAT_WIDGET=true
VITE_ENABLE_REFERRALS=true
VITE_MAINTENANCE_MODE=false

# Application
VITE_APP_NAME=KLINEO
VITE_APP_URL=https://klineo.com
VITE_SUPPORT_EMAIL=support@klineo.com

# Rate Limiting (if applicable)
VITE_API_RATE_LIMIT=100
```

**⚠️ SECURITY WARNING:**
- NEVER commit `.env.production` to Git
- Add `.env*` to `.gitignore`
- Use environment variable management (Vercel/Netlify UI, AWS Secrets Manager, etc.)
- Rotate keys regularly

---

## 🏗️ BUILD PROCESS

### **1. Test Build Locally**

```bash
# Run production build
npm run build

# Preview production build
npm run preview
```

**Verify:**
- Build completes without errors
- No warnings about unused dependencies
- Bundle size is acceptable
- Preview works correctly at `http://localhost:4173`

### **2. Optimize Build**

**Check bundle size:**
```bash
npm run build -- --stats
```

**Analyze bundle (if using Vite):**
```bash
npm install -D rollup-plugin-visualizer
```

Add to `vite.config.ts`:
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true })
  ]
});
```

**Optimization tips:**
- Lazy load routes
- Code split large components
- Remove unused dependencies
- Compress images
- Use CDN for heavy assets

---

## 🌐 HOSTING OPTIONS

### **OPTION 1: Vercel (Recommended for React/Vite)**

**Pros:**
- ✅ Zero config deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments
- ✅ Free tier available

**Steps:**

1. **Sign up**: https://vercel.com
2. **Connect Git repository**
3. **Configure project:**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add environment variables** in Vercel dashboard
5. **Deploy**: Push to main branch (auto-deploys)

**CLI Deployment:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

### **OPTION 2: Netlify**

**Pros:**
- ✅ Easy deployment
- ✅ Form handling
- ✅ Functions support
- ✅ Free tier

**Steps:**

1. **Sign up**: https://netlify.com
2. **Create `netlify.toml`:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

3. **Deploy via Git** or drag-and-drop
4. **Add environment variables** in Netlify UI

**CLI Deployment:**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

### **OPTION 3: AWS S3 + CloudFront**

**Pros:**
- ✅ Scalable
- ✅ Full control
- ✅ Cost-effective at scale

**Steps:**

1. **Create S3 bucket:**
```bash
aws s3 mb s3://klineo-production
```

2. **Enable static website hosting:**
```bash
aws s3 website s3://klineo-production \
  --index-document index.html \
  --error-document index.html
```

3. **Upload build:**
```bash
npm run build
aws s3 sync dist/ s3://klineo-production --delete
```

4. **Create CloudFront distribution:**
   - Origin: S3 bucket
   - Viewer Protocol: Redirect HTTP to HTTPS
   - Price Class: Use All Edge Locations

5. **Configure CloudFront caching:**
   - Cache `index.html`: 0 seconds
   - Cache assets (`/assets/*`): 1 year
   - Gzip compression: Enabled

---

### **OPTION 4: Docker + Any Cloud**

**Create `Dockerfile`:**

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Create `nginx.conf`:**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Build and run:**
```bash
docker build -t klineo:latest .
docker run -p 80:80 klineo:latest
```

**Deploy to:**
- AWS ECS/Fargate
- Google Cloud Run
- DigitalOcean App Platform
- Railway
- Render

---

## 🌍 DOMAIN & DNS SETUP

### **1. Purchase Domain**

Recommended registrars:
- Namecheap
- Google Domains
- Cloudflare Registrar
- GoDaddy

**Recommended domain:** `klineo.com`, `klineo.io`, `klineo.app`

### **2. Configure DNS**

**For Vercel:**
```
A     @      76.76.21.21
CNAME www    cname.vercel-dns.com
```

**For Netlify:**
```
A     @      75.2.60.5
CNAME www    your-site.netlify.app
```

**For CloudFront:**
```
A     @      [CloudFront IPv4]
AAAA  @      [CloudFront IPv6]
CNAME www    d111111abcdef8.cloudfront.net
```

### **3. Verify DNS Propagation**

```bash
# Check A record
dig klineo.com A

# Check CNAME
dig www.klineo.com CNAME

# Check from multiple locations
https://www.whatsmydns.net
```

**Note:** DNS propagation can take 24-48 hours

---

## 🔒 SSL/HTTPS CONFIGURATION

### **Automatic (Vercel/Netlify)**
- SSL certificate automatically provisioned via Let's Encrypt
- Auto-renewal handled
- No configuration needed

### **CloudFront (AWS)**
1. **Request certificate** in AWS Certificate Manager (ACM)
2. **Validate domain** via DNS or email
3. **Attach to CloudFront** distribution
4. **Enable HTTPS** redirect

### **Manual (nginx + Let's Encrypt)**

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d klineo.com -d www.klineo.com

# Auto-renewal
sudo certbot renew --dry-run
```

**Update nginx config:**
```nginx
server {
    listen 443 ssl http2;
    server_name klineo.com www.klineo.com;

    ssl_certificate /etc/letsencrypt/live/klineo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/klineo.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of config
}
```

---

## 🔐 ENVIRONMENT VARIABLES

### **Managing Secrets**

**Vercel:**
```bash
vercel env add VITE_API_BASE_URL production
```

**Netlify:**
```bash
netlify env:set VITE_API_BASE_URL https://api.klineo.com
```

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name klineo/production/env \
  --secret-string file://secrets.json
```

### **Required Variables**

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_BASE_URL` | `https://api.klineo.com` | Yes |
| `VITE_WS_URL` | `wss://ws.klineo.com` | Yes |
| `VITE_COINPAYMENTS_PUBLIC_KEY` | `abc123...` | Yes |
| `VITE_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Optional |
| `VITE_PLAUSIBLE_DOMAIN` | `klineo.com` | Optional |

---

## 🔌 BACKEND INTEGRATION

### **API Endpoints to Implement**

**Authentication:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/reset-password
```

**User:**
```
GET    /api/user/profile
PUT    /api/user/profile
GET    /api/user/settings
PUT    /api/user/settings
```

**Marketplace:**
```
GET    /api/traders
GET    /api/traders/:id
GET    /api/traders/:id/stats
GET    /api/traders/:id/history
```

**Copy Trading:**
```
POST   /api/copy/start
PUT    /api/copy/:id
DELETE /api/copy/:id
GET    /api/copy/active
GET    /api/copy/history
```

**Exchange:**
```
POST   /api/exchange/connect
GET    /api/exchange/balance
GET    /api/exchange/positions
GET    /api/exchange/orders
```

**Payments:**
```
POST   /api/payments/subscription
POST   /api/payments/webhook (CoinPayments)
GET    /api/payments/history
```

### **WebSocket Events**

**Subscribe to:**
- `price_update` - Real-time price data
- `position_update` - Position changes
- `order_update` - Order status changes
- `trade_executed` - Trade completions
- `balance_update` - Account balance changes

### **API Integration Example**

Create `/src/lib/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    return res.json();
  },

  // Traders
  getTraders: async (filters?: any) => {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE_URL}/traders?${params}`);
    return res.json();
  },

  // Copy Trading
  startCopy: async (traderId: string, settings: any) => {
    const res = await fetch(`${API_BASE_URL}/copy/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ traderId, settings })
    });
    return res.json();
  }
};
```

---

## 💳 PAYMENT INTEGRATION (COINPAYMENTS)

### **1. Create CoinPayments Account**

1. Sign up: https://www.coinpayments.net
2. Verify email and identity (KYC)
3. Enable 2FA

### **2. Get API Credentials**

1. Go to **My Account** → **API Keys**
2. Generate new API key pair:
   - Public Key (for frontend)
   - Private Key (for backend only)
3. Set permissions:
   - ✅ Create transactions
   - ✅ Get transaction info
   - ✅ Get callback address

### **3. Configure IPN (Instant Payment Notification)**

1. Go to **My Account** → **Account Settings** → **Merchant Settings**
2. Set IPN URL: `https://api.klineo.com/payments/webhook`
3. Enable IPN
4. Set IPN secret (save for backend)

### **4. Frontend Integration**

Create `/src/lib/payments.ts`:

```typescript
const COINPAYMENTS_PUBLIC_KEY = import.meta.env.VITE_COINPAYMENTS_PUBLIC_KEY;

export const createPayment = async (plan: string, duration: string) => {
  // Call your backend to create payment
  const response = await fetch(`${API_BASE_URL}/payments/subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ plan, duration })
  });
  
  const { paymentUrl, txnId } = await response.json();
  
  // Redirect to CoinPayments checkout
  window.location.href = paymentUrl;
};
```

### **5. Test Mode**

Use CoinPayments sandbox for testing:
- Sandbox URL: https://www.coinpayments.net/merchant-tools-sandbox
- Test with fake transactions
- No real crypto required

---

## 📊 EXCHANGE API SETUP

### **Binance API**

1. **Create Account**: https://www.binance.com
2. **Create API Key**:
   - Account → API Management
   - Label: "KLINEO Copy Trading"
   - Permissions: ✅ Enable Reading, ✅ Enable Spot & Margin Trading
   - ❌ Enable Withdrawals (never enable)
3. **Whitelist IPs**: Add your server IP
4. **Save keys** in backend environment (NEVER in frontend)

### **Bybit API**

1. **Create Account**: https://www.bybit.com
2. **Create API Key**:
   - API Management → Create New Key
   - Permissions: ✅ Read, ✅ Trade
   - IP Restriction: Enable and whitelist server IP
3. **Save keys** in backend

### **OKX API**

1. **Create Account**: https://www.okx.com
2. **Create API Key**:
   - Profile → API → Create API Key
   - Permissions: ✅ Read, ✅ Trade
   - IP Whitelist: Add server IP
   - Passphrase: Create strong passphrase
3. **Save keys** in backend

**⚠️ SECURITY:**
- NEVER expose API keys in frontend
- Always use backend proxy for exchange calls
- Enable IP whitelisting
- Disable withdrawal permissions
- Rotate keys regularly
- Use read-only keys for display data

---

## 📈 MONITORING & ANALYTICS

### **1. Error Tracking - Sentry**

```bash
npm install @sentry/react @sentry/vite-plugin
```

**Configure in `/src/main.tsx`:**

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxx@xxx.ingest.sentry.io/xxx",
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### **2. Performance Monitoring - Lighthouse CI**

```bash
npm install -D @lhci/cli
```

**Create `lighthouserc.json`:**

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

**Run:**
```bash
npm run build
npm run preview
lhci autorun
```

### **3. Uptime Monitoring**

**Options:**
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom**: https://www.pingdom.com
- **StatusCake**: https://www.statuscake.com

**Configure:**
- Check interval: 5 minutes
- Check type: HTTPS
- Alerts: Email, SMS, Slack

---

## ✅ POST-DEPLOYMENT TESTING

### **Smoke Tests**

```bash
# Check homepage loads
curl -I https://klineo.com

# Check SSL certificate
curl -vI https://klineo.com 2>&1 | grep -i "SSL certificate"

# Check redirects
curl -I http://klineo.com  # Should redirect to HTTPS
curl -I https://www.klineo.com  # Should redirect to apex domain
```

### **Functional Tests**

- [ ] Homepage loads without errors
- [ ] Navigation works on all pages
- [ ] Login/Signup forms work
- [ ] Pricing page displays correctly
- [ ] Chat widget opens/closes
- [ ] Mobile menu works
- [ ] All images load
- [ ] Forms validate properly
- [ ] Error pages work (404, 500)

### **Performance Tests**

```bash
# Run Lighthouse
npm install -g lighthouse
lighthouse https://klineo.com --view

# Check page speed
https://pagespeed.web.dev/

# Check bundle size
npm run build
ls -lh dist/assets/*.js
```

### **Security Tests**

```bash
# Check security headers
curl -I https://klineo.com

# SSL test
https://www.ssllabs.com/ssltest/

# Security headers test
https://securityheaders.com/
```

---

## 🔄 ROLLBACK STRATEGY

### **Vercel Rollback**

1. Go to Vercel dashboard
2. Select deployment to rollback to
3. Click "..." → "Promote to Production"

**Or via CLI:**
```bash
vercel rollback
```

### **AWS S3 + CloudFront Rollback**

1. **Enable S3 versioning** (before first deploy):
```bash
aws s3api put-bucket-versioning \
  --bucket klineo-production \
  --versioning-configuration Status=Enabled
```

2. **Restore previous version**:
```bash
aws s3 sync s3://klineo-production s3://klineo-production-backup
aws s3 sync s3://klineo-backup/v1.0.0 s3://klineo-production
```

3. **Invalidate CloudFront cache**:
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### **Docker Rollback**

```bash
# Tag previous version
docker tag klineo:v1.0.0 klineo:latest

# Restart containers
docker-compose up -d
```

---

## 🛠️ TROUBLESHOOTING

### **Issue: Build Fails**

**Error:** `Module not found`

**Solution:**
```bash
rm -rf node_modules
npm install
npm run build
```

---

### **Issue: Environment Variables Not Working**

**Error:** `undefined` for `import.meta.env.VITE_*`

**Solution:**
- Ensure variable starts with `VITE_`
- Restart dev server after changing `.env`
- Check variable is set in hosting platform
- Don't destructure `import.meta.env`

---

### **Issue: 404 on Refresh (SPA Routing)**

**Error:** Refreshing `/pricing` returns 404

**Solution for Netlify:**
Create `public/_redirects`:
```
/* /index.html 200
```

**Solution for Vercel:**
Create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Solution for nginx:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

### **Issue: CORS Errors**

**Error:** `Access-Control-Allow-Origin` error

**Solution (Backend):**
```javascript
// Express.js example
const cors = require('cors');

app.use(cors({
  origin: 'https://klineo.com',
  credentials: true
}));
```

---

### **Issue: Slow Load Times**

**Solution:**
1. Enable Gzip/Brotli compression
2. Add CDN (CloudFront, Cloudflare)
3. Optimize images (WebP format)
4. Code splitting
5. Lazy load routes
6. Cache static assets

---

### **Issue: SSL Certificate Errors**

**Error:** "Your connection is not private"

**Solution:**
1. Verify DNS is pointing correctly
2. Wait for certificate provisioning (can take 24 hours)
3. Check certificate expiration
4. Ensure auto-renewal is enabled

---

## 🎯 FINAL DEPLOYMENT CHECKLIST

Before going live:

### **Pre-Launch**
- [ ] All tests passing
- [ ] Lighthouse score > 90
- [ ] SSL certificate active
- [ ] DNS propagated
- [ ] Environment variables set
- [ ] Error tracking configured (Sentry)
- [ ] Analytics tracking configured
- [ ] Uptime monitoring configured
- [ ] Backup strategy in place
- [ ] Rollback plan tested

### **Launch Day**
- [ ] Deploy to production
- [ ] Verify all pages load
- [ ] Test critical user flows
- [ ] Monitor error logs
- [ ] Monitor analytics
- [ ] Check performance metrics
- [ ] Verify payments work (test mode)
- [ ] Send test email notifications

### **Post-Launch (Week 1)**
- [ ] Monitor uptime
- [ ] Track user signups
- [ ] Review error logs daily
- [ ] Check load times
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Document issues
- [ ] Update changelog

---

## 📞 SUPPORT & RESOURCES

### **Official Docs**
- Vite: https://vitejs.dev/guide/
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/docs

### **Hosting Docs**
- Vercel: https://vercel.com/docs
- Netlify: https://docs.netlify.com/
- AWS: https://docs.aws.amazon.com/

### **Payment Docs**
- CoinPayments: https://www.coinpayments.net/merchant-tools

### **Exchange Docs**
- Binance API: https://binance-docs.github.io/apidocs/
- Bybit API: https://bybit-exchange.github.io/docs/
- OKX API: https://www.okx.com/docs-v5/

---

## 🎉 DEPLOYMENT COMPLETE!

Congratulations! Your KLINEO platform is now live and ready to serve users.

**Next Steps:**
1. Monitor initial traffic
2. Gather user feedback
3. Iterate on features
4. Scale infrastructure as needed

**Remember:**
- Deploy frequently
- Monitor constantly
- Test thoroughly
- Backup regularly
- Stay secure

---

**Need Help?**
- Check error logs in Sentry
- Review server logs
- Contact hosting support
- Consult deployment docs

**Good luck with your launch! 🚀**
