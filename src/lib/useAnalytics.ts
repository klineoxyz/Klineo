/**
 * React Hook for Analytics Tracking
 * Automatically tracks page views and provides event tracking functions
 */

import { useEffect } from 'react';
import analytics from './analytics';

/**
 * Hook to track page views automatically
 */
export const usePageTracking = (view: string, title?: string) => {
  useEffect(() => {
    // Track page view when view changes
    const path = `/${view}`;
    const pageTitle = title || formatViewTitle(view);
    
    analytics.pageView({
      path,
      title: pageTitle,
      referrer: document.referrer,
    });
  }, [view, title]);
};

/**
 * Format view name to readable title
 */
const formatViewTitle = (view: string): string => {
  // Map view names to readable titles
  const titleMap: Record<string, string> = {
    'landing': 'Home - KLINEO',
    'dashboard': 'Dashboard - KLINEO',
    'marketplace': 'Trader Marketplace - KLINEO',
    'copy-trading': 'Copy Trading - KLINEO',
    'portfolio': 'Portfolio - KLINEO',
    'positions': 'Active Positions - KLINEO',
    'orders': 'Orders - KLINEO',
    'trade-history': 'Trade History - KLINEO',
    'fees': 'Fees - KLINEO',
    'referrals': 'Referrals - KLINEO',
    'subscription': 'Subscription - KLINEO',
    'settings': 'Settings - KLINEO',
    'support': 'Support - KLINEO',
    'pricing': 'Pricing - KLINEO',
    'how-it-works': 'How It Works - KLINEO',
    'about': 'About - KLINEO',
    'faq': 'FAQ - KLINEO',
    'contact': 'Contact - KLINEO',
    'blog': 'Blog - KLINEO',
    'login': 'Login - KLINEO',
    'signup': 'Sign Up - KLINEO',
  };

  return titleMap[view] || `${view.charAt(0).toUpperCase() + view.slice(1)} - KLINEO`;
};

/**
 * Hook to get analytics tracking functions
 */
export const useAnalytics = () => {
  return {
    // Core tracking
    trackEvent: analytics.event,
    trackConversion: analytics.conversion,
    identifyUser: analytics.identify,
    
    // Predefined trackers
    navigation: analytics.navigation,
    auth: analytics.auth,
    copyTrading: analytics.copyTrading,
    subscription: analytics.subscription,
    referral: analytics.referral,
    engagement: analytics.engagement,
    error: analytics.error,
  };
};

export default useAnalytics;
