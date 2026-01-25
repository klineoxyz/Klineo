/**
 * KLINEO Analytics Tracking System
 * Supports multiple analytics providers:
 * - Google Analytics 4 (GA4)
 * - Plausible Analytics (privacy-friendly)
 * - Custom events for internal tracking
 */

// Environment variables
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
const IS_PRODUCTION = import.meta.env.PROD;

// Analytics provider type
type AnalyticsProvider = 'ga4' | 'plausible' | 'custom';

// Event categories
export type EventCategory =
  | 'navigation'
  | 'authentication'
  | 'copy_trading'
  | 'subscription'
  | 'referral'
  | 'engagement'
  | 'conversion'
  | 'error';

// Event parameters
interface EventParams {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

// Page view parameters
interface PageViewParams {
  path: string;
  title: string;
  referrer?: string;
}

// User properties
interface UserProperties {
  userId?: string;
  userType?: 'free' | 'starter' | 'pro' | 'unlimited';
  signupDate?: string;
  referralCode?: string;
  [key: string]: any;
}

// Conversion events
interface ConversionEvent {
  eventName: string;
  value?: number;
  currency?: string;
  transactionId?: string;
  items?: any[];
}

/**
 * Initialize analytics providers
 */
export const initAnalytics = () => {
  if (!IS_PRODUCTION) {
    console.log('[Analytics] Running in development mode - events will be logged only');
    return;
  }

  // Initialize Google Analytics 4
  if (GA_MEASUREMENT_ID) {
    initGA4();
  }

  // Initialize Plausible
  if (PLAUSIBLE_DOMAIN) {
    initPlausible();
  }

  console.log('[Analytics] Initialized successfully');
};

/**
 * Initialize Google Analytics 4
 */
const initGA4 = () => {
  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll send manually
    anonymize_ip: true,
  });

  // Make gtag globally available
  (window as any).gtag = gtag;

  console.log('[Analytics] GA4 initialized:', GA_MEASUREMENT_ID);
};

/**
 * Initialize Plausible Analytics
 */
const initPlausible = () => {
  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://plausible.io/js/script.js';
  script.setAttribute('data-domain', PLAUSIBLE_DOMAIN);
  document.head.appendChild(script);

  // Make plausible globally available
  (window as any).plausible = (window as any).plausible || function() {
    ((window as any).plausible.q = (window as any).plausible.q || []).push(arguments);
  };

  console.log('[Analytics] Plausible initialized:', PLAUSIBLE_DOMAIN);
};

/**
 * Track page view
 */
export const trackPageView = (params: PageViewParams) => {
  const { path, title, referrer } = params;

  if (!IS_PRODUCTION) {
    console.log('[Analytics] Page View:', { path, title, referrer });
    return;
  }

  // Google Analytics 4
  if (GA_MEASUREMENT_ID && (window as any).gtag) {
    (window as any).gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
      page_referrer: referrer,
    });
  }

  // Plausible (automatically tracks page views, but we can send custom events)
  if (PLAUSIBLE_DOMAIN && (window as any).plausible) {
    (window as any).plausible('pageview', {
      url: path,
    });
  }
};

/**
 * Track custom event
 */
export const trackEvent = (params: EventParams) => {
  const { category, action, label, value, ...rest } = params;

  if (!IS_PRODUCTION) {
    console.log('[Analytics] Event:', { category, action, label, value, ...rest });
    return;
  }

  // Google Analytics 4
  if (GA_MEASUREMENT_ID && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...rest,
    });
  }

  // Plausible
  if (PLAUSIBLE_DOMAIN && (window as any).plausible) {
    (window as any).plausible(action, {
      props: { category, label, ...rest },
    });
  }
};

/**
 * Track conversion event (purchases, signups, etc.)
 */
