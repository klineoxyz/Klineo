import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Footer } from "@/app/components/layout/Footer";
import { MobileMenu } from "@/app/components/layout/MobileMenu";
import { ChatWidget } from "@/app/components/ui/chat-widget";
import heroImage from "figma:asset/27a5e37b3de43f564e5875751799a9ee08284de6.png";
import { 
  TrendingUp, 
  Users, 
  Shield, 
  Zap, 
  BarChart3, 
  Lock,
  Copy,
  Bot,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Target,
  Clock,
  Award,
  Star,
  Quote
} from "lucide-react";

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="container flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="font-bold text-2xl sm:text-3xl tracking-wider text-foreground">
              KLINEO
            </span>
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent"></div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => onNavigate("how-it-works")}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            How It Works
          </button>
          <button 
            onClick={() => onNavigate("pricing")}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Pricing
          </button>
          <button 
            onClick={() => onNavigate("blog")}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Blog
          </button>
          <button 
            onClick={() => onNavigate("about")}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            About
          </button>
          <button 
            onClick={() => onNavigate("faq")}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            FAQ
          </button>
          <button 
            onClick={() => onNavigate("contact")}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Contact
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNavigate("login")}
            className="hidden sm:flex"
          >
            Login
          </Button>
          <Button 
            size="sm"
            onClick={() => onNavigate("signup")}
            className="bg-accent text-background hover:bg-accent/90 hidden sm:flex"
          >
            Start Trading
          </Button>
          <MobileMenu onNavigate={onNavigate} currentView="landing" />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative border-b border-border overflow-hidden">
        <img 
          src={heroImage} 
          alt="KLINEO - The Professional Trading Terminal Built for Disciplined Execution"
          className="w-full h-auto object-cover"
        />
      </section>

      {/* Featured Strategies Banner */}
      <section className="bg-[#0a0e13] border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="size-5 text-accent" />
              <span className="text-sm font-semibold text-foreground">Featured Strategies</span>
            </div>
            <div className="flex items-center gap-4 md:gap-8 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 px-4 py-2 bg-background/50 rounded border border-border/30 hover:border-accent/50 hover:bg-background/70 transition-all cursor-pointer">
                <span className="text-xs text-muted-foreground">Scalping Pro</span>
                <span className="text-xs font-mono font-bold text-green-500">+127% YTD</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background/50 rounded border border-border/30 hover:border-accent/50 hover:bg-background/70 transition-all cursor-pointer">
                <span className="text-xs text-muted-foreground">Swing Master</span>
                <span className="text-xs font-mono font-bold text-green-500">+89% YTD</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background/50 rounded border border-border/30 hover:border-accent/50 hover:bg-background/70 transition-all cursor-pointer">
                <span className="text-xs text-muted-foreground">Range Sniper</span>
                <span className="text-xs font-mono font-bold text-green-500">+156% YTD</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background/50 rounded border border-border/30 hover:border-accent/50 hover:bg-background/70 transition-all cursor-pointer">
                <span className="text-xs text-muted-foreground">Trend Rider</span>
                <span className="text-xs font-mono font-bold text-green-500">+203% YTD</span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onNavigate("marketplace")}
              className="text-accent hover:text-accent/80 whitespace-nowrap"
            >
              View All
              <ArrowRight className="size-3 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 text-center hover:border-accent/50 transition">
              <div className="text-3xl font-mono font-bold text-accent mb-2">$12.4M</div>
              <div className="text-sm text-muted-foreground">Volume Copied</div>
            </Card>
            <Card className="p-6 text-center hover:border-accent/50 transition">
              <div className="text-3xl font-mono font-bold text-accent mb-2">1,247</div>
              <div className="text-sm text-muted-foreground">Active Copiers</div>
            </Card>
            <Card className="p-6 text-center hover:border-accent/50 transition">
              <div className="text-3xl font-mono font-bold text-accent mb-2">89</div>
              <div className="text-sm text-muted-foreground">Master Traders</div>
            </Card>
            <Card className="p-6 text-center hover:border-accent/50 transition">
              <div className="text-3xl font-mono font-bold text-accent mb-2">94%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Professional-Grade Trading Infrastructure
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for serious traders who demand reliability, transparency, and control
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 hover:border-accent/50 transition">
              <div className="size-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Copy className="size-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Copy Engine</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mirror trades from master traders with sub-second execution. 
                Our proprietary engine ensures zero slippage and perfect synchronization.
              </p>
            </Card>

            <Card className="p-6 hover:border-accent/50 transition">
              <div className="size-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="size-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Advanced Risk Controls</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Set max drawdown, position size limits, stop-loss rules, and daily loss limits. 
                Your capital, your rules.
              </p>
            </Card>

            <Card className="p-6 hover:border-accent/50 transition">
              <div className="size-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <DollarSign className="size-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Pay Only on Profits</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Zero upfront fees. We only charge 20% when you make money. 
                Lose money? Pay nothing. Our success depends on yours.
              </p>
            </Card>

            <Card className="p-6 hover:border-accent/50 transition">
              <div className="size-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <BarChart3 className="size-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Transparent Analytics</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Real-time performance tracking, detailed trade history, and comprehensive 
                reporting. No hidden metrics.
              </p>
            </Card>

            <Card className="p-6 hover:border-accent/50 transition">
              <div className="size-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Users className="size-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Verified Master Traders</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Browse proven traders with audited track records. See their exact PnL, 
                win rates, and risk scores.
              </p>
            </Card>

            <Card className="p-6 hover:border-accent/50 transition">
              <div className="size-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Lock className="size-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Bank-Level Security</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                API-only access (no withdrawals), encrypted connections, and SOC 2 compliance. 
                Your funds never leave your exchange.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Start Copying in 3 Steps</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get up and running in under 10 minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="relative">
              <div className="size-12 rounded-full bg-accent text-background flex items-center justify-center font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect Your Exchange</h3>
              <p className="text-muted-foreground leading-relaxed">
                Connect Binance, Bybit, or OKX via API keys. 
                We only need trading permissions—never withdrawal access.
              </p>
            </div>

            <div className="relative">
              <div className="size-12 rounded-full bg-accent text-background flex items-center justify-center font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Choose a Master Trader</h3>
              <p className="text-muted-foreground leading-relaxed">
                Browse our marketplace of verified traders. Filter by strategy, 
                risk level, and historical performance.
              </p>
            </div>

            <div className="relative">
              <div className="size-12 rounded-full bg-accent text-background flex items-center justify-center font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Set & Forget</h3>
              <p className="text-muted-foreground leading-relaxed">
                Configure your risk parameters and start copying. 
                Monitor performance 24/7 from your terminal dashboard.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button 
              size="lg"
              onClick={() => onNavigate("signup")}
              className="bg-accent text-background hover:bg-accent/90"
            >
              Create Free Account
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by Traders Worldwide</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-accent/20" />
                <div>
                  <div className="font-semibold">Sarah M.</div>
                  <div className="text-xs text-muted-foreground">Professional Trader</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "KLINEO's risk controls are unmatched. I can sleep knowing my drawdown limits 
                are hardcoded. Made 34% last quarter copying just two traders."
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-accent/20" />
                <div>
                  <div className="font-semibold">Marcus T.</div>
                  <div className="text-xs text-muted-foreground">Crypto Investor</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "Finally, a platform that doesn't nickel-and-dime you. Pay only on profits 
                means they're aligned with my success. Brilliant business model."
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-accent/20" />
                <div>
                  <div className="font-semibold">Alex R.</div>
                  <div className="text-xs text-muted-foreground">Hedge Fund Analyst</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "The terminal UI is a breath of fresh air. Dense, professional, and built for 
                people who actually trade. No fluff, just tools."
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Copy the Best Traders?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join 1,247 traders who've already automated their profits
          </p>
          <div className="flex items-center gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => onNavigate("signup")}
              className="bg-accent text-background hover:bg-accent/90"
            >
              Start Free Account
              <ArrowRight className="size-4 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => onNavigate("pricing")}
            >
              View Pricing
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • 20% fee only on profits • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}