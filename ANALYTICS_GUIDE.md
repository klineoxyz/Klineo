# KLINEO ANALYTICS TRACKING GUIDE 📊
**Complete Guide to Analytics Implementation**  
**Last Updated: January 24, 2026**

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Supported Providers](#supported-providers)
4. [Setup Instructions](#setup-instructions)
5. [Usage Examples](#usage-examples)
6. [Event Catalog](#event-catalog)
7. [Custom Events](#custom-events)
8. [Privacy & GDPR](#privacy--gdpr)
9. [Testing Analytics](#testing-analytics)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 OVERVIEW

KLINEO's analytics system supports **multiple providers** and tracks:

✅ **Page Views** - Automatic tracking on route changes  
✅ **User Actions** - Button clicks, form submissions, navigation  
✅ **Conversions** - Signups, subscriptions, copy trading starts  
✅ **Engagement** - Chat widget usage, feature interactions  
✅ **Errors** - API failures, validation errors, payment issues  
✅ **User Properties** - Plan tier, signup date, referral code  

**Supported Providers:**
- **Google Analytics 4 (GA4)** - Industry standard
- **Plausible Analytics** - Privacy-friendly alternative
- **Custom Events** - Internal tracking/debugging

---

## 🚀 QUICK START

### **1. Set Environment Variables**

Add to `.env.production`:

```bash
# Google Analytics 4
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Plausible Analytics (optional)
VITE_PLAUSIBLE_DOMAIN=klineo.com
```

### **2. Initialize Analytics**

Analytics is automatically initialized in `/src/lib/analytics.ts`.

The initialization happens when your app loads. No manual setup needed!

### **3. Track Events in Components**

```typescript
import { useAnalytics } from '@/lib/useAnalytics';

function MyComponent() {
  const analytics = useAnalytics();

  const handleClick = () => {
    analytics.navigation.clickCTA('Start Trading', 'hero_section');
    // ... rest of your logic
  };

  return <button onClick={handleClick}>Start Trading</button>;
}
```

### **4. Automatic Page View Tracking**

```typescript
import { usePageTracking } from '@/lib/useAnalytics';

function MyPage() {
  usePageTracking('pricing', 'Pricing Plans - KLINEO');
  
  return <div>Your page content</div>;
}
```

**That's it!** Your events are now being tracked.

---

## 📊 SUPPORTED PROVIDERS

### **Google Analytics 4 (GA4)**

**When to use:**
- Need detailed funnel analysis
- Want demographic data
- Integration with Google Ads
- Standard analytics platform

**Setup:**

1. **Create GA4 Property:**
   - Go to: https://analytics.google.com
   - Admin → Create Property
   - Property Name: "KLINEO"
   - Select "Web" data stream

2. **Get Measurement ID:**
   - Data Streams → Select your stream
   - Copy "Measurement ID" (format: `G-XXXXXXXXXX`)

3. **Add to Environment:**
   ```bash
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

**Features:**
- ✅ Real-time tracking
- ✅ Custom events
- ✅ User demographics
- ✅ Conversion tracking
- ✅ Funnel visualization
- ✅ Free tier (unlimited)

---

### **Plausible Analytics**

**When to use:**
- Privacy-focused approach
- GDPR compliance without cookie banners
- Simple, fast analytics
- Open-source preference

**Setup:**

1. **Create Account:**
   - Go to: https://plausible.io
   - Add your website: `klineo.com`

2. **Add to Environment:**
   ```bash
   VITE_PLAUSIBLE_DOMAIN=klineo.com
   ```

3. **Verify Installation:**
   - Go to Plausible dashboard
   - Check if events are coming through

**Features:**
- ✅ Privacy-friendly (no cookies)
- ✅ Lightweight script (< 1KB)
- ✅ GDPR/CCPA compliant
- ✅ Simple dashboard
- ✅ Custom goals
- ❌ Paid (after 30-day trial)

---

## 🛠️ SETUP INSTRUCTIONS

### **Step 1: Create Google Analytics Account**

1. Go to https://analytics.google.com
2. Sign in with Google account
3. Click "Start measuring"
4. Account name: "KLINEO"
5. Property name: "KLINEO Production"
6. Reporting time zone: Your timezone
7. Currency: USD
8. Industry category: Finance
9. Business size: Small/Medium
10. Data stream type: Web
11. Website URL: `https://klineo.com`
12. Stream name: "KLINEO Web"

### **Step 2: Configure GA4 Settings**

**Enhanced Measurement (Auto-tracking):**
- ✅ Page views
- ✅ Scrolls
- ✅ Outbound clicks
- ✅ Site search
- ✅ Video engagement
- ✅ File downloads

**User Data Collection:**
- ✅ Collect user data
- ✅ Enable Google signals (for demographics)
- ❌ Do NOT enable IP anonymization (GA4 does this by default)

**Data Retention:**
- Event data retention: **14 months** (maximum)
- User data retention: **14 months**

### **Step 3: Create Custom Conversions**

In GA4, go to **Configure** → **Events** → **Create Event**:

1. **signup** - Mark as conversion ✅
2. **purchase** - Mark as conversion ✅
3. **start_copy_trade** - Mark as conversion ✅
4. **referral_signup** - Mark as conversion ✅

### **Step 4: Set Up Goals in Plausible (Optional)**

If using Plausible:

1. Go to Settings → Goals
2. Add custom goals:
   - `sign_up`
   - `purchase`
   - `start_copy_trade`
   - `referral_signup`

### **Step 5: Verify Tracking**

1. **Development Mode:**
   ```bash
   npm run dev
   ```
   - Open browser console
   - Look for `[Analytics]` logs
   - Events are logged but NOT sent

2. **Production Mode:**
   ```bash
   npm run build
   npm run preview
   ```
   - Navigate through app
   - Check GA4 Realtime report
   - Check Plausible dashboard

---

## 💡 USAGE EXAMPLES

### **Example 1: Track Button Click**

```typescript
import { useAnalytics } from '@/lib/useAnalytics';

function HeroSection() {
  const analytics = useAnalytics();

  return (
    <button
      onClick={() => {
        analytics.navigation.clickCTA('Start Trading', 'hero_section');
        // Navigate to signup
      }}
    >
      Start Trading
    </button>
  );
}
```

---

### **Example 2: Track Signup**

```typescript
import { useAnalytics } from '@/lib/useAnalytics';

function SignUpPage() {
  const analytics = useAnalytics();

  const handleSubmit = async (email: string, password: string) => {
    // Track signup started
    analytics.auth.signupStarted();

    try {
      await api.signup(email, password);
      
      // Track signup completed (conversion)
      analytics.auth.signupCompleted('email');
      
      // Identify user
      analytics.identifyUser('user_123', {
        userType: 'free',
        signupDate: new Date().toISOString(),
      });
    } catch (error) {
      // Track error
      analytics.error.apiError('/auth/signup', 500, error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

---

### **Example 3: Track Copy Trading**

```typescript
import { useAnalytics } from '@/lib/useAnalytics';

function CopySetup() {
  const analytics = useAnalytics();

  const handleStartCopy = async (traderId: string, amount: number) => {
    try {
      await api.startCopy(traderId, amount);
      
      // Track conversion
      analytics.copyTrading.startCopy(
        traderId,
        'Top Trader',
        amount
      );
    } catch (error) {
      analytics.error.apiError('/copy/start', 500, error.message);
    }
  };

  return (
    <button onClick={() => handleStartCopy('trader_123', 1000)}>
      Start Copying
    </button>
  );
}
```

---

### **Example 4: Track Subscription Purchase**

```typescript
import { useAnalytics } from '@/lib/useAnalytics';

function CheckoutPage() {
  const analytics = useAnalytics();

  const handlePurchase = async (plan: string, amount: number) => {
    // Track checkout started
    analytics.subscription.checkoutStarted(plan, amount);

    try {
      const result = await api.purchase(plan);
      
      // Track successful purchase (conversion)
      analytics.subscription.purchaseCompleted(
        plan,
        amount,
        'monthly',
        result.transactionId
      );
    } catch (error) {
      analytics.error.paymentError('PAYMENT_FAILED', error.message);
    }
  };

  return <button onClick={() => handlePurchase('pro', 79)}>Buy Now</button>;
}
```

---

### **Example 5: Track Chat Widget**

```typescript
import { useAnalytics } from '@/lib/useAnalytics';

function ChatWidget() {
  const analytics = useAnalytics();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    analytics.engagement.openChatWidget();
  };

  const handleSendMessage = (message: string) => {
    analytics.engagement.sendChatMessage(message.length);
    // Send message logic
  };

  return (
    <div>
      <button onClick={handleOpen}>Ask KLINEO</button>
      {/* Chat UI */}
    </div>
  );
}
```

---

### **Example 6: Track Page Views**

```typescript
import { usePageTracking } from '@/lib/useAnalytics';

function PricingPage() {
  // Automatically tracks page view
  usePageTracking('pricing', 'Pricing Plans - KLINEO');

  return <div>Pricing content</div>;
}
```

---

### **Example 7: Track Referral Link Copy**

```typescript
import { useAnalytics } from '@/lib/useAnalytics';

function ReferralsPage() {
  const analytics = useAnalytics();

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://klineo.com?ref=abc123');
    analytics.referral.copyReferralLink();
  };

  return <button onClick={handleCopyLink}>Copy Link</button>;
}
```

---

## 📖 EVENT CATALOG

### **Navigation Events**

| Event | Trigger | Parameters |
|-------|---------|------------|
| `click_link` | User clicks navigation link | `linkName`, `destination` |
| `click_cta` | User clicks CTA button | `ctaText`, `location` |
| `open_mobile_menu` | User opens mobile menu | - |

**Usage:**
```typescript
analytics.navigation.clickLink('Pricing', '/pricing');
analytics.navigation.clickCTA('Start Trading', 'navbar');
analytics.navigation.openMobileMenu();
```

---

### **Authentication Events**

| Event | Trigger | Parameters |
|-------|---------|------------|
| `signup_started` | User begins signup flow | - |
| `signup_completed` | User completes signup (conversion) | `method` |
| `login_completed` | User logs in | `method` |
| `logged_out` | User logs out | - |
| `password_reset` | User resets password | - |

**Usage:**
```typescript
analytics.auth.signupStarted();
analytics.auth.signupCompleted('email');
analytics.auth.loginCompleted('google');
analytics.auth.loggedOut();
```

---

### **Copy Trading Events**

| Event | Trigger | Parameters |
|-------|---------|------------|
| `view_trader` | User views trader profile | `traderId`, `traderName` |
| `start_copy` | User starts copying (conversion) | `traderId`, `traderName`, `allocatedAmount` |
| `stop_copy` | User stops copying | `traderId`, `traderName`, `reason` |
| `update_risk_settings` | User updates risk settings | `traderId`, `settingType` |
| `filter_marketplace` | User filters marketplace | `filterType`, `filterValue` |

**Usage:**
```typescript
analytics.copyTrading.viewTrader('t123', 'Top Trader');
analytics.copyTrading.startCopy('t123', 'Top Trader', 1000);
analytics.copyTrading.stopCopy('t123', 'Top Trader', 'poor_performance');
analytics.copyTrading.updateRiskSettings('t123', 'stop_loss');
analytics.copyTrading.filterMarketplace('roi', '>50%');
```

---

### **Subscription Events**

| Event | Trigger | Parameters |
|-------|---------|------------|
| `view_pricing` | User views pricing page | - |
| `select_plan` | User selects a plan | `plan`, `duration` |
| `checkout_started` | User starts checkout | `plan`, `amount` |
| `purchase_completed` | User completes purchase (conversion) | `plan`, `amount`, `duration`, `transactionId` |
| `cancel_subscription` | User cancels subscription | `plan`, `reason` |
| `upgrade_subscription` | User upgrades plan | `fromPlan`, `toPlan` |

**Usage:**
```typescript
analytics.subscription.viewPricing();
analytics.subscription.selectPlan('pro', 'monthly');
analytics.subscription.checkoutStarted('pro', 79);
analytics.subscription.purchaseCompleted('pro', 79, 'monthly', 'txn_123');
analytics.subscription.cancelSubscription('pro', 'too_expensive');
analytics.subscription.upgradeSubscription('starter', 'pro');
```

---

### **Referral Events**

| Event | Trigger | Parameters |
|-------|---------|------------|
| `view_referrals` | User views referrals page | - |
| `copy_referral_link` | User copies referral link | - |
| `share_referral` | User shares referral | `method` |
| `referral_signup` | New user signs up via referral (conversion) | `referrerCode` |
| `earned_commission` | User earns referral commission | `amount`, `tier` |

**Usage:**
```typescript
analytics.referral.viewReferrals();
analytics.referral.copyReferralLink();
analytics.referral.shareReferral('twitter');
analytics.referral.referralSignup('abc123');
analytics.referral.earnedCommission(20, 1);
```

---

### **Engagement Events**

| Event | Trigger | Parameters |
|-------|---------|------------|
| `open_chat_widget` | User opens chat widget | - |
| `send_chat_message` | User sends chat message | `messageLength` |
| `download_report` | User downloads report | `reportType` |
| `connect_exchange` | User connects exchange | `exchange` |
| `watch_tutorial` | User watches tutorial | `tutorialName` |
| `read_blog_post` | User reads blog post | `postTitle` |
| `contact_support` | User contacts support | `method` |

**Usage:**
```typescript
analytics.engagement.openChatWidget();
analytics.engagement.sendChatMessage(50);
analytics.engagement.downloadReport('trade_history');
analytics.engagement.connectExchange('binance');
analytics.engagement.watchTutorial('copy_trading_basics');
analytics.engagement.readBlogPost('Market Analysis Jan 2026');
analytics.engagement.contactSupport('email');
```

---

### **Error Events**

| Event | Trigger | Parameters |
|-------|---------|------------|
| `api_error` | API request fails | `endpoint`, `statusCode`, `errorMessage` |
| `validation_error` | Form validation fails | `field`, `errorType` |
| `payment_error` | Payment fails | `errorCode`, `errorMessage` |
| `exchange_connection_error` | Exchange connection fails | `exchange`, `errorMessage` |

**Usage:**
```typescript
analytics.error.apiError('/api/traders', 500, 'Server error');
analytics.error.validationError('email', 'invalid_format');
analytics.error.paymentError('INSUFFICIENT_FUNDS', 'Not enough balance');
analytics.error.exchangeConnectionError('binance', 'API key invalid');
```

---

## 🎨 CUSTOM EVENTS

For events not covered by predefined trackers:

```typescript
import analytics from '@/lib/analytics';

// Track custom event
analytics.event({
  category: 'engagement',
  action: 'custom_action',
  label: 'Optional label',
  value: 123,
  customParam1: 'data',
  customParam2: 'more data',
});
```

**Example - Track Feature Usage:**

```typescript
analytics.event({
  category: 'engagement',
  action: 'use_advanced_filter',
  label: 'marketplace',
  filterType: 'sharpe_ratio',
  filterValue: '>2.0',
});
```

---

## 🔒 PRIVACY & GDPR

### **GA4 Privacy Settings**

**Automatically Enabled:**
- ✅ IP anonymization (GA4 default)
- ✅ No personally identifiable information (PII)
- ✅ Secure data transfer (HTTPS only)

**User Consent:**

If you need cookie consent (EU users):

1. **Install Cookie Consent Library:**
```bash
npm install react-cookie-consent
```

2. **Add Consent Banner:**
```typescript
import CookieConsent from "react-cookie-consent";

function App() {
  return (
    <>
      <CookieConsent
        location="bottom"
        buttonText="Accept"
        declineButtonText="Decline"
        enableDeclineButton
        onAccept={() => {
          analytics.init(); // Initialize only after consent
        }}
        onDecline={() => {
          // Don't initialize analytics
        }}
      >
        We use cookies to analyze traffic and improve user experience.
      </CookieConsent>
      {/* Rest of app */}
    </>
  );
}
```

### **Plausible Privacy**

Plausible is **GDPR compliant by default**:
- ✅ No cookies
- ✅ No personal data collection
- ✅ No cross-site tracking
- ✅ CCPA compliant
- ✅ No consent banner needed (in most cases)

### **Data Collected**

**We track:**
- ✅ Page views
- ✅ Button clicks
- ✅ Feature usage
- ✅ Conversion events

**We DON'T track:**
- ❌ Names, emails, phone numbers
- ❌ IP addresses (anonymized automatically)
- ❌ Credit card numbers
- ❌ Social security numbers
- ❌ Any PII (personally identifiable information)

---

## 🧪 TESTING ANALYTICS

### **Development Mode**

In development (`npm run dev`):
- Events are **logged to console** only
- NO data sent to analytics providers
- Easy debugging

**Console output:**
```
[Analytics] Initialized successfully
[Analytics] Page View: { path: '/pricing', title: 'Pricing - KLINEO' }
[Analytics] Event: { category: 'navigation', action: 'click_cta', label: 'Start Trading' }
```

---

### **Production Preview**

Test with production build:

```bash
npm run build
npm run preview
```

1. Open `http://localhost:4173`
2. Open GA4 Realtime report
3. Navigate through app
4. Verify events appear in realtime

---

### **Debug Mode (GA4)**

Enable debug mode in browser console:

```javascript
gtag('config', 'G-XXXXXXXXXX', {
  debug_mode: true
});
```

Or add to URL:
```
http://localhost:4173?debug_mode=true
```

---

### **Test Event Tracking**

Create a test component:

```typescript
function AnalyticsTest() {
  const analytics = useAnalytics();

  const testAll = () => {
    analytics.navigation.clickCTA('Test Button', 'test_page');
    analytics.auth.signupStarted();
    analytics.copyTrading.viewTrader('test_123', 'Test Trader');
    analytics.subscription.viewPricing();
    analytics.engagement.openChatWidget();
  };

  return <button onClick={testAll}>Test All Events</button>;
}
```

---

## 🛠️ TROUBLESHOOTING

### **Issue: Events Not Showing in GA4**

**Possible Causes:**
1. Wrong Measurement ID
2. Ad blocker enabled
3. Running in development mode
4. DNS not propagated (for custom domain)

**Solutions:**
1. Verify `VITE_GA_MEASUREMENT_ID` is correct
2. Disable ad blockers
3. Test with `npm run build && npm run preview`
4. Check GA4 Realtime report (can take 30 seconds)

---

### **Issue: Duplicate Page Views**

**Cause:** Multiple `usePageTracking` calls or React Strict Mode

**Solution:**
```typescript
// Only call once per component
usePageTracking('pricing');

// Or disable in development
if (import.meta.env.PROD) {
  usePageTracking('pricing');
}
```

---

### **Issue: Custom Events Not Working**

**Cause:** Wrong event format or blocked by ad blocker

**Solution:**
```typescript
// Make sure category and action are provided
analytics.event({
  category: 'engagement', // Required
  action: 'custom_action', // Required
  label: 'optional',
  value: 123,
});
```

---

### **Issue: "gtag is not defined" Error**

**Cause:** Analytics not initialized or script blocked

**Solution:**
1. Ensure `VITE_GA_MEASUREMENT_ID` is set
2. Check browser console for script errors
3. Verify script is loaded: `console.log(window.gtag)`

---

## 📈 ANALYTICS DASHBOARD GUIDE

### **GA4 Reports to Monitor**

1. **Realtime Report:**
   - Current active users
   - Real-time events
   - Real-time conversions

2. **Acquisition Report:**
   - Traffic sources
   - Campaign performance
   - Referral sources

3. **Engagement Report:**
   - Page views
   - Event counts
   - User engagement time

4. **Retention Report:**
   - Returning users
   - Cohort analysis
   - User lifetime value

5. **Conversions Report:**
   - Signup completions
   - Purchase completions
   - Copy trading starts
   - Referral signups

### **Custom Reports to Create**

1. **Funnel: Signup Conversion**
   - Landing page view
   - Pricing page view
   - Signup started
   - Signup completed

2. **Funnel: Subscription Purchase**
   - View pricing
   - Select plan
   - Checkout started
   - Purchase completed

3. **Funnel: Copy Trading**
   - Marketplace view
   - Trader profile view
   - Copy setup
   - Start copy

---

## 🎯 KEY METRICS TO TRACK

### **Top-Level KPIs**
- Total signups
- Conversion rate (visitor → signup)
- Subscription conversion rate
- Copy trading starts
- Average revenue per user (ARPU)
- Customer lifetime value (LTV)

### **Engagement Metrics**
- Pages per session
- Session duration
- Bounce rate
- Return visitor rate
- Feature usage rates

### **Conversion Funnels**
- Landing → Signup: Target > 5%
- Signup → First Copy: Target > 30%
- Free → Paid: Target > 10%
- Starter → Pro: Target > 20%

---

## 🚀 NEXT STEPS

1. **Set up GA4 property**
2. **Add Measurement ID to `.env.production`**
3. **Deploy and verify tracking**
4. **Create custom reports**
5. **Set up conversion goals**
6. **Monitor key metrics weekly**
7. **Iterate based on data**

---

## 📞 SUPPORT

**Need Help?**
- GA4 Docs: https://support.google.com/analytics/
- Plausible Docs: https://plausible.io/docs
- Community: https://stackoverflow.com/questions/tagged/google-analytics

---

**Happy Tracking! 📊**
