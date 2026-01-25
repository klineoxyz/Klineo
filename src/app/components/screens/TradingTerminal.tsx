import { useState, useMemo } from "react";
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Brush,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Clock,
  X,
  Star,
  Search,
} from "lucide-react";
import { toast } from "sonner";

// ==================== TECHNICAL INDICATOR CALCULATIONS ====================

// Calculate Simple Moving Average
const calculateSMA = (data: any[], period: number, key: string) => {
  return data.map((item, index) => {
    if (index < period - 1) return null;
    const sum = data.slice(index - period + 1, index + 1).reduce((acc, d) => acc + d[key], 0);
    return sum / period;
  });
};

// Calculate Exponential Moving Average
const calculateEMA = (data: any[], period: number, key: string) => {
  const k = 2 / (period + 1);
  const emaData: (number | null)[] = [];
  
  data.forEach((item, index) => {
    if (index === 0) {
      emaData.push(item[key]);
    } else if (index < period) {
      emaData.push(null);
    } else {
      const prevEMA = emaData[index - 1] ?? item[key];
      emaData.push(item[key] * k + prevEMA * (1 - k));
    }
  });
  
  return emaData;
};

// Calculate Bollinger Bands
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

// Calculate RSI (Relative Strength Index)
const calculateRSI = (data: any[], period: number = 14) => {
  const rsiData: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsiData.push(null);
      continue;
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = data[j].close - data[j - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    rsiData.push(rsi);
  }
  
  return rsiData;
};

// Calculate MACD
const calculateMACD = (data: any[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) => {
  const emaFast = calculateEMA(data, fastPeriod, "close");
  const emaSlow = calculateEMA(data, slowPeriod, "close");
  
  const macdLine = emaFast.map((fast, i) => {
    if (fast === null || emaSlow[i] === null) return null;
    return fast - emaSlow[i]!;
  });
  
  // Calculate signal line (EMA of MACD)
  const macdData = data.map((d, i) => ({ ...d, macd: macdLine[i] ?? 0 }));
  const signalLine = calculateEMA(macdData, signalPeriod, "macd");
  
  const histogram = macdLine.map((macd, i) => {
    if (macd === null || signalLine[i] === null) return null;
    return macd - signalLine[i]!;
  });
  
  return { macdLine, signalLine, histogram };
};

// Calculate Stochastic Oscillator
const calculateStochastic = (data: any[], kPeriod: number = 14, dPeriod: number = 3) => {
  const kData: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      kData.push(null);
      continue;
    }
    
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map(d => d.high));
    const lowest = Math.min(...slice.map(d => d.low));
    const current = data[i].close;
    
    const k = ((current - lowest) / (highest - lowest)) * 100;
    kData.push(k);
  }
  
  // Calculate %D (SMA of %K)
  const stochData = data.map((d, i) => ({ ...d, k: kData[i] ?? 0 }));
  const dData = calculateSMA(stochData, dPeriod, "k");
  
  return { k: kData, d: dData };
};

// ==================== DATA GENERATION ====================

