import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { MobileMenu } from "@/app/components/layout/MobileMenu";
import { CheckCircle2, ArrowLeft, Zap, User, Users } from "lucide-react";
import klineoLogo from "figma:asset/8bf59ae1cbe92e0c2f3aa2a0b5d5e5eb7d8e9c25.png";

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

      {/* Performance Fee */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Card className="p-12 border-accent/50">
            <div className="text-center mb-8">
              <Badge variant="outline" className="mb-4 bg-accent/10 text-accent border-accent/30">
                Performance-Based
              </Badge>
              <h2 className="text-3xl font-bold mb-3"><span className="font-mono">20%</span> on Profitable Trades Only</h2>
              <p className="text-muted-foreground text-lg">
                We charge <span className="font-mono font-semibold">20%</span> commission exclusively on trades that make you money
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="p-6 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20">
                <div className="text-2xl font-mono font-bold text-[#10B981] mb-2">
                  Profitable Trade: +$1,000
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Platform Fee (<span className="font-mono">20%</span>): <span className="font-mono font-semibold">$200</span>
                </div>
                <div className="text-xl font-mono font-semibold">
                  You Keep: $800
                </div>
              </div>

              <div className="p-6 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
                <div className="text-2xl font-mono font-bold text-[#EF4444] mb-2">
                  Losing Trade: -$500
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Platform Fee: <span className="font-mono font-semibold">$0</span>
                </div>
                <div className="text-xl font-mono font-semibold">
                  No Fee Charged
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-mono font-bold text-accent mb-2">0%</div>
                  <div className="text-sm text-muted-foreground">Monthly Subscription</div>
                </div>
                <div>
                  <div className="text-3xl font-mono font-bold text-accent mb-2">0%</div>
                  <div className="text-sm text-muted-foreground">Setup Fees</div>
                </div>
                <div>
                  <div className="text-3xl font-mono font-bold text-accent mb-2">0%</div>
                  <div className="text-sm text-muted-foreground">Withdrawal Fees</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Subscription Plans</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your trading needs. All plans include our performance-based fee structure.
            </p>
            <Badge variant="outline" className="mt-4 bg-accent/10 text-accent border-accent/30">
              Save 10% with 6-month plans
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <Card className="p-8 hover:border-accent/50 transition">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Starter</h3>
                <div className="text-4xl font-mono font-bold mb-1">$29</div>
                <div className="text-sm text-muted-foreground">/month</div>
                <div className="text-sm text-accent flex items-center gap-2 mt-2">
                  <Zap className="size-4" />
                  <span className="font-mono">$156</span> for <span className="font-mono">6</span> months (save <span className="font-mono">10%</span>)
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Copy up to <span className="font-mono">2</span> traders</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Basic risk controls</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Email support</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Trade history (<span className="font-mono">30</span> days)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Standard execution speed</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><span className="font-mono">20%</span> fee on profitable trades</span>
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

            {/* Pro Plan */}
            <Card className="p-8 border-accent/50 relative hover:border-accent transition">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-background">
                Most Popular
              </Badge>

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-4xl font-mono font-bold">$79</div>
                  <div className="text-muted-foreground">/month</div>
                </div>
                <div className="text-sm text-accent flex items-center gap-2 mt-2">
                  <Zap className="size-4" />
                  <span className="font-mono">$426</span> for <span className="font-mono">6</span> months (save <span className="font-mono">10%</span>)
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Copy up to <span className="font-mono">5</span> traders</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Advanced risk controls</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Unlimited trade history</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Priority execution speed</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Referral program access</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">API access</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold"><span className="font-mono">20%</span> fee on profitable trades</span>
                </li>
              </ul>

              <Button
                className="w-full bg-accent text-background hover:bg-accent/90"
                onClick={() => onNavigate("signup")}
              >
                Start Pro Plan
              </Button>
            </Card>

            {/* Unlimited Plan */}
            <Card className="p-8 hover:border-accent/50 transition">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Unlimited</h3>
                <div className="text-4xl font-mono font-bold mb-1">$199</div>
                <div className="text-sm text-muted-foreground">/month</div>
                <div className="text-sm text-accent flex items-center gap-2 mt-2">
                  <Zap className="size-4" />
                  <span className="font-mono">$1,074</span> for <span className="font-mono">6</span> months (save <span className="font-mono">10%</span>)
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Unlimited trader copies</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Advanced risk controls</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">24/7 dedicated support</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Unlimited trade history</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Priority execution speed</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Referral program access</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">Custom integrations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">API access</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold"><span className="font-mono">10%</span> fee on profitable trades</span>
                </li>
              </ul>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onNavigate("signup")}
              >
                Get Unlimited
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Card className="p-8 bg-accent/5 border-accent/20">
            <div className="text-center mb-6">
              <Badge variant="outline" className="mb-3 bg-accent/10 text-accent border-accent/30">
                Earn Passive Income
              </Badge>
              <h2 className="text-2xl font-bold mb-2">2-Tier Referral Program</h2>
              <p className="text-muted-foreground">
                Get paid for introducing traders to KLINEO
              </p>
            </div>

            {/* Visual Diagram - Compact */}
            <div className="mb-8 max-w-3xl mx-auto">
              <div className="flex flex-col items-center">
                {/* YOU at the top */}
                <div className="flex flex-col items-center">
                  <div className="size-20 rounded-full bg-accent/30 border-3 border-accent flex items-center justify-center shadow-md shadow-accent/20">
                    <User className="size-10 text-accent" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold mt-1.5">YOU</span>
                </div>

                {/* Vertical line from YOU down */}
                <div className="w-0.5 h-8 bg-gradient-to-b from-accent to-accent/60 my-2" />

                {/* Connecting lines layout */}
                <div className="relative w-full flex justify-center">
                  {/* Horizontal distribution line */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-0.5 bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
                  
                  {/* Three vertical lines down to Tier 1 */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -ml-[140px] w-0.5 h-8 bg-gradient-to-b from-accent/60 to-accent" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-accent to-accent" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 ml-[140px] w-0.5 h-8 bg-gradient-to-b from-accent/60 to-accent" />
                </div>

                {/* Tier 1 Users */}
                <div className="flex gap-16 mt-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="size-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center shadow-md shadow-accent/10">
                        <User className="size-8 text-accent" strokeWidth={2.5} />
                      </div>
                      <div className="text-base font-bold text-accent mt-1.5">10%</div>
                      <span className="text-xs font-semibold text-center">Tier 1</span>
                      <span className="text-[10px] text-muted-foreground text-center">Direct</span>
                      
                      {/* Vertical line to Tier 2 */}
                      <div className="w-0.5 h-8 bg-gradient-to-b from-accent/60 to-accent/40 my-2" />
                      
                      {/* Tier 2 under each Tier 1 */}
                      <div className="flex flex-col items-center">
                        <div className="size-12 rounded-full bg-accent/15 border-2 border-accent/60 flex items-center justify-center shadow-sm shadow-accent/10">
                          <User className="size-6 text-accent/80" strokeWidth={2.5} />
                        </div>
                        <div className="text-sm font-bold text-accent/80 mt-1">5%</div>
                        <span className="text-xs font-semibold text-center">Tier 2</span>
                        <span className="text-[10px] text-muted-foreground text-center">Sub</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
              <div className="text-center p-5 rounded-lg bg-card border border-border">
                <div className="text-3xl font-mono font-bold text-accent mb-2">10%</div>
                <div className="font-semibold mb-1.5 text-sm">Tier 1 Commission</div>
                <div className="text-xs text-muted-foreground">
                  Earn <span className="font-mono">10%</span> of platform fees from users you directly refer
                </div>
              </div>

              <div className="text-center p-5 rounded-lg bg-card border border-border">
                <div className="text-3xl font-mono font-bold text-accent mb-2">5%</div>
                <div className="font-semibold mb-1.5 text-sm">Tier 2 Commission</div>
                <div className="text-xs text-muted-foreground">
                  Earn <span className="font-mono">5%</span> from users referred by your direct referrals
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-4">
                Example: Your referral makes <span className="font-mono font-semibold">$1,000</span> profit → Platform fee is <span className="font-mono font-semibold">$200</span> → You earn <span className="font-mono font-semibold">$20</span>
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
              <h3 className="font-semibold mb-2">When exactly do I pay the 20% fee?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The 20% fee is charged only when a copied trade closes in profit. 
                If you lose money on a trade, you pay nothing. The fee is automatically 
                calculated and displayed in your Fees dashboard.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We accept cryptocurrency payments via CoinPayments (USDT, BTC, ETH, and 50+ other coins). 
                All subscription fees are paid in crypto.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I cancel my Pro subscription anytime?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes, you can cancel anytime. If you cancel, you'll retain Pro features 
                until the end of your billing period. No refunds for partial months.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Are there any hidden fees?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No. The only fees are: (1) 20% on profitable trades, and (2) optional Pro subscription. 
                Your exchange may charge trading fees separately.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">How does the 6-month discount work?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pay for 6 months upfront and get 10% off. For example, Pro plan is $426 for 6 months 
                instead of $474. This is paid once every 6 months via crypto.
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
            Join free and only pay when you profit
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