export const trackConversion = (event: ConversionEvent) => {
  const { eventName, value, currency = 'USD', transactionId, items } = event;

  if (!IS_PRODUCTION) {
    console.log('[Analytics] Conversion:', { eventName, value, currency, transactionId });
    return;
  }

  // Google Analytics 4
  if (GA_MEASUREMENT_ID && (window as any).gtag) {
    (window as any).gtag('event', eventName, {
      value,
      currency,
      transaction_id: transactionId,
      items,
    });
  }

  // Plausible goal
  if (PLAUSIBLE_DOMAIN && (window as any).plausible) {
    (window as any).plausible(eventName, {
      props: { value, currency, transactionId },
    });
  }
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: UserProperties) => {
  if (!IS_PRODUCTION) {
    console.log('[Analytics] User Properties:', properties);
    return;
  }

  // Google Analytics 4
  if (GA_MEASUREMENT_ID && (window as any).gtag) {
    (window as any).gtag('set', 'user_properties', properties);
  }
};

/**
 * Track user (set user ID)
 */
export const identifyUser = (userId: string, properties?: UserProperties) => {
  if (!IS_PRODUCTION) {
    console.log('[Analytics] Identify User:', userId, properties);
    return;
  }

  // Google Analytics 4
  if (GA_MEASUREMENT_ID && (window as any).gtag) {
    (window as any).gtag('config', GA_MEASUREMENT_ID, {
      user_id: userId,
    });
    
    if (properties) {
      setUserProperties(properties);
    }
  }
};

// ==========================================
// PREDEFINED EVENT TRACKERS
// ==========================================

/**
 * Navigation Events
 */
export const navigation = {
  clickLink: (linkName: string, destination: string) => {
    trackEvent({
      category: 'navigation',
      action: 'click_link',
      label: linkName,
      destination,
    });
  },

  openMobileMenu: () => {
    trackEvent({
      category: 'navigation',
      action: 'open_mobile_menu',
    });
  },

  clickCTA: (ctaText: string, location: string) => {
    trackEvent({
      category: 'navigation',
      action: 'click_cta',
      label: ctaText,
      location,
    });
  },
};

/**
 * Authentication Events
 */
export const auth = {
  signupStarted: () => {
    trackEvent({
      category: 'authentication',
      action: 'signup_started',
    });
  },

  signupCompleted: (method: string) => {
    trackConversion({
      eventName: 'sign_up',
      value: 0,
    });
    trackEvent({
      category: 'authentication',
      action: 'signup_completed',
      method,
    });
  },

  loginCompleted: (method: string) => {
    trackEvent({
      category: 'authentication',
      action: 'login_completed',
      method,
    });
  },

  loggedOut: () => {
    trackEvent({
      category: 'authentication',
      action: 'logged_out',
    });
  },

  passwordReset: () => {
    trackEvent({
      category: 'authentication',
      action: 'password_reset',
    });
  },
};

/**
 * Copy Trading Events
 */
export const copyTrading = {
  viewTrader: (traderId: string, traderName: string) => {
    trackEvent({
      category: 'copy_trading',
      action: 'view_trader',
      label: traderName,
      traderId,
    });
  },

  startCopy: (traderId: string, traderName: string, allocatedAmount: number) => {
    trackConversion({
      eventName: 'start_copy_trade',
      value: allocatedAmount,
    });
    trackEvent({
      category: 'copy_trading',
      action: 'start_copy',
      label: traderName,
      traderId,
      allocatedAmount,
    });
  },

  stopCopy: (traderId: string, traderName: string, reason?: string) => {
    trackEvent({
      category: 'copy_trading',
      action: 'stop_copy',
      label: traderName,
      traderId,
      reason,
    });
  },

  updateRiskSettings: (traderId: string, settingType: string) => {
    trackEvent({
      category: 'copy_trading',
      action: 'update_risk_settings',
      label: settingType,
      traderId,
    });
  },

  filterMarketplace: (filterType: string, filterValue: string) => {
    trackEvent({
      category: 'copy_trading',
      action: 'filter_marketplace',
      label: filterType,
      value: filterValue,
    });
  },
};

/**
 * Subscription Events
 */
