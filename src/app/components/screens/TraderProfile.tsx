import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, ArrowLeft, Copy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { ErrorState } from "@/app/components/ui/error-state";
import { formatDistanceToNow } from "date-fns";

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

export function TraderProfile({ onNavigate, traderData }: TraderProfileProps) {
  const [trader, setTrader] = useState<TraderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Determine risk level from drawdown
  const risk = trader.stats.maxDrawdown > -10 ? "Low" : trader.stats.maxDrawdown > -15 ? "Medium" : "High";

  // Format performance data for chart
  const chartData = trader.performance
    .slice()
    .reverse()
    .map((p, i) => ({
      date: new Date(p.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: 10000 + trader.performance.slice(0, i + 1).reduce((sum, perf) => sum + perf.pnl, 0),
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
        >
          <Copy className="size-4 mr-2" />
          Copy Trader
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">ROI</div>
          <div className={`text-2xl font-semibold flex items-center gap-1 ${trader.stats.avgRoi > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {trader.stats.avgRoi > 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
            {trader.stats.avgRoi > 0 ? "+" : ""}{trader.stats.avgRoi.toFixed(1)}%
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Max Drawdown</div>
          <div className="text-2xl font-semibold text-[#EF4444]">{trader.stats.maxDrawdown.toFixed(1)}%</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Volume</div>
          <div className="text-2xl font-semibold">${(trader.stats.totalVolume / 1000).toFixed(1)}k</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Followers</div>
          <div className="text-2xl font-semibold flex items-center gap-2">
            <Users className="size-5" />
            {trader.followers}
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Performance Points</div>
          <div className="text-2xl font-semibold">{trader.stats.performancePoints}</div>
        </Card>
      </div>

      {/* Performance Chart */}
      {chartData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Performance</h3>
            <Tabs defaultValue="all" className="w-auto">
              <TabsList>
                <TabsTrigger value="1m">1M</TabsTrigger>
                <TabsTrigger value="3m">3M</TabsTrigger>
                <TabsTrigger value="6m">6M</TabsTrigger>
                <TabsTrigger value="1y">1Y</TabsTrigger>
                <TabsTrigger value="all">ALL</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" />
              <XAxis dataKey="date" stroke="#8B8B8B" />
              <YAxis stroke="#8B8B8B" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#12151A", 
                  border: "1px solid #2A2D35",
                  borderRadius: "4px"
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
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
