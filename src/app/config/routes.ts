/**
 * Route paths and mapping between view ids and URLs for deep linking.
 */
export const ROUTES = {
  // Public
  landing: "/",
  pricing: "/pricing",
  howItWorks: "/how-it-works",
  about: "/about",
  faq: "/faq",
  contact: "/contact",
  blog: "/blog",
  changelog: "/changelog",
  termsOfService: "/terms-of-service",
  privacyPolicy: "/privacy-policy",
  riskDisclosure: "/risk-disclosure",
  login: "/login",
  signup: "/signup",
  // App (authenticated)
  dashboard: "/dashboard",
  terminal: "/terminal",
  positions: "/positions",
  orders: "/orders",
  tradeHistory: "/trade-history",
  portfolio: "/portfolio",
  strategyBacktest: "/strategy-backtest",
  packages: "/packages",
  referrals: "/referrals",
  fees: "/fees",
  settings: "/settings",
  support: "/support",
  admin: "/admin",
  payments: "/payments",
  checkout: "/checkout",
  marketplace: "/marketplace",
  copyTrading: "/copy-trading",
  masterTraderApplication: "/master-trader-application",
  notificationsCenter: "/notifications-center",
  onboardingWizard: "/onboarding-wizard",
  smokeTest: "/smoke-test",
  uiStatesDemo: "/ui-states-demo",
} as const;

/** View id (legacy) to path */
export const VIEW_TO_PATH: Record<string, string> = {
  landing: ROUTES.landing,
  pricing: ROUTES.pricing,
  "how-it-works": ROUTES.howItWorks,
  about: ROUTES.about,
  faq: ROUTES.faq,
  contact: ROUTES.contact,
  blog: ROUTES.blog,
  changelog: ROUTES.changelog,
  "terms-of-service": ROUTES.termsOfService,
  "privacy-policy": ROUTES.privacyPolicy,
  "risk-disclosure": ROUTES.riskDisclosure,
  login: ROUTES.login,
  signup: ROUTES.signup,
  dashboard: ROUTES.dashboard,
  "trading-terminal": ROUTES.terminal,
  positions: ROUTES.positions,
  orders: ROUTES.orders,
  "trade-history": ROUTES.tradeHistory,
  portfolio: ROUTES.portfolio,
  "strategy-backtest": ROUTES.strategyBacktest,
  subscription: ROUTES.packages,
  referrals: ROUTES.referrals,
  fees: ROUTES.fees,
  settings: ROUTES.settings,
  support: ROUTES.support,
  admin: ROUTES.admin,
  payments: ROUTES.payments,
  checkout: ROUTES.checkout,
  marketplace: ROUTES.marketplace,
  "copy-trading": ROUTES.copyTrading,
  "master-trader-application": ROUTES.masterTraderApplication,
  "notifications-center": ROUTES.notificationsCenter,
  "onboarding-wizard": ROUTES.onboardingWizard,
  "smoke-test": ROUTES.smokeTest,
  "ui-states-demo": ROUTES.uiStatesDemo,
  "trader-profile": ROUTES.marketplace,
  "copy-setup": ROUTES.marketplace,
};

/** Path to view id for Sidebar active state. Prefer primary view when multiple views share a path (e.g. /marketplace). */
export const PATH_TO_VIEW: Record<string, string> = {};
const PRIMARY_VIEW_FOR_PATH: Record<string, string> = { [ROUTES.marketplace]: 'marketplace' };
Object.entries(VIEW_TO_PATH).forEach(([view, path]) => {
  const primary = PRIMARY_VIEW_FOR_PATH[path];
  if (primary) {
    if (view === primary) PATH_TO_VIEW[path] = view;
  } else {
    PATH_TO_VIEW[path] = view;
  }
});

export function pathForView(view: string): string {
  return VIEW_TO_PATH[view] ?? ROUTES.dashboard;
}

export function viewForPath(path: string): string {
  return PATH_TO_VIEW[path] ?? "dashboard";
}

export const PUBLIC_PATHS = new Set([
  ROUTES.landing,
  ROUTES.pricing,
  ROUTES.howItWorks,
  ROUTES.about,
  ROUTES.faq,
  ROUTES.contact,
  ROUTES.blog,
  ROUTES.changelog,
  ROUTES.termsOfService,
  ROUTES.privacyPolicy,
  ROUTES.riskDisclosure,
  ROUTES.login,
  ROUTES.signup,
]);
