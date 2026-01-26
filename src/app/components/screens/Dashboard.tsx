import { Card } from "@/app/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useState, useMemo } from "react";
import { DashboardLoading } from "./DashboardLoading";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { Sparkline, generateSparklineData } from "@/app/components/ui/sparkline";

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);

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
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold mb-1">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Operational overview of your trading activity</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 w-full sm:w-auto"
          >
            <RefreshCw className="size-4" />
            Refresh Data
          </Button>
        </div>

        {/* System Alerts */}
        <Alert className="border-[#FFB000]/20 bg-[#FFB000]/5">
          <AlertCircle className="size-4 text-[#FFB000]" />
          <AlertDescription className="text-sm">
            Copy trader <span className="font-medium">ProTrader_XYZ</span> has been paused due to max daily loss limit
          </AlertDescription>
        </Alert>

        {/* Key Metrics with Sparklines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-4 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Equity (30d)</div>
            <div className="text-xl sm:text-2xl font-mono font-bold">$24,567.82</div>
            <Sparkline
              data={portfolioData}
              width={180}
              height={40}
              color="#10B981"
              valueFormatter={(v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />
            <div className="text-xs text-muted-foreground">USDT</div>
          </Card>

          <Card className="p-3 sm:p-4 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Today's PnL</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#10B981] flex items-center gap-1">
              <TrendingUp className="size-5" />
              +$342.18
            </div>
            <Sparkline
              data={dailyPnLData}
              width={180}
              height={40}
              color="#10B981"
              valueFormatter={(v) => `${v >= 0 ? "+" : ""}$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />
            <div className="text-xs font-mono text-muted-foreground">+1.42%</div>
          </Card>

          <Card className="p-3 sm:p-4 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Unrealized PnL</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#EF4444] flex items-center gap-1">
              <TrendingDown className="size-5" />
              -$128.45
            </div>
            <div className="text-xs font-mono text-muted-foreground">-0.52%</div>
          </Card>

          <Card className="p-3 sm:p-4 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Copied Traders</div>
            <div className="text-xl sm:text-2xl font-mono font-bold">3</div>
            <div className="text-xs text-muted-foreground">of 5 max</div>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-4 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Platform Fees (This Month)</div>
            <div className="text-xl font-mono font-bold">$45.23</div>
            <div className="text-xs text-muted-foreground">From profitable trades</div>
          </Card>

          <Card className="p-3 sm:p-4 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Referral Earnings</div>
            <div className="text-xl font-mono font-bold text-[#FFB000]">$127.50</div>
            <div className="text-xs text-muted-foreground">$85.00 pending payout</div>
          </Card>

          <Card className="p-3 sm:p-4 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Copy Engine Status</div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#10B981]" />
              <span className="font-medium">Running</span>
            </div>
            <div className="text-xs text-muted-foreground">Last sync: 2s ago</div>
          </Card>
        </div>

        {/* Active Copy Traders */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4">Active Copy Traders</h3>
          <div className="space-y-3">
            {[
              { name: "ProTrader_XYZ", status: "paused", roi: "+24.3%", pnl: "+$1,245.00" },
              { name: "AlphaStrategist", status: "running", roi: "+18.7%", pnl: "+$892.50" },
              { name: "QuantMaster_Pro", status: "running", roi: "+31.2%", pnl: "+$1,567.20" },
            ].map((trader, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-secondary/30 rounded border border-border">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="size-10 rounded bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                    {trader.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{trader.name}</div>
                    <div className="text-xs text-muted-foreground">ROI: {trader.roi}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pl-[52px] sm:pl-0">
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-medium text-[#10B981]">{trader.pnl}</div>
                    <div className="text-xs text-muted-foreground">Your PnL</div>
                  </div>
                  <Badge variant={trader.status === "running" ? "default" : "secondary"} className="min-w-20 justify-center shrink-0">
                    {trader.status === "running" ? (
                      <><Activity className="size-3 mr-1" /> Running</>
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