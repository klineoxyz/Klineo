import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { useDemo } from "@/app/contexts/DemoContext";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { ErrorState } from "@/app/components/ui/error-state";

interface PortfolioSummary {
  totalPnl: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalVolume: number;
  openPositions: number;
  activeCopySetups: number;
}

export function Portfolio() {
  const { isDemoMode } = useDemo();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.get<PortfolioSummary>("/api/portfolio/summary");
        setSummary(data);
      } catch (err: any) {
        const message = err?.message || "Failed to load portfolio";
        setError(message);
        toast.error("Failed to load portfolio", { description: message });
      } finally {
        setIsLoading(false);
      }
    };

    if (!isDemoMode) loadSummary();
    else setIsLoading(false);
  }, [isDemoMode]);

  if (isLoading && !isDemoMode) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isDemoMode && error && !summary) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Failed to load portfolio"
          message={error}
          action={
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  // In demo mode, show placeholder and banner; real data only in Live
  const effectiveSummary = isDemoMode
    ? { totalPnl: 0, unrealizedPnl: 0, realizedPnl: 0, totalVolume: 0, openPositions: 0, activeCopySetups: 0 }
    : summary;

  // Mock chart data (in real app, this would come from historical data)
  const equityData = [
    { date: "Jan 15", value: 20000 },
    { date: "Jan 16", value: 20450 },
    { date: "Jan 17", value: 20280 },
    { date: "Jan 18", value: 21100 },
    { date: "Jan 19", value: 22300 },
    { date: "Jan 20", value: 22850 },
    { date: "Jan 21", value: 23420 },
    { date: "Jan 22", value: 24150 },
    { date: "Jan 23", value: 24567 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {isDemoMode && (
        <Alert className="bg-primary/10 border-primary/30">
          <AlertDescription>
            Demo mode — portfolio is placeholder. Switch to <strong>Live</strong> via the user menu (top right) to see your real portfolio and connect Binance/Bybit.
          </AlertDescription>
        </Alert>
      )}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">Portfolio</h1>
        <p className="text-sm text-muted-foreground">Overview of your asset balances and equity</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total PnL</div>
          <div className={`text-xl sm:text-2xl font-semibold truncate ${(effectiveSummary?.totalPnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            ${(effectiveSummary?.totalPnl || 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">All time</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Unrealized PnL</div>
          <div className={`text-xl sm:text-2xl font-semibold truncate ${(effectiveSummary?.unrealizedPnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            ${(effectiveSummary?.unrealizedPnl || 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Open positions</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Realized PnL</div>
          <div className={`text-xl sm:text-2xl font-semibold truncate ${(effectiveSummary?.realizedPnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            ${(effectiveSummary?.realizedPnl || 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Closed positions</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Volume</div>
          <div className="text-xl sm:text-2xl font-semibold truncate">${((effectiveSummary?.totalVolume || 0) / 1000).toFixed(1)}k</div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Open Positions</div>
          <div className="text-xl sm:text-2xl font-semibold">{effectiveSummary?.openPositions || 0}</div>
        </Card>
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Copy Setups</div>
          <div className="text-xl sm:text-2xl font-semibold">{effectiveSummary?.activeCopySetups || 0}</div>
        </Card>
      </div>

      {/* Equity Chart */}
      <Card className="p-4 sm:p-6 overflow-hidden">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Equity Chart</h3>
        <div className="h-48 sm:h-64 md:h-[300px] min-h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" />
            <XAxis dataKey="date" stroke="#8B8B8B" />
            <YAxis stroke="#8B8B8B" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#12151A",
                border: "1px solid #2A2D35",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#8B8B8B" }}
              formatter={(value: number) => [`$${value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Equity"]}
              cursor={{ stroke: "#374151", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#10B981", stroke: "#12151A", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
