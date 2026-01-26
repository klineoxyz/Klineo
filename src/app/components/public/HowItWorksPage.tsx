import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { MobileMenu } from "@/app/components/layout/MobileMenu";
import { 
  ArrowLeft, 
  Search,
  Settings,
  Play,
  BarChart3,
  Shield,
  Copy,
  TrendingUp,
  CheckCircle2,
  Clock,
  Users
} from "lucide-react";
import klineoLogo from "@/assets/6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png";
import klineoIcon from "@/assets/klineo-icon-64.png";
import klineoLogoDark from "@/assets/klineo-logo-dark-bg.png";

interface HowItWorksPageProps {
  onNavigate: (view: string) => void;
}

export function HowItWorksPage({ onNavigate }: HowItWorksPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate("landing")}
              className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent rounded transition-opacity hover:opacity-80"
              aria-label="KLINEO Home"
            >
              <img
                src={klineoLogoDark}
                alt="KLINEO"
                className="h-8 sm:h-10 w-auto object-contain"
              />
            </button>
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => onNavigate("how-it-works")}
                className="text-sm text-foreground font-medium"
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
            <MobileMenu onNavigate={onNavigate} currentView="how-it-works" />
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
            Complete Guide
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            How KLINEO Copy Trading Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From setup to profit - understand exactly how our platform works in under 5 minutes
          </p>
        </div>
      </section>

      {/* Step-by-Step Process */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Complete Setup Process</h2>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="size-16 rounded-full bg-accent text-background flex items-center justify-center font-bold text-2xl">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Create Your Free Account</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Sign up with your email - no credit card required. Verify your account 
                  and you're ready to start exploring master traders.
                </p>
                <Card className="p-6 bg-card/50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="size-6 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">✓</div>
                      <span>Email verification (instant)</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="size-6 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">✓</div>
                      <span>Set up 2FA for security (recommended)</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="size-6 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">✓</div>
                      <span>Complete profile (optional)</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="size-16 rounded-full bg-accent text-background flex items-center justify-center font-bold text-2xl">
                  2
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Connect Your Exchange</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Link your Binance, Bybit, or OKX account via API. We only request trading 
                  permissions - never withdrawal access. Your funds stay on your exchange.
                </p>
                <Card className="p-6 bg-card/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-background border border-border">
                      <Copy className="size-5 text-accent mb-2" />
                      <div className="font-semibold mb-1">API Key Setup</div>
                      <div className="text-xs text-muted-foreground">
                        Follow our guided tutorial to create API keys with correct permissions
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-background border border-border">
                      <Shield className="size-5 text-accent mb-2" />
                      <div className="font-semibold mb-1">Security First</div>
                      <div className="text-xs text-muted-foreground">
                        We never ask for withdrawal permissions. Your capital is safe.
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="size-16 rounded-full bg-accent text-background flex items-center justify-center font-bold text-2xl">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Browse Master Traders</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Explore our marketplace of verified traders. Filter by strategy type, risk level, 
                  historical returns, and more. See their complete track record.
                </p>
                <Card className="p-6 bg-card/50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                      <div className="flex items-center gap-3">
                        <Users className="size-5 text-accent" />
                        <span className="font-medium">ProTrader_XYZ</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-[#10B981]">+127% ROI</div>
                        <div className="text-muted-foreground">Risk: 6/10</div>
                        <Badge variant="outline" className="bg-accent/10 text-accent">Scalper</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      All performance data is verified and audited
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="size-16 rounded-full bg-accent text-background flex items-center justify-center font-bold text-2xl">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Configure Risk Parameters</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Set your own risk controls before copying. Define max position size, 
                  stop-loss rules, daily loss limits, and drawdown thresholds.
                </p>
                <Card className="p-6 bg-card/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Max Position Size</div>
                      <div className="text-xs text-muted-foreground">Limit how much capital per trade</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Stop Loss %</div>
                      <div className="text-xs text-muted-foreground">Auto-exit losing positions</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Daily Loss Limit</div>
                      <div className="text-xs text-muted-foreground">Stop copying if daily losses exceed</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Max Drawdown</div>
                      <div className="text-xs text-muted-foreground">Pause copying at drawdown threshold</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="size-16 rounded-full bg-accent text-background flex items-center justify-center font-bold text-2xl">
                  5
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Start Copying (Automated)</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Hit "Start Copying" and our engine takes over. When your master trader opens 
                  a position, we mirror it on your exchange within milliseconds.
                </p>
                <Card className="p-6 bg-card/50">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Play className="size-8 text-accent" />
                      <div className="flex-1">
                        <div className="font-semibold mb-1">Real-Time Synchronization</div>
                        <div className="text-sm text-muted-foreground">
                          Sub-second execution ensures you get the same entry prices as the master trader
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Copy className="size-8 text-accent" />
                      <div className="flex-1">
                        <div className="font-semibold mb-1">Automatic Position Sizing</div>
                        <div className="text-sm text-muted-foreground">
                          Proportional sizing based on your capital and risk settings
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="size-16 rounded-full bg-accent text-background flex items-center justify-center font-bold text-2xl">
                  6
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Monitor & Optimize</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Track performance in real-time from your terminal dashboard. Adjust risk settings 
                  anytime, pause copying, or switch to different traders.
                </p>
                <Card className="p-6 bg-card/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-background border border-border">
                      <BarChart3 className="size-6 text-accent mx-auto mb-2" />
                      <div className="font-semibold text-sm mb-1">Live Analytics</div>
                      <div className="text-xs text-muted-foreground">Real-time PnL tracking</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-background border border-border">
                      <Clock className="size-6 text-accent mx-auto mb-2" />
                      <div className="font-semibold text-sm mb-1">Trade History</div>
                      <div className="text-xs text-muted-foreground">Full audit trail</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-background border border-border">
                      <Settings className="size-6 text-accent mx-auto mb-2" />
                      <div className="font-semibold text-sm mb-1">Easy Control</div>
                      <div className="text-xs text-muted-foreground">Pause/resume anytime</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fee Explanation */}
      <section className="border-b border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How Fees Work</h2>
            <p className="text-muted-foreground">Transparent, performance-based pricing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 border-[#10B981]/50">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-[#10B981] mb-2">Win</div>
                <div className="text-sm text-muted-foreground">Profitable Trade Scenario</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Your Profit</span>
                  <span className="font-semibold text-[#10B981]">+$500</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Platform Fee (20%)</span>
                  <span className="font-semibold text-accent">-$100</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">You Keep</span>
                  <span className="text-xl font-bold text-[#10B981]">+$400</span>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-[#EF4444]/50">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-[#EF4444] mb-2">Loss</div>
                <div className="text-sm text-muted-foreground">Losing Trade Scenario</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Your Loss</span>
                  <span className="font-semibold text-[#EF4444]">-$300</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Platform Fee</span>
                  <span className="font-semibold">$0.00</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">You Pay</span>
                  <span className="text-xl font-bold text-[#EF4444]">-$300</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              We only profit when you profit. Our success is tied to yours.
            </p>
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
            Set up your account in under 10 minutes
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