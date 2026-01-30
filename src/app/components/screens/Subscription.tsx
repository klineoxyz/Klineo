import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Info, Loader2, Zap, ChevronDown, ChevronUp, Copy, Bot, Sparkles, Store, Check } from "lucide-react";
import { api } from "@/lib/api";
import type { BillingPlansResponse, EntitlementResponse } from "@/lib/api";
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
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningFeeLoading, setJoiningFeeLoading] = useState(false);
  const [packageLoading, setPackageLoading] = useState<string | null>(null);
  const [revenueOpen, setRevenueOpen] = useState(false);

  const loadEntitlement = async () => {
    try {
      const data = await api.get<EntitlementResponse>("/api/me/entitlement");
      setEntitlement(data);
    } catch {
      setEntitlement(null);
    }
  };

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

  useEffect(() => {
    loadEntitlement();
  }, []);

  const handleJoiningFeeCheckout = async () => {
    setJoiningFeeLoading(true);
    try {
      await api.post("/api/billing/joining-fee/checkout", { method: "manual" });
      toast.success("Checkout started", {
        description: "Complete your joining fee payment to enable API connection.",
      });
      await loadEntitlement();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast.error("Could not start checkout", { description: msg });
    } finally {
      setJoiningFeeLoading(false);
    }
  };

  const handlePackageCheckout = async (packageId: string) => {
    if (!entitlement?.joiningFeePaid) {
      toast.error("Pay joining fee first", {
        description: "You must pay the joining fee before you can buy packages.",
      });
      return;
    }
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
          joiningFeePaid={entitlement?.joiningFeePaid ?? false}
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
          Pay a one-time joining fee, then buy a package and trade until you make the profit shown (e.g. $100 → $300 profit). Then top up or upgrade to continue.
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
        joiningFeePaid={entitlement?.joiningFeePaid ?? false}
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
  joiningFeePaid,
}: {
  plans: BillingPlansResponse;
  onJoiningFeeCheckout: () => void;
  onPackageCheckout: (packageId: string) => void;
  joiningFeeLoading: boolean;
  packageLoading: string | null;
  revenueOpen: boolean;
  onRevenueOpenChange: (open: boolean) => void;
  joiningFeePaid: boolean;
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

      {/* Revenue allocation */}
      <Collapsible open={revenueOpen} onOpenChange={onRevenueOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <Info className="size-4" />
            REV Distribution
            {revenueOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue Allocation: {revenueSplit.mlmPct}% Community Rewards · {revenueSplit.platformPct}% Platform · {revenueSplit.marketingPct}% Marketing
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Trading Packages — clear: buy package, trade until you make X profit (multiplier), then top up */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Trading packages</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Buy a package and trade until you make the profit shown below (e.g. $100 package → trade until you make $300 profit). Then top up or upgrade to continue.
        </p>
        {!joiningFeePaid && (
          <div className="mb-4 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
            Pay the joining fee above before you can buy packages.
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-sm font-medium">
          <span className="text-foreground">Starter — <span className="text-primary font-semibold">$100</span></span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground">Booster — <span className="text-primary font-semibold">$200</span></span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground">Establish — <span className="text-primary font-semibold">$500</span></span>
        </div>
        {(() => {
          const packageDisplayNames: Record<string, string> = {
            entry_100: "Starter Package",
            pro_200: "Booster Package",
            elite_500: "Establish Package",
          };
          const packageSubtext = "Then top up or upgrade to continue.";
          const packageFeatures: Record<string, { copyTrades: number | string; bots: number | string; canCreateStrategy: boolean; listStrategyInMarket: boolean }> = {
            entry_100: { copyTrades: 1, bots: 5, canCreateStrategy: true, listStrategyInMarket: false },
            pro_200: { copyTrades: 5, bots: 10, canCreateStrategy: true, listStrategyInMarket: true },
            elite_500: { copyTrades: "Unlimited", bots: "Unlimited", canCreateStrategy: true, listStrategyInMarket: true },
          };
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {packages.map((pkg) => {
                const popular = pkg.id === "pro_200";
                const features = packageFeatures[pkg.id] ?? { copyTrades: 1, bots: 5, canCreateStrategy: true, listStrategyInMarket: false };
                const displayName = packageDisplayNames[pkg.id] ?? `$${pkg.priceUsd} package`;
                return (
                  <Card
                    key={pkg.id}
                    className={`p-4 sm:p-6 flex flex-col ${popular ? "border-primary/50 ring-2 ring-primary/20" : ""}`}
                  >
                    {popular && (
                      <Badge className="mb-3 w-fit bg-primary text-primary-foreground">Most popular</Badge>
                    )}
                    <div className="mb-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="text-lg font-semibold">
                          {displayName}
                        </h3>
                        <span className="text-2xl font-bold text-primary">${pkg.priceUsd}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 font-medium">
                        Buy ${pkg.priceUsd}. Trade until you make <span className="text-foreground font-semibold">${pkg.profitAllowanceUsd.toLocaleString()}</span> profit ({pkg.multiplier}x).
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {packageSubtext}
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-primary" />
                        <span>Duration: until allowance used</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-primary" />
                        <span>Copy trading: <strong className="text-foreground">{features.copyTrades}</strong> trader{features.copyTrades === 1 ? "" : "s"} at a time</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-primary" />
                        <span>Auto-trade bots: <strong className="text-foreground">{features.bots}</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-primary" />
                        <span>Create strategy: {features.canCreateStrategy ? "yes" : "no"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-primary" />
                        <span>List in Market: {features.listStrategyInMarket ? "yes" : "no (upgrade to list)"}</span>
                      </li>
                    </ul>
                    <Button
                      className="mt-4 w-full"
                      variant={popular ? "default" : "outline"}
                      onClick={() => onPackageCheckout(pkg.id)}
                      disabled={!!packageLoading || !joiningFeePaid}
                    >
                      {packageLoading === pkg.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : !joiningFeePaid ? (
                        "Pay joining fee first"
                      ) : (
                        "Start now"
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>
    </>
  );
}