export const subscription = {
  viewPricing: () => {
    trackEvent({
      category: 'subscription',
      action: 'view_pricing',
    });
  },

  selectPlan: (plan: string, duration: string) => {
    trackEvent({
      category: 'subscription',
      action: 'select_plan',
      label: plan,
      duration,
    });
  },

  checkoutStarted: (plan: string, amount: number) => {
    trackEvent({
      category: 'subscription',
      action: 'checkout_started',
      label: plan,
      value: amount,
    });
  },

  purchaseCompleted: (plan: string, amount: number, duration: string, transactionId: string) => {
    trackConversion({
      eventName: 'purchase',
      value: amount,
      currency: 'USD',
      transactionId,
      items: [
        {
          item_name: `${plan} - ${duration}`,
          item_category: 'subscription',
          price: amount,
          quantity: 1,
        },
      ],
    });
    trackEvent({
      category: 'subscription',
      action: 'purchase_completed',
      label: plan,
      value: amount,
      duration,
      transactionId,
    });
  },

  cancelSubscription: (plan: string, reason?: string) => {
    trackEvent({
      category: 'subscription',
      action: 'cancel_subscription',
      label: plan,
      reason,
    });
  },

  upgradeSubscription: (fromPlan: string, toPlan: string) => {
    trackEvent({
      category: 'subscription',
      action: 'upgrade_subscription',
      label: `${fromPlan} → ${toPlan}`,
      fromPlan,
      toPlan,
    });
  },
};

/**
 * Referral Events
 */
export const referral = {
  viewReferrals: () => {
    trackEvent({
      category: 'referral',
      action: 'view_referrals',
    });
  },

  copyReferralLink: () => {
    trackEvent({
      category: 'referral',
      action: 'copy_referral_link',
    });
  },

  shareReferral: (method: string) => {
    trackEvent({
      category: 'referral',
      action: 'share_referral',
      label: method,
    });
  },

  referralSignup: (referrerCode: string) => {
    trackConversion({
      eventName: 'referral_signup',
    });
    trackEvent({
      category: 'referral',
      action: 'referral_signup',
      referrerCode,
    });
  },

  earnedCommission: (amount: number, tier: number) => {
    trackEvent({
      category: 'referral',
      action: 'earned_commission',
      value: amount,
      tier,
    });
  },
};

/**
 * Engagement Events
 */
export const engagement = {
  openChatWidget: () => {
    trackEvent({
      category: 'engagement',
      action: 'open_chat_widget',
    });
  },

  sendChatMessage: (messageLength: number) => {
    trackEvent({
      category: 'engagement',
      action: 'send_chat_message',
      value: messageLength,
    });
  },

  downloadReport: (reportType: string) => {
    trackEvent({
      category: 'engagement',
      action: 'download_report',
      label: reportType,
    });
  },

  connectExchange: (exchange: string) => {
    trackEvent({
      category: 'engagement',
      action: 'connect_exchange',
      label: exchange,
    });
  },

  watchTutorial: (tutorialName: string) => {
    trackEvent({
      category: 'engagement',
      action: 'watch_tutorial',
      label: tutorialName,
    });
  },

  readBlogPost: (postTitle: string) => {
    trackEvent({
      category: 'engagement',
      action: 'read_blog_post',
      label: postTitle,
    });
  },

  contactSupport: (method: string) => {
    trackEvent({
      category: 'engagement',
      action: 'contact_support',
      label: method,
    });
  },
};

/**
 * Error Events
 */
export const error = {
  apiError: (endpoint: string, statusCode: number, errorMessage: string) => {
    trackEvent({
      category: 'error',
      action: 'api_error',
      label: endpoint,
      statusCode,
      errorMessage,
    });
  },

  validationError: (field: string, errorType: string) => {
    trackEvent({
      category: 'error',
      action: 'validation_error',
      label: field,
      errorType,
    });
  },

  paymentError: (errorCode: string, errorMessage: string) => {
    trackEvent({
      category: 'error',
      action: 'payment_error',
      label: errorCode,
      errorMessage,
    });
  },

  exchangeConnectionError: (exchange: string, errorMessage: string) => {
    trackEvent({
      category: 'error',
      action: 'exchange_connection_error',
      label: exchange,
      errorMessage,
    });
  },
};

/**
 * Export all analytics functions
 */
export const analytics = {
  init: initAnalytics,
  pageView: trackPageView,
  event: trackEvent,
  conversion: trackConversion,
  identify: identifyUser,
  setUserProperties,
  
  // Predefined trackers
  navigation,
  auth,
  copyTrading,
  subscription,
  referral,
  engagement,
  error,
};

// Default export
export default analytics;