// Seeded random number generator for consistent data
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Generate realistic OHLC candlestick data based on timeframe
const generateCandlestickData = (timeframe: string) => {
  const timeframeConfig: Record<string, { count: number; interval: number; format: string }> = {
    "1s": { count: 200, interval: 1000, format: "time" },
    "5s": { count: 200, interval: 5000, format: "time" },
    "15s": { count: 200, interval: 15000, format: "time" },
    "1m": { count: 200, interval: 60000, format: "time" },
    "5m": { count: 200, interval: 300000, format: "time" },
    "15m": { count: 150, interval: 900000, format: "time" },
    "1h": { count: 120, interval: 3600000, format: "time" },
    "4h": { count: 100, interval: 14400000, format: "datetime" },
    "1D": { count: 90, interval: 86400000, format: "date" },
    "1W": { count: 52, interval: 604800000, format: "date" },
  };
  
  const config = timeframeConfig[timeframe] || timeframeConfig["5m"];
  const data = [];
  
  // Use seeded random for consistent data per timeframe
  const seedValue = timeframe.split("").reduce((acc, char) => acc + char.charCodeAt(0), 12345);
  const rng = new SeededRandom(seedValue);
  
  // Starting price and SUPER STRONG mean reversion to eliminate drift
  const basePrice = 45234.56; // Center price point
  let currentPrice = basePrice;
  const meanReversionStrength = 0.65; // MASSIVELY STRENGTHENED: Very aggressive pull to center
  const maxDeviation = 600; // REDUCED: Tighter bounds to prevent drift
  
  for (let i = 0; i < config.count; i++) {
    // DRAMATICALLY REDUCED volatility to prevent any long-term drift
    const volatility = timeframe === "1s" ? 8 : timeframe === "5s" ? 12 : timeframe === "1m" ? 18 : timeframe === "5m" ? 30 : 60;
    
    // Mean reversion: VERY STRONG pull back toward base price
    const distanceFromMean = currentPrice - basePrice;
    const meanReversionForce = -distanceFromMean * meanReversionStrength;
    
    // Random walk component (balanced around zero) - USING SEEDED RNG
    const randomChange = (rng.next() - 0.5) * volatility * 2;
    
    // Combine mean reversion + random walk (mean reversion dominates)
    let change = randomChange + meanReversionForce;
    
    // Hard bounds: prevent price from drifting too far (TIGHTER)
    let newPrice = currentPrice + change;
    if (Math.abs(newPrice - basePrice) > maxDeviation) {
      // Force price strongly back toward center if it exceeds bounds
      newPrice = basePrice + (Math.sign(newPrice - basePrice) * maxDeviation * 0.7);
      change = newPrice - currentPrice;
    }
    
    // Periodic "gravity" reset every 20 candles to eliminate any accumulated drift
    if (i % 20 === 0 && Math.abs(newPrice - basePrice) > maxDeviation * 0.5) {
      newPrice = basePrice + (newPrice - basePrice) * 0.3; // Pull 70% back to center
      change = newPrice - currentPrice;
    }
    
    const open = currentPrice;
    const close = newPrice;
    const high = Math.max(open, close) + rng.next() * (volatility / 4);
    const low = Math.min(open, close) - rng.next() * (volatility / 4);
    
    const timestamp = Date.now() - (config.count - i) * config.interval;
    let timeLabel = "";
    
    if (config.format === "time") {
      timeLabel = new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (config.format === "datetime") {
      timeLabel = new Date(timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      });
    } else {
      timeLabel = new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    
    data.push({
      time: timeLabel,
      open,
      high,
      low,
      close,
      volume: rng.next() * 1000 + 500, // Use seeded RNG for volume too
    });
    
    currentPrice = close;
  }
  
  return data;
};

// Custom Candlestick Shape
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
      {/* Wick (High-Low line) */}
      <line
        x1={wickX}
        y1={highY}
        x2={wickX}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body (Open-Close rectangle) */}
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

// Mock order book data
const generateOrderBook = () => ({
  bids: Array.from({ length: 20 }, (_, i) => ({
    price: (45000 - i * 5).toFixed(2),
    amount: (Math.random() * 5 + 0.1).toFixed(4),
    total: ((45000 - i * 5) * (Math.random() * 5 + 0.1)).toFixed(2),
  })),
  asks: Array.from({ length: 20 }, (_, i) => ({
    price: (45000 + (i + 1) * 5).toFixed(2),
    amount: (Math.random() * 5 + 0.1).toFixed(4),
    total: ((45000 + (i + 1) * 5) * (Math.random() * 5 + 0.1)).toFixed(2),
  })),
});

const orderBookData = generateOrderBook();

// Mock recent trades
const recentTrades = Array.from({ length: 30 }, (_, i) => ({
  time: new Date(Date.now() - i * 5000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }),
  price: (45000 + Math.random() * 200 - 100).toFixed(2),
  amount: (Math.random() * 0.5).toFixed(4),
  side: Math.random() > 0.5 ? "buy" : "sell",
}));

