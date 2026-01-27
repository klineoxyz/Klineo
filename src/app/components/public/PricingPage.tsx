import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { MobileMenu } from "@/app/components/layout/MobileMenu";
import { CheckCircle2, ArrowLeft, Zap, User, Users } from "lucide-react";
import klineoLogo from "@/assets/6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png";

interface PricingPageProps {
  onNavigate: (view: string) => void;
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate("landing")}
              className="flex items-center gap-2"
            >
              <img 
                src={klineoLogo}
                alt="KLINEO"
                className="size-8 object-contain"
              />
              <span className="text-xl font-bold tracking-tight">KLINEO</span>
            </button>
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => onNavigate("how-it-works")}
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                How It Works
              </button>
              <button 
                onClick={() => onNavigate("pricing")}
                className="text-sm text-foreground font-medium"
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
            <MobileMenu onNavigate={onNavigate} currentView="pricing" />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <button
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition mx-auto"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </button>

          <Badge variant="outline" className="mb-6 bg-secondary">
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Only Pay When You Profit
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Zero upfront costs. No hidden fees. We only succeed when you succeed.
          </p>
        </div>
      </section>

      {/* Credit-based model */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Card className="p-12 border-accent/50">
            <div className="text-center mb-8">
              <Badge variant="outline" className="mb-4 bg-accent/10 text-accent border-accent/30">
                Credit-based allowance
              </Badge>
              <h2 className="text-3xl font-bold mb-3">Pay upfront, trade until you hit your profit cap</h2>
              <p className="text-muted-foreground text-lg">
                Buy a package to unlock a profit allowance. Trade until you earn up to that amount in profit, then buy again to continue.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="p-6 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20">
                <div className="text-2xl font-mono font-bold text-[#10B981] mb-2">
                  Example: $100 package
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Profit allowance: <span className="font-mono font-semibold">$300</span> (3x)
                </div>
                <div className="text-xl font-mono font-semibold">
                  Trade until you earn up to $300 profit
                </div>
              </div>

              <div className="p-6 rounded-lg bg-accent/10 border border-accent/20">
                <div className="text-2xl font-mono font-bold text-accent mb-2">
                  Joining fee $100 (one-time)
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Enables profile + CEX API connection
                </div>
                <div className="text-xl font-mono font-semibold">
                  Required before you can copy trade
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-mono font-bold text-accent mb-2">70%</div>
                  <div className="text-sm text-muted-foreground">Referral rewards pool</div>
                </div>
                <div>
                  <div className="text-3xl font-mono font-bold text-accent mb-2">20%</div>
                  <div className="text-sm text-muted-foreground">Platform revenue</div>
                </div>
                <div>
                  <div className="text-3xl font-mono font-bold text-accent mb-2">10%</div>
                  <div className="text-sm text-muted-foreground">Marketing</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Trading Packages */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Trading Packages</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Buy a package to unlock a profit allowance. Trade until you earn up to the cap, then buy again.
            </p>
            <Badge variant="outline" className="mt-4 bg-accent/10 text-accent border-accent/30">
              Joining fee $100 required first
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Entry $100 */}
            <Card className="p-8 hover:border-accent/50 transition">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Entry</h3>
                <div className="text-4xl font-mono font-bold mb-1">$100</div>
                <div className="text-sm text-muted-foreground">one-time package</div>
                <div className="text-sm text-accent flex items-center gap-2 mt-2">
                  <Zap className="size-4" />
                  <span className="font-mono">3x</span> → <span className="font-mono font-semibold">$300</span> profit allowance
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Trade until you earn up to $300 profit</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Then buy another package to continue</span>
                </li>
              </ul>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onNavigate("signup")}
              >
                Get Started
              </Button>
            </Card>

            {/* Level 2 $200 */}
            <Card className="p-8 border-accent/50 relative hover:border-accent transition">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-background">
                Most Popular
              </Badge>

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Level 2</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-4xl font-mono font-bold">$200</div>
                </div>
                <div className="text-sm text-muted-foreground">one-time package</div>
                <div className="text-sm text-accent flex items-center gap-2 mt-2">
                  <Zap className="size-4" />
                  <span className="font-mono">5x</span> → <span className="font-mono font-semibold">$1,000</span> profit allowance
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Trade until you earn up to $1,000 profit</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Then buy another package to continue</span>
                </li>
              </ul>

              <Button
                className="w-full bg-accent text-background hover:bg-accent/90"
                onClick={() => onNavigate("signup")}
              >
                Activate allowance
              </Button>
            </Card>

            {/* Level 3 $500 */}
            <Card className="p-8 hover:border-accent/50 transition">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Level 3</h3>
                <div className="text-4xl font-mono font-bold mb-1">$500</div>
                <div className="text-sm text-muted-foreground">one-time package</div>
                <div className="text-sm text-accent flex items-center gap-2 mt-2">
                  <Zap className="size-4" />
                  <span className="font-mono">10x</span> → <span className="font-mono font-semibold">$5,000</span> profit allowance
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Trade until you earn up to $5,000 profit</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Then buy another package to continue</span>
                </li>
              </ul>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onNavigate("signup")}
              >
                Buy package
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Referral & Revenue Split (onboarding + package purchases only) */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Card className="p-8 bg-accent/5 border-accent/20">
            <div className="text-center mb-6">
              <Badge variant="outline" className="mb-3 bg-accent/10 text-accent border-accent/30">
                Transparent economics
              </Badge>
              <h2 className="text-2xl font-bold mb-2">70% Referral Rewards Pool (7 Levels)</h2>
              <p className="text-muted-foreground">
                From every onboarding fee and package (credit) purchase: 70% goes to your upline referral rewards, 20% to platform revenue, 10% to marketing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-6">
              <div className="text-center p-5 rounded-lg bg-card border border-border">
                <div className="text-3xl font-mono font-bold text-accent mb-2">70%</div>
                <div className="font-semibold mb-1.5 text-sm">Referral rewards pool</div>
                <div className="text-xs text-muted-foreground">
                  Distributed across 7 levels (L1–L7) when someone you referred—or in your upline—pays an onboarding fee or buys a package
                </div>
              </div>
              <div className="text-center p-5 rounded-lg bg-card border border-border">
                <div className="text-3xl font-mono font-bold text-accent mb-2">20%</div>
                <div className="font-semibold mb-1.5 text-sm">Platform revenue</div>
                <div className="text-xs text-muted-foreground">
                  Klineo platform share from each eligible purchase
                </div>
              </div>
              <div className="text-center p-5 rounded-lg bg-card border border-border">
                <div className="text-3xl font-mono font-bold text-accent mb-2">10%</div>
                <div className="font-semibold mb-1.5 text-sm">Marketing</div>
                <div className="text-xs text-muted-foreground">
                  Marketing pool; unused referral levels also roll here
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-4">
                Rewards are based on onboarding and package purchases only, not on trading PnL or balances.
              </p>
              <Button
                onClick={() => onNavigate("signup")}
                variant="outline"
                size="sm"
                className="border-accent text-accent hover:bg-accent/10"
              >
                Get Your Referral Link
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">How does the profit allowance work?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You pay upfront for a package (e.g. $100 Entry = $300 profit allowance). You can trade until you earn up to that amount in profit. When you hit the cap, buy another package to unlock more allowance. No per-trade fee.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We accept cryptocurrency payments via CoinPayments (USDT, BTC, ETH, and 50+ other coins). 
                Joining fee and package purchases are paid in crypto.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Do I need to pay the joining fee first?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes. The $100 joining fee is required before you can connect your CEX API and copy trade. It enables profile creation and API connection. After that, buy a trading package to unlock your profit allowance.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Are there any hidden fees?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No. You pay: (1) a one-time $100 joining fee, and (2) package purchases for profit allowance. Your exchange may charge trading fees separately.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">What is the revenue split?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                70% of joining fee and package revenue goes to the referral rewards pool, 20% to platform revenue, 10% to marketing. Rewards are based on purchases only, not on trading PnL.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Copying?
          </h2>
          <p className="text-muted-foreground mb-8">
            Pay joining fee and a package to unlock your trading allowance
          </p>
          <Button 
            size="lg"
            onClick={() => onNavigate("signup")}
            className="bg-accent text-background hover:bg-accent/90"
          >
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 KLINEO. Trading involves substantial risk. Only invest what you can afford to lose.</p>
        </div>
      </footer>
    </div>
  );
}