import { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Toaster } from "@/app/components/ui/sonner";
import { TopBar } from "@/app/components/layout/TopBar";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { Dashboard } from "@/app/components/screens/Dashboard";
import { TradingTerminalNew } from "@/app/components/screens/TradingTerminalNew";
import { StrategyBacktest } from "@/app/components/screens/StrategyBacktest";
import { Marketplace } from "@/app/components/screens/Marketplace";
import { TraderProfile } from "@/app/components/screens/TraderProfile";
import { CopySetup } from "@/app/components/screens/CopySetup";
import { CopyTrading } from "@/app/components/screens/CopyTrading";
import { Portfolio } from "@/app/components/screens/Portfolio";
import { Positions } from "@/app/components/screens/Positions";
import { Orders } from "@/app/components/screens/Orders";
import { TradeHistory } from "@/app/components/screens/TradeHistory";
import { Fees } from "@/app/components/screens/Fees";
import { Referrals } from "@/app/components/screens/Referrals";
import { Subscription } from "@/app/components/screens/Subscription";
import { Payments } from "@/app/components/screens/Payments";
import { Settings } from "@/app/components/screens/Settings";
import { Support } from "@/app/components/screens/Support";
import { Admin } from "@/app/components/screens/Admin";
import { CheckoutPage } from "@/app/components/screens/CheckoutPage";
import { MasterTraderApplication } from "@/app/components/screens/MasterTraderApplication";
import { NotificationsCenter } from "@/app/components/screens/NotificationsCenter";
import { UIStatesDemo } from "@/app/components/screens/UIStatesDemo";
import { OnboardingWizard } from "@/app/components/screens/OnboardingWizard";
import { SmokeTest } from "@/app/components/screens/SmokeTest";

import { LandingPage } from "@/app/components/public/LandingPage";
import { PricingPage } from "@/app/components/public/PricingPage";
import { HowItWorksPage } from "@/app/components/public/HowItWorksPage";
import { AboutPage } from "@/app/components/public/AboutPage";
import { FAQPage } from "@/app/components/public/FAQPage";
import { ContactPage } from "@/app/components/public/ContactPage";
import { BlogPage } from "@/app/components/public/BlogPage";
import { ChangelogPage } from "@/app/components/public/ChangelogPage";
import { TermsOfService } from "@/app/components/public/TermsOfService";
import { PrivacyPolicy } from "@/app/components/public/PrivacyPolicy";
import { RiskDisclosure } from "@/app/components/public/RiskDisclosure";
import { LoginPage } from "@/app/components/auth/LoginPage";
import { SignUpPage } from "@/app/components/auth/SignUpPage";
import { RefRedirect } from "@/app/components/auth/RefRedirect";
import { useAuth } from "@/app/contexts/AuthContext";
import { TerminalLoader } from "@/app/components/ui/spinner";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import { MobileNavSheet } from "@/app/components/layout/MobileNavSheet";
import { ErrorBoundary } from "@/app/components/ui/error-boundary";
import { ROUTES, pathForView, viewForPath, PUBLIC_PATHS, REF_CODE_STORAGE_KEY } from "@/app/config/routes";
import { api } from "@/lib/api";

