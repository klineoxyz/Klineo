import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Info, Loader2, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import type { BillingPlansResponse } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";

interface SubscriptionProps {
  onNavigate: (view: string) => void;
}

export function Subscription({ onNavigate }: SubscriptionProps) {
  const [plans, setPlans] = useState<BillingPlansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningFeeLoading, setJoiningFeeLoading] = useState(false);
  const [packageLoading, setPackageLoading] = useState<string | null>(null);
  const [revenueOpen, setRevenueOpen] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";
      if (!baseURL?.trim()) {
        setPlans({
          joiningFee: { priceUsd: 100, currency: "USD" },
          packages: [
            { id: "entry_100", priceUsd: 100, multiplier: 3, profitAllowanceUsd: 300 },
            { id: "pro_200", priceUsd: 200, multiplier: 5, profitAllowanceUsd: 1000 },
            { id: "elite_500", priceUsd: 500, multiplier: 10, profitAllowanceUsd: 5000 },
          ],
          revenueSplit: { mlmPct: 70, platformPct: 20, marketingPct: 10 },
        });
        return; // finally block will run and setLoading(false)
      }
      const data = await api.get<BillingPlansResponse>("/api/billing/plans");
      setPlans(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load plans";
      setError(msg);
      setPlans(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleJoiningFeeCheckout = async () => {
    setJoiningFeeLoading(true);
    try {
      await api.post("/api/billing/joining-fee/checkout", { method: "manual" });
      toast.success("Checkout started", {
        description: "Complete your joining fee payment to enable API connection.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast.error("Could not start checkout", { description: msg });
    } finally {
      setJoiningFeeLoading(false);
    }
  };

  const handlePackageCheckout = async (packageId: string) => {
    setPackageLoading(packageId);
    try {
      await api.post("/api/billing/packages/checkout", {
        packageId,
        method: "manual",
      });
      toast.success("Checkout started", {
        description: "Complete payment to activate your trading allowance.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast.error("Could not start checkout", { description: msg });
    } finally {
      setPackageLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !plans) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl sm:text-2xl font-semibold">Packages & Membership</h1>
        <Card className="p-8 border-destructive/30 bg-destructive/5">
          <p className="text-muted-foreground mb-4">
            Plans could not be loaded. You can still view default packages below.
          </p>
          <Button variant="outline" onClick={loadPlans}>
            Try again
          </Button>
        </Card>
        {/* Fallback static plans for offline / no-backend */}
        <SubscriptionContent
          plans={{
            joiningFee: { priceUsd: 100, currency: "USD" },
            packages: [
              { id: "entry_100", priceUsd: 100, multiplier: 3, profitAllowanceUsd: 300 },
              { id: "pro_200", priceUsd: 200, multiplier: 5, profitAllowanceUsd: 1000 },
              { id: "elite_500", priceUsd: 500, multiplier: 10, profitAllowanceUsd: 5000 },
            ],
            revenueSplit: { mlmPct: 70, platformPct: 20, marketingPct: 10 },
          }}
          onJoiningFeeCheckout={handleJoiningFeeCheckout}
          onPackageCheckout={handlePackageCheckout}
          joiningFeeLoading={joiningFeeLoading}
          packageLoading={packageLoading}
          revenueOpen={revenueOpen}
          onRevenueOpenChange={setRevenueOpen}
        />
      </div>
    );
  }

  if (!plans) return null;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">Packages & Membership</h1>
        <p className="text-sm text-muted-foreground">
          Pay a one-time joining fee, then buy trading packages to unlock profit allowance.
        </p>
      </div>

      <SubscriptionContent
        plans={plans}
        onJoiningFeeCheckout={handleJoiningFeeCheckout}
        onPackageCheckout={handlePackageCheckout}
        joiningFeeLoading={joiningFeeLoading}
        packageLoading={packageLoading}
        revenueOpen={revenueOpen}
        onRevenueOpenChange={setRevenueOpen}
      />

      {/* Payment History */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Payment History</h3>
          <Button variant="outline" size="sm" onClick={() => onNavigate("payments")}>
            View All
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          View and download past payments in Payments.
        </p>
      </Card>
    </div>
  );
}

function SubscriptionContent({
  plans,
  onJoiningFeeCheckout,
  onPackageCheckout,
  joiningFeeLoading,
  packageLoading,
  revenueOpen,
  onRevenueOpenChange,
}: {
  plans: BillingPlansResponse;
  onJoiningFeeCheckout: () => void;
  onPackageCheckout: (packageId: string) => void;
  joiningFeeLoading: boolean;
  packageLoading: string | null;
  revenueOpen: boolean;
  onRevenueOpenChange: (open: boolean) => void;
}) {
  const { joiningFee, packages, revenueSplit } = plans;

  return (
    <>
      {/* Joining Fee */}
      <Card className="p-4 sm:p-6 border-primary/30 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg sm:text-xl font-semibold">Joining Fee</h3>
              <Badge variant="secondary">Required</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Enables profile creation and CEX API connection before you can copy trade.
            </p>
            <div className="text-2xl font-semibold">
              ${joiningFee.priceUsd}
              <span className="text-base font-normal text-muted-foreground"> one-time</span>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto shrink-0"
            onClick={onJoiningFeeCheckout}
            disabled={joiningFeeLoading}
          >
            {joiningFeeLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Pay joining fee"
            )}
          </Button>
        </div>
      </Card>

      {/* Revenue split */}
      <Collapsible open={revenueOpen} onOpenChange={onRevenueOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <Info className="size-4" />
            Revenue split
            {revenueOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="text-sm text-muted-foreground mt-1">
            {revenueSplit.mlmPct}% referral rewards, {revenueSplit.platformPct}% platform,{" "}
            {revenueSplit.marketingPct}% marketing.
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Trading Packages */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Trading packages</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Buy a package to unlock a profit allowance. Trade until you earn up to that profit cap, then buy again to continue.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {packages.map((pkg, i) => {
            const popular = pkg.id === "pro_200";
            return (
              <Card
                key={pkg.id}
                className={`p-4 sm:p-6 flex flex-col ${popular ? "border-primary/50 ring-2 ring-primary/20" : ""}`}
              >
                {popular && (
                  <Badge className="mb-3 w-fit bg-primary text-primary-foreground">Most popular</Badge>
                )}
                <div className="mb-2">
                  <h3 className="text-lg font-semibold">
                    ${pkg.priceUsd} package
                  </h3>
                  <div className="text-2xl sm:text-3xl font-semibold mt-1">
                    ${pkg.profitAllowanceUsd.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Profit allowance ({pkg.multiplier}x — trade until you earn up to this much profit)
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-accent">
                  <Zap className="size-4 shrink-0" />
                  <span>Unlock {pkg.multiplier}x allowance</span>
                </div>
                <Button
                  className="mt-4 w-full"
                  variant={popular ? "default" : "outline"}
                  onClick={() => onPackageCheckout(pkg.id)}
                  disabled={!!packageLoading}
                >
                  {packageLoading === pkg.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Buy package"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
