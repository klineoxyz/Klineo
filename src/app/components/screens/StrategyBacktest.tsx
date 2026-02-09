import * as React from "react";

// Use React.useEffect explicitly to avoid "useEffect is not defined" with recharts/libraries in production builds
const { useState, useEffect } = React;
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
  ReferenceLine,
  ReferenceArea,
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
import { useAuth } from "@/app/contexts/AuthContext";
import { useDemo } from "@/app/contexts/DemoContext";
import { api, exchangeConnections, strategies, candles as candlesApi, type ExchangeConnection, type KlineCandle } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

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

// RSI(period) from close prices — used for backtest signals on real data
function computeRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = (closes[i] ?? 0) - (closes[i! - 1] ?? 0);
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Convert exchange klines to chart shape and run RSI-based backtest (long RSI<30 exit RSI>70, short RSI>70 exit RSI<30). */
function runBacktestFromRealCandles(apiCandles: KlineCandle[]): {
  data: Array<{
    time: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    buySignal: number | null;
    sellSignal: number | null;
    tradeId: number | null;
  }>;
  trades: Array<{ entryIndex: number; exitIndex: number; entryPrice: number; exitPrice: number; direction: "long" | "short" }>;
} {
  const RSI_PERIOD = 14;
  const RSI_OVERSOLD = 30;
  const RSI_OVERBOUGHT = 70;
  const data = apiCandles.map((c) => ({
    time: new Date(c.time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    timestamp: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    buySignal: null as number | null,
    sellSignal: null as number | null,
    tradeId: null as number | null,
  }));
  const closes = data.map((d) => d.close);
  const trades: Array<{ entryIndex: number; exitIndex: number; entryPrice: number; exitPrice: number; direction: "long" | "short" }> = [];
  let tradeId = 1;
  let inLong: number | null = null;
  let inShort: number | null = null;

  for (let i = RSI_PERIOD; i < data.length; i++) {
    const rsi = computeRSI(closes.slice(0, i + 1), RSI_PERIOD);
    if (rsi == null) continue;
    if (inLong !== null) {
      if (rsi >= RSI_OVERBOUGHT) {
        trades.push({
          entryIndex: inLong,
          exitIndex: i,
          entryPrice: data[inLong].close,
          exitPrice: data[i].close,
          direction: "long",
        });
        data[inLong].buySignal = data[inLong].close;
        data[i].sellSignal = data[i].close;
        for (let j = inLong; j <= i; j++) data[j].tradeId = tradeId;
        tradeId++;
        inLong = null;
      }
    } else if (inShort !== null) {
      if (rsi <= RSI_OVERSOLD) {
        trades.push({
          entryIndex: inShort,
          exitIndex: i,
          entryPrice: data[inShort].close,
          exitPrice: data[i].close,
          direction: "short",
        });
        data[inShort].sellSignal = data[inShort].close;
        data[i].buySignal = data[i].close;
        for (let j = inShort; j <= i; j++) data[j].tradeId = tradeId;
        tradeId++;
        inShort = null;
      }
    } else {
      if (rsi <= RSI_OVERSOLD) inLong = i;
      else if (rsi >= RSI_OVERBOUGHT) inShort = i;
    }
  }
  return { data, trades };
}

// Generate realistic candlestick data for backtest with trade signals (fallback when no exchange data)
const generateBacktestCandlesticks = (count: number) => {
  const data = [];
  let currentPrice = 45000;
  const trades: Array<{ entryIndex: number; exitIndex: number; entryPrice: number; exitPrice: number; direction: 'long' | 'short' }> = [];
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 500;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;
    
    const timestamp = new Date(Date.now() - (count - i) * 86400000);
    
    data.push({
      time: timestamp.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      timestamp: timestamp.getTime(),
      open,
      high,
      low,
      close,
      buySignal: null as number | null,
      sellSignal: null as number | null,
      tradeId: null as number | null,
    });
    
    currentPrice = close;
  }
  
  // Generate realistic trades with entry/exit points
  let tradeId = 1;
  for (let i = 0; i < count - 10; i += Math.floor(Math.random() * 8) + 5) {
    const entryIndex = i;
    const exitIndex = Math.min(i + Math.floor(Math.random() * 8) + 3, count - 1);
    const entryPrice = data[entryIndex].close;
    const exitPrice = data[exitIndex].close;
    const direction = Math.random() > 0.3 ? 'long' : 'short';
    
    trades.push({ entryIndex, exitIndex, entryPrice, exitPrice, direction });
    
    // Mark buy/sell signals
    data[entryIndex].buySignal = direction === 'long' ? entryPrice : null;
    data[entryIndex].sellSignal = direction === 'short' ? entryPrice : null;
    data[exitIndex].sellSignal = direction === 'long' ? exitPrice : null;
    data[exitIndex].buySignal = direction === 'short' ? exitPrice : null;
    
    // Mark trade ID for shaded regions
    for (let j = entryIndex; j <= exitIndex; j++) {
      data[j].tradeId = tradeId;
    }
    
    tradeId++;
  }
  
  return { data, trades };
};

