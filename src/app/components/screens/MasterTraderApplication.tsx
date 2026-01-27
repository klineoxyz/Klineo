import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, TrendingUp, Users, Shield, Clock, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { useState } from "react";

interface MasterTraderApplicationProps {
  onNavigate: (view: string) => void;
}

export function MasterTraderApplication({ onNavigate }: MasterTraderApplicationProps) {
  const [applicationStatus, setApplicationStatus] = useState<"form" | "review" | "approved">("form");
  const [exchangeProof, setExchangeProof] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplicationStatus("review");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => onNavigate("marketplace")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition"
        >
          <ArrowLeft className="size-4" />
          Back to Marketplace
        </button>
        <h1 className="text-2xl font-semibold mb-1">Become a Master Trader</h1>
        <p className="text-sm text-muted-foreground">
          Join our marketplace and earn commission when others copy your trades
        </p>
      </div>

      {applicationStatus === "form" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Application Form */}
          <div className="col-span-2 space-y-6">
            {/* Benefits */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="text-lg font-semibold mb-4">Master Trader Benefits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <TrendingUp className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Earn Commission</div>
                    <div className="text-xs text-muted-foreground">Get 40% of platform fees from your copiers</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <Users className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Build Your Brand</div>
                    <div className="text-xs text-muted-foreground">Grow your reputation and following</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <Shield className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Verified Badge</div>
                    <div className="text-xs text-muted-foreground">Stand out with official verification</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <Clock className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Free Service</div>
                    <div className="text-xs text-muted-foreground">No cost to become a master trader</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Application Form */}
            <form onSubmit={handleSubmit}>
              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input type="email" placeholder="trader@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Country *</Label>
                      <Input placeholder="United States" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Telegram Handle</Label>
                      <Input placeholder="@username" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-lg font-semibold mb-4">Trading Experience</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primary Exchange *</Label>
                      <Input placeholder="e.g., Binance, Bybit, OKX" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Years of Trading Experience *</Label>
                      <Input type="number" placeholder="3" min="1" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Trading Style *</Label>
                        <select className="w-full h-10 rounded border border-border bg-background px-3 text-sm" required>
                          <option value="">Select...</option>
                          <option value="day">Day Trading</option>
                          <option value="swing">Swing Trading</option>
                          <option value="scalping">Scalping</option>
                          <option value="position">Position Trading</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Preferred Markets *</Label>
                        <select className="w-full h-10 rounded border border-border bg-background px-3 text-sm" required>
                          <option value="">Select...</option>
                          <option value="spot">Spot Only</option>
                          <option value="futures">Futures Only</option>
                          <option value="both">Both Spot & Futures</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Average Monthly Return (%) *</Label>
                      <Input type="number" placeholder="15" step="0.01" required />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-lg font-semibold mb-4">Proof of Performance</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Trading History Screenshot *</Label>
                      <div className="border-2 border-dashed border-border rounded p-6 text-center hover:border-primary/50 transition cursor-pointer">
                        <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG up to 10MB (Last 3-6 months of trading history)
                        </p>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => setExchangeProof(e.target.files?.[0] || null)}
                        />
                      </div>
                      {exchangeProof && (
                        <p className="text-xs text-[#10B981]">✓ File uploaded: {exchangeProof.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>TradingView or Exchange Profile URL</Label>
                      <Input placeholder="https://www.tradingview.com/u/username/" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-lg font-semibold mb-4">Trading Strategy</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Describe Your Trading Strategy *</Label>
                      <Textarea
                        placeholder="Explain your trading approach, risk management, and what makes your strategy unique..."
                        className="min-h-32"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Why Do You Want to Become a Master Trader? *</Label>
                      <Textarea
                        placeholder="Tell us about your goals and what you hope to achieve..."
                        className="min-h-24"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <div className="flex items-start gap-3 p-4 bg-secondary/30 rounded border border-border">
                    <input type="checkbox" className="mt-1" required />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Terms & Conditions</p>
                      <p className="text-muted-foreground text-xs">
                        I confirm that all information provided is accurate and I understand that:
                      </p>
                      <ul className="text-muted-foreground text-xs mt-2 space-y-1">
                        <li>• KLINEO will verify my trading performance before approval</li>
                        <li>• I will earn from the referral pool when my copiers pay joining fee or buy packages</li>
                        <li>• I can be removed from the platform for suspicious activity</li>
                        <li>• I agree to maintain transparent and ethical trading practices</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-primary text-primary-foreground" size="lg">
                  Submit Application
                </Button>
              </Card>
            </form>
          </div>

          {/* Right: Info Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h4 className="font-semibold mb-4">Application Process</h4>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-primary/20 text-primary font-semibold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Submit Application</div>
                    <div className="text-xs text-muted-foreground">Complete this form with accurate info</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-secondary text-muted-foreground font-semibold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Review Period</div>
                    <div className="text-xs text-muted-foreground">We verify your trading history (2-5 days)</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-secondary text-muted-foreground font-semibold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Get Approved</div>
                    <div className="text-xs text-muted-foreground">Start earning from copiers immediately</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-semibold mb-3">Referral rewards</h4>
              <div className="p-4 bg-primary/10 rounded border border-primary/20 mb-4">
                <div className="text-3xl font-bold text-primary mb-1">70%</div>
                <div className="text-xs text-muted-foreground">of joining fee & package revenue goes to referral pool (7 levels)</div>
              </div>
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">Example:</p>
                <p>Your copier pays joining fee $100 or buys a $200 package</p>
                <p>→ 70% is distributed across upline (L1–L7)</p>
                <p className="text-primary">→ You earn according to your level in their referral chain</p>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-semibold mb-3">Requirements</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>Minimum 1 year trading experience</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>Proven profitable trading history</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>Active trading on supported exchanges</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>Commitment to transparent trading</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {applicationStatus === "review" && (
        <Card className="p-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-accent/20 mb-6">
            <Clock className="size-8 text-accent" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Application Submitted!</h2>
          <p className="text-muted-foreground mb-8">
            Thank you for applying to become a Master Trader. Our team is reviewing your application
            and will get back to you within 2-5 business days.
          </p>
          <div className="p-6 bg-secondary/30 rounded border border-border mb-6 text-left">
            <h4 className="font-semibold mb-3">What happens next?</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ We'll verify your trading history and performance</p>
              <p>✓ Our compliance team will review your profile</p>
              <p>✓ You'll receive an email with the decision</p>
              <p>✓ If approved, you can start accepting copiers immediately</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => onNavigate("dashboard")}>
              Go to Dashboard
            </Button>
            <Button onClick={() => setApplicationStatus("approved")} className="bg-primary text-primary-foreground">
              View Application Status
            </Button>
          </div>
        </Card>
      )}

      {applicationStatus === "approved" && (
        <Card className="p-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-[#10B981]/20 mb-6">
            <CheckCircle2 className="size-8 text-[#10B981]" />
          </div>
          <Badge className="mb-4 bg-[#10B981] text-white">Approved</Badge>
          <h2 className="text-2xl font-semibold mb-3">Welcome, Master Trader!</h2>
          <p className="text-muted-foreground mb-8">
            Congratulations! Your application has been approved. You're now listed in the marketplace
            and can start earning commission from copiers.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-secondary/30 rounded border border-border">
              <div className="text-2xl font-bold text-primary mb-1">0</div>
              <div className="text-xs text-muted-foreground">Active Copiers</div>
            </div>
            <div className="p-4 bg-secondary/30 rounded border border-border">
              <div className="text-2xl font-bold text-primary mb-1">$0</div>
              <div className="text-xs text-muted-foreground">Earned This Month</div>
            </div>
            <div className="p-4 bg-secondary/30 rounded border border-border">
              <div className="text-2xl font-bold text-[#10B981] mb-1">NEW</div>
              <div className="text-xs text-muted-foreground">Your Status</div>
            </div>
          </div>
          <Button onClick={() => onNavigate("marketplace")} className="bg-primary text-primary-foreground">
            View My Profile in Marketplace
          </Button>
        </Card>
      )}
    </div>
  );
}
