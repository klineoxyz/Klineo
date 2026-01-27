import { useState, useEffect, useMemo } from "react";
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
import { useAuth } from "@/app/contexts/AuthContext";
import { TerminalLoader } from "@/app/components/ui/spinner";
import { toast } from "sonner";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import { MobileNavSheet } from "@/app/components/layout/MobileNavSheet";

export default function App() {
  const { isAuthenticated, isAdmin, loading, logout } = useAuth();
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState("landing");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const publicViews = useMemo(
    () =>
      new Set([
        "landing", "pricing", "how-it-works", "about", "faq", "contact", "blog", "changelog",
        "terms-of-service", "privacy-policy", "risk-disclosure", "login", "signup",
      ]),
    []
  );

  useEffect(() => {
    if (isAuthenticated && activeView === "admin" && !isAdmin) {
      setActiveView("dashboard");
    }
  }, [isAuthenticated, activeView, isAdmin]);

  useEffect(() => {
    if (!loading && !isAuthenticated && !publicViews.has(activeView)) {
      setActiveView("login");
    }
  }, [loading, isAuthenticated, activeView, publicViews]);

  const handleNavigate = (view: string, data?: any) => {
    setActiveView(view);
    setViewData(data);
  };

  const handleLogout = async () => {
    await logout();
    setActiveView("landing");
  };

  const renderPublicContent = () => {
    switch (activeView) {
      case "landing":
        return <LandingPage onNavigate={handleNavigate} />;
      case "pricing":
        return <PricingPage onNavigate={handleNavigate} />;
      case "how-it-works":
        return <HowItWorksPage onNavigate={handleNavigate} />;
      case "about":
        return <AboutPage onNavigate={handleNavigate} />;
      case "faq":
        return <FAQPage onNavigate={handleNavigate} />;
      case "contact":
        return <ContactPage onNavigate={handleNavigate} />;
      case "blog":
        return <BlogPage onNavigate={handleNavigate} />;
      case "changelog":
        return <ChangelogPage onNavigate={handleNavigate} />;
      case "terms-of-service":
        return <TermsOfService onNavigate={handleNavigate} />;
      case "privacy-policy":
        return <PrivacyPolicy onNavigate={handleNavigate} />;
      case "risk-disclosure":
        return <RiskDisclosure onNavigate={handleNavigate} />;
      case "login":
        return <LoginPage onNavigate={handleNavigate} />;
      case "signup":
        return <SignUpPage onNavigate={handleNavigate} />;
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  const renderContent = () => {
    if (activeView === "admin" && !isAdmin) return <Dashboard onNavigate={handleNavigate} />;
    switch (activeView) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "trading-terminal":
        return <TradingTerminalNew onNavigate={handleNavigate} />;
      case "strategy-backtest":
        return <StrategyBacktest onNavigate={handleNavigate} />;
      case "marketplace":
        return <Marketplace onNavigate={handleNavigate} />;
      case "trader-profile":
        return <TraderProfile onNavigate={handleNavigate} traderData={viewData} />;
      case "copy-setup":
        return <CopySetup onNavigate={handleNavigate} traderData={viewData} />;
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
        return <Payments onNavigate={handleNavigate} />;
      case "settings":
        return <Settings />;
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
        // Access control: dev OR (prod + admin)
        if (import.meta.env.PROD && !isAdmin) {
          setTimeout(() => {
            toast.error("UI States Demo disabled in production", {
              description: "This page is only available in development or for admins."
            });
          }, 100);
          return <Dashboard onNavigate={handleNavigate} />;
        }
        return <UIStatesDemo onNavigate={handleNavigate} />;
      case "smoke-test":
        const isDev = import.meta.env.DEV;
        // Access control: dev OR (prod + admin)
        if (import.meta.env.PROD && !isAdmin) {
          // Redirect to dashboard and show toast
          setTimeout(() => {
            toast.error("Smoke test disabled in production", {
              description: "This page is only available in development or for admins."
            });
          }, 100);
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
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <TerminalLoader />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden dark min-w-0">
      {isAuthenticated ? (
        <>
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
              {renderContent()}
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
        </>
      ) : (
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {renderPublicContent()}
        </main>
      )}
      <Toaster />
    </div>
  );
}
