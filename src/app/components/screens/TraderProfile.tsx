import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { TrendingUp, TrendingDown, Users, ArrowLeft, Copy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { ErrorState } from "@/app/components/ui/error-state";

interface TraderProfileProps {
  onNavigate: (view: string, data?: any) => void;
  traderData?: any;
}

interface TraderDetails {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  avatarUrl?: string;
  exchange?: string;
  verified: boolean;
  status: string;
  followers: number;
  stats: {
    totalPnl: number;
    avgRoi: number;
    maxDrawdown: number;
    totalVolume: number;
    performancePoints: number;
  };
  performance: Array<{
    periodStart: string;
    periodEnd: string;
    pnl: number;
    pnlPct: number;
    volume: number;
    drawdownPct: number;
  }>;
}

const PERFORMANCE_PERIODS = ["1m", "3m", "6m", "1y", "all"] as const;
type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];

function filterPerformanceByPeriod(
  performance: TraderDetails["performance"],
  period: PerformancePeriod
): { data: TraderDetails["performance"]; fallbackLabel: string | null } {
  if (!performance.length) return { data: [], fallbackLabel: null };
  if (period === "all") return { data: performance, fallbackLabel: null };

  const now = Date.now();
  const ms = (n: number) => n * 24 * 60 * 60 * 1000;
  const cutoff =
    period === "1m" ? now - ms(31) :
    period === "3m" ? now - ms(92) :
    period === "6m" ? now - ms(183) :
    period === "1y" ? now - ms(365) : 0;

  const filtered = performance.filter((p) => new Date(p.periodEnd).getTime() >= cutoff);
  // If no data in range, show all so chart never goes empty; label so user knows
  if (filtered.length === 0) {
    return { data: performance, fallbackLabel: "No data in selected period; showing all." };
  }
  return { data: filtered, fallbackLabel: null };
}