// Trading pairs for right panel
const tradingPairs = [
  { symbol: "BTC/USDT", price: "45,234.56", change: "+2.45", volume: "1.2B" },
  { symbol: "ETH/USDT", price: "2,456.78", change: "+1.23", volume: "456M" },
  { symbol: "BNB/USDT", price: "345.67", change: "-0.89", volume: "89M" },
  { symbol: "SOL/USDT", price: "98.45", change: "+5.67", volume: "234M" },
  { symbol: "XRP/USDT", price: "0.5678", change: "+3.21", volume: "678M" },
  { symbol: "ADA/USDT", price: "0.4567", change: "-1.45", volume: "123M" },
  { symbol: "DOGE/USDT", price: "0.0789", change: "+4.56", volume: "345M" },
  { symbol: "MATIC/USDT", price: "0.8765", change: "+2.34", volume: "567M" },
];

interface TradingTerminalProps {
  onNavigate: (view: string) => void;
}

export function TradingTerminal({ onNavigate }: TradingTerminalProps) {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [orderType, setOrderType] = useState("limit");
  const [buyAmount, setBuyAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [timeframe, setTimeframe] = useState("5m");
  
  // Indicator toggles
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showEMA9, setShowEMA9] = useState(false);
  const [showEMA21, setShowEMA21] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showStochastic, setShowStochastic] = useState(false);
  
  // Chart mode and controls
  const [chartMode, setChartMode] = useState<"original" | "tradingview" | "depth">("tradingview");
  const [showVolume, setShowVolume] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Generate chart data based on timeframe (memoized for performance)
  const chartData = useMemo(() => {
    const priceData = generateCandlestickData(timeframe);
    const sma20 = calculateSMA(priceData, 20, "close");
    const sma50 = calculateSMA(priceData, 50, "close");
    const ema9 = calculateEMA(priceData, 9, "close");
    const ema21 = calculateEMA(priceData, 21, "close");
    const bollingerBands = calculateBollingerBands(priceData, 20, 2);
    const rsi = calculateRSI(priceData, 14);
    const macd = calculateMACD(priceData, 12, 26, 9);
    const stochastic = calculateStochastic(priceData, 14, 3);
    
    return priceData.map((item, index) => ({
      ...item,
      sma20: sma20[index],
      sma50: sma50[index],
      ema9: ema9[index],
      ema21: ema21[index],
      bb_upper: bollingerBands[index].upper,
      bb_middle: bollingerBands[index].middle,
      bb_lower: bollingerBands[index].lower,
      rsi: rsi[index],
      macd: macd.macdLine[index],
      macd_signal: macd.signalLine[index],
      macd_histogram: macd.histogram[index],
      stoch_k: stochastic.k[index],
      stoch_d: stochastic.d[index],
    }));
  }, [timeframe]);

  // Pre-calculate price domain once for performance (instead of 40,000+ times per render)
  const priceDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return [0, 100000];
    const minPrice = Math.min(...chartData.map(d => d.low));
    const maxPrice = Math.max(...chartData.map(d => d.high));
    const padding = (maxPrice - minPrice) * 0.02; // 2% padding for better visualization
    return [minPrice - padding, maxPrice + padding];
  }, [chartData]);

  // Pre-calculate volume domain
  const volumeDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return [0, 1000];
    const maxVolume = Math.max(...chartData.map(d => d.volume));
    return [0, maxVolume * 1.1]; // 10% padding on top
  }, [chartData]);

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

  const currentPrice = 45234.56;
  const priceChange24h = 2.45;
  const volume24h = "1,234.56";
  const high24h = "46,789.12";
  const low24h = "44,123.45";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar - Binance Style */}
      <div className="flex items-center gap-6 px-4 py-2 border-b border-border bg-card/50">
        {/* Pair Selector */}
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

        {/* Current Price */}
        <div>
          <div className="text-xl font-mono font-bold text-green-500">
            ${currentPrice.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            ${currentPrice.toLocaleString()}
          </div>
        </div>

        {/* 24h Change */}
        <div>
          <div className="text-xs text-muted-foreground">24h Change</div>
          <div className="flex items-center gap-1 text-green-500 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>+{priceChange24h}%</span>
          </div>
        </div>

        {/* 24h High */}
        <div>
          <div className="text-xs text-muted-foreground">24h High</div>
          <div className="font-mono text-sm">${high24h}</div>
        </div>

        {/* 24h Low */}
        <div>
          <div className="text-xs text-muted-foreground">24h Low</div>
          <div className="font-mono text-sm">${low24h}</div>
        </div>

        {/* 24h Volume */}
        <div>
          <div className="text-xs text-muted-foreground">24h Volume (BTC)</div>
          <div className="font-mono text-sm">{volume24h}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Order Book */}
        <div className="w-[280px] border-r border-border bg-card/30 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="text-sm font-semibold">Order Book</div>
          </div>
          
          {/* Asks - Scrollable */}
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

          {/* Current Price */}
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

          {/* Bids - Scrollable */}
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
          {/* Chart with integrated toolbar */}
          <div className="flex-1 bg-[#0a0e13] flex flex-col min-h-0">
            {/* Minimal Toolbar - Timeframes + Indicators + Chart Modes */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[#0a0e13] flex-shrink-0">
              {/* Left: Timeframes + Chart Mode */}
              <div className="flex items-center gap-3">
                {/* Timeframe buttons */}
                <div className="flex items-center gap-1">
                  {["1s", "5s", "15s", "1m", "5m", "15m", "1h", "4h", "1D", "1W"].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors ${
                        timeframe === tf 
                          ? "bg-accent text-accent-foreground" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                
                {/* Chart Mode Toggles */}
                <div className="flex items-center gap-1 border-l border-border/30 pl-3">
                  <button
                    onClick={() => setChartMode("original")}
                    className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors ${
                      chartMode === "original" 
                        ? "bg-accent text-accent-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setChartMode("tradingview")}
                    className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors ${
                      chartMode === "tradingview" 
                        ? "bg-accent text-accent-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    TradingView
                  </button>
                  <button
                    onClick={() => setChartMode("depth")}
                    className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors ${
                      chartMode === "depth" 
                        ? "bg-accent text-accent-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    Depth
                  </button>
                </div>
                
                {/* Volume Toggle */}
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
              </div>

              {/* Right: Indicators */}
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
              </div>
            </div>

            {/* OHLC Data Bar + MA Values */}
            <div className="px-3 py-2 border-b border-border/20 bg-[#0a0e13] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className="text-muted-foreground">
                  Open <span className="text-foreground ml-1">{chartData[chartData.length - 1]?.open.toFixed(2)}</span>
                </span>
                <span className="text-muted-foreground">
                  High <span className="text-green-500 ml-1">{Math.max(...chartData.slice(-20).map(d => d.high)).toFixed(2)}</span>
                </span>
                <span className="text-muted-foreground">
                  Low <span className="text-red-500 ml-1">{Math.min(...chartData.slice(-20).map(d => d.low)).toFixed(2)}</span>
                </span>
                <span className="text-muted-foreground">
                  Close <span className="text-foreground ml-1">{chartData[chartData.length - 1]?.close.toFixed(2)}</span>
                </span>
                <span className={`font-medium ${priceChange24h > 0 ? "text-green-500" : "text-red-500"}`}>
                  {priceChange24h > 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
                </span>
              </div>
              
              {/* Active MA Indicators */}
              <div className="flex items-center gap-3 text-[11px] font-mono">
                {showSMA20 && (
                  <span className="text-[#FFB000]">
                    MA(20) {chartData[chartData.length - 1]?.sma20?.toFixed(2) || "—"}
                  </span>
                )}
                {showSMA50 && (
                  <span className="text-[#3B82F6]">
                    MA(50) {chartData[chartData.length - 1]?.sma50?.toFixed(2) || "—"}
                  </span>
                )}
                {showEMA9 && (
                  <span className="text-[#10B981]">
                    EMA(9) {chartData[chartData.length - 1]?.ema9?.toFixed(2) || "—"}
                  </span>
                )}
                {showEMA21 && (
                  <span className="text-[#F59E0B]">
                    EMA(21) {chartData[chartData.length - 1]?.ema21?.toFixed(2) || "—"}
                  </span>
                )}
              </div>
            </div>

            {/* TradingView-Grade Split Chart Area */}
            <div className="flex-1 flex flex-col min-h-0 gap-0 p-2">
              {/* Main Price Chart - 70% */}
              <div className="flex-1 min-h-0" style={{ height: '70%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={chartData}
                    margin={{ top: 10, right: 65, left: 5, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <defs>
                      <linearGradient id="priceZone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFB000" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#FFB000" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid 
                      strokeDasharray="2 2" 
                      stroke="#374151" 
                      strokeOpacity={0.4}
                      vertical={true}
                    />
                    
                    <XAxis
                      dataKey="time"
                      stroke="transparent"
                      tick={false}
                      axisLine={false}
                      height={0}
                    />
                    
                    <YAxis
                      yAxisId="price"
                      orientation="right"
                      stroke="transparent"
                      tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "monospace" }}
                      domain={priceDomain}
                      tickFormatter={(value) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      axisLine={false}
                      tickLine={false}
                      width={65}
                      tickMargin={8}
                    />
                    
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0B0D10",
                        border: "1px solid #374151",
                        borderRadius: "6px",
                        fontSize: "11px",
                        padding: "10px 12px",
                        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.6)",
                      }}
                      labelStyle={{ 
                        color: "#FFB000", 
                        fontSize: "10px",
                        fontWeight: 700,
                        marginBottom: "6px",
                        fontFamily: "monospace"
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === "high" || name === "low" || name === "open" || name === "close") {
                          return [`$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, name.toUpperCase()];
                        }
                        return null;
                      }}
                      cursor={{ 
                        stroke: "#6b7280", 
                        strokeWidth: 1, 
                        strokeDasharray: "3 3"
                      }}
                    />
                    
                    <Bar
                      yAxisId="price"
                      dataKey="high"
                      isAnimationActive={false}
                      maxBarSize={14}
                      shape={(props: any) => {
                        const item = chartData[props.index];
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
                              const range = priceDomain[1] - priceDomain[0];
                              return y + height - ((val - priceDomain[0]) / range) * height;
                            }}
                          />
                        );
                      }}
                    />
                    
                    {showBB && (
                      <>
                        <Line 
                          yAxisId="price" 
                          type="monotone" 
                          dataKey="bb_upper" 
                          stroke="#8b5cf6" 
                          strokeWidth={1.5} 
                          dot={false} 
                          strokeDasharray="3 3" 
                          isAnimationActive={false} 
                          strokeOpacity={0.6} 
                        />
                        <Line 
                          yAxisId="price" 
                          type="monotone" 
                          dataKey="bb_middle" 
                          stroke="#8b5cf6" 
                          strokeWidth={1.5} 
                          dot={false} 
                          isAnimationActive={false} 
                          strokeOpacity={0.7} 
                        />
                        <Line 
                          yAxisId="price" 
                          type="monotone" 
                          dataKey="bb_lower" 
                          stroke="#8b5cf6" 
                          strokeWidth={1.5} 
                          dot={false} 
                          strokeDasharray="3 3" 
                          isAnimationActive={false} 
                          strokeOpacity={0.6} 
                        />
                      </>
                    )}
                    
                    {showSMA20 && (
                      <Line 
                        yAxisId="price" 
                        type="monotone" 
                        dataKey="sma20" 
                        stroke="#FFB000" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                    )}
                    {showSMA50 && (
                      <Line 
                        yAxisId="price" 
                        type="monotone" 
                        dataKey="sma50" 
                        stroke="#3B82F6" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                    )}
                    {showEMA9 && (
                      <Line 
                        yAxisId="price" 
                        type="monotone" 
                        dataKey="ema9" 
                        stroke="#10B981" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                    )}
                    {showEMA21 && (
                      <Line 
                        yAxisId="price" 
                        type="monotone" 
                        dataKey="ema21" 
                        stroke="#F59E0B" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                    )}
                    
                    <ReferenceLine
                      yAxisId="price"
                      y={chartData[chartData.length - 1]?.close}
                      stroke={priceChange24h > 0 ? "#10B981" : "#EF4444"}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      label={{
                        value: `${chartData[chartData.length - 1]?.close.toFixed(2)}`,
                        position: "right",
                        fill: "#ffffff",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        offset: 10
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Volume Sub-Chart - 30% */}
              {showVolume && (
                <div className="border-t border-border/30 pt-1" style={{ height: '30%', minHeight: '110px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={chartData}
                      margin={{ top: 0, right: 65, left: 5, bottom: 5 }}
                      barCategoryGap="20%"
                    >
                      <defs>
                        <linearGradient id="volumeGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="volumeRed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#1f2937" 
                        strokeOpacity={0.2}
                        vertical={false}
                      />
                      
                      <XAxis
                        dataKey="time"
                        stroke="transparent"
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        interval="preserveStartEnd"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={6}
                      />
                      
                      <YAxis
                        yAxisId="volume"
                        orientation="right"
                        stroke="transparent"
                        tick={{ fontSize: 10, fill: "#6b7280", fontFamily: "monospace" }}
                        domain={[0, (dataMax: number) => dataMax * 1.8]}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        width={65}
                        tickMargin={8}
                      />
                      
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0B0D10",
                          border: "1px solid #374151",
                          borderRadius: "6px",
                          fontSize: "11px",
                          padding: "8px 10px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                        }}
                        labelStyle={{ 
                          color: "#FFB000", 
                          fontSize: "10px",
                          fontWeight: 700,
                          fontFamily: "monospace"
                        }}
                        formatter={(value: any) => [`${parseFloat(value).toLocaleString()}`, "Volume"]}
                        cursor={{ 
                          stroke: "#6b7280", 
                          strokeWidth: 1, 
                          strokeDasharray: "3 3"
                        }}
                      />
                      
                      <Bar
                        yAxisId="volume"
                        dataKey="volume"
                        isAnimationActive={false}
                        maxBarSize={14}
                        shape={(props: any) => {
                          const { x, y, width, height, index } = props;
                          if (!chartData[index]) return null;
                          const candle = chartData[index];
                          const isGreen = candle.close >= candle.open;
                          return (
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={isGreen ? "url(#volumeGreen)" : "url(#volumeRed)"}
                            />
                          );
                        }}
                      />
                      
                      <Brush
                        dataKey="time"
                        height={22}
                        stroke="#FFB000"
                        fill="#0B0D10"
                        travellerWidth={8}
                        tickFormatter={() => ""}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tabs - Order Book & Trades */}
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

        {/* Right Side - Trading Pairs + Order Entry */}
        <div className="w-[340px] border-l border-border overflow-hidden flex flex-col">
          {/* Trading Pairs List */}
          <div className="h-[300px] border-b border-border bg-card/30 flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="text-sm font-semibold">Market</div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {tradingPairs.map((pair, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 hover:bg-secondary/50 cursor-pointer ${
                    pair.symbol === selectedPair ? "bg-secondary/50" : ""
                  }`}
                  onClick={() => setSelectedPair(pair.symbol)}
                >
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{pair.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{pair.price}</div>
                    <div
                      className={`text-xs ${
                        pair.change.startsWith("+") ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {pair.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Entry Panel */}
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="sell">Sell</TabsTrigger>
              </TabsList>

              {/* Buy Form */}
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

              {/* Sell Form */}
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