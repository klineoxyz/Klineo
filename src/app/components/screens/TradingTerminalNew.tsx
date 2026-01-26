import { useState, useEffect, useCallback } from "react";
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
  TrendingUp,
  TrendingDown,
  Star,
  Search,
  BarChart3,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { TradingViewChart } from "@/app/components/TradingViewChart";
import { 
  TradingViewTicker,
  TradingViewMarketOverview,
  TradingViewAdvancedChart 
} from "@/app/components/TradingViewWidgets";
import { fetchKlines } from "@/lib/binance";
import type { OhlcvItem } from "@/app/components/charts/LightweightChartsWidget";

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

// Trading pairs
const tradingPairs = [
  { symbol: "BTC/USDT", price: "45,234.56", change: "+2.45", volume: "1.2B" },
  { symbol: "ETH/USDT", price: "2,456.78", change: "+1.23", volume: "456M" },
  { symbol: "BNB/USDT", price: "345.67", change: "-0.89", volume: "89M" },
  { symbol: "SOL/USDT", price: "98.45", change: "+5.67", volume: "234M" },
  { symbol: "XRP/USDT", price: "0.5678", change: "+3.21", volume: "678M" },
];

// Mock order book data
const generateOrderBook = (basePrice: number) => ({
  bids: Array.from({ length: 20 }, (_, i) => ({
    price: (basePrice - i * (basePrice * 0.0001)).toFixed(2),
    amount: (Math.random() * 5 + 0.1).toFixed(4),
    total: ((basePrice - i * (basePrice * 0.0001)) * (Math.random() * 5 + 0.1)).toFixed(2),
  })),
  asks: Array.from({ length: 20 }, (_, i) => ({
    price: (basePrice + (i + 1) * (basePrice * 0.0001)).toFixed(2),
    amount: (Math.random() * 5 + 0.1).toFixed(4),
    total: ((basePrice + (i + 1) * (basePrice * 0.0001)) * (Math.random() * 5 + 0.1)).toFixed(2),
  })),
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

export function TradingTerminalNew({ onNavigate }: TradingTerminalProps) {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [orderType, setOrderType] = useState("limit");
  const [buyAmount, setBuyAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [chartMode, setChartMode] = useState<"lightweight" | "advanced">("lightweight");
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  
  // Indicator toggles
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showEMA9, setShowEMA9] = useState(false);
  const [showEMA21, setShowEMA21] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  // Get current pair data (fallback for order book, trades, 24h stats)
  const currentPairData = tradingPairs.find(p => p.symbol === selectedPair) || tradingPairs[0];
  const basePrice = parseFloat(currentPairData.price.replace(/,/g, ""));
  const priceChange = parseFloat(currentPairData.change);
  const isPositiveChange = priceChange >= 0;

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

  const orderBookData = generateOrderBook(basePrice);
  const recentTrades = generateRecentTrades(basePrice);
  const currentPrice = chartData.length ? chartData[chartData.length - 1].close : basePrice;
  const priceChange24h = priceChange;
  const volume24h = currentPairData.volume;
  const high24h = chartData.length
    ? Math.max(...chartData.map((d) => d.high)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (basePrice * 1.035).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const low24h = chartData.length
    ? Math.min(...chartData.map((d) => d.low)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (basePrice * 0.975).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleTimeframeChange = useCallback((timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
  }, []);

  const handleBuyOrder = () => {
    if (!buyAmount || (orderType === "limit" && !buyPrice)) {
      toast.error("Please enter all required fields");
      return;
    }
    toast.success(`Buy order placed: ${buyAmount} ${selectedPair.split("/")[0]} ${orderType === "limit" ? `@ $${buyPrice}` : "at market price"}`);
    setBuyAmount("");
    setBuyPrice("");
  };

  const handleSellOrder = () => {
    if (!sellAmount || (orderType === "limit" && !sellPrice)) {
      toast.error("Please enter all required fields");
      return;
    }
    toast.success(`Sell order placed: ${sellAmount} ${selectedPair.split("/")[0]} ${orderType === "limit" ? `@ $${sellPrice}` : "at market price"}`);
    setSellAmount("");
    setSellPrice("");
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* TradingView Ticker Tape */}
      <div className="h-12 border-b border-border">
        <TradingViewTicker />
      </div>

      {/* Top Bar */}
      <div className="flex items-center gap-6 px-4 py-2 border-b border-border bg-card/50">
        <Select value={selectedPair} onValueChange={setSelectedPair}>
          <SelectTrigger className="w-[140px] border-none shadow-none font-mono font-bold text-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tradingPairs.map((pair) => (
              <SelectItem key={pair.symbol} value={pair.symbol}>
                {pair.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <div className="text-xl font-mono font-bold text-green-500">
            ${currentPrice.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            ${currentPrice.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">24h Change</div>
          <div className={`flex items-center gap-1 font-medium ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
            {isPositiveChange ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositiveChange ? '+' : ''}{priceChange24h}%</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">24h High</div>
          <div className="font-mono text-sm">${high24h}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">24h Low</div>
          <div className="font-mono text-sm">${low24h}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">24h Volume (BTC)</div>
          <div className="font-mono text-sm">{volume24h}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Order Book */}
        <div className="w-[280px] border-r border-border bg-card/30 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="text-sm font-semibold">Order Book</div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="text-xs font-mono">
              {orderBookData.asks.reverse().map((ask, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-2 px-3 py-0.5 hover:bg-red-500/5 relative"
                >
                  <div
                    className="absolute inset-0 bg-red-500/10"
                    style={{ width: `${Math.random() * 60 + 20}%`, right: 0 }}
                  />
                  <div className="text-red-500 relative z-10">{ask.price}</div>
                  <div className="text-right relative z-10">{ask.amount}</div>
                  <div className="text-right text-muted-foreground relative z-10 text-[10px]">
                    {ask.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-3 py-2 border-y border-border bg-green-500/10">
            <div className="flex items-center justify-between">
              <div className="text-lg font-mono font-bold text-green-500">
                {currentPrice.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                ${currentPrice.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="text-xs font-mono">
              {orderBookData.bids.map((bid, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-2 px-3 py-0.5 hover:bg-green-500/5 relative"
                >
                  <div
                    className="absolute inset-0 bg-green-500/10"
                    style={{ width: `${Math.random() * 60 + 20}%`, right: 0 }}
                  />
                  <div className="text-green-500 relative z-10">{bid.price}</div>
                  <div className="text-right relative z-10">{bid.amount}</div>
                  <div className="text-right text-muted-foreground relative z-10 text-[10px]">
                    {bid.total}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Chart */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Chart with toolbar */}
          <div className="flex-1 bg-[#0a0e13] flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[#0a0e13] flex-shrink-0">
              <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowSMA20(!showSMA20)}
                    className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
                      showSMA20 ? "bg-[#FFB000]/20 text-[#FFB000]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    MA(20)
                  </button>
                  <button
                    onClick={() => setShowSMA50(!showSMA50)}
                    className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
                      showSMA50 ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    MA(50)
                  </button>
                  <button
                    onClick={() => setShowEMA9(!showEMA9)}
                    className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
                      showEMA9 ? "bg-[#10B981]/20 text-[#10B981]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    EMA(9)
                  </button>
                  <button
                    onClick={() => setShowEMA21(!showEMA21)}
                    className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
                      showEMA21 ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    EMA(21)
                  </button>
                  <button
                    onClick={() => setShowBB(!showBB)}
                    className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
                      showBB ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    BB
                  </button>
                  <button
                    onClick={() => setShowRSI(!showRSI)}
                    className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
                      showRSI ? "bg-[#ec4899]/20 text-[#ec4899]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    RSI
                  </button>
                  <button
                    onClick={() => setShowMACD(!showMACD)}
                    className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
                      showMACD ? "bg-[#06b6d4]/20 text-[#06b6d4]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    MACD
                  </button>
                </div>
              )}
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-0 p-2">
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
                  <TradingViewAdvancedChart symbol="BINANCE:BTCUSDT" />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tabs */}
          <div className="h-[240px] border-t border-border">
            <Tabs defaultValue="trades" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2 w-auto">
                <TabsTrigger value="trades">Market Trades</TabsTrigger>
                <TabsTrigger value="myorders">My Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="trades" className="flex-1 px-4 pb-2 overflow-hidden">
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-1 font-medium">
                  <div>Price (USDT)</div>
                  <div className="text-right">Amount (BTC)</div>
                  <div className="text-right">Time</div>
                </div>
                <div className="space-y-0 overflow-y-auto h-[calc(100%-24px)] text-xs font-mono">
                  {recentTrades.map((trade, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 gap-2 py-0.5 hover:bg-secondary/50"
                    >
                      <div className={trade.side === "buy" ? "text-green-500" : "text-red-500"}>
                        {trade.price}
                      </div>
                      <div className="text-right">{trade.amount}</div>
                      <div className="text-right text-muted-foreground text-[10px]">{trade.time}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="myorders" className="flex-1 px-4 pb-2">
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No open orders
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right - Order Entry + Market Overview */}
        <div className="w-[340px] border-l border-border overflow-hidden flex flex-col">
          {/* Market Stats */}
          <div className="p-4 border-b border-border bg-card/30">
            <div className="text-sm font-semibold mb-3">Market Stats</div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Volume</span>
                <span className="font-mono font-medium">{volume24h} BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h High</span>
                <span className="font-mono font-medium text-green-500">${high24h}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Low</span>
                <span className="font-mono font-medium text-red-500">${low24h}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Change</span>
                <span className={`font-mono font-medium ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositiveChange ? '+' : ''}{priceChange24h}%
                </span>
              </div>
            </div>
          </div>

          {/* Order Entry Panel */}
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="sell">Sell</TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="space-y-3 mt-0">
                <div className="flex gap-2 mb-3">
                  <Button
                    variant={orderType === "limit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderType("limit")}
                    className="flex-1 h-7 text-xs"
                  >
                    Limit
                  </Button>
                  <Button
                    variant={orderType === "market" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderType("market")}
                    className="flex-1 h-7 text-xs"
                  >
                    Market
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mb-1">
                  Available: <span className="text-foreground">12,345.67 USDT</span>
                </div>

                {orderType === "limit" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="h-9 font-mono text-sm"
                  />
                </div>

                <div className="flex gap-1">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-6 text-xs"
                      onClick={() => {
                        const balance = 12345.67;
                        const price = orderType === "limit" ? parseFloat(buyPrice) : currentPrice;
                        if (price) {
                          setBuyAmount(((balance * percent) / 100 / price).toFixed(6));
                        }
                      }}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                {buyAmount && (orderType === "market" || buyPrice) && (
                  <div className="text-xs text-muted-foreground">
                    Total: <span className="text-foreground font-mono">
                      {(parseFloat(buyAmount) * (orderType === "limit" ? parseFloat(buyPrice) : currentPrice)).toFixed(2)} USDT
                    </span>
                  </div>
                )}

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-9"
                  onClick={handleBuyOrder}
                >
                  Buy {selectedPair.split("/")[0]}
                </Button>
              </TabsContent>

              <TabsContent value="sell" className="space-y-3 mt-0">
                <div className="flex gap-2 mb-3">
                  <Button
                    variant={orderType === "limit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderType("limit")}
                    className="flex-1 h-7 text-xs"
                  >
                    Limit
                  </Button>
                  <Button
                    variant={orderType === "market" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderType("market")}
                    className="flex-1 h-7 text-xs"
                  >
                    Market
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mb-1">
                  Available: <span className="text-foreground">0.5234 BTC</span>
                </div>

                {orderType === "limit" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="h-9 font-mono text-sm"
                  />
                </div>

                <div className="flex gap-1">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-6 text-xs"
                      onClick={() => {
                        const balance = 0.5234;
                        setSellAmount(((balance * percent) / 100).toFixed(6));
                      }}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                {sellAmount && (orderType === "market" || sellPrice) && (
                  <div className="text-xs text-muted-foreground">
                    Total: <span className="text-foreground font-mono">
                      {(parseFloat(sellAmount) * (orderType === "limit" ? parseFloat(sellPrice) : currentPrice)).toFixed(2)} USDT
                    </span>
                  </div>
                )}

                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-9"
                  onClick={handleSellOrder}
                >
                  Sell {selectedPair.split("/")[0]}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}