export function TraderProfile({ onNavigate, traderData }: TraderProfileProps) {
  const [trader, setTrader] = useState<TraderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>("all");

  const traderId = traderData?.id || traderData?.slug;

  useEffect(() => {
    if (!traderId) {
      setError("Trader ID not provided");
      setIsLoading(false);
      return;
    }

    const loadTrader = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.get<TraderDetails>(`/api/traders/${traderId}`);
        setTrader(data);
      } catch (err: any) {
        const message = err?.message || "Failed to load trader";
        setError(message);
        toast.error("Failed to load trader", { description: message });
      } finally {
        setIsLoading(false);
      }
    };

    loadTrader();
  }, [traderId]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !trader) {
    return (
      <div className="p-6">
        <ErrorState
          title="Trader not found"
          message={error || "The trader you're looking for doesn't exist or is not available."}
          action={
            <Button onClick={() => onNavigate("marketplace")} variant="outline">
              Back to Marketplace
            </Button>
          }
        />
      </div>
    );
  }

  // Defensive: ensure stats exist (API may return slightly different shape)
  const stats = trader.stats ?? {
    totalPnl: 0,
    avgRoi: 0,
    maxDrawdown: 0,
    totalVolume: 0,
    performancePoints: 0,
  };
  const performance = Array.isArray(trader.performance) ? trader.performance : [];

  // Determine risk level from drawdown
  const risk = (stats.maxDrawdown ?? 0) > -10 ? "Low" : (stats.maxDrawdown ?? 0) > -15 ? "Medium" : "High";

  // Filter performance by selected period; fallback to all if period empty
  const { data: filteredPerformance, fallbackLabel } = filterPerformanceByPeriod(performance, performancePeriod);
  const chartData = filteredPerformance
    .slice()
    .reverse()
    .map((p, i) => ({
      date: new Date(p.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: 10000 + filteredPerformance.slice(0, i + 1).reduce((sum, perf) => sum + (Number(perf.pnl) || 0), 0),
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onNavigate("marketplace")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold mb-1">{trader.name}</h1>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={
                  risk === "Low" ? "border-[#10B981]/50 text-[#10B981]" :
                  risk === "Medium" ? "border-[#FFB000]/50 text-[#FFB000]" :
                  "border-[#EF4444]/50 text-[#EF4444]"
                }
              >
                {risk} Risk
              </Badge>
              <Badge variant={trader.status === "approved" ? "default" : "secondary"}>
                {trader.status === "approved" ? "Active" : trader.status}
              </Badge>
              {trader.verified && (
                <Badge variant="outline" className="border-accent/50 text-accent">
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button 
          onClick={() => onNavigate("copy-setup", { id: trader.id, name: trader.name, slug: trader.slug })} 
          className="bg-primary text-primary-foreground"
          data-onboarding="traderprofile-copy"
        >
          <Copy className="size-4 mr-2" />
          Copy Trader
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">ROI</div>
          <div className={`text-2xl font-semibold flex items-center gap-1 ${(stats.avgRoi ?? 0) > 0 ? "text-[#10B981]" : (stats.avgRoi ?? 0) < 0 ? "text-[#EF4444]" : "text-foreground"}`}>
            {(stats.avgRoi ?? 0) > 0 ? <TrendingUp className="size-5" /> : (stats.avgRoi ?? 0) < 0 ? <TrendingDown className="size-5" /> : null}
            {(stats.avgRoi ?? 0) > 0 ? "+" : ""}{(stats.avgRoi ?? 0).toFixed(1)}%
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Max Drawdown</div>
          <div className="text-2xl font-semibold text-[#EF4444]">{(stats.maxDrawdown ?? 0).toFixed(1)}%</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Volume</div>
          <div className="text-2xl font-semibold">${((stats.totalVolume ?? 0) / 1000).toFixed(1)}k</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Followers</div>
          <div className="text-2xl font-semibold flex items-center gap-2">
            <Users className="size-5" />
            {trader.followers ?? 0}
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Performance Points</div>
          <div className="text-2xl font-semibold">{stats.performancePoints ?? 0}</div>
        </Card>
      </div>

      {/* Performance Chart — period selector as button group so it's clearly functional */}
      {(chartData.length > 0 || performance.length > 0) && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold">Performance</h3>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5" role="tablist" aria-label="Performance period">
              {PERFORMANCE_PERIODS.map((period) => (
                <button
                  key={period}
                  type="button"
                  role="tab"
                  aria-selected={performancePeriod === period}
                  aria-label={`Show ${period === "all" ? "all" : period.replace("m", " month").replace("y", " year")} performance`}
                  onClick={() => setPerformancePeriod(period)}
                  className={`min-w-[44px] px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    performancePeriod === period
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {period === "all" ? "ALL" : period.toUpperCase().replace("m", "M").replace("y", "Y")}
                </button>
              ))}
            </div>
          </div>
          {fallbackLabel && (
            <p className="text-xs text-muted-foreground mb-2">{fallbackLabel}</p>
          )}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={true} horizontal={true} />
                <XAxis dataKey="date" stroke="#8B8B8B" fontSize={12} tick={{ fill: "#8B8B8B" }} />
                <YAxis stroke="#8B8B8B" fontSize={12} tick={{ fill: "#8B8B8B" }} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Tooltip
                  formatter={(value: number) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Equity"]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ fill: "#10B981", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#10B981", stroke: "#0B0D10", strokeWidth: 2 }}
                  name="Equity"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              No performance data available
            </div>
          )}
        </Card>
      )}

      {/* Strategy & Risk Disclosure */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Strategy Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {trader.bio || "No strategy description available."}
          </p>
          {trader.exchange && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exchange:</span>
                <span className="font-medium">{trader.exchange}</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 border-[#FFB000]/20 bg-[#FFB000]/5">
          <h3 className="text-lg font-semibold mb-3">Risk Disclosure</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Copy trading involves significant risk of capital loss</li>
            <li>• Past performance does not guarantee future results</li>
            <li>• You maintain full control and can stop copying at any time</li>
            <li>• Your profit allowance is used as you earn from copied trades; buy packages to unlock more</li>
            <li>• Ensure you understand the trader's strategy before copying</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
