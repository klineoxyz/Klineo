import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, ArrowLeft, Copy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const performanceData = [
  { date: "Jan", value: 10000 },
  { date: "Feb", value: 10850 },
  { date: "Mar", value: 10420 },
  { date: "Apr", value: 11280 },
  { date: "May", value: 11950 },
  { date: "Jun", value: 12430 },
];

interface TraderProfileProps {
  onNavigate: (view: string, data?: any) => void;
  traderData?: any;
}

export function TraderProfile({ onNavigate, traderData }: TraderProfileProps) {
  const trader = traderData || {
    name: "ProTrader_XYZ",
    roi: 24.3,
    drawdown: -8.2,
    daysActive: 156,
    followers: 342,
    risk: "Medium",
    status: "Active",
  };

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
                  trader.risk === "Low" ? "border-[#10B981]/50 text-[#10B981]" :
                  trader.risk === "Medium" ? "border-[#FFB000]/50 text-[#FFB000]" :
                  "border-[#EF4444]/50 text-[#EF4444]"
                }
              >
                {trader.risk} Risk
              </Badge>
              <Badge variant={trader.status === "Active" ? "default" : "secondary"}>
                {trader.status}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => onNavigate("copy-setup", trader)} className="bg-primary text-primary-foreground">
          <Copy className="size-4 mr-2" />
          Copy Trader
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">ROI</div>
          <div className={`text-2xl font-semibold flex items-center gap-1 ${trader.roi > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {trader.roi > 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
            +{trader.roi}%
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Max Drawdown</div>
          <div className="text-2xl font-semibold text-[#EF4444]">{trader.drawdown}%</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Win Rate</div>
          <div className="text-2xl font-semibold">67.3%</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Followers</div>
          <div className="text-2xl font-semibold flex items-center gap-2">
            <Users className="size-5" />
            {trader.followers}
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Days Active</div>
          <div className="text-2xl font-semibold">{trader.daysActive}</div>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performance</h3>
          <Tabs defaultValue="6m" className="w-auto">
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
          <LineChart data={performanceData}>
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

      {/* Strategy & Risk Disclosure */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Strategy Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Momentum-based swing trading strategy focused on high-volume altcoins. Typically holds positions for 2-7 days. 
            Uses technical indicators including RSI, MACD, and volume analysis. Risk per trade capped at 2% of portfolio.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Trade Duration:</span>
              <span className="font-medium">4.2 days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Daily Trades:</span>
              <span className="font-medium">2.3</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sharpe Ratio:</span>
              <span className="font-medium">1.87</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-[#FFB000]/20 bg-[#FFB000]/5">
          <h3 className="text-lg font-semibold mb-3">Risk Disclosure</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Copy trading involves significant risk of capital loss</li>
            <li>• Past performance does not guarantee future results</li>
            <li>• You maintain full control and can stop copying at any time</li>
            <li>• Platform fees apply only to profitable copied trades</li>
            <li>• Ensure you understand the trader's strategy before copying</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground">Copy Limits</div>
            <div className="text-sm font-medium mt-1">
              {trader.status === "Limited" ? "48 of 50 slots available" : "Unlimited capacity"}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
