import React, { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Progress } from "@/app/components/ui/progress";
import { Separator } from "@/app/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Bar,
  Line,
  Brush,
} from "recharts";
import {
  Play,
  RefreshCw,
  Share2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  DollarSign,
  Activity,
  Calendar,
  Settings,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ListOrdered,
} from "lucide-react";
import { toast } from "sonner";

// Helper: Calculate SMA
const calculateSMA = (data: any[], period: number, key: string) => {
  return data.map((item, index) => {
    if (index < period - 1) return null;
    const sum = data.slice(index - period + 1, index + 1).reduce((acc, d) => acc + d[key], 0);
    return sum / period;
  });
};

// Helper: Calculate Bollinger Bands
const calculateBollingerBands = (data: any[], period: number = 20, stdDev: number = 2) => {
  const sma = calculateSMA(data, period, "close");
  return data.map((item, index) => {
    if (index < period - 1) return { upper: null, middle: null, lower: null };
    
    const slice = data.slice(index - period + 1, index + 1);
    const mean = sma[index];
    const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - mean!, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    return {
      middle: mean,
      upper: mean! + stdDev * std,
      lower: mean! - stdDev * std,
    };
  });
};

// Generate realistic candlestick data for backtest
const generateBacktestCandlesticks = (count: number) => {
  const data = [];
  let currentPrice = 45000;
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 500;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;
    
    data.push({
      time: new Date(Date.now() - (count - i) * 86400000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      open,
      high,
      low,
      close,
      entry: i % 8 === 0 ? close : null,
      exit: i % 8 === 5 ? close : null,
    });
    
    currentPrice = close;
  }
  
  return data;
};

const backtestCandles = generateBacktestCandlesticks(50);
const sma20Backtest = calculateSMA(backtestCandles, 20, "close");
const bbBacktest = calculateBollingerBands(backtestCandles, 20, 2);

const backtestChartData = backtestCandles.map((item, index) => ({
  ...item,
  sma20: sma20Backtest[index],
  bb_upper: bbBacktest[index].upper,
  bb_middle: bbBacktest[index].middle,
  bb_lower: bbBacktest[index].lower,
}));

// Custom Candlestick Component
const Candlestick = (props: any) => {
  const { x, y, width, height, open, close, high, low, yScale } = props;
  
  if (!open || !close || !high || !low || !yScale) return null;
  
  const isGreen = close > open;
  const color = isGreen ? "#10B981" : "#EF4444";
  const bodyHeight = Math.abs(yScale(open) - yScale(close));
  const bodyY = Math.min(yScale(open), yScale(close));
  
  const wickX = x + width / 2;
  const highY = yScale(high);
  const lowY = yScale(low);
  
  return (
    <g>
      <line x1={wickX} y1={highY} x2={wickX} y2={lowY} stroke={color} strokeWidth={1} />
      <rect
        x={x}
        y={bodyY}
        width={width}
        height={Math.max(bodyHeight, 1)}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

const backtestTrades = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  entryTime: new Date(Date.now() - (15 - i) * 86400000 * 2).toLocaleString(),
  exitTime: new Date(Date.now() - (15 - i) * 86400000 * 2 + 43200000).toLocaleString(),
  direction: Math.random() > 0.5 ? "Long" : "Short",
  entryPrice: (45000 + Math.random() * 2000).toFixed(2),
  exitPrice: (45000 + Math.random() * 2000).toFixed(2),
  pnl: (Math.random() * 2000 - 500).toFixed(2),
  pnlPercent: (Math.random() * 10 - 2).toFixed(2),
  leverage: ["1x", "2x", "3x", "5x"][Math.floor(Math.random() * 4)],
  stopLoss: (45000 - Math.random() * 1000).toFixed(2),
  takeProfit: (46000 + Math.random() * 1000).toFixed(2),
}));

const strategies = [
  { id: "rsi-oversold", name: "RSI Oversold/Overbought", description: "Buy when RSI < 30, Sell when RSI > 70" },
  { id: "ma-crossover", name: "MA Crossover", description: "Golden/Death cross strategy" },
  { id: "breakout", name: "Breakout Strategy", description: "Trade channel breakouts" },
  { id: "mean-reversion", name: "Mean Reversion", description: "Fade extreme moves" },
  { id: "momentum", name: "Momentum Following", description: "Follow strong trends" },
  { id: "custom", name: "Custom Strategy", description: "Upload your own logic" },
];

