import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  BookOpen,
  Zap,
  Pause,
  Play,
  Square,
  AlertTriangle,
  RefreshCw,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { useDemo } from "@/app/contexts/DemoContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useExchangeBalances } from "@/app/hooks/useExchangeBalances";
import { api, exchangeConnections, strategies, futures, sanitizeExchangeError, type EntitlementResponse, type StrategyRun, type StrategyEvent, type ExchangeConnection } from "@/lib/api";
import { TradingViewChart } from "@/app/components/TradingViewChart";
import { 
  TradingViewMarketOverview,
  TradingViewAdvancedChart 
} from "@/app/components/TradingViewWidgets";
import { fetchKlines, fetchOrderBook, fetchUsdtPairs, fetchTicker24h } from "@/lib/binance";
import type { OrderBookLevel, UsdtPairInfo, Ticker24h } from "@/lib/binance";
import type { OhlcvItem } from "@/app/components/charts/LightweightChartsWidget";
import { Card } from "@/app/components/ui/card";
import { FuturesEnableModal } from "@/app/components/screens/FuturesEnableModal";

type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '12h' | '1D' | '5D' | '1W' | '1M';

// Get milliseconds per candle based on timeframe
const getTimeframeMs = (timeframe: Timeframe): number => {
  const map: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '5D': 5 * 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };
  return map[timeframe];
};

// Get number of candles to generate based on timeframe
const getCandleCount = (timeframe: Timeframe): number => {
  const map: Record<Timeframe, number> = {
    '1m': 200,
    '5m': 200,
    '15m': 180,
    '30m': 150,
    '1h': 120,
    '2h': 100,
    '4h': 90,
    '12h': 80,
    '1D': 60,
    '5D': 50,
    '1W': 40,
    '1M': 30,
  };
  return map[timeframe];
};

// Mock data generator with timeframe support
const generateMockData = (basePrice: number, timeframe: Timeframe): OhlcvItem[] => {
  const data: OhlcvItem[] = [];
  let price = basePrice;
  const intervalMs = getTimeframeMs(timeframe);
  const candleCount = getCandleCount(timeframe);
  
  for (let i = 0; i < candleCount; i++) {
    const change = (Math.random() - 0.5) * (basePrice * 0.002); // 0.2% variation
    price += change;
    
    const open = price;
    const close = price + (Math.random() - 0.5) * (basePrice * 0.001);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.0005);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.0005);
    
    data.push({
      time: new Date(Date.now() - (candleCount - i) * intervalMs).toISOString(),
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000 + 500,
    });
    
    price = close;
  }
  
  return data;
};

/** Fallback when Binance pairs fetch fails */
const DEFAULT_PAIRS: UsdtPairInfo[] = [
  { symbol: "BTC/USDT", price: "45,234.56", change: "+2.45", volume: "1.2B" },
  { symbol: "ETH/USDT", price: "2,456.78", change: "+1.23", volume: "456M" },
  { symbol: "BNB/USDT", price: "345.67", change: "-0.89", volume: "89M" },
  { symbol: "SOL/USDT", price: "98.45", change: "+5.67", volume: "234M" },
  { symbol: "XRP/USDT", price: "0.5678", change: "+3.21", volume: "678M" },
];

// Fallback when Binance order book fetch fails
const generateOrderBook = (basePrice: number): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } => ({
  bids: Array.from({ length: 20 }, (_, i) => {
    const price = basePrice - i * (basePrice * 0.0001);
    const amount = Math.random() * 5 + 0.1;
    return {
      price: price.toFixed(2),
      amount: amount.toFixed(4),
      total: (price * amount).toFixed(2),
    };
  }),
  asks: Array.from({ length: 20 }, (_, i) => {
    const price = basePrice + (i + 1) * (basePrice * 0.0001);
    const amount = Math.random() * 5 + 0.1;
    return {
      price: price.toFixed(2),
      amount: amount.toFixed(4),
      total: (price * amount).toFixed(2),
    };
  }),
});

// Mock recent trades
const generateRecentTrades = (basePrice: number) => Array.from({ length: 30 }, (_, i) => ({
  time: new Date(Date.now() - i * 5000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }),
  price: (basePrice + Math.random() * (basePrice * 0.004) - (basePrice * 0.002)).toFixed(2),
  amount: (Math.random() * 0.5).toFixed(4),
  side: Math.random() > 0.5 ? "buy" : "sell",
}));

interface TradingTerminalProps {
  onNavigate: (view: string) => void;
}

