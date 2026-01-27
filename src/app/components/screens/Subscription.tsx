import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

const plans = [
  {
    name: "Starter",
    price: 29,
    features: [
      "Copy up to 2 traders",
      "Basic risk controls",
      "Email support",
      "Trade history (30 days)",
      "Standard execution speed",
    ],
  },
  {
    name: "Pro",
    price: 79,
    popular: true,
    features: [
      "Copy up to 5 traders",
      "Advanced risk controls",
      "Priority support",
      "Unlimited trade history",
      "Priority execution speed",
      "Referral program access",
    ],
  },
  {
    name: "Unlimited",
    price: 199,
    features: [
      "Unlimited trader copies",
      "Advanced risk controls",
      "24/7 dedicated support",
      "Unlimited trade history",
      "Priority execution speed",
      "Referral program access",
      "Custom integrations",
      "API access",
    ],
  },
];

interface SubscriptionProps {
  onNavigate: (view: string) => void;
}

export function Subscription({ onNavigate }: SubscriptionProps) {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">Subscription</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      <Card className="p-4 sm:p-6 bg-secondary/30 border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold">Pro Plan</h3>
              <Badge className="bg-primary text-primary-foreground">Current</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your subscription renews on March 15, 2026
            </p>
            <div className="text-2xl font-semibold mb-1">$79<span className="text-base text-muted-foreground">/month</span></div>
          </div>
          <Button variant="outline" className="w-full sm:w-auto">Manage Plan</Button>
        </div>
      </Card>

      {/* Duration Toggle */}
      <div className="flex justify-center">
        <Tabs defaultValue="monthly" className="w-full max-w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="6months">
              6 Months
              <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                Save 10%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan, i) => (
          <Card 
            key={i} 
            className={`p-6 space-y-6 ${plan.popular ? "border-primary/50 ring-2 ring-primary/20" : ""}`}
          >
            {plan.popular && (
              <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
            )}
            
            <div>
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="text-3xl font-semibold mb-1">
                ${plan.price}
                <span className="text-base text-muted-foreground">/month</span>
              </div>
              <div className="text-xs text-muted-foreground">
                ${Math.floor(plan.price * 6 * 0.9)} for 6 months (save 10%)
              </div>
            </div>

            <ul className="space-y-3">
              {plan.features.map((feature, j) => (
                <li key={j} className="flex items-start gap-2 text-sm">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              className={`w-full ${plan.popular ? "bg-primary text-primary-foreground" : ""}`}
              variant={plan.popular ? "default" : "outline"}
              onClick={() => plan.name === "Pro" ? null : onNavigate("checkout")}
            >
              {plan.name === "Pro" ? "Current Plan" : "Upgrade"}
            </Button>
          </Card>
        ))}
      </div>

      {/* Coupon & Payment */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Apply Coupon or Referral Link</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Coupon Code</Label>
            <div className="flex gap-2">
              <Input placeholder="Enter coupon code" />
              <Button variant="outline">Apply</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Referral Link</Label>
            <div className="flex gap-2">
              <Input placeholder="Paste referral link" />
              <Button variant="outline">Apply</Button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-secondary/30 rounded space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base Price (Pro - 6 months):</span>
            <span className="font-mono">$474.00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">6-Month Discount (10%):</span>
            <span className="font-mono text-[#10B981]">-$47.40</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Coupon Discount:</span>
            <span className="font-mono">$0.00</span>
          </div>
          <div className="border-t border-border pt-2 mt-2 flex justify-between">
            <span className="font-semibold">Total Payable:</span>
            <span className="font-mono text-xl font-semibold">$426.60</span>
          </div>
        </div>
      </Card>

      {/* Payment History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Payment History</h3>
          <Button variant="outline" size="sm" onClick={() => onNavigate("payments")}>
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {[
            { id: "INV-2024-001", amount: "$79.00", status: "Paid", date: "Sep 15, 2025" },
            { id: "INV-2024-002", amount: "$79.00", status: "Paid", date: "Oct 15, 2025" },
            { id: "INV-2024-003", amount: "$79.00", status: "Paid", date: "Nov 15, 2025" },
          ].map((payment, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded border border-border">
              <div>
                <div className="font-mono text-sm">{payment.id}</div>
                <div className="text-xs text-muted-foreground">{payment.date}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-medium">{payment.amount}</div>
                <Badge variant="outline" className="text-xs border-[#10B981]/50 text-[#10B981]">
                  {payment.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}