interface StrategyBacktestProps {
  onNavigate: (view: string) => void;
}

export function StrategyBacktest({ onNavigate }: StrategyBacktestProps) {
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [hasResults, setHasResults] = useState(true);
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);
  const [launchMode, setLaunchMode] = useState<"demo" | "live">("demo");
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [tradeBreakdownExpanded, setTradeBreakdownExpanded] = useState(true);

  // Strategy Configuration State
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [strategy, setStrategy] = useState("rsi-oversold");
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState("2026-01-23");
  const [timeframe, setTimeframe] = useState("1h");
  const [takeProfit, setTakeProfit] = useState("3");
  const [stopLoss, setStopLoss] = useState("1.5");
  const [direction, setDirection] = useState("both");
  const [capital, setCapital] = useState("10000");
  const [orderSize, setOrderSize] = useState("100");
  const [leverage, setLeverage] = useState("1");
  const [launchCapital, setLaunchCapital] = useState("10000");
  const [exchange, setExchange] = useState("binance");

  // Mock KPIs
  const kpis = {
    totalTrades: 47,
    winRate: 63.83,
    netPnl: 12450.67,
    roi: 24.5,
    avgPnl: 265.12,
    maxDrawdown: -8.34,
    sharpeRatio: 1.87,
    profitFactor: 2.34,
  };

  const handleRunBacktest = () => {
    setIsBacktesting(true);
    toast.info("Running backtest...");
    setTimeout(() => {
      setIsBacktesting(false);
      setHasResults(true);
      toast.success("Backtest completed successfully!");
    }, 2000);
  };

  const handleLaunchStrategy = () => {
    if (!riskAccepted) {
      toast.error("Please accept the risk disclaimer");
      return;
    }
    setLaunchDialogOpen(false);
    toast.success(
      `Strategy launched in ${launchMode.toUpperCase()} mode with $${launchCapital} capital`
    );
    setTimeout(() => {
      onNavigate("copy-trading");
    }, 1500);
  };

  const marginRequired = (parseFloat(launchCapital) / parseFloat(leverage)).toFixed(2);
  const isHighRisk = parseFloat(leverage) > 3;

  const selectedStrategy = strategies.find((s) => s.id === strategy);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* LEFT PANEL - Strategy Configuration */}
      <div
        className={`border-r border-border bg-card transition-all duration-300 overflow-y-auto ${
          configCollapsed ? "w-14" : "w-80"
        }`}
      >
        {configCollapsed ? (
          <div className="p-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfigCollapsed(false)}
              className="w-full"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Strategy Config</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfigCollapsed(true)}
                className="h-7 w-7"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <Separator />

            {/* Symbol Selector */}
            <div className="space-y-2">
              <Label>Trading Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                  <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Strategy Selector */}
            <div className="space-y-2">
              <Label>Strategy Template</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strat) => (
                    <SelectItem key={strat.id} value={strat.id}>
                      {strat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStrategy && (
                <p className="text-xs text-muted-foreground">{selectedStrategy.description}</p>
              )}
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Timeframe */}
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Direction */}
            <div className="space-y-2">
              <Label>Trade Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long Only</SelectItem>
                  <SelectItem value="short">Short Only</SelectItem>
                  <SelectItem value="both">Both (Long & Short)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Take Profit */}
            <div className="space-y-2">
              <Label>Take Profit (%)</Label>
              <Input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="3.0"
                step="0.1"
              />
            </div>

            {/* Stop Loss */}
            <div className="space-y-2">
              <Label>Stop Loss (%)</Label>
              <Input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="1.5"
                step="0.1"
              />
            </div>

            {/* Capital Allocation */}
            <div className="space-y-2">
              <Label>Initial Capital (USDT)</Label>
              <Input
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="10000"
              />
            </div>

            {/* Order Size */}
            <div className="space-y-2">
              <Label>Order Size (% of Capital)</Label>
              <Input
                type="number"
                value={orderSize}
                onChange={(e) => setOrderSize(e.target.value)}
                placeholder="100"
                max="100"
              />
            </div>

            {/* Leverage */}
            <div className="space-y-2">
              <Label>Leverage</Label>
              <Select value={leverage} onValueChange={setLeverage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x (No Leverage)</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                  <SelectItem value="20">20x</SelectItem>
                </SelectContent>
              </Select>
              {parseFloat(leverage) > 3 && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-xs text-destructive">
                    High leverage increases liquidation risk
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Margin Summary */}
            <Card className="p-3 bg-secondary/30">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margin Required</span>
                  <span className="font-mono font-medium">
                    ${(parseFloat(capital) / parseFloat(leverage)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective Position</span>
                  <span className="font-mono font-medium">
                    ${(parseFloat(capital) * (parseFloat(orderSize) / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            <Button
              className="w-full"
              onClick={handleRunBacktest}
              disabled={isBacktesting}
            >
              {isBacktesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* CENTER & BOTTOM PANELS */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* CENTER PANEL - Backtest Results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Strategy Backtest</h1>
              <p className="text-sm text-muted-foreground">
                Test and optimize your trading strategies before going live
              </p>
            </div>
            {hasResults && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRunBacktest}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-run
                </Button>
                <Button variant="outline" size="sm">
                  <Zap className="h-4 w-4 mr-2" />
                  Optimize
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            )}
          </div>

          {/* KPI Cards */}
          {hasResults && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-3">
                <Card className="p-3 bg-card/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Total Trades</span>
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-xl font-mono font-bold">{kpis.totalTrades}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Win Rate: {kpis.winRate}%
                  </div>
                </Card>

                <Card className="p-3 bg-card/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Net PnL</span>
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-xl font-mono font-bold text-green-500">
                    +${kpis.netPnl.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-green-500 mt-0.5">+{kpis.roi}% ROI</div>
                </Card>

                <Card className="p-3 bg-card/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Avg PnL/Trade</span>
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-xl font-mono font-bold text-green-500">
                    +${kpis.avgPnl}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Profit Factor: {kpis.profitFactor}
                  </div>
                </Card>

                <Card className="p-3 bg-card/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Max Drawdown</span>
                    <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-xl font-mono font-bold text-red-500">
                    {kpis.maxDrawdown}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Sharpe: {kpis.sharpeRatio}
                  </div>
                </Card>
              </div>

              {/* Price Chart with Indicators */}
              <Card className="p-6 bg-card/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Strategy Performance Chart</h3>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Entry Points
                    </Badge>
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                      Exit Points
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                      Bollinger Bands
                    </Badge>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      SMA 20
                    </Badge>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={backtestChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
                      <YAxis
                        stroke="#6b7280"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                        formatter={(value: any, name: string) => [
                          `$${parseFloat(value).toLocaleString()}`,
                          name.toUpperCase()
                        ]}
                        cursor={{ stroke: "#6b7280", strokeWidth: 1, strokeDasharray: "3 3" }}
                      />
                      
                      {/* Candlesticks */}
                      <Bar
                        dataKey="high"
                        shape={(props: any) => {
                          const item = backtestChartData[props.index];
                          return (
                            <Candlestick
                              {...props}
                              open={item.open}
                              close={item.close}
                              high={item.high}
                              low={item.low}
                              yScale={(val: number) => {
                                const { y, height } = props;
                                const domain = [
                                  Math.min(...backtestChartData.map(d => d.low)),
                                  Math.max(...backtestChartData.map(d => d.high))
                                ];
                                const range = domain[1] - domain[0];
                                return y + height - ((val - domain[0]) / range) * height;
                              }}
                            />
                          );
                        }}
                      />
                      
                      {/* Bollinger Bands */}
                      <Line
                        type="monotone"
                        dataKey="bb_upper"
                        stroke="#9333EA"
                        strokeWidth={1}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="bb_middle"
                        stroke="#9333EA"
                        strokeWidth={1}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="bb_lower"
                        stroke="#9333EA"
                        strokeWidth={1}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                      
                      {/* SMA 20 */}
                      <Line
                        type="monotone"
                        dataKey="sma20"
                        stroke="#FFB000"
                        strokeWidth={2}
                        dot={false}
                      />
                      
                      {/* Entry/Exit Markers */}
                      <Scatter
                        dataKey="entry"
                        fill="#10B981"
                        shape={(props: any) => {
                          if (!props.payload.entry) return null;
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill="#10B981"
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          );
                        }}
                      />
                      <Scatter
                        dataKey="exit"
                        fill="#EF4444"
                        shape={(props: any) => {
                          if (!props.payload.exit) return null;
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill="#EF4444"
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          );
                        }}
                      />
                      
                      {/* Brush for zooming */}
                      <Brush
                        dataKey="time"
                        height={30}
                        stroke="#FFB000"
                        fill="#1f2937"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!hasResults && !isBacktesting && (
            <Card className="p-12 bg-card/50 flex flex-col items-center justify-center text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Backtest Results</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Configure your strategy parameters in the left panel and click "Run Backtest" to
                see performance results
              </p>
              <Button onClick={handleRunBacktest}>
                <Play className="h-4 w-4 mr-2" />
                Run Your First Backtest
              </Button>
            </Card>
          )}

          {/* Loading State */}
          {isBacktesting && (
            <Card className="p-12 bg-card/50 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Running Backtest...</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Analyzing {symbol} on {timeframe} timeframe
              </p>
              <Progress value={65} className="w-64" />
            </Card>
          )}
        </div>

        {/* BOTTOM PANEL - Trade Breakdown */}
        {hasResults && !isBacktesting && (
          <div className={`border-t border-border transition-all duration-300 ${tradeBreakdownExpanded ? 'h-96' : 'h-auto'}`}>
            {/* Collapsible Header */}
            <div 
              className="flex items-center justify-between px-6 py-3 bg-card/30 border-b border-border cursor-pointer hover:bg-card/50 transition-colors"
              onClick={() => setTradeBreakdownExpanded(!tradeBreakdownExpanded)}
            >
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Trade Breakdown</h3>
                <Badge variant="outline">{backtestTrades.length} trades</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                {tradeBreakdownExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Collapsible Content */}
            {tradeBreakdownExpanded && (
              <div className="overflow-y-auto h-[calc(100%-52px)]">
                <div className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Entry Time</TableHead>
                        <TableHead>Exit Time</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>Exit Price</TableHead>
                        <TableHead>PnL</TableHead>
                        <TableHead>PnL %</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backtestTrades.flatMap((trade) => {
                        const rows = [
                          <TableRow
                            key={`trade-${trade.id}`}
                            className="cursor-pointer hover:bg-secondary/50"
                            onClick={() =>
                              setExpandedTrade(expandedTrade === trade.id ? null : trade.id)
                            }
                          >
                            <TableCell className="font-mono text-muted-foreground">
                              {trade.id}
                            </TableCell>
                            <TableCell className="text-xs font-mono">{trade.entryTime}</TableCell>
                            <TableCell className="text-xs font-mono">{trade.exitTime}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  trade.direction === "Long"
                                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                                    : "bg-red-500/10 text-red-500 border-red-500/20"
                                }
                              >
                                {trade.direction === "Long" ? (
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3 mr-1" />
                                )}
                                {trade.direction}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">${trade.entryPrice}</TableCell>
                            <TableCell className="font-mono">${trade.exitPrice}</TableCell>
                            <TableCell
                              className={`font-mono font-medium ${
                                parseFloat(trade.pnl) > 0 ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {parseFloat(trade.pnl) > 0 ? "+" : ""}${trade.pnl}
                            </TableCell>
                            <TableCell
                              className={`font-mono font-medium ${
                                parseFloat(trade.pnlPercent) > 0 ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {parseFloat(trade.pnlPercent) > 0 ? "+" : ""}
                              {trade.pnlPercent}%
                            </TableCell>
                            <TableCell>
                              {expandedTrade === trade.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                          </TableRow>
                        ];
                        
                        if (expandedTrade === trade.id) {
                          rows.push(
                            <TableRow key={`trade-detail-${trade.id}`}>
                              <TableCell colSpan={9} className="bg-secondary/30">
                                <div className="p-4 space-y-3">
                                  <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <div className="text-muted-foreground mb-1">Leverage</div>
                                      <div className="font-mono font-medium">{trade.leverage}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground mb-1">Stop Loss</div>
                                      <div className="font-mono font-medium">${trade.stopLoss}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground mb-1">Take Profit</div>
                                      <div className="font-mono font-medium">${trade.takeProfit}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground mb-1">Trade Duration</div>
                                      <div className="font-mono font-medium">12h 34m</div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return rows;
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Launch Strategy */}
      <div className="w-80 border-l border-border bg-card overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Launch Strategy</h2>
          </div>

          <Separator />

          {/* Strategy Summary */}
          <Card className="p-4 bg-secondary/30">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Strategy</span>
                <span className="font-medium">{selectedStrategy?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Symbol</span>
                <span className="font-mono font-medium">{symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timeframe</span>
                <span className="font-mono font-medium">{timeframe.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Direction</span>
                <span className="font-medium capitalize">{direction}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">TP / SL</span>
                <span className="font-mono font-medium">
                  {takeProfit}% / {stopLoss}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leverage</span>
                <span className="font-mono font-medium">{leverage}x</span>
              </div>
            </div>
          </Card>

          {/* Trading Capital */}
          <div className="space-y-2">
            <Label>Trading Capital (USDT)</Label>
            <Input
              type="number"
              value={launchCapital}
              onChange={(e) => setLaunchCapital(e.target.value)}
              placeholder="10000"
            />
            <p className="text-xs text-muted-foreground">
              Margin required: ${marginRequired}
            </p>
          </div>

          {/* Exchange Selector */}
          <div className="space-y-2">
            <Label>Exchange</Label>
            <Select value={exchange} onValueChange={setExchange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="bybit">Bybit</SelectItem>
                <SelectItem value="okx">OKX</SelectItem>
                <SelectItem value="kraken">Kraken</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <Label>Launch Mode</Label>
            <Tabs value={launchMode} onValueChange={(v: any) => setLaunchMode(v)}>
              <TabsList className="w-full">
                <TabsTrigger value="demo" className="flex-1">
                  Demo
                </TabsTrigger>
                <TabsTrigger value="live" className="flex-1">
                  Live
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {launchMode === "demo" ? (
              <Alert className="border-primary/50 bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  Demo mode uses simulated trading with no real funds
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs text-destructive">
                  Live mode trades with real funds. Losses are possible.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {isHighRisk && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-xs text-destructive">
                High leverage detected! Increased liquidation risk.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* CTAs */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => setLaunchDialogOpen(true)}
              disabled={!hasResults}
            >
              <Play className="h-4 w-4 mr-2" />
              Review & Start Trading
            </Button>
            <Button variant="outline" className="w-full" onClick={() => toast.info("Demo mode activated")}>
              Run Demo
            </Button>
          </div>

          {/* Subscription Upgrade CTA */}
          <Card className="p-4 bg-primary/10 border-primary/20">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div className="font-medium text-sm">Upgrade for More Strategies</div>
                <p className="text-xs text-muted-foreground">
                  Unlimited Plan unlocks advanced strategy templates and optimization tools
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={() => onNavigate("subscription")}
                >
                  View Plans
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Launch Confirmation Dialog */}
      <AlertDialog open={launchDialogOpen} onOpenChange={setLaunchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Launch Strategy Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to launch the following strategy in{" "}
              <strong className={launchMode === "live" ? "text-destructive" : "text-primary"}>
                {launchMode.toUpperCase()} MODE
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <Card className="p-3 bg-secondary/30">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategy</span>
                  <span className="font-medium">{selectedStrategy?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Symbol</span>
                  <span className="font-mono">{symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital</span>
                  <span className="font-mono">${launchCapital}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leverage</span>
                  <span className="font-mono">{leverage}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exchange</span>
                  <span className="font-medium capitalize">{exchange}</span>
                </div>
              </div>
            </Card>

            {launchMode === "live" && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs text-destructive font-medium">
                  This will use real funds. Trading involves substantial risk of loss.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="risk-acceptance"
                checked={riskAccepted}
                onCheckedChange={(checked) => setRiskAccepted(checked as boolean)}
              />
              <label
                htmlFor="risk-acceptance"
                className="text-xs text-muted-foreground cursor-pointer leading-tight"
              >
                I understand the risks involved in automated trading and accept that losses may
                occur. I have reviewed the backtest results and strategy parameters.
              </label>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRiskAccepted(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLaunchStrategy}
              disabled={!riskAccepted}
              className={launchMode === "live" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {launchMode === "live" ? "Launch Live Strategy" : "Launch Demo Strategy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}