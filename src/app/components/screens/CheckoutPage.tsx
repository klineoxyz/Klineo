import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, Check, Shield, Clock, Zap, ExternalLink, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "@/app/lib/toast";
import { copyToClipboard } from "@/app/lib/clipboard";

interface CheckoutPageProps {
  onNavigate: (view: string) => void;
  selectedPlan?: string;
  selectedDuration?: string;
}

const plans = {
  starter: { name: "Starter", monthly: 29, sixMonth: 156 },
  pro: { name: "Pro", monthly: 79, sixMonth: 426 },
  unlimited: { name: "Unlimited", monthly: 199, sixMonth: 1074 },
};

const cryptoCurrencies = [
  { symbol: "USDT", name: "Tether", icon: "₮", network: "TRC20" },
  { symbol: "BTC", name: "Bitcoin", icon: "₿", network: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", network: "ERC20" },
  { symbol: "USDC", name: "USD Coin", icon: "$", network: "ERC20" },
  { symbol: "BNB", name: "Binance Coin", icon: "B", network: "BSC" },
  { symbol: "LTC", name: "Litecoin", icon: "Ł", network: "Litecoin" },
];

export function CheckoutPage({ onNavigate, selectedPlan = "pro", selectedDuration = "monthly" }: CheckoutPageProps) {
  const [plan, setPlan] = useState(selectedPlan);
  const [duration, setDuration] = useState(selectedDuration);
  const [couponCode, setCouponCode] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("USDT");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "awaiting" | "completed">("idle");
  
  const planDetails = plans[plan as keyof typeof plans];
  const basePrice = duration === "monthly" ? planDetails.monthly : planDetails.sixMonth;
  const discount = duration === "sixmonth" ? basePrice * 0.1 : 0;
  const totalPrice = basePrice - discount;

  // Mock payment address
  const paymentAddress = "TXhZQ9K3jP8vN2mR7cU4sW6bL1dF5eG9aH";

  const handleGenerateInvoice = () => {
    setPaymentStatus("processing");
    setTimeout(() => {
      setPaymentStatus("awaiting");
    }, 1500);
  };

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(paymentAddress);
    if (success) {
      toast.success("Address copied", {
        description: "Payment address copied to clipboard",
      });
    } else {
      toast.error("Copy failed", {
        description: "Please copy the address manually",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => onNavigate("subscription")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition"
          >
            <ArrowLeft className="size-4" />
            Back to Subscription
          </button>
          <h1 className="text-2xl font-semibold mb-1">Checkout</h1>
          <p className="text-sm text-muted-foreground">Complete your subscription payment</p>
        </div>
        <Badge className="bg-primary text-primary-foreground">
          Secure Payment
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Order Summary */}
        <div className="col-span-2 space-y-6">
          {/* Plan Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Select Your Plan</h3>
            <Tabs value={plan} onValueChange={setPlan}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="starter">Starter</TabsTrigger>
                <TabsTrigger value="pro">
                  Pro
                  <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-xs">
                    Popular
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="unlimited">Unlimited</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-6 p-4 bg-secondary/30 rounded border border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">{planDetails.name} Plan</div>
                  <div className="text-sm text-muted-foreground">
                    {duration === "monthly" ? "Billed monthly" : "Billed every 6 months"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold font-mono">${basePrice}</div>
                  {duration === "sixmonth" && (
                    <div className="text-xs text-[#10B981]">Save 10%</div>
                  )}
                </div>
              </div>

              <Tabs value={duration} onValueChange={setDuration} className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="sixmonth">
                    6 Months
                    <Zap className="size-3 ml-1 text-primary" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </Card>

          {/* Coupon Code */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Coupon or Referral Code</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
              </div>
              <Button variant="outline">Apply</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Have a referral code? Enter it above to get special discounts.
            </p>
          </Card>

          {/* Payment Method */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Payment Method</h3>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                CoinPayments
              </Badge>
            </div>

            {paymentStatus === "idle" && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Select your preferred cryptocurrency for payment
                </p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {cryptoCurrencies.map((crypto) => (
                    <button
                      key={crypto.symbol}
                      onClick={() => setSelectedCrypto(crypto.symbol)}
                      className={`p-4 rounded border transition ${
                        selectedCrypto === crypto.symbol
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-2xl mb-1">{crypto.icon}</div>
                      <div className="font-semibold text-sm">{crypto.symbol}</div>
                      <div className="text-xs text-muted-foreground">{crypto.network}</div>
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground"
                  size="lg"
                  onClick={handleGenerateInvoice}
                >
                  Generate Payment Invoice
                </Button>
              </>
            )}

            {paymentStatus === "processing" && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary mb-4"></div>
                <p className="text-muted-foreground">Generating payment invoice...</p>
              </div>
            )}

            {paymentStatus === "awaiting" && (
              <div className="space-y-6">
                <div className="p-4 bg-accent/10 border border-accent/30 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="size-5 text-accent" />
                    <span className="font-semibold">Payment Awaiting</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Send exactly <span className="font-mono font-semibold text-foreground">{totalPrice} {selectedCrypto}</span> to the address below
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Payment Address ({selectedCrypto})</Label>
                  <div className="flex gap-2">
                    <Input
                      value={paymentAddress}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" onClick={handleCopyAddress}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-secondary/30 rounded border border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount to send:</span>
                    <span className="font-mono font-semibold">{totalPrice} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Network:</span>
                    <span className="font-mono">{cryptoCurrencies.find(c => c.symbol === selectedCrypto)?.network}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-xs border-accent/50 text-accent">
                      Awaiting Payment
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded">
                  <div className="flex gap-3">
                    <Shield className="size-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Important Payment Instructions</p>
                      <ul className="text-muted-foreground space-y-1 text-xs">
                        <li>• Send the exact amount shown above</li>
                        <li>• Use the correct network ({cryptoCurrencies.find(c => c.symbol === selectedCrypto)?.network})</li>
                        <li>• Payment will be confirmed within 10-30 minutes</li>
                        <li>• Do not close this page until payment is confirmed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setPaymentStatus("idle")}>
                    Change Payment Method
                  </Button>
                  <Button className="flex-1 bg-[#10B981] hover:bg-[#10B981]/90" onClick={() => setPaymentStatus("completed")}>
                    I've Sent Payment
                  </Button>
                </div>
              </div>
            )}

            {paymentStatus === "completed" && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-[#10B981]/20 mb-4">
                  <Check className="size-8 text-[#10B981]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Payment Received!</h3>
                <p className="text-muted-foreground mb-6">
                  Your subscription is now active. Welcome to {planDetails.name}!
                </p>
                <Button onClick={() => onNavigate("dashboard")} className="bg-primary text-primary-foreground">
                  Go to Dashboard
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="space-y-6">
          <Card className="p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
            
            <div className="space-y-3 mb-6 pb-6 border-b border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{planDetails.name} Plan</span>
                <span className="font-mono">${basePrice}</span>
              </div>
              {duration === "sixmonth" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">6-Month Discount (10%)</span>
                  <span className="font-mono text-[#10B981]">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coupon Discount</span>
                <span className="font-mono">$0.00</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <span className="font-semibold">Total Payable</span>
              <span className="text-2xl font-semibold font-mono">${totalPrice}</span>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                <span>Instant activation</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                <span>24/7 support included</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                <span>Secure crypto payment</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="size-5 text-accent" />
              <h4 className="font-semibold">Secure Payment</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All payments are processed securely through CoinPayments. Your subscription begins immediately after payment confirmation.
            </p>
            <Button variant="link" className="text-xs p-0 h-auto mt-2 text-accent" asChild>
              <a href="#" className="flex items-center gap-1">
                Learn more about CoinPayments
                <ExternalLink className="size-3" />
              </a>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}