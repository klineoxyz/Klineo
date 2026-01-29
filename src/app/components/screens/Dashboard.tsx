import { Card } from "@/app/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown, Activity, RefreshCw, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { DashboardLoading } from "./DashboardLoading";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { Sparkline, generateSparklineData } from "@/app/components/ui/sparkline";
import { api } from "@/lib/api";
import type { EntitlementResponse } from "@/lib/api";

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL ?? "";
    if (!base?.trim()) return;
    api.get<EntitlementResponse>("/api/me/entitlement").then(setEntitlement).catch(() => setEntitlement(null));
  }, []);

  // Generate sparkline data (in production, this would come from API)
  const portfolioData = useMemo(() => generateSparklineData(30, 24000, 0.02, 500), []);
  const dailyPnLData = useMemo(() => generateSparklineData(30, 300, 0.3, 40), []);

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate data fetch
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <LoadingWrapper
      isLoading={isLoading}
      loadingComponent={<DashboardLoading />}
    >
      <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Overview of your trading activity</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5 w-full sm:w-auto shrink-0"
          >
            <RefreshCw className="size-3.5" />
            Refresh Data
          </Button>
        </div>

        {/* Allowance exhausted banner */}
        {entitlement?.status === "exhausted" && (
          <Alert className="border-[#EF4444]/30 bg-[#EF4444]/5 py-2.5 px-3 sm:px-4">
            <Package className="size-3.5 text-[#EF4444] shrink-0" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
              <span>Your package allowance is exhausted. Buy a new package to continue copy trading.</span>
              {onNavigate && (
                <Button variant="outline" size="sm" className="border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10 shrink-0 h-8 text-xs" onClick={() => onNavigate("subscription")}>
                  <Package className="size-3 mr-1" />
                  Buy package
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* System Alerts */}
        <Alert className="border-[#FFB000]/20 bg-[#FFB000]/5 py-2.5 px-3 sm:px-4">
          <AlertCircle className="size-3.5 text-[#FFB000] shrink-0" />
          <AlertDescription className="text-xs sm:text-sm">
            Copy trader <span className="font-medium">ProTrader_XYZ</span> has been paused due to max daily loss limit
          </AlertDescription>
        </Alert>

        {/* Key Metrics with Sparklines */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card className="p-2.5 sm:p-3 space-y-2">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Total Equity (30d)</div>
            <div className="text-base sm:text-lg font-mono font-bold truncate">$24,567.82</div>
            <Sparkline
              data={portfolioData}
              width={140}
              height={32}
              color="#10B981"
              valueFormatter={(v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />
            <div className="text-[10px] text-muted-foreground">USDT</div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-2">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Today's PnL</div>
            <div className="text-base sm:text-lg font-mono font-bold text-[#10B981] flex items-center gap-1 truncate">
              <TrendingUp className="size-4 shrink-0" />
              +$342.18
            </div>
            <Sparkline
              data={dailyPnLData}
              width={140}
              height={32}
              color="#10B981"
              valueFormatter={(v) => `${v >= 0 ? "+" : ""}$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />
            <div className="text-[10px] font-mono text-muted-foreground">+1.42%</div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-1.5">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Unrealized PnL</div>
            <div className="text-base sm:text-lg font-mono font-bold text-[#EF4444] flex items-center gap-1">
              <TrendingDown className="size-4 shrink-0" />
              -$128.45
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">-0.52%</div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-1.5">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Active Copied</div>
            <div className="text-base sm:text-lg font-mono font-bold">3</div>
            <div className="text-[10px] text-muted-foreground">of 5 max</div>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Card className="p-2.5 sm:p-3 space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Platform Fees</div>
            <div className="text-base sm:text-lg font-mono font-bold">$45.23</div>
            <div className="text-[10px] text-muted-foreground">This month</div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Referral Earnings</div>
            <div className="text-base sm:text-lg font-mono font-bold text-[#FFB000]">$127.50</div>
            <div className="text-[10px] text-muted-foreground">$85 pending</div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Copy Engine</div>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#10B981]" />
              <span className="font-medium text-sm">Running</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Last sync: 2s ago</div>
          </Card>
        </div>

        {/* Active Copy Traders */}
        <Card className="p-3 sm:p-4">
          <h3 className="text-sm font-semibold mb-3">Active Copy Traders</h3>
          <div className="space-y-2">
            {[
              { name: "ProTrader_XYZ", status: "paused", roi: "+24.3%", pnl: "+$1,245.00" },
              { name: "AlphaStrategist", status: "running", roi: "+18.7%", pnl: "+$892.50" },
              { name: "QuantMaster_Pro", status: "running", roi: "+31.2%", pnl: "+$1,567.20" },
            ].map((trader, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-md bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                    {trader.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{trader.name}</div>
                    <div className="text-[10px] text-muted-foreground">ROI {trader.roi}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-medium text-[#10B981]">{trader.pnl}</div>
                    <div className="text-[10px] text-muted-foreground">PnL</div>
                  </div>
                  <Badge variant={trader.status === "running" ? "default" : "secondary"} className="text-[10px] px-2 py-0 h-5 min-w-[4.5rem] justify-center">
                    {trader.status === "running" ? (
                      <><Activity className="size-2.5 mr-1" /> Running</>
                    ) : (
                      "Paused"
                    )}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </LoadingWrapper>
  );
}