import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, Target, Shield, Zap, Users, TrendingUp, Globe } from "lucide-react";
import klineoIcon from "@/assets/klineo-icon-64.png";

interface AboutPageProps {
  onNavigate: (view: string) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('home')}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                <img
                  src={klineoIcon}
                  alt="KLINEO"
                  className="size-8 object-contain"
                />
                <div>
                  <h1 className="text-xl font-semibold">About KLINEO</h1>
                  <p className="text-xs text-muted-foreground">Professional copy trading, reimagined</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="border-b border-border bg-gradient-to-b from-secondary/20 to-background">
        <div className="container mx-auto px-6 py-16 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Built for Serious Traders Who Value
            <span className="text-primary"> Precision & Control</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            KLINEO is a professional-grade copy trading terminal designed for the modern cryptocurrency trader. 
            We combine institutional-level execution with transparent fee structures and terminal aesthetics 
            that echo the precision tools traders demand.
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="container mx-auto px-6 py-16 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Target className="size-8 text-primary" />
              <h3 className="text-xl font-semibold">Our Mission</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To democratize access to professional trading strategies while maintaining the highest standards 
              of transparency, security, and user control. We believe every trader deserves institutional-grade 
              tools without sacrificing ownership of their capital.
            </p>
          </Card>

          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="size-8 text-primary" />
              <h3 className="text-xl font-semibold">Our Vision</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To become the global standard for copy trading terminals—trusted by both retail and professional 
              traders worldwide. We're building infrastructure that treats trading as a serious profession, not a 
              gamified experiment.
            </p>
          </Card>
        </div>
      </div>

      {/* Core Values */}
      <div className="border-y border-border bg-secondary/10">
        <div className="container mx-auto px-6 py-16 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">What We Stand For</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <div className="size-12 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                <Shield className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Transparency</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Clear fee structures. No hidden charges. Real-time performance data. You deserve to know exactly 
                what you're paying and why.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="size-12 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                <Users className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">User Control</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your capital stays on your exchange. You set risk limits. You can stop anytime. We provide the 
                tools—you make the decisions.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="size-12 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                <Zap className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Execution Speed</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Milliseconds matter. Our infrastructure is optimized for low-latency trade replication, 
                minimizing slippage and maximizing execution quality.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Why KLINEO is Different */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <h2 className="text-2xl font-bold mb-8 text-center">Why KLINEO is Different</h2>
        <Card className="p-8 space-y-6">
          <div className="flex gap-4">
            <div className="size-8 bg-primary/10 border border-primary/30 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">1</span>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2">Performance Fees Only on Profits</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlike competitors who charge monthly platform fees regardless of results, KLINEO only takes a 
                cut when you make money. If a trade loses, you pay zero performance fees. Our success is tied 
                to yours.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="size-8 bg-primary/10 border border-primary/30 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">2</span>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2">Terminal-Grade Interface</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We rejected flashy dashboards and gamification. KLINEO's interface is inspired by late-1990s 
                trading terminals—dense, functional, and built for professionals who need information, not 
                distractions.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="size-8 bg-primary/10 border border-primary/30 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">3</span>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2">Master Trader Verification</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We vet every Master Trader. No bots pretending to be humans. No fake track records. Only 
                verified traders with proven history and transparent performance metrics.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="size-8 bg-primary/10 border border-primary/30 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">4</span>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2">Advanced Risk Controls</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Max daily loss limits. Position size caps. Trailing stops. Multi-level safety mechanisms that 
                let you define exactly how much risk you're willing to take—then enforce it automatically.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="size-8 bg-primary/10 border border-primary/30 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">5</span>
            </div>
            <div>
              <h3 className="text-base font-semibold mb-2">Non-Custodial Architecture</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                KLINEO never holds your funds. Your capital remains on your exchange account at all times. 
                We execute trades via API—without withdrawal permissions. You maintain complete ownership.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* By the Numbers */}
      <div className="border-y border-border bg-secondary/10">
        <div className="container mx-auto px-6 py-16 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">KLINEO by the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">156</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Verified Master Traders</div>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">1,247</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Users</div>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">$2.4M</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Volume Copied (Monthly)</div>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">99.8%</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Platform Uptime</div>
            </Card>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <h2 className="text-2xl font-bold mb-8 text-center">Built on Robust Infrastructure</h2>
        <Card className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Globe className="size-5 text-primary" />
                Global Infrastructure
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Multi-region server deployment for low latency</li>
                <li>• Redundant failover systems for 99.9%+ uptime</li>
                <li>• CDN-accelerated content delivery worldwide</li>
                <li>• Real-time WebSocket connections for instant updates</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Security First
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• AES-256 encryption for API keys at rest</li>
                <li>• TLS 1.3 for all data in transit</li>
                <li>• Regular third-party security audits</li>
                <li>• Rate limiting and DDoS protection</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Team Section */}
      <div className="border-y border-border bg-secondary/10">
        <div className="container mx-auto px-6 py-16 max-w-6xl">
          <h2 className="text-2xl font-bold mb-4 text-center">Built by Traders, for Traders</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            KLINEO was founded by a team of quantitative traders, software engineers, and fintech veterans who 
            were frustrated with existing copy trading solutions. We built the platform we wished existed.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <div className="size-16 bg-primary/10 border border-primary/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-primary font-bold text-xl">AK</span>
              </div>
              <h3 className="font-semibold mb-1">Alex Kim</h3>
              <p className="text-xs text-primary mb-2">CEO & Co-Founder</p>
              <p className="text-xs text-muted-foreground">
                Former quant trader at hedge fund. 10+ years in algorithmic trading and risk management.
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="size-16 bg-primary/10 border border-primary/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-primary font-bold text-xl">SM</span>
              </div>
              <h3 className="font-semibold mb-1">Sarah Mitchell</h3>
              <p className="text-xs text-primary mb-2">CTO & Co-Founder</p>
              <p className="text-xs text-muted-foreground">
                Infrastructure engineer from high-frequency trading firm. Expert in low-latency systems.
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="size-16 bg-primary/10 border border-primary/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-primary font-bold text-xl">JC</span>
              </div>
              <h3 className="font-semibold mb-1">James Chen</h3>
              <p className="text-xs text-primary mb-2">Head of Trading Operations</p>
              <p className="text-xs text-muted-foreground">
                Crypto native trader since 2015. Built and operated multi-million dollar trading desk.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Card className="p-8 text-center bg-gradient-to-br from-secondary/30 to-background">
          <h2 className="text-2xl font-bold mb-4">Ready to Experience Professional Copy Trading?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join over 1,200 traders who trust KLINEO for precision execution and transparent performance tracking.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" size="lg">
              View Pricing
            </Button>
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Start Free Trial
            </Button>
          </div>
        </Card>
      </div>

      {/* Footer Note */}
      <div className="border-t border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <p className="text-xs text-muted-foreground text-center">
            Questions about KLINEO? <a href="/contact" className="text-primary hover:underline">Contact us</a> or 
            visit our <a href="/faq" className="text-primary hover:underline">FAQ page</a>.
          </p>
        </div>
      </div>
    </div>
  );
}