export default function App() {
  const { isAuthenticated, isAdmin, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const pathname = location.pathname;
  const activeView = viewForPath(pathname);
  const viewData = location.state;

  const handleNavigate = (view: string, data?: any) => {
    const path = pathForView(view);
    const state = data != null ? (typeof data === "object" && !Array.isArray(data) ? { ...data, subView: view } : { subView: view }) : undefined;
    navigate(path, { state, replace: false });
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.landing, { replace: true });
  };

  const refClaimAttempted = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || refClaimAttempted.current) return;
    try {
      const stored = localStorage.getItem(REF_CODE_STORAGE_KEY);
      if (!stored?.trim()) return;
      refClaimAttempted.current = true;
      api
        .post("/api/referrals/claim", { code: stored.trim() })
        .then(() => {
          try {
            localStorage.removeItem(REF_CODE_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          refClaimAttempted.current = false;
        });
    } catch {
      refClaimAttempted.current = false;
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <TerminalLoader />
      </div>
    );
  }

  const isPublicPath = PUBLIC_PATHS.has(pathname) || pathname.startsWith(`${ROUTES.ref}/`);
  if (!isAuthenticated && !isPublicPath) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (isAuthenticated && pathname === ROUTES.landing) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  if (isAuthenticated && (pathname === ROUTES.login || pathname === ROUTES.signup)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  if (isAuthenticated && activeView === "admin" && !isAdmin) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  if (!isAuthenticated) {
    const publicRoutes = (
      <Routes>
        <Route path={ROUTES.landing} element={<LandingPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.pricing} element={<PricingPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.howItWorks} element={<HowItWorksPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.about} element={<AboutPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.faq} element={<FAQPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.contact} element={<ContactPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.blog} element={<BlogPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.changelog} element={<ChangelogPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.termsOfService} element={<TermsOfService onNavigate={handleNavigate} />} />
        <Route path={ROUTES.privacyPolicy} element={<PrivacyPolicy onNavigate={handleNavigate} />} />
        <Route path={ROUTES.riskDisclosure} element={<RiskDisclosure onNavigate={handleNavigate} />} />
        <Route path={ROUTES.login} element={<LoginPage onNavigate={handleNavigate} />} />
        <Route path={ROUTES.signup} element={<SignUpPage onNavigate={handleNavigate} />} />
        <Route path={`${ROUTES.ref}/:code`} element={<RefRedirect />} />
        <Route path="*" element={<LandingPage onNavigate={handleNavigate} />} />
      </Routes>
    );
    return (
      <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden dark min-w-0">
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {publicRoutes}
        </main>
        <Toaster />
      </div>
    );
  }

  function renderContent() {
    const subView = viewData?.subView;
    if (pathname === ROUTES.marketplace && subView === "trader-profile") {
      return <TraderProfile onNavigate={handleNavigate} traderData={viewData} />;
    }
    if (pathname === ROUTES.marketplace && subView === "copy-setup") {
      return <CopySetup onNavigate={handleNavigate} traderData={viewData} />;
    }
    switch (activeView) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "trading-terminal":
        return <TradingTerminalNew onNavigate={handleNavigate} />;
      case "strategy-backtest":
        return (
          <ErrorBoundary onRetry={() => window.location.reload()}>
            <StrategyBacktest onNavigate={handleNavigate} />
          </ErrorBoundary>
        );
      case "marketplace":
        return <Marketplace onNavigate={handleNavigate} />;
      case "copy-trading":
        return <CopyTrading onNavigate={handleNavigate} />;
      case "portfolio":
        return <Portfolio />;
      case "positions":
        return <Positions />;
      case "orders":
        return <Orders />;
      case "trade-history":
        return <TradeHistory />;
      case "fees":
        return <Fees />;
      case "referrals":
        return <Referrals onNavigate={handleNavigate} />;
      case "subscription":
        return <Subscription onNavigate={handleNavigate} />;
      case "payments":
        return <Payments onNavigate={handleNavigate} viewData={viewData} />;
      case "settings":
        return <Settings onNavigate={handleNavigate} />;
      case "support":
        return <Support />;
      case "admin":
        return <Admin />;
      case "checkout":
        return <CheckoutPage onNavigate={handleNavigate} />;
      case "master-trader-application":
        return <MasterTraderApplication onNavigate={handleNavigate} />;
      case "notifications-center":
        return <NotificationsCenter onNavigate={handleNavigate} />;
      case "ui-states-demo":
        if (import.meta.env.PROD && !isAdmin) {
          setTimeout(() => toast.error("UI States Demo disabled in production", { description: "This page is only available in development or for admins." }), 100);
          return <Dashboard onNavigate={handleNavigate} />;
        }
        return <UIStatesDemo onNavigate={handleNavigate} />;
      case "smoke-test":
        if (import.meta.env.PROD && (!isAdmin || import.meta.env.VITE_ENABLE_SMOKE_TEST_PAGE !== "true")) {
          setTimeout(() => toast.error("Not available", { description: "Smoke test is enabled only for admins when VITE_ENABLE_SMOKE_TEST_PAGE=true." }), 100);
          return <Dashboard onNavigate={handleNavigate} />;
        }
        return <SmokeTest />;
      case "onboarding-wizard":
        return (
          <OnboardingWizard
            onComplete={() => handleNavigate("dashboard")}
            onSkip={() => handleNavigate("marketplace")}
          />
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden dark min-w-0">
      <TopBar
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        sidebarCollapsed={sidebarCollapsed}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden min-w-0">
        <Sidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isAdmin={isAdmin}
        />
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
              <ErrorBoundary
                onRetry={() => navigate(ROUTES.dashboard)}
                fallback={
                  <div className="min-h-[320px] flex flex-col items-center justify-center gap-4 p-6 bg-background text-foreground">
                    <h3 className="text-lg font-semibold">Something went wrong</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      This page could not be loaded. Try another menu item or go to Dashboard.
                    </p>
                    <Button variant="outline" onClick={() => navigate(ROUTES.dashboard)}>
                      Go to Dashboard
                    </Button>
                  </div>
                }
              >
                {renderContent()}
              </ErrorBoundary>
            </main>
      </div>
      {isMobile && (
        <MobileNavSheet
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          activeView={activeView}
          onNavigate={handleNavigate}
          isAdmin={isAdmin}
        />
      )}
      <Toaster />
    </div>
  );
}