/** Format balance for display (compact for small UI) */
function formatBalance(value: number): string {
  if (value >= 1e6) return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (value >= 1e3) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function TradingTerminalNew({ onNavigate }: TradingTerminalProps) {
  const { isDemoMode } = useDemo();
  const { connected: exchangeConnected, balances, loading: balanceLoading, error: balanceError } = useExchangeBalances();
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  const [entitlementLoading, setEntitlementLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setEntitlementLoading(false);
      return;
    }
    api.get<EntitlementResponse>("/api/me/entitlement")
      .then(setEntitlement)
      .catch(() => setEntitlement(null))
      .finally(() => setEntitlementLoading(false));
  }, [isDemoMode]);

  const tradingAllowed = isDemoMode || (entitlement?.status === "active" && (entitlement?.remainingUsd ?? 0) > 0);
  const remainingAllowance = entitlement?.remainingUsd ?? 0;

  const [pairs, setPairs] = useState<UsdtPairInfo[]>(DEFAULT_PAIRS);
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [orderType, setOrderType] = useState("limit");
  const [buyAmount, setBuyAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [chartMode, setChartMode] = useState<"lightweight" | "advanced">("lightweight");
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [orderBookOpen, setOrderBookOpen] = useState(false);

  // Indicator toggles
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showEMA9, setShowEMA9] = useState(false);
  const [showEMA21, setShowEMA21] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  // Futures Strategy panel
  const [strategyList, setStrategyList] = useState<StrategyRun[]>([]);
  const { isAdmin } = useAuth();
  const [strategyEvents, setStrategyEvents] = useState<StrategyEvent[]>([]);
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyStatusUpdating, setStrategyStatusUpdating] = useState(false);
  const [runnerCronLoading, setRunnerCronLoading] = useState(false);
  const [runnerStatus, setRunnerStatus] = useState<{
    activeStrategies: number;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    blockedUsersCount: number;
    lastBlockedReasons?: string[];
  } | null>(null);
  const [runnerStatusLoading, setRunnerStatusLoading] = useState(false);
  const [tickRuns, setTickRuns] = useState<Array<{ id: string; strategy_run_id: string; started_at: string; status: string; reason: string | null; latency_ms: number | null }>>([]);
  const [killSwitchUpdating, setKillSwitchUpdating] = useState<Record<string, boolean>>({});
  const [futuresTestId, setFuturesTestId] = useState<string | null>(null);
  const [enableFuturesConnection, setEnableFuturesConnection] = useState<ExchangeConnection | null>(null);
  const futuresQuickActionsRef = useRef<HTMLDivElement>(null);
  const [manualOrderConnectionId, setManualOrderConnectionId] = useState("");
  const [manualOrderSymbol, setManualOrderSymbol] = useState("BTCUSDT");
  const [manualOrderSide, setManualOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [manualOrderUsdt, setManualOrderUsdt] = useState("");
  const [manualOrderLoading, setManualOrderLoading] = useState(false);

  // Get current pair data (fallback for order book, trades, 24h stats)
  const currentPairData = pairs.find((p) => p.symbol === selectedPair) || pairs[0];
  const basePrice = parseFloat(currentPairData.price.replace(/,/g, ""));
  const priceChange = parseFloat(currentPairData.change);

  // Real balances from connected exchange (Binance); null when not connected
  const baseAsset = selectedPair.split("/")[0];
  const usdtFree =
    exchangeConnected && balances?.USDT != null ? parseFloat(balances.USDT.free) : null;
  const baseAssetFree =
    exchangeConnected && baseAsset
      ? (balances?.[baseAsset] ? parseFloat(balances[baseAsset].free) : 0)
      : null;

  // Chart: real Binance klines (fallback to mock on error)
  const [chartData, setChartData] = useState<OhlcvItem[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  const loadChartData = useCallback(async () => {
    setChartLoading(true);
    setChartError(null);
    setChartData([]);
    try {
      const data = await fetchKlines(selectedPair, selectedTimeframe, 500);
      setChartData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load Binance data";
      setChartError(msg);
      const mock = generateMockData(basePrice, selectedTimeframe);
      setChartData(mock);
      toast.error("Chart using sample data — Binance fetch failed");
    } finally {
      setChartLoading(false);
    }
  }, [selectedPair, selectedTimeframe, basePrice]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  // Live Binance order book (fallback to mock on error)
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] } | null>(null);
  const [orderBookLoading, setOrderBookLoading] = useState(true);
  const [orderBookLive, setOrderBookLive] = useState(false);

  const loadOrderBook = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await fetchOrderBook(selectedPair, 50);
      setOrderBook(data);
      setOrderBookLive(true);
    } catch {
      setOrderBook(generateOrderBook(basePrice));
      setOrderBookLive(false);
      if (!opts?.silent) {
        toast.error("Order book using sample data — Binance fetch failed");
      }
    } finally {
      setOrderBookLoading(false);
    }
  }, [selectedPair, basePrice]);

  useEffect(() => {
    setOrderBookLoading(true);
    loadOrderBook();
  }, [loadOrderBook]);

  useEffect(() => {
    if (!orderBookLive) return;
    const interval = setInterval(() => loadOrderBook({ silent: true }), 3000);
    return () => clearInterval(interval);
  }, [loadOrderBook, orderBookLive]);

  // Fetch USDT pairs from Binance (fallback to DEFAULT_PAIRS on error)
  useEffect(() => {
    fetchUsdtPairs(100)
      .then((list) => setPairs(list))
      .catch(() => {
        toast.error("Could not load pairs from Binance. Using default list.");
      });
  }, []);

  // Market Stats from Binance 24h ticker for selected pair (exchange-specific; Binance for now)
  const [marketStats, setMarketStats] = useState<Ticker24h | null>(null);
  const [marketStatsLoading, setMarketStatsLoading] = useState(false);

  const loadMarketStats = useCallback(async () => {
    setMarketStatsLoading(true);
    try {
      const t = await fetchTicker24h(selectedPair);
      setMarketStats(t);
    } catch {
      setMarketStats(null);
    } finally {
      setMarketStatsLoading(false);
    }
  }, [selectedPair]);

  useEffect(() => {
    loadMarketStats();
  }, [loadMarketStats]);

  useEffect(() => {
    const interval = setInterval(loadMarketStats, 30000);
    return () => clearInterval(interval);
  }, [loadMarketStats]);

  const loadStrategies = useCallback(async () => {
    if (isDemoMode) return;
    setStrategyLoading(true);
    try {
      const [stratRes, connRes] = await Promise.all([strategies.list(), exchangeConnections.list()]);
      setStrategyList(stratRes.strategies ?? []);
      setConnections(connRes.connections ?? []);
      setSelectedStrategyId((prev) => (prev ? prev : stratRes.strategies?.[0]?.id ?? null));
    } catch {
      setStrategyList([]);
      setConnections([]);
    } finally {
      setStrategyLoading(false);
    }
  }, [isDemoMode]);

  const loadStrategyEvents = useCallback(async (id: string) => {
    try {
      const res = await strategies.get(id);
      setStrategyEvents(res.events ?? []);
    } catch {
      setStrategyEvents([]);
    }
  }, []);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  useEffect(() => {
    if (selectedStrategyId) loadStrategyEvents(selectedStrategyId);
  }, [selectedStrategyId, loadStrategyEvents]);

  const activeStrategy = strategyList.find((s) => s.status === "active");
  const selectedStrategy = strategyList.find((s) => s.id === selectedStrategyId);

  // Connections that support futures (Binance/Bybit) for Quick Actions and Strategy tab
  const supportsFutures = (c: ExchangeConnection) => c.exchange === "binance" || c.exchange === "bybit";
  const supportFuturesConnections = connections.filter(supportsFutures);
  // Connections that have futures enabled (for Strategy tab display)
  const hasFuturesEnabled = (c: ExchangeConnection) =>
    !!c.futures_enabled && (!!c.supports_futures || c.exchange === "binance" || c.exchange === "bybit");
  const futuresConnections = connections.filter(hasFuturesEnabled);

  useEffect(() => {
    if (futuresConnections.length > 0 && !manualOrderConnectionId) {
      setManualOrderConnectionId(futuresConnections[0].id);
    }
  }, [futuresConnections, manualOrderConnectionId]);

  const handleManualFuturesOrder = async () => {
    const connId = manualOrderConnectionId || futuresConnections[0]?.id;
    if (!connId || !manualOrderUsdt.trim()) {
      toast.error("Select connection and enter size (USDT)");
      return;
    }
    const usdtNum = parseFloat(manualOrderUsdt);
    if (Number.isNaN(usdtNum) || usdtNum <= 0) {
      toast.error("Size (USDT) must be a positive number");
      return;
    }
    setManualOrderLoading(true);
    try {
      const res = await futures.placeOrder({
        connectionId: connId,
        symbol: manualOrderSymbol,
        side: manualOrderSide,
        quoteSizeUsdt: usdtNum,
        type: "MARKET",
      });
      toast.success(`Order placed: ${res.orderId} (${res.status})`);
      setManualOrderUsdt("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Order failed", { description: sanitizeExchangeError(msg) });
    } finally {
      setManualOrderLoading(false);
    }
  };

  const handleFuturesTest = async (id: string) => {
    setFuturesTestId(id);
    try {
      const res = await exchangeConnections.futuresTest(id);
      if (res.ok) toast.success(`Futures API OK (${res.latencyMs}ms)`);
      else toast.error(sanitizeExchangeError(res.error ?? "Futures test failed"));
      const connRes = await exchangeConnections.list();
      setConnections(connRes.connections ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Futures test failed", { description: sanitizeExchangeError(msg) });
      const connRes = await exchangeConnections.list();
      setConnections(connRes.connections ?? []);
    } finally {
      setFuturesTestId(null);
    }
  };

  const handleStrategyStatus = async (id: string, status: "active" | "paused" | "stopped") => {
    setStrategyStatusUpdating(true);
    try {
      await strategies.setStatus(id, status);
      toast.success(`Strategy ${status}`);
      await loadStrategies();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setStrategyStatusUpdating(false);
    }
  };

  const loadRunnerStatus = useCallback(async () => {
    if (!isAdmin) return;
    setRunnerStatusLoading(true);
    try {
      const res = await api.get<{ ok?: boolean; activeStrategies?: number; lastRunAt?: string | null; lastRunStatus?: string | null; blockedUsersCount?: number; lastBlockedReasons?: string[] }>("/api/runner/status");
      setRunnerStatus({
        activeStrategies: res?.activeStrategies ?? 0,
        lastRunAt: res?.lastRunAt ?? null,
        lastRunStatus: res?.lastRunStatus ?? null,
        blockedUsersCount: res?.blockedUsersCount ?? 0,
        lastBlockedReasons: res?.lastBlockedReasons,
      });
    } catch {
      setRunnerStatus(null);
    } finally {
      setRunnerStatusLoading(false);
    }
  }, [isAdmin]);

  const loadTickRuns = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get<{ ok?: boolean; tickRuns?: Array<{ id: string; strategy_run_id: string; started_at: string; status: string; reason: string | null; latency_ms: number | null }> }>("/api/runner/tick-runs?limit=20");
      setTickRuns(res?.tickRuns ?? []);
    } catch {
      setTickRuns([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadRunnerStatus();
      loadTickRuns();
    }
  }, [isAdmin, loadRunnerStatus, loadTickRuns]);

  const handleKillSwitch = async (connectionId: string, enabled: boolean) => {
    setKillSwitchUpdating((prev) => ({ ...prev, [connectionId]: true }));
    try {
      await exchangeConnections.setKillSwitch(connectionId, enabled);
      toast.success(enabled ? "Kill switch ON — no futures orders" : "Kill switch OFF");
      await loadStrategies();
      const connRes = await exchangeConnections.list();
      setConnections(connRes.connections ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update kill switch";
      toast.error(sanitizeExchangeError(msg));
    } finally {
      setKillSwitchUpdating((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const orderBookData = orderBook ?? generateOrderBook(basePrice);
  const recentTrades = generateRecentTrades(basePrice);
  const currentPrice = chartData.length ? chartData[chartData.length - 1].close : basePrice;

  // Prefer Binance 24h ticker for Market Stats; fallback to pair list / chart
  const priceChange24h = marketStats ? parseFloat(marketStats.priceChangePercent) : priceChange;
  const volume24h = marketStats
    ? (() => {
        const v = parseFloat(marketStats.quoteVolume);
        if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
        if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
        if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
        return v.toFixed(0);
      })()
    : currentPairData.volume;
  const high24h = marketStats
    ? parseFloat(marketStats.high24h).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : chartData.length
      ? Math.max(...chartData.map((d) => d.high)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : (basePrice * 1.035).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const low24h = marketStats
    ? parseFloat(marketStats.low24h).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : chartData.length
      ? Math.min(...chartData.map((d) => d.low)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : (basePrice * 0.975).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isPositiveChange = priceChange24h >= 0;

  const handleTimeframeChange = useCallback((timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
  }, []);

  const handleBuyOrder = () => {
    if (!tradingAllowed && !isDemoMode) {
      toast.error("Trading is disabled until you have an active package.");
      return;
    }
    if (!buyAmount || (orderType === "limit" && !buyPrice)) {
      toast.error("Please enter all required fields");
      return;
    }
    toast.success(`Buy order placed: ${buyAmount} ${selectedPair.split("/")[0]} ${orderType === "limit" ? `@ $${buyPrice}` : "at market price"}`);
    setBuyAmount("");
    setBuyPrice("");
  };

  const handleSellOrder = () => {
    if (!tradingAllowed && !isDemoMode) {
      toast.error("Trading is disabled until you have an active package.");
      return;
    }
    if (!sellAmount || (orderType === "limit" && !sellPrice)) {
      toast.error("Please enter all required fields");
      return;
    }
    toast.success(`Sell order placed: ${sellAmount} ${selectedPair.split("/")[0]} ${orderType === "limit" ? `@ $${sellPrice}` : "at market price"}`);
    setSellAmount("");
    setSellPrice("");
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden min-h-0">
      {/* Futures Quick Actions: visible at top so users can connect, test, enable Futures without opening Settings. */}
      <Card ref={futuresQuickActionsRef} className="shrink-0 mx-3 mt-2 mb-1 p-3 border-primary/20 bg-card/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            Futures Trading
          </h3>
          {supportFuturesConnections.length === 0 ? (
            <Button size="sm" className="gap-2" onClick={() => onNavigate("settings")}>
              <Key className="size-4" />
              Connect Exchange
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {supportFuturesConnections.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2 rounded border border-border/50 px-2 py-1.5 bg-background/50">
                  <span className="text-xs font-medium truncate max-w-[100px]">
                    {c.exchange} {c.label ? `(${c.label})` : ""}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {c.last_test_status === "ok" ? "Spot active" : "Spot: needs test"}
                  </Badge>
                  {c.futures_enabled ? (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">Futures ON</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground" title="Futures may be restricted in your region">Futures OFF</Badge>
                  )}
                  {c.disabled_at ? (
                    <Badge variant="secondary" className="text-[10px]">Disabled</Badge>
                  ) : null}
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => handleFuturesTest(c.id)} disabled={futuresTestId === c.id}>
                    {futuresTestId === c.id ? <Loader2 className="size-3 animate-spin" /> : null}
                    Test Futures
                  </Button>
                  {!c.futures_enabled && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" onClick={() => setEnableFuturesConnection(c)}>
                      Enable Futures
                    </Button>
                  )}
                  <span className="text-[10px] text-muted-foreground">Kill</span>
                  <Switch
                    checked={!!c.kill_switch}
                    onCheckedChange={(checked) => handleKillSwitch(c.id, !!checked)}
                    disabled={killSwitchUpdating[c.id]}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <FuturesEnableModal
        open={!!enableFuturesConnection}
        onOpenChange={(open) => !open && setEnableFuturesConnection(null)}
        connection={enableFuturesConnection}
        onSuccess={() => {
          loadStrategies();
          exchangeConnections.list().then((r) => setConnections(r.connections ?? []));
        }}
      />

      {isDemoMode && (
        <div className="shrink-0 px-3 py-1.5 bg-primary/10 border-b border-primary/20 text-center text-xs text-muted-foreground">
          Demo mode — charts and order book use sample data. Switch to <strong className="text-foreground">Live</strong> (user menu) and connect Binance/Bybit in Settings to trade with real funds.
        </div>
      )}
      {!isDemoMode && !entitlementLoading && !tradingAllowed && (
        <div className="shrink-0 px-3 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center justify-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <span>Trading is disabled until you have an active package. Pay joining fee and buy a package to enable.</span>
          <Button variant="outline" size="sm" className="h-7 border-amber-500/50 text-amber-800 dark:text-amber-200" onClick={() => onNavigate("subscription")}>
            Go to Packages
          </Button>
        </div>
      )}
      {/* CSP-safe ticker: Binance data only, no external script — avoids Content-Security-Policy eval violations */}
      <div className="h-10 sm:h-12 border-b border-border shrink-0 overflow-hidden">
        <div className="h-full flex items-center gap-4 overflow-x-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {pairs.slice(0, 12).map((p, i) => (
            <span key={p.symbol} className="shrink-0 flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              <span className="text-muted-foreground">{p.symbol}</span>
              <span className="text-foreground font-medium">{p.price}</span>
              <span className={p.change.startsWith("+") ? "text-green-500" : "text-red-500"}>{p.change}%</span>
              {i < 11 && <span className="text-muted-foreground/60">|</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Top Bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6 px-3 py-2 sm:px-4 border-b border-border bg-card/50 shrink-0">
        <Select value={selectedPair} onValueChange={setSelectedPair}>
          <SelectTrigger className="w-[110px] sm:w-[140px] border-none shadow-none font-mono font-bold text-base sm:text-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pairs.map((pair) => (
              <SelectItem key={pair.symbol} value={pair.symbol}>
                {pair.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="min-w-0">
          <div className="text-base sm:text-xl font-mono font-bold text-green-500 truncate">
            ${currentPrice.toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
            ${currentPrice.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">24h Change</div>
          <div className={`flex items-center gap-1 font-medium text-sm ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
            {isPositiveChange ? <TrendingUp className="h-3 w-3 shrink-0" /> : <TrendingDown className="h-3 w-3 shrink-0" />}
            <span>{isPositiveChange ? '+' : ''}{priceChange24h}%</span>
          </div>
        </div>

        {!isDemoMode && entitlement && tradingAllowed && (
          <div className="text-[10px] sm:text-xs">
            <div className="text-muted-foreground">Profit allowance</div>
            <div className="font-mono font-medium text-primary">${remainingAllowance.toFixed(2)} left</div>
          </div>
        )}

        <div className="hidden lg:block">
          <div className="text-xs text-muted-foreground">24h High</div>
          <div className="font-mono text-sm">${high24h}</div>
        </div>
        <div className="hidden lg:block">
          <div className="text-xs text-muted-foreground">24h Low</div>
          <div className="font-mono text-sm">${low24h}</div>
        </div>
        <div className="hidden md:block">
          <div className="text-xs text-muted-foreground">24h Vol</div>
          <div className="font-mono text-sm">{volume24h}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left - Order Book (hidden < lg; use Sheet on mobile/tablet) */}
        <div className="hidden lg:flex lg:w-[260px] xl:w-[280px] border-r border-border bg-card overflow-hidden flex-col shrink-0 min-h-0">
          <div className="p-2.5 sm:p-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
            <div className="text-sm font-semibold">Order Book</div>
            <div className="flex items-center gap-1.5 shrink-0">
              {orderBookLoading && (
                <Loader2 className="size-3.5 text-muted-foreground animate-spin" aria-hidden />
              )}
              {orderBookLive && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" title="Data source">
                  Binance
                </span>
              )}
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  orderBookLive
                    ? "bg-green-500/15 text-green-500 border border-green-500/30"
                    : "bg-muted/80 text-muted-foreground"
                }`}
              >
                {orderBookLive ? "Live" : "Sample"}
              </span>
            </div>
          </div>

          {/* Asks */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1.5 border-b border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Total</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="text-xs font-mono tabular-nums">
                {(() => {
                  const asks = [...orderBookData.asks].reverse();
                  const maxAskTotal = Math.max(...asks.map((a) => parseFloat(a.total)), 1);
                  return asks.map((ask, i) => (
                    <div
                      key={`ask-${i}`}
                      className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1 hover:bg-red-500/5 relative items-center min-h-[22px]"
                    >
                      <div
                        className="absolute inset-0 bg-red-500/10 pointer-events-none"
                        style={{ width: `${Math.min(70, (parseFloat(ask.total) / maxAskTotal) * 60 + 5)}%`, right: 0 }}
                        aria-hidden
                      />
                      <span className="text-red-500 relative z-10 truncate">{ask.price}</span>
                      <span className="text-right relative z-10 truncate">{ask.amount}</span>
                      <span className="text-right text-muted-foreground relative z-10 truncate">{ask.total}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Mid price */}
          <div className="px-3 py-2 border-y border-border bg-muted/30 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-mono font-bold text-foreground tabular-nums">
                {currentPrice.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                ${currentPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Bids */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1.5 border-b border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Total</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="text-xs font-mono tabular-nums">
                {(() => {
                  const maxBidTotal = Math.max(...orderBookData.bids.map((b) => parseFloat(b.total)), 1);
                  return orderBookData.bids.map((bid, i) => (
                    <div
                      key={`bid-${i}`}
                      className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1 hover:bg-green-500/5 relative items-center min-h-[22px]"
                    >
                      <div
                        className="absolute inset-0 bg-green-500/10 pointer-events-none"
                        style={{ width: `${Math.min(70, (parseFloat(bid.total) / maxBidTotal) * 60 + 5)}%`, right: 0 }}
                        aria-hidden
                      />
                      <span className="text-green-500 relative z-10 truncate">{bid.price}</span>
                      <span className="text-right relative z-10 truncate">{bid.amount}</span>
                      <span className="text-right text-muted-foreground relative z-10 truncate">{bid.total}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Center + Right wrapper: stack on mobile, side-by-side on lg */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0 overflow-y-auto lg:overflow-hidden">
        {/* Center - Chart */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-[320px] sm:min-h-[380px] lg:min-h-0">
          {/* Chart with toolbar */}
          <div className="flex-1 bg-[#0a0e13] flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 sm:px-3 border-b border-border/30 bg-[#0a0e13] flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Order book trigger (visible when sidebar hidden) */}
                <Sheet open={orderBookOpen} onOpenChange={setOrderBookOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="lg:hidden h-7 px-2.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-border/50"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Order book
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[85vw] max-w-[320px] sm:max-w-[340px] flex flex-col p-0 gap-0 bg-card">
                    <SheetHeader className="p-3 pr-12 border-b border-border flex flex-row items-center justify-between space-y-0 shrink-0">
                      <SheetTitle className="text-sm font-semibold">Order Book</SheetTitle>
                      <div className="flex items-center gap-1.5">
                        {orderBookLoading && <Loader2 className="size-3.5 text-muted-foreground animate-spin" />}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${orderBookLive ? "bg-green-500/15 text-green-500 border border-green-500/30" : "bg-muted/80 text-muted-foreground"}`}>
                          {orderBookLive ? "Live" : "Sample"}
                        </span>
                      </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                      <div className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1.5 border-b border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                        <span>Price</span>
                        <span className="text-right">Amount</span>
                        <span className="text-right">Total</span>
                      </div>
                      <div className="text-xs font-mono tabular-nums">
                        {[...orderBookData.asks].reverse().map((ask, i) => {
                          const maxAskTotal = Math.max(...orderBookData.asks.map((a) => parseFloat(a.total)), 1);
                          return (
                            <div key={`ask-sheet-${i}`} className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1 hover:bg-red-500/5 relative items-center min-h-[22px]">
                              <div className="absolute inset-0 bg-red-500/10 pointer-events-none" style={{ width: `${Math.min(70, (parseFloat(ask.total) / maxAskTotal) * 60 + 5)}%`, right: 0 }} aria-hidden />
                              <span className="text-red-500 relative z-10 truncate">{ask.price}</span>
                              <span className="text-right relative z-10 truncate">{ask.amount}</span>
                              <span className="text-right text-muted-foreground relative z-10 truncate">{ask.total}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-3 py-2 border-y border-border bg-muted/30 shrink-0">
                        <div className="text-base font-mono font-bold text-foreground tabular-nums">{currentPrice.toFixed(2)}</div>
                      </div>
                      <div className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1.5 border-b border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                        <span>Price</span>
                        <span className="text-right">Amount</span>
                        <span className="text-right">Total</span>
                      </div>
                      <div className="text-xs font-mono tabular-nums">
                        {orderBookData.bids.map((bid, i) => {
                          const maxBidTotal = Math.max(...orderBookData.bids.map((b) => parseFloat(b.total)), 1);
                          return (
                            <div key={`bid-sheet-${i}`} className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1 hover:bg-green-500/5 relative items-center min-h-[22px]">
                              <div className="absolute inset-0 bg-green-500/10 pointer-events-none" style={{ width: `${Math.min(70, (parseFloat(bid.total) / maxBidTotal) * 60 + 5)}%`, right: 0 }} aria-hidden />
                              <span className="text-green-500 relative z-10 truncate">{bid.price}</span>
                              <span className="text-right relative z-10 truncate">{bid.amount}</span>
                              <span className="text-right text-muted-foreground relative z-10 truncate">{bid.total}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                {/* Chart Mode */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChartMode("lightweight")}
                    className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors ${
                      chartMode === "lightweight" 
                        ? "bg-accent text-accent-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    Lightweight
                  </button>
                  <button
                    onClick={() => setChartMode("advanced")}
                    className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors ${
                      chartMode === "advanced" 
                        ? "bg-accent text-accent-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    TradingView Pro
                  </button>
                </div>
                
                {chartMode === "lightweight" && (
                  <>
                    <div className="flex items-center gap-1 border-l border-border/30 pl-3">
                      <button
                        onClick={() => setShowVolume(!showVolume)}
                        className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors flex items-center gap-1 ${
                          showVolume 
                            ? "bg-accent/20 text-accent" 
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <BarChart3 className="h-3 w-3" />
                        Volume
                      </button>
                    </div>
                  </>
                )}
              </div>

              {chartMode === "lightweight" && (
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => setShowSMA20(!showSMA20)}
                    className={`h-6 px-2 text-[10px] sm:text-[11px] font-medium rounded transition-colors ${
                      showSMA20 ? "bg-[#FFB000]/20 text-[#FFB000]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    MA(20)
                  </button>
                  <button
                    onClick={() => setShowSMA50(!showSMA50)}
                    className={`h-6 px-2 text-[10px] sm:text-[11px] font-medium rounded transition-colors ${
                      showSMA50 ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    MA(50)
                  </button>
                  <button
                    onClick={() => setShowEMA9(!showEMA9)}
                    className={`h-6 px-2 text-[10px] sm:text-[11px] font-medium rounded transition-colors ${
                      showEMA9 ? "bg-[#10B981]/20 text-[#10B981]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    EMA(9)
                  </button>
                  <button
                    onClick={() => setShowEMA21(!showEMA21)}
                    className={`h-6 px-2 text-[10px] sm:text-[11px] font-medium rounded transition-colors ${
                      showEMA21 ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    EMA(21)
                  </button>
                  <button
                    onClick={() => setShowBB(!showBB)}
                    className={`h-6 px-2 text-[10px] sm:text-[11px] font-medium rounded transition-colors ${
                      showBB ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    BB
                  </button>
                  <button
                    onClick={() => setShowRSI(!showRSI)}
                    className={`h-6 px-2 text-[10px] sm:text-[11px] font-medium rounded transition-colors ${
                      showRSI ? "bg-[#ec4899]/20 text-[#ec4899]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    RSI
                  </button>
                  <button
                    onClick={() => setShowMACD(!showMACD)}
                    className={`h-6 px-2 text-[10px] sm:text-[11px] font-medium rounded transition-colors ${
                      showMACD ? "bg-[#06b6d4]/20 text-[#06b6d4]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    MACD
                  </button>
                </div>
              )}
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-0 p-2 flex flex-col">
              {!isDemoMode && chartData.length > 0 && !chartError && (
                <div className="shrink-0 flex items-center justify-end pb-1">
                  <span className="text-[10px] sm:text-xs text-muted-foreground" title="Chart uses live data from Binance">
                    Live: Binance
                  </span>
                </div>
              )}
              {chartMode === "lightweight" ? (
                chartLoading && !chartData.length ? (
                  <div className="h-full flex items-center justify-center bg-[#0a0e13]">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <div className="text-sm">Loading Binance data...</div>
                    </div>
                  </div>
                ) : (
                  <TradingViewChart
                    data={chartData}
                    showVolume={showVolume}
                    showRSI={showRSI}
                    showMACD={showMACD}
                    showBB={showBB}
                    showSMA20={showSMA20}
                    showSMA50={showSMA50}
                    showEMA9={showEMA9}
                    showEMA21={showEMA21}
                    onTimeframeChange={handleTimeframeChange}
                  />
                )
              ) : (
                <div className="h-full">
                  <TradingViewAdvancedChart symbol={`BINANCE:${selectedPair.replace("/", "")}`} />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tabs */}
          <div className="h-[180px] sm:h-[200px] lg:h-[240px] border-t border-border shrink-0">
            <Tabs defaultValue="trades" className="h-full flex flex-col">
              <TabsList className="mx-2 sm:mx-4 mt-2 w-auto flex-wrap">
                <TabsTrigger value="trades" className="text-xs sm:text-sm">Market Trades</TabsTrigger>
                <TabsTrigger value="myorders" className="text-xs sm:text-sm">My Orders</TabsTrigger>
                <TabsTrigger value="strategy" className="text-xs sm:text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Strategy
                  <Badge variant="secondary" className="text-[10px] ml-0.5">Auto</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trades" className="flex-1 px-2 sm:px-4 pb-2 overflow-hidden min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] sm:text-xs text-muted-foreground mb-1 font-medium">
                  <div>Price (USDT)</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right hidden sm:block">Time</div>
                </div>
                <div className="space-y-0 overflow-y-auto h-[calc(100%-20px)] text-[10px] sm:text-xs font-mono">
                  {recentTrades.map((trade, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-0.5 hover:bg-secondary/50"
                    >
                      <div className={`min-w-0 truncate ${trade.side === "buy" ? "text-green-500" : "text-red-500"}`}>
                        {trade.price}
                      </div>
                      <div className="text-right truncate">{trade.amount}</div>
                      <div className="text-right text-muted-foreground text-[10px] hidden sm:block">{trade.time}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="myorders" className="flex-1 px-2 sm:px-4 pb-2 min-h-0">
                <div className="flex items-center justify-center h-full text-xs sm:text-sm text-muted-foreground">
                  No open orders
                </div>
              </TabsContent>

              <TabsContent value="strategy" className="flex-1 px-2 sm:px-4 pb-2 overflow-y-auto min-h-0">
                {futuresConnections.length > 0 && (
                  <div className="rounded border border-border bg-card/30 p-2 mb-3 space-y-2">
                    <div className="text-[10px] font-semibold text-muted-foreground">Manual Futures Order (MVP)</div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <Label className="text-[10px]">Connection</Label>
                        <Select value={manualOrderConnectionId} onValueChange={setManualOrderConnectionId}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {futuresConnections.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.exchange} {c.label ? `(${c.label})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Symbol</Label>
                        <Select value={manualOrderSymbol} onValueChange={setManualOrderSymbol}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                            <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                            <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Side</Label>
                        <Select value={manualOrderSide} onValueChange={(v: "BUY" | "SELL") => setManualOrderSide(v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BUY">Long</SelectItem>
                            <SelectItem value="SELL">Short</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Size (USDT)</Label>
                        <Input
                          className="h-7 text-xs font-mono"
                          placeholder="10"
                          value={manualOrderUsdt}
                          onChange={(e) => setManualOrderUsdt(e.target.value)}
                        />
                        <p className="text-[9px] text-muted-foreground mt-0.5">We convert to quantity using mark price.</p>
                      </div>
                    </div>
                    {futuresConnections.find((c) => c.id === (manualOrderConnectionId || futuresConnections[0]?.id)) && (
                      <div className="text-[10px] text-muted-foreground">
                        Leverage: {futuresConnections.find((c) => c.id === (manualOrderConnectionId || futuresConnections[0]?.id))?.default_leverage ?? "—"}x
                      </div>
                    )}
                    <Button size="sm" className="h-7 text-[10px] w-full" onClick={handleManualFuturesOrder} disabled={manualOrderLoading}>
                      {manualOrderLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                      Place Futures Order
                    </Button>
                  </div>
                )}
                {isDemoMode ? (
                  <div className="text-xs text-muted-foreground py-2">Connect an exchange and enable Futures in Settings to run auto strategies.</div>
                ) : strategyLoading ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                  </div>
                ) : strategyList.length === 0 ? (
                  <div className="py-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">No active strategies yet</p>
                    <p className="text-xs text-muted-foreground">Run a backtest, then click &quot;Go Live (Futures)&quot; to create a live strategy.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-2 border-primary text-primary" onClick={() => onNavigate("strategy-backtest")}>
                        <Zap className="h-3 w-3" /> Go to Backtest
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => futuresQuickActionsRef.current?.scrollIntoView({ behavior: "smooth" })}>
                        Enable Futures
                      </Button>
                    </div>
                    {futuresConnections.length > 0 && (
                      <div className="rounded border border-border bg-card/30 p-2 space-y-2 mt-2">
                        <div className="text-[10px] font-semibold text-muted-foreground">Futures connections</div>
                        {futuresConnections.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="truncate">{c.exchange} {c.label ? `(${c.label})` : ""}</span>
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">Futures ON</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="pt-2 border-t border-border">
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] w-full" onClick={() => onNavigate("admin")}>
                          Run a test tick (admin)
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    {/* Connection Futures ON/OFF + Kill switch at top */}
                    {futuresConnections.length > 0 && (
                      <div className="rounded border border-border bg-card/30 p-2 space-y-2">
                        <div className="text-[10px] font-semibold text-muted-foreground">Futures</div>
                        {futuresConnections.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="truncate">{c.exchange} {c.label ? `(${c.label})` : ""}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">ON</Badge>
                              <span className="text-muted-foreground">Kill</span>
                              <Switch
                                checked={!!c.kill_switch}
                                onCheckedChange={(checked) => handleKillSwitch(c.id, !!checked)}
                                disabled={killSwitchUpdating[c.id]}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Active Strategy panel */}
                    {activeStrategy && (
                      <div className="rounded border border-border bg-card/50 p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold">Active Strategy</span>
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">{activeStrategy.status}</Badge>
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {activeStrategy.symbol} • {activeStrategy.timeframe} • {activeStrategy.direction} • {activeStrategy.leverage}x
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Last signal: {activeStrategy.last_signal_at ? new Date(activeStrategy.last_signal_at).toLocaleString() : "—"}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleStrategyStatus(activeStrategy.id, "paused")} disabled={strategyStatusUpdating}>
                            <Pause className="h-3 w-3 mr-1" /> Pause
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleStrategyStatus(activeStrategy.id, "stopped")} disabled={strategyStatusUpdating}>
                            <Square className="h-3 w-3 mr-1" /> Stop
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedStrategy && selectedStrategy.status !== "active" && (
                      <div className="rounded border border-border bg-card/50 p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold">Strategy</span>
                          <Badge variant="outline" className="text-[10px]">{selectedStrategy.status}</Badge>
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {selectedStrategy.symbol} • {selectedStrategy.timeframe} • {selectedStrategy.direction}
                        </div>
                        {selectedStrategy.status === "paused" && (
                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => handleStrategyStatus(selectedStrategy.id, "active")} disabled={strategyStatusUpdating}>
                            <Play className="h-3 w-3 mr-1" /> Resume
                          </Button>
                        )}
                      </div>
                    )}
                    {strategyList.length > 1 && (
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px]">Strategy</Label>
                        <Select value={selectedStrategyId ?? ""} onValueChange={setSelectedStrategyId}>
                          <SelectTrigger className="h-7 text-xs w-[140px]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {strategyList.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.symbol} ({s.status})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Execution log */}
                    <div className="rounded border border-border bg-card/30 overflow-hidden">
                      <div className="px-2 py-1 border-b border-border text-[10px] font-semibold">Execution log</div>
                      <div className="max-h-[120px] overflow-y-auto">
                        {strategyEvents.length === 0 ? (
                          <div className="px-2 py-3 text-[10px] text-muted-foreground">No events yet</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-0">
                                <TableHead className="h-6 text-[10px]">Time</TableHead>
                                <TableHead className="h-6 text-[10px]">Type</TableHead>
                                <TableHead className="h-6 text-[10px]">Payload</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {strategyEvents.slice(0, 20).map((ev) => (
                                <TableRow key={ev.id} className="border-0">
                                  <TableCell className="py-0.5 text-[10px] font-mono">{new Date(ev.created_at).toLocaleTimeString()}</TableCell>
                                  <TableCell className="py-0.5 text-[10px]">{ev.event_type}</TableCell>
                                  <TableCell className="py-0.5 text-[10px] font-mono truncate max-w-[120px]">{JSON.stringify(ev.payload)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                    {/* Kill switch */}
                    {futuresConnections.length > 0 && (
                      <div className="rounded border border-border bg-card/30 p-2 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Kill switch
                        </div>
                        <p className="text-[10px] text-muted-foreground">When ON, no futures orders are placed for this connection.</p>
                        {futuresConnections.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-2">
                            <span className="text-[10px] truncate">{c.exchange} {c.label ? `(${c.label})` : ""}</span>
                            <Switch
                              checked={!!c.kill_switch}
                              onCheckedChange={(checked) => handleKillSwitch(c.id, !!checked)}
                              disabled={killSwitchUpdating[c.id]}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Admin: Runner — Run Cron Now, status, recent tick runs */}
                    {isAdmin && (
                      <div className="pt-2 border-t border-border space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px]"
                            disabled={runnerCronLoading}
                            onClick={async () => {
                              setRunnerCronLoading(true);
                              try {
                                const res = await api.post<{
                                  ok?: boolean;
                                  requestId?: string;
                                  summary?: { processed: number; ran: number; skipped: number; blocked: number; errored: number };
                                  notes?: string[];
                                }>("/api/runner/cron");
                                const s = res?.summary;
                                const id = res?.requestId ?? "";
                                if (res?.ok && s) {
                                  toast.success(`Cron: ran=${s.ran} skipped=${s.skipped} blocked=${s.blocked} errored=${s.errored}`, { description: id ? `Request: ${id}` : undefined });
                                } else if (res?.notes?.length) {
                                  toast.error(res.notes[0] ?? "Cron failed", { description: id ? `Request: ${id}` : undefined });
                                } else {
                                  toast.success("Cron run completed", { description: id ? `Request: ${id}` : undefined });
                                }
                                loadRunnerStatus();
                                loadTickRuns();
                              } catch (e: unknown) {
                                const msg = e instanceof Error ? e.message : "Request failed";
                                toast.error(msg);
                              } finally {
                                setRunnerCronLoading(false);
                              }
                            }}
                          >
                            {runnerCronLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Run Cron Now
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { loadRunnerStatus(); loadTickRuns(); }} disabled={runnerStatusLoading}>
                            {runnerStatusLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          </Button>
                        </div>
                        {runnerStatus !== null && (
                          <div className="rounded border border-border bg-card/30 p-2 text-[10px] space-y-1">
                            <div className="font-semibold">Runner status</div>
                            <div>Active: {runnerStatus.activeStrategies} · Last run: {runnerStatus.lastRunAt ? new Date(runnerStatus.lastRunAt).toLocaleString() : "—"} ({runnerStatus.lastRunStatus ?? "—"})</div>
                            {runnerStatus.blockedUsersCount > 0 && <div className="text-amber-600">Blocked users: {runnerStatus.blockedUsersCount} {runnerStatus.lastBlockedReasons?.length ? `(${runnerStatus.lastBlockedReasons.slice(0, 2).join(", ")})` : ""}</div>}
                          </div>
                        )}
                        {tickRuns.length > 0 && (
                          <div className="rounded border border-border bg-card/30 overflow-hidden">
                            <div className="px-2 py-1 border-b border-border text-[10px] font-semibold">Recent tick runs (last 20)</div>
                            <div className="max-h-[120px] overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-0">
                                    <TableHead className="h-6 text-[10px]">Time</TableHead>
                                    <TableHead className="h-6 text-[10px]">Status</TableHead>
                                    <TableHead className="h-6 text-[10px]">Reason</TableHead>
                                    <TableHead className="h-6 text-[10px]">Latency</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {tickRuns.slice(0, 20).map((r) => (
                                    <TableRow key={r.id} className="border-0">
                                      <TableCell className="py-0.5 text-[10px] font-mono">{new Date(r.started_at).toLocaleTimeString()}</TableCell>
                                      <TableCell className="py-0.5 text-[10px]">{r.status}</TableCell>
                                      <TableCell className="py-0.5 text-[10px] truncate max-w-[80px]">{r.reason ?? "—"}</TableCell>
                                      <TableCell className="py-0.5 text-[10px]">{r.latency_ms != null ? `${r.latency_ms}ms` : "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right - Order Entry + Market Overview */}
        <div className="w-full lg:w-[300px] xl:w-[340px] border-t lg:border-t-0 lg:border-l border-border overflow-hidden flex flex-col shrink-0">
          {/* Market Stats (from Binance when connected; exchange-specific) */}
          <div className="p-3 sm:p-4 border-b border-border bg-card/30 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm font-semibold">Market Stats</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" title="Data source">
                Binance
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-2 sm:gap-y-2.5 text-[11px] sm:text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Volume</span>
                <span className="font-mono font-medium truncate ml-1">{volume24h}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h High</span>
                <span className="font-mono font-medium text-green-500 truncate ml-1">${high24h}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Low</span>
                <span className="font-mono font-medium text-red-500 truncate ml-1">${low24h}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Change</span>
                <span className={`font-mono font-medium truncate ml-1 ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositiveChange ? '+' : ''}{priceChange24h}%
                </span>
              </div>
            </div>
          </div>

          {/* Order Entry Panel */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-3 sm:mb-4 h-9 sm:h-8 bg-muted text-muted-foreground items-center justify-center rounded-xl p-[3px]">
                <TabsTrigger
                  value="buy"
                  className="text-xs sm:text-sm font-semibold border border-transparent rounded-lg data-[state=active]:!bg-green-500/25 data-[state=active]:!text-green-700 data-[state=active]:!border-green-500/50 data-[state=active]:shadow-sm dark:data-[state=active]:!bg-green-500/30 dark:data-[state=active]:!text-green-300"
                >
                  Buy
                </TabsTrigger>
                <TabsTrigger
                  value="sell"
                  className="text-xs sm:text-sm font-semibold border border-transparent rounded-lg data-[state=active]:!bg-red-500/25 data-[state=active]:!text-red-700 data-[state=active]:!border-red-500/50 data-[state=active]:shadow-sm dark:data-[state=active]:!bg-red-500/30 dark:data-[state=active]:!text-red-300"
                >
                  Sell
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="space-y-2.5 sm:space-y-3 mt-0">
                <div className="flex gap-2 mb-2 sm:mb-3">
                  <Button
                    variant={orderType === "limit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderType("limit")}
                    className="flex-1 h-8 sm:h-7 text-xs min-h-[44px] sm:min-h-0"
                  >
                    Limit
                  </Button>
                  <Button
                    variant={orderType === "market" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderType("market")}
                    className="flex-1 h-8 sm:h-7 text-xs min-h-[44px] sm:min-h-0"
                  >
                    Market
                  </Button>
                </div>

                <div className="text-[11px] sm:text-xs text-muted-foreground mb-1">
                  Available:{" "}
                  {balanceLoading ? (
                    <span className="text-muted-foreground">Loading…</span>
                  ) : isDemoMode ? (
                    <>
                      <span className="text-foreground truncate" title="Demo balance">12,345.67 USDT</span>
                      <span className="ml-1 text-[10px] text-muted-foreground/80">(demo)</span>
                    </>
                  ) : exchangeConnected ? (
                    <>
                      <span className="text-foreground truncate" title="Live balance from connected exchange">
                        {formatBalance(usdtFree ?? 0)} USDT
                      </span>
                      <span className="ml-1 text-[10px] text-muted-foreground/80">(live)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-foreground truncate" title="Connect Binance in Settings to see balance">— USDT</span>
                      <span className="ml-1 text-[10px] text-muted-foreground/80">(connect in Settings)</span>
                    </>
                  )}
                </div>

                {orderType === "limit" && (
                  <div className="space-y-1">
                    <Label className="text-[11px] sm:text-xs">Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      className="h-9 sm:h-9 font-mono text-sm min-h-[44px]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[11px] sm:text-xs">Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="h-9 font-mono text-sm min-h-[44px]"
                  />
                </div>

                <div className="flex gap-1">
                  {[25, 50, 75, 100].map((percent) => {
                    const buyBalance = isDemoMode ? 12345.67 : (usdtFree ?? 0);
                    return (
                      <Button
                        key={percent}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 sm:h-6 text-[11px] sm:text-xs min-h-[40px] sm:min-h-0"
                        disabled={!isDemoMode && !exchangeConnected}
                        onClick={() => {
                          const price = orderType === "limit" ? parseFloat(buyPrice) : currentPrice;
                          if (price && buyBalance > 0) {
                            setBuyAmount(((buyBalance * percent) / 100 / price).toFixed(6));
                          }
                        }}
                      >
                        {percent}%
                      </Button>
                    );
                  })}
                </div>

                {buyAmount && (orderType === "market" || buyPrice) && (
                  <div className="text-[11px] sm:text-xs text-muted-foreground">
                    Total: <span className="text-foreground font-mono">
                      {(parseFloat(buyAmount) * (orderType === "limit" ? parseFloat(buyPrice) : currentPrice)).toFixed(2)} USDT
                    </span>
                  </div>
                )}

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-10 sm:h-9 min-h-[44px] font-medium"
                  onClick={handleBuyOrder}
                  disabled={!isDemoMode && !tradingAllowed}
                >
                  Buy {selectedPair.split("/")[0]}
                </Button>
              </TabsContent>

              <TabsContent value="sell" className="space-y-2.5 sm:space-y-3 mt-0">
                <div className="flex gap-2 mb-2 sm:mb-3">
                  <Button
                    variant={orderType === "limit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderType("limit")}
                    className="flex-1 h-8 sm:h-7 text-xs min-h-[44px] sm:min-h-0"
                  >
                    Limit
                  </Button>
                  <Button
                    variant={orderType === "market" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderType("market")}
                    className="flex-1 h-8 sm:h-7 text-xs min-h-[44px] sm:min-h-0"
                  >
                    Market
                  </Button>
                </div>

                <div className="text-[11px] sm:text-xs text-muted-foreground mb-1">
                  Available:{" "}
                  {balanceLoading ? (
                    <span className="text-muted-foreground">Loading…</span>
                  ) : isDemoMode ? (
                    <>
                      <span className="text-foreground" title="Demo balance">0.5234 {baseAsset}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground/80">(demo)</span>
                    </>
                  ) : exchangeConnected ? (
                    <>
                      <span className="text-foreground truncate" title="Live balance from connected exchange">
                        {formatBalance(baseAssetFree ?? 0)} {baseAsset}
                      </span>
                      <span className="ml-1 text-[10px] text-muted-foreground/80">(live)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-foreground truncate" title="Connect Binance in Settings to see balance">— {baseAsset}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground/80">(connect in Settings)</span>
                    </>
                  )}
                </div>

                {orderType === "limit" && (
                  <div className="space-y-1">
                    <Label className="text-[11px] sm:text-xs">Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className="h-9 font-mono text-sm min-h-[44px]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[11px] sm:text-xs">Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="h-9 font-mono text-sm min-h-[44px]"
                  />
                </div>

                <div className="flex gap-1">
                  {[25, 50, 75, 100].map((percent) => {
                    const sellBalance = isDemoMode ? 0.5234 : (baseAssetFree ?? 0);
                    return (
                      <Button
                        key={percent}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 sm:h-6 text-[11px] sm:text-xs min-h-[40px] sm:min-h-0"
                        disabled={!isDemoMode && !exchangeConnected}
                        onClick={() => {
                          if (sellBalance > 0) {
                            setSellAmount(((sellBalance * percent) / 100).toFixed(6));
                          }
                        }}
                      >
                        {percent}%
                      </Button>
                    );
                  })}
                </div>

                {sellAmount && (orderType === "market" || sellPrice) && (
                  <div className="text-[11px] sm:text-xs text-muted-foreground">
                    Total: <span className="text-foreground font-mono">
                      {(parseFloat(sellAmount) * (orderType === "limit" ? parseFloat(sellPrice) : currentPrice)).toFixed(2)} USDT
                    </span>
                  </div>
                )}

                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-10 sm:h-9 min-h-[44px] font-medium"
                  onClick={handleSellOrder}
                  disabled={!isDemoMode && !tradingAllowed}
                >
                  Sell {selectedPair.split("/")[0]}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}