import { useState, useEffect } from "react";
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

// Public pages
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

export default function App() {
  const [activeView, setActiveView] = useState("landing");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // Mock admin status - in production this would come from auth
  const isAdmin = true;

  // Developer bypass: Press Ctrl+Shift+D to toggle dev mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDevMode(!devMode);
        if (!devMode) {
          console.log('🔧 Developer Mode: Activated');
          console.log('💡 You can now bypass login with Ctrl+Shift+L');
        } else {
          console.log('🔧 Developer Mode: Deactivated');
        }
      }
      
      // Ctrl+Shift+L to bypass login when in dev mode
      if (devMode && e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        console.log('🚀 Bypassing login...');
        setIsAuthenticated(true);
        setActiveView("dashboard");
      }
      
      // Ctrl+Shift+O to logout
      if (devMode && e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        console.log('👋 Logging out...');
        setIsAuthenticated(false);
        setActiveView("landing");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [devMode]);

  const handleNavigate = (view: string, data?: any) => {
    setActiveView(view);
    setViewData(data);
  };

  const handleLogin = (email: string, password: string) => {
    // Mock login - in production this would call an API
    console.log("Login:", email, password);
    setIsAuthenticated(true);
    setActiveView("dashboard");
  };

  const handleSignUp = (email: string, password: string) => {
    // Mock signup - in production this would call an API
    console.log("Sign up:", email, password);
    setIsAuthenticated(true);
    setActiveView("dashboard");
  };

  // Public routes (non-authenticated)
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
        return <LoginPage onNavigate={handleNavigate} onLogin={handleLogin} />;
      case "signup":
        return <SignUpPage onNavigate={handleNavigate} onSignUp={handleSignUp} />;
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  // Authenticated routes
  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
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
        return <UIStatesDemo onNavigate={handleNavigate} />;
      case "onboarding-wizard":
        return (
          <OnboardingWizard
            onComplete={() => handleNavigate("dashboard")}
            onSkip={() => handleNavigate("marketplace")}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden dark">
      {/* Developer Mode Indicator */}
      {devMode && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-background px-4 py-2 rounded-lg shadow-lg font-mono text-sm flex items-center gap-2">
          <div className="size-2 rounded-full bg-background animate-pulse" />
          <div>
            <div className="font-bold">DEV MODE</div>
            <div className="text-xs opacity-80">Ctrl+Shift+L = Login | Ctrl+Shift+O = Logout</div>
          </div>
        </div>
      )}

      {isAuthenticated ? (
        <>
          <TopBar onNavigate={handleNavigate} sidebarCollapsed={sidebarCollapsed} />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar
              activeView={activeView}
              onNavigate={handleNavigate}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              isAdmin={isAdmin}
            />
            <main className="flex-1 overflow-y-auto">
              {renderContent()}
            </main>
          </div>
        </>
      ) : (
        <main className="flex-1 overflow-y-auto">
          {renderPublicContent()}
        </main>
      )}
      <Toaster />
    </div>
  );
}