// Calculate trade statistics from a list of generated trades
const calculateTradeStatsFromTrades = (
  trades: Array<{ entryPrice: number; exitPrice: number; direction: 'long' | 'short' }>
) => {
  let totalTrades = trades.length;
  let winningTrades = 0;
  let totalPnl = 0;
  let totalPnlPercent = 0;

  trades.forEach((trade) => {
    const pnl =
      trade.direction === 'long'
        ? trade.exitPrice - trade.entryPrice
        : trade.entryPrice - trade.exitPrice;
    const pnlPercent = (pnl / trade.entryPrice) * 100;

    totalPnl += pnl;
    totalPnlPercent += pnlPercent;
    if (pnl > 0) winningTrades++;
  });

  return {
    totalTrades,
    winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
    totalPnl,
    totalPnlPercent,
    avgPnl: totalTrades > 0 ? totalPnl / totalTrades : 0,
  };
};

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

const strategyOptions = [
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
  const { user } = useAuth();
  const { addDemoFromBacktest } = useDemo();
  const [entitlement, setEntitlement] = useState<{
    joiningFeePaid: boolean;
    status: string;
    activePackageId: string | null;
    remainingUsd: number;
  } | null>(null);
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

  // Go Live (Futures) modal + gating (load connections on mount)
  const [goLiveFuturesOpen, setGoLiveFuturesOpen] = useState(false);
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [goLiveConnectionId, setGoLiveConnectionId] = useState("");
  const [goLiveLeverage, setGoLiveLeverage] = useState("3");
  const [goLiveMarginMode, setGoLiveMarginMode] = useState<"isolated" | "cross">("isolated");
  const [goLivePositionMode, setGoLivePositionMode] = useState<"one_way" | "hedge">("one_way");
  const [goLiveOrderSizePct, setGoLiveOrderSizePct] = useState("100");
  const [goLiveRiskAccepted, setGoLiveRiskAccepted] = useState(false);
  const [isGoLiveSubmitting, setIsGoLiveSubmitting] = useState(false);

  // Backtest data: from exchange (live) when user has a connection, else synthetic
  const [backtestResult, setBacktestResult] = useState(() => generateBacktestCandlesticks(50));
  const [backtestDataSource, setBacktestDataSource] = useState<"live" | "synthetic">("synthetic");
  const [backtestExchangeLabel, setBacktestExchangeLabel] = useState<string | null>(null);
  const [klinesError, setKlinesError] = useState<string | null>(null);

  const backtestCandles = backtestResult.data;
  const generatedTrades = backtestResult.trades;

  const sma20Backtest = React.useMemo(() => calculateSMA(backtestCandles, 20, "close"), [backtestCandles]);
  const bbBacktest = React.useMemo(() => calculateBollingerBands(backtestCandles, 20, 2), [backtestCandles]);
  const backtestChartData = React.useMemo(
    () =>
      backtestCandles.map((item, index) => ({
        ...item,
        sma20: sma20Backtest[index],
        bb_upper: bbBacktest[index].upper,
        bb_middle: bbBacktest[index].middle,
        bb_lower: bbBacktest[index].lower,
      })),
    [backtestCandles, sma20Backtest, bbBacktest]
  );

  const tradeStats = React.useMemo(() => calculateTradeStatsFromTrades(generatedTrades), [generatedTrades]);
  const kpis = {
    totalTrades: tradeStats.totalTrades,
    winRate: tradeStats.winRate,
    netPnl: tradeStats.totalPnl,
    roi: tradeStats.totalPnlPercent,
    avgPnl: tradeStats.avgPnl,
    maxDrawdown: -8.34,
    sharpeRatio: 1.87,
    profitFactor: 2.34,
  };

  // Trade list for table: derived from generated trades so it stays in sync with chart
  const backtestTrades = React.useMemo(
    () =>
      generatedTrades.map((trade, i) => {
        const pnl =
          trade.direction === "long"
            ? trade.exitPrice - trade.entryPrice
            : trade.entryPrice - trade.exitPrice;
        const pnlPercent = (pnl / trade.entryPrice) * 100;
        const entryTs = backtestCandles[trade.entryIndex]?.timestamp;
        const exitTs = backtestCandles[trade.exitIndex]?.timestamp;
        const entryTime = entryTs != null ? new Date(entryTs).toLocaleString() : "";
        const exitTime = exitTs != null ? new Date(exitTs).toLocaleString() : "";
        return {
          id: i + 1,
          entryTime,
          exitTime,
          direction: trade.direction === "long" ? "Long" : "Short",
          entryPrice: trade.entryPrice.toFixed(2),
          exitPrice: trade.exitPrice.toFixed(2),
          pnl: pnl.toFixed(2),
          pnlPercent: pnlPercent.toFixed(2),
          leverage: "1x",
          stopLoss: (trade.entryPrice * 0.98).toFixed(2),
          takeProfit: (trade.entryPrice * 1.02).toFixed(2),
        };
      }),
    [generatedTrades, backtestCandles]
  );

  const handleRunBacktest = async () => {
    setIsBacktesting(true);
    setKlinesError(null);
    setBacktestExchangeLabel(null);
    setBacktestDataSource("synthetic");
    toast.info("Running backtest...");

    const dataConnection = connections.length > 0 ? connections[0] : null;
    const exchange = dataConnection?.exchange === "bybit" ? "bybit" : "binance";
    const env = (dataConnection?.environment === "testnet" ? "testnet" : "production") as "production" | "testnet";
    const symbolClean = symbol.replace("/", "").toUpperCase();

    if (dataConnection) {
      try {
        const { candles: rawCandles } = await candlesApi.getKlines({
          exchange,
          symbol: symbolClean,
          interval: timeframe,
          limit: 500,
          env,
        });
        if (rawCandles.length > 0) {
          const result = runBacktestFromRealCandles(rawCandles);
          setBacktestResult(result);
          setBacktestDataSource("live");
          setBacktestExchangeLabel(`${dataConnection.exchange}${env === "testnet" ? " (testnet)" : ""}`);
          setHasResults(true);
          toast.success("Backtest completed with live data from " + dataConnection.exchange);
        } else {
          setBacktestResult(generateBacktestCandlesticks(50));
          toast.success("Backtest completed (no candles returned, using sample data).");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load klines";
        setKlinesError(msg);
        setBacktestResult(generateBacktestCandlesticks(50));
        toast.warning("Using sample data — " + msg);
      }
    } else {
      setBacktestResult(generateBacktestCandlesticks(50));
      setHasResults(true);
      toast.success("Backtest completed (sample data). Connect an exchange for live prices.");
    }

    setIsBacktesting(false);
  };

  const handleLaunchStrategy = () => {
    if (!riskAccepted) {
      toast.error("Please accept the risk disclaimer");
      return;
    }
    setLaunchDialogOpen(false);
    if (launchMode === "demo") {
      addDemoFromBacktest(backtestTrades, symbol);
      toast.success("Demo mode on — backtest trades are now visible in Trade History, Orders, and Positions.");
    } else {
      toast.success(`Strategy launched in LIVE mode with $${launchCapital} capital`);
    }
    setTimeout(() => {
      onNavigate("copy-trading");
    }, 1500);
  };

  const futuresEnabledConnections = connections.filter(
    (c) => c.supports_futures && c.futures_enabled && !c.disabled_at
  );
  const hasAnyConnection = connections.length > 0;
  const hasFuturesEnabled = futuresEnabledConnections.length > 0;
  const selectedConnection = connections.find((c) => c.id === goLiveConnectionId);
  const maxLeverage = selectedConnection?.max_leverage_allowed ?? 10;

  useEffect(() => {
    exchangeConnections.list()
      .then(({ connections: list }) => {
        setConnections(list);
        setConnectionsLoaded(true);
      })
      .catch(() => setConnectionsLoaded(true));
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setEntitlement(null);
      return;
    }
    api
      .get<{ joiningFeePaid: boolean; status: string; activePackageId: string | null; remainingUsd: number }>("/api/me/entitlement")
      .then((data) =>
        setEntitlement({
          joiningFeePaid: data.joiningFeePaid ?? false,
          status: data.status ?? "inactive",
          activePackageId: data.activePackageId ?? null,
          remainingUsd: data.remainingUsd ?? 0,
        })
      )
      .catch(() => setEntitlement(null));
  }, [user?.id]);

  const showUnlockAllowanceCard =
    entitlement == null ||
    !(entitlement.joiningFeePaid && (entitlement.activePackageId || entitlement.status === "active"));

  const openGoLiveFutures = async () => {
    setGoLiveFuturesOpen(true);
    setGoLiveRiskAccepted(false);
    try {
      const { connections: list } = await exchangeConnections.list();
      setConnections(list);
      const first = list.find((c) => c.supports_futures && c.futures_enabled && !c.disabled_at);
      if (first) {
        setGoLiveConnectionId(first.id);
        setGoLiveLeverage(String(first.default_leverage ?? 3));
        setGoLiveMarginMode((first.margin_mode as "isolated" | "cross") ?? "isolated");
        setGoLivePositionMode((first.position_mode as "one_way" | "hedge") ?? "one_way");
      } else {
        setGoLiveConnectionId("");
      }
    } catch (e) {
      toast.error("Failed to load connections");
    }
  };

  const handleGoLiveFutures = async () => {
    if (!goLiveRiskAccepted) {
      toast.error("Please accept the risk disclaimer");
      return;
    }
    if (!goLiveConnectionId) {
      toast.error("Select a futures-enabled connection");
      return;
    }
    const lev = parseInt(goLiveLeverage, 10);
    if (isNaN(lev) || lev < 1 || (selectedConnection && lev > (selectedConnection.max_leverage_allowed ?? 10))) {
      toast.error("Invalid leverage");
      return;
    }
    setIsGoLiveSubmitting(true);
    try {
      const symbolClean = symbol.replace("/", "");
      const { strategy: created } = await strategies.create({
        exchange_connection_id: goLiveConnectionId,
        symbol: symbolClean,
        timeframe,
        direction: direction as "long" | "short" | "both",
        leverage: lev,
        margin_mode: goLiveMarginMode,
        position_mode: goLivePositionMode,
        order_size_pct: parseFloat(goLiveOrderSizePct) || 100,
        initial_capital_usdt: parseFloat(launchCapital) || 10000,
        take_profit_pct: parseFloat(takeProfit) || 3,
        stop_loss_pct: parseFloat(stopLoss) || 1.5,
        strategy_template: "rsi_oversold_overbought",
      });
      await strategies.setStatus(created.id, "active");
      setGoLiveFuturesOpen(false);
      toast.success("Futures strategy is live. Monitor it in Terminal.");
      onNavigate("trading-terminal");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Go Live failed";
      toast.error(msg);
    } finally {
      setIsGoLiveSubmitting(false);
    }
  };

  const marginRequired = (parseFloat(launchCapital) / parseFloat(leverage)).toFixed(2);
  const isHighRisk = parseFloat(leverage) > 3;

  const selectedStrategy = strategyOptions.find((s) => s.id === strategy);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-background overflow-y-auto lg:overflow-hidden">
      {/* LEFT PANEL - Strategy Configuration */}
      <div
        className={`border-b lg:border-b-0 lg:border-r border-border bg-card transition-all duration-300 overflow-y-auto shrink-0 ${
          configCollapsed ? "w-full lg:w-14" : "w-full lg:w-80"
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
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Settings className="h-4 w-4 text-primary shrink-0" />
                <h2 className="font-semibold truncate">Strategy Config</h2>
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
                  {strategyOptions.map((strat) => (
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* CENTER PANEL - Backtest Results */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold mb-1">Strategy Backtest</h1>
              <p className="text-sm text-muted-foreground">
                Test and optimize your trading strategies before going live
              </p>
            </div>
            {hasResults && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleRunBacktest} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Re-run
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Optimize", { description: "Parameter optimization coming soon" })}>
                  <Zap className="h-4 w-4" />
                  Optimize
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Share", { description: "Share backtest results coming soon" })}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            )}
          </div>

          {/* Summary Statistics Header - Matching Screenshot */}
          {hasResults && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge className="bg-[#FFB000] text-black font-semibold px-2 py-1 shrink-0">
                    {kpis.totalTrades}
                  </Badge>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold">Backtest results</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {selectedStrategy?.name || 'Strategy'} • {symbol.replace('/', '')} • {timeframe} • {new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {backtestDataSource === "live" && backtestExchangeLabel && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        Live data from {backtestExchangeLabel}
                      </p>
                    )}
                    {backtestDataSource === "synthetic" && connections.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        Sample data — connect an exchange in Settings for live prices
                      </p>
                    )}
                    {klinesError && (
                      <p className="text-xs text-muted-foreground mt-0.5">Fallback: {klinesError}</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 w-full sm:w-auto" onClick={() => toast.info("Share", { description: "Share backtest results coming soon" })}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* KPI Cards - Matching Screenshot Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">Total trades</div>
                  <div className="text-xl sm:text-2xl font-bold truncate">{kpis.totalTrades}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">Win rate</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-500 truncate">{kpis.winRate.toFixed(1)}%</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">PnL (USDT)</div>
                  <div className={`text-xl sm:text-2xl font-bold truncate ${kpis.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {kpis.netPnl >= 0 ? '+' : ''}${kpis.netPnl.toFixed(2)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">PnL (%)</div>
                  <div className={`text-xl sm:text-2xl font-bold truncate ${kpis.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {kpis.roi >= 0 ? '+' : ''}{kpis.roi.toFixed(2)}%
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">Avg Profit/Trade</div>
                  <div className={`text-xl sm:text-2xl font-bold truncate ${kpis.avgPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {kpis.avgPnl >= 0 ? '+' : ''}${kpis.avgPnl.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Optimize Button */}
              <div className="flex justify-end">
                <Button className="bg-[#FFB000] hover:bg-[#FFB000]/90 text-black font-semibold w-full sm:w-auto min-h-[44px] sm:min-h-0" onClick={() => toast.info("Optimize", { description: "Parameter optimization coming soon" })}>
                  Optimize
                </Button>
              </div>

              {/* Price Chart with Buy/Sell Labels and Shaded Regions */}
              <Card className="p-4 sm:p-6 bg-card/50 overflow-hidden">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Chart Toolbar - horizontal on mobile, vertical on lg+ */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:border-r border-border lg:pr-4 overflow-x-auto pb-2 lg:pb-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Trend Line">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Horizontal Line">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Zoom">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m6-6v6" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Pan">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Vertical Pan">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Parallel Lines">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 9h16M4 13h16M4 17h16" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Rectangle">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Triangle">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m-9-9l9-9 9 9" />
                      </svg>
                    </Button>
                  </div>

                  {/* Chart Area */}
                  <div className="flex-1">
                    <div className="h-64 sm:h-80 lg:h-96 relative min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={backtestChartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                          <defs>
                            {/* Gradient for long positions (green) */}
                            <linearGradient id="longGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                            </linearGradient>
                            {/* Gradient for short positions (red) */}
                            <linearGradient id="shortGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis 
                            dataKey="time" 
                            stroke="#9CA3AF" 
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `$${value.toLocaleString()}`}
                            domain={['dataMin - 100', 'dataMax + 100']}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1F2937",
                              border: "1px solid #374151",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                            formatter={(value: any, name: string) => [
                              `$${parseFloat(value).toLocaleString()}`,
                              name.toUpperCase()
                            ]}
                            cursor={{ stroke: "#6B7280", strokeWidth: 1, strokeDasharray: "3 3" }}
                          />
                          
                          {/* Shaded Trade Regions - Using ReferenceArea for proper positioning */}
                          {generatedTrades.map((trade, idx) => {
                            const entryData = backtestChartData[trade.entryIndex];
                            const exitData = backtestChartData[trade.exitIndex];
                            if (!entryData || !exitData) return null;
                            
                            const minPrice = Math.min(...backtestChartData.map(d => d.low));
                            const maxPrice = Math.max(...backtestChartData.map(d => d.high));
                            
                            return (
                              <ReferenceArea
                                key={`trade-${idx}`}
                                x1={entryData.time}
                                x2={exitData.time}
                                y1={minPrice}
                                y2={maxPrice}
                                fill={trade.direction === 'long' ? '#10B981' : '#EF4444'}
                                fillOpacity={0.15}
                                stroke="none"
                              />
                            );
                          })}
                          
                          {/* Candlesticks */}
                          <Bar
                            dataKey="high"
                            shape={(props: any) => {
                              const item = backtestChartData[props.index];
                              if (!item) return null;
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
                            opacity={0.7}
                          />
                          <Line
                            type="monotone"
                            dataKey="bb_middle"
                            stroke="#9333EA"
                            strokeWidth={1}
                            dot={false}
                            opacity={0.7}
                          />
                          <Line
                            type="monotone"
                            dataKey="bb_lower"
                            stroke="#9333EA"
                            strokeWidth={1}
                            dot={false}
                            strokeDasharray="3 3"
                            opacity={0.7}
                          />
                          
                          {/* SMA 20 */}
                          <Line
                            type="monotone"
                            dataKey="sma20"
                            stroke="#FFB000"
                            strokeWidth={2}
                            dot={false}
                          />
                          
                          {/* Buy/Sell Labels */}
                          <Scatter
                            dataKey="buySignal"
                            fill="#10B981"
                            shape={(props: any) => {
                              if (!props.payload.buySignal) return null;
                              const yPos = props.cy - 20; // Position above the price
                              return (
                                <g>
                                  <rect
                                    x={props.cx - 10}
                                    y={yPos - 10}
                                    width={20}
                                    height={20}
                                    rx={4}
                                    fill="#10B981"
                                    stroke="#fff"
                                    strokeWidth={1.5}
                                  />
                                  <text
                                    x={props.cx}
                                    y={yPos + 4}
                                    textAnchor="middle"
                                    fill="#fff"
                                    fontSize={12}
                                    fontWeight="bold"
                                  >
                                    B
                                  </text>
                                </g>
                              );
                            }}
                          />
                          <Scatter
                            dataKey="sellSignal"
                            fill="#EF4444"
                            shape={(props: any) => {
                              if (!props.payload.sellSignal) return null;
                              const yPos = props.cy + 20; // Position below the price
                              return (
                                <g>
                                  <rect
                                    x={props.cx - 10}
                                    y={yPos - 10}
                                    width={20}
                                    height={20}
                                    rx={4}
                                    fill="#EF4444"
                                    stroke="#fff"
                                    strokeWidth={1.5}
                                  />
                                  <text
                                    x={props.cx}
                                    y={yPos + 4}
                                    textAnchor="middle"
                                    fill="#fff"
                                    fontSize={12}
                                    fontWeight="bold"
                                  >
                                    S
                                  </text>
                                </g>
                              );
                            }}
                          />
                          
                          {/* Reference Price Line */}
                          <ReferenceLine 
                            y={backtestChartData[Math.floor(backtestChartData.length / 2)]?.close} 
                            stroke="#EF4444" 
                            strokeDasharray="3 3"
                            opacity={0.5}
                            label={{ value: `${(backtestChartData[Math.floor(backtestChartData.length / 2)]?.close ?? 0).toFixed(2)}`, position: "right" }}
                          />
                          
                          {/* Brush for zooming */}
                          <Brush
                            dataKey="time"
                            height={30}
                            stroke="#FFB000"
                            fill="#1F2937"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!hasResults && !isBacktesting && (
            <Card className="p-6 sm:p-12 bg-card/50 flex flex-col items-center justify-center text-center">
              <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No Backtest Results</h3>
              <p className="text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md px-2">
                Configure your strategy parameters in the left panel and click "Run Backtest" to
                see performance results
              </p>
              <Button onClick={handleRunBacktest} className="w-full sm:w-auto min-h-[44px]">
                <Play className="h-4 w-4 mr-2" />
                Run Your First Backtest
              </Button>
            </Card>
          )}

          {/* Loading State */}
          {isBacktesting && (
            <Card className="p-6 sm:p-12 bg-card/50 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-3 sm:mb-4 animate-spin" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Running Backtest...</h3>
              <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
                Analyzing {symbol} on {timeframe} timeframe
              </p>
              <Progress value={65} className="w-full max-w-64" />
            </Card>
          )}
        </div>

        {/* BOTTOM PANEL - Trade Breakdown */}
        {hasResults && !isBacktesting && (
          <div className={`border-t border-border transition-all duration-300 shrink-0 ${tradeBreakdownExpanded ? 'h-64 sm:h-80 lg:h-96' : 'h-auto'}`}>
            {/* Collapsible Header */}
            <div 
              className="flex items-center justify-between px-4 sm:px-6 py-3 bg-card/30 border-b border-border cursor-pointer hover:bg-card/50 transition-colors min-h-[52px]"
              onClick={() => setTradeBreakdownExpanded(!tradeBreakdownExpanded)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ListOrdered className="h-4 w-4 text-primary shrink-0" />
                <h3 className="font-semibold truncate">Trade Breakdown</h3>
                <Badge variant="outline" className="shrink-0">{backtestTrades.length} trades</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={tradeBreakdownExpanded ? "Collapse" : "Expand"}>
                {tradeBreakdownExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Collapsible Content */}
            {tradeBreakdownExpanded && (
              <div className="overflow-x-auto overflow-y-auto h-[calc(100%-52px)]">
                <div className="p-4 sm:p-6 min-w-0">
                  <Table className="min-w-[640px]">
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
                      {[...backtestTrades].reverse().flatMap((trade) => {
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
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
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
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card overflow-y-auto shrink-0">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
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

          {/* Go Live (Futures) — gated by connection + Futures enabled */}
          <div className="space-y-2">
            {hasResults && (
              <>
                {!connectionsLoaded ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
                  </div>
                ) : !hasAnyConnection ? (
                  <Card className="p-4 border-primary/20 bg-primary/5">
                    <p className="text-sm mb-2">Connect Binance or Bybit to go live.</p>
                    <Button variant="outline" size="sm" className="w-full border-primary text-primary" onClick={() => onNavigate("settings")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Open Settings
                    </Button>
                  </Card>
                ) : !hasFuturesEnabled ? (
                  <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                    <p className="text-sm mb-2">Enable Futures in Settings to launch a live strategy.</p>
                    <Button variant="outline" size="sm" className="w-full border-amber-500/50 text-amber-700 dark:text-amber-400" onClick={() => onNavigate("settings")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Open Settings
                    </Button>
                  </Card>
                ) : (
                  <Button
                    className="w-full bg-primary"
                    onClick={openGoLiveFutures}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Go Live (Futures)
                  </Button>
                )}
              </>
            )}
            <Button
              className="w-full"
              onClick={() => setLaunchDialogOpen(true)}
              disabled={!hasResults}
            >
              <Play className="h-4 w-4 mr-2" />
              Review & Start Trading
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                addDemoFromBacktest(backtestTrades, symbol);
                toast.success("Demo mode on — backtest trades now appear in Trade History, Orders, and Positions.");
              }}
            >
              Run Demo
            </Button>
          </div>

          {/* Packages / Allowance CTA — hide when user has paid onboarding and has an active package */}
          {showUnlockAllowanceCard && (
            <Card className="p-4 bg-primary/10 border-primary/20">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-medium text-sm">Unlock trading allowance</div>
                  <p className="text-xs text-muted-foreground">
                    Buy a package in Packages to unlock your profit allowance and start copying
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/10"
                    onClick={() => onNavigate("subscription")}
                  >
                    View Packages
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Go Live (Futures) Modal */}
      <Dialog open={goLiveFuturesOpen} onOpenChange={setGoLiveFuturesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Go Live — Futures Auto Trading</DialogTitle>
            <DialogDescription>
              Create a live futures strategy from this backtest. Choose a futures-enabled connection and confirm risk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Exchange connection (Futures enabled)</Label>
              <Select value={goLiveConnectionId} onValueChange={setGoLiveConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select connection" />
                </SelectTrigger>
                <SelectContent>
                  {futuresEnabledConnections.length === 0 ? (
                    <SelectItem value="_none" disabled>No futures-enabled connection</SelectItem>
                  ) : (
                    futuresEnabledConnections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.exchange} {c.label ? `(${c.label})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leverage (1–{maxLeverage})</Label>
              <Input
                type="number"
                min={1}
                max={maxLeverage}
                value={goLiveLeverage}
                onChange={(e) => setGoLiveLeverage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Margin mode</Label>
              <Select value={goLiveMarginMode} onValueChange={(v: "isolated" | "cross") => setGoLiveMarginMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="isolated">Isolated</SelectItem>
                  <SelectItem value="cross">Cross</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position mode</Label>
              <Select value={goLivePositionMode} onValueChange={(v: "one_way" | "hedge") => setGoLivePositionMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">One-way</SelectItem>
                  <SelectItem value="hedge">Hedge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order size (% of capital)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={goLiveOrderSizePct}
                onChange={(e) => setGoLiveOrderSizePct(e.target.value)}
              />
            </div>
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-xs text-destructive">
                Futures trading uses real funds. Losses and liquidation are possible. The strategy will run automatically based on RSI signals.
              </AlertDescription>
            </Alert>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="go-live-risk"
                checked={goLiveRiskAccepted}
                onCheckedChange={(checked) => setGoLiveRiskAccepted(checked as boolean)}
              />
              <label htmlFor="go-live-risk" className="text-xs text-muted-foreground cursor-pointer leading-tight">
                I understand the risks and accept that automated futures trading may result in loss of capital.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoLiveFuturesOpen(false)}>Cancel</Button>
            <Button
              onClick={handleGoLiveFutures}
              disabled={!goLiveConnectionId || !goLiveRiskAccepted || isGoLiveSubmitting}
            >
              {isGoLiveSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting…
                </>
              ) : (
                "Go Live"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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