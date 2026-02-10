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
import { fetchUsdtPairs } from "@/lib/binance";
import { BacktestLightweightChart } from "@/app/components/charts/BacktestLightweightChart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";

// Helper: Calculate SMA (for chart overlays: array of objects with key)
const calculateSMA = (data: any[], period: number, key: string) => {
  return data.map((item, index) => {
    if (index < period - 1) return null;
    const sum = data.slice(index - period + 1, index + 1).reduce((acc: number, d: any) => acc + d[key], 0);
    return sum / period;
  });
};

// SMA of a number array (for strategy backtest)
const sma = (closes: number[], period: number): (number | null)[] => {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    return sum / period;
  });
};

// EMA of a number array (for strategy backtest)
const ema = (closes: number[], period: number): (number | null)[] => {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let val: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (val == null) {
      if (i < period - 1) {
        out.push(null);
        continue;
      }
      const sum = closes.slice(0, i + 1).reduce((a, b) => a + b, 0);
      val = sum / (i + 1);
    } else {
      val = closes[i] * k + val * (1 - k);
    }
    out.push(val);
  }
  return out;
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

/** Config passed into backtest so results reflect Strategy Parameters and Filters. */
export type BacktestConfig = {
  strategy: string;
  direction: "long" | "short" | "both";
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  maFastType: "sma" | "ema";
  maFastPeriod: number;
  maSlowType: "sma" | "ema";
  maSlowPeriod: number;
  breakoutLookback: number;
  breakoutThresholdPct: number;
  meanReversionLookback: number;
  meanReversionZScore: number;
  momentumRocPeriod: number;
  momentumMinPct: number;
  volumeFilterEnabled: boolean;
  volumeMaPeriod: number;
  atrPeriod: number;
};

type ChartPoint = {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  buySignal: number | null;
  sellSignal: number | null;
  tradeId: number | null;
};

type Trade = { entryIndex: number; exitIndex: number; entryPrice: number; exitPrice: number; direction: "long" | "short" };

/** Run backtest on OHLC candles with the selected strategy. Returns chart data and trades. */
function runBacktestFromRealCandles(
  apiCandles: KlineCandle[],
  config: BacktestConfig
): { data: ChartPoint[]; trades: Trade[] } {
  const data: ChartPoint[] = apiCandles.map((c) => ({
    time: new Date(c.time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    timestamp: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    buySignal: null,
    sellSignal: null,
    tradeId: null,
  }));
  const closes = data.map((d) => d.close);
  const trades: Trade[] = [];
  let tradeId = 1;
  let inLong: number | null = null;
  let inShort: number | null = null;
  const allowLong = config.direction === "long" || config.direction === "both";
  const allowShort = config.direction === "short" || config.direction === "both";

  const strategy = config.strategy;

  // ---- RSI ----
  if (strategy === "rsi-oversold") {
    const period = config.rsiPeriod;
    const oversold = config.rsiOversold;
    const overbought = config.rsiOverbought;
    for (let i = period; i < data.length; i++) {
      const rsi = computeRSI(closes.slice(0, i + 1), period);
      if (rsi == null) continue;
      if (inLong !== null) {
        if (rsi >= overbought) {
          trades.push({ entryIndex: inLong, exitIndex: i, entryPrice: data[inLong].close, exitPrice: data[i].close, direction: "long" });
          data[inLong].buySignal = data[inLong].close;
          data[i].sellSignal = data[i].close;
          for (let j = inLong; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inLong = null;
        }
      } else if (inShort !== null) {
        if (rsi <= oversold) {
          trades.push({ entryIndex: inShort, exitIndex: i, entryPrice: data[inShort].close, exitPrice: data[i].close, direction: "short" });
          data[inShort].sellSignal = data[inShort].close;
          data[i].buySignal = data[i].close;
          for (let j = inShort; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inShort = null;
        }
      } else {
        if (rsi <= oversold && allowLong) inLong = i;
        else if (rsi >= overbought && allowShort) inShort = i;
      }
    }
    return { data, trades };
  }

  // ---- MA Crossover: golden cross = long, death cross = short ----
  if (strategy === "ma-crossover") {
    const fastArr = config.maFastType === "ema" ? ema(closes, config.maFastPeriod) : sma(closes, config.maFastPeriod);
    const slowArr = config.maSlowType === "ema" ? ema(closes, config.maSlowPeriod) : sma(closes, config.maSlowPeriod);
    const lookback = Math.max(config.maFastPeriod, config.maSlowPeriod);
    for (let i = lookback; i < data.length; i++) {
      const fast = fastArr[i];
      const slow = slowArr[i];
      const prevFast = fastArr[i - 1];
      const prevSlow = slowArr[i - 1];
      if (fast == null || slow == null || prevFast == null || prevSlow == null) continue;
      const crossUp = prevFast <= prevSlow && fast > slow;
      const crossDown = prevFast >= prevSlow && fast < slow;
      if (inLong !== null) {
        if (crossDown) {
          trades.push({ entryIndex: inLong, exitIndex: i, entryPrice: data[inLong].close, exitPrice: data[i].close, direction: "long" });
          data[inLong].buySignal = data[inLong].close;
          data[i].sellSignal = data[i].close;
          for (let j = inLong; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inLong = null;
        }
      } else if (inShort !== null) {
        if (crossUp) {
          trades.push({ entryIndex: inShort, exitIndex: i, entryPrice: data[inShort].close, exitPrice: data[i].close, direction: "short" });
          data[inShort].sellSignal = data[inShort].close;
          data[i].buySignal = data[i].close;
          for (let j = inShort; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inShort = null;
        }
      } else {
        if (crossUp && allowLong) inLong = i;
        else if (crossDown && allowShort) inShort = i;
      }
    }
    return { data, trades };
  }

  // ---- Breakout: break above lookback high = long, below lookback low = short ----
  if (strategy === "breakout") {
    const lb = config.breakoutLookback;
    const thresh = config.breakoutThresholdPct / 100;
    for (let i = lb; i < data.length; i++) {
      const slice = closes.slice(i - lb, i);
      const high = Math.max(...slice);
      const low = Math.min(...slice);
      const prevHigh = i > lb ? Math.max(...closes.slice(i - lb - 1, i - 1)) : high;
      const prevLow = i > lb ? Math.min(...closes.slice(i - lb - 1, i - 1)) : low;
      const price = closes[i];
      const breakUp = price >= high * (1 + thresh) && high > prevHigh;
      const breakDown = price <= low * (1 - thresh) && low < prevLow;
      if (inLong !== null) {
        if (breakDown) {
          trades.push({ entryIndex: inLong, exitIndex: i, entryPrice: data[inLong].close, exitPrice: data[i].close, direction: "long" });
          data[inLong].buySignal = data[inLong].close;
          data[i].sellSignal = data[i].close;
          for (let j = inLong; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inLong = null;
        }
      } else if (inShort !== null) {
        if (breakUp) {
          trades.push({ entryIndex: inShort, exitIndex: i, entryPrice: data[inShort].close, exitPrice: data[i].close, direction: "short" });
          data[inShort].sellSignal = data[inShort].close;
          data[i].buySignal = data[i].close;
          for (let j = inShort; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inShort = null;
        }
      } else {
        if (breakUp && allowLong) inLong = i;
        else if (breakDown && allowShort) inShort = i;
      }
    }
    return { data, trades };
  }

  // ---- Mean reversion: price Z std below mean = long, above = short ----
  if (strategy === "mean-reversion") {
    const lb = config.meanReversionLookback;
    const zThresh = config.meanReversionZScore;
    for (let i = lb; i < data.length; i++) {
      const slice = closes.slice(i - lb, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((s, x) => s + (x - mean) ** 2, 0) / slice.length;
      const std = Math.sqrt(variance) || 1e-8;
      const z = (closes[i] - mean) / std;
      const oversold = z <= -zThresh;
      const overbought = z >= zThresh;
      if (inLong !== null) {
        if (overbought) {
          trades.push({ entryIndex: inLong, exitIndex: i, entryPrice: data[inLong].close, exitPrice: data[i].close, direction: "long" });
          data[inLong].buySignal = data[inLong].close;
          data[i].sellSignal = data[i].close;
          for (let j = inLong; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inLong = null;
        }
      } else if (inShort !== null) {
        if (oversold) {
          trades.push({ entryIndex: inShort, exitIndex: i, entryPrice: data[inShort].close, exitPrice: data[i].close, direction: "short" });
          data[inShort].sellSignal = data[inShort].close;
          data[i].buySignal = data[i].close;
          for (let j = inShort; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inShort = null;
        }
      } else {
        if (oversold && allowLong) inLong = i;
        else if (overbought && allowShort) inShort = i;
      }
    }
    return { data, trades };
  }

  // ---- Momentum (ROC): ROC > min% = long, ROC < -min% = short ----
  if (strategy === "momentum") {
    const period = config.momentumRocPeriod;
    const minPct = config.momentumMinPct;
    for (let i = period; i < data.length; i++) {
      const roc = ((closes[i] - closes[i - period]) / (closes[i - period] || 1)) * 100;
      const strongUp = roc >= minPct;
      const strongDown = roc <= -minPct;
      if (inLong !== null) {
        if (strongDown) {
          trades.push({ entryIndex: inLong, exitIndex: i, entryPrice: data[inLong].close, exitPrice: data[i].close, direction: "long" });
          data[inLong].buySignal = data[inLong].close;
          data[i].sellSignal = data[i].close;
          for (let j = inLong; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inLong = null;
        }
      } else if (inShort !== null) {
        if (strongUp) {
          trades.push({ entryIndex: inShort, exitIndex: i, entryPrice: data[inShort].close, exitPrice: data[i].close, direction: "short" });
          data[inShort].sellSignal = data[inShort].close;
          data[i].buySignal = data[i].close;
          for (let j = inShort; j <= i; j++) data[j].tradeId = tradeId;
          tradeId++;
          inShort = null;
        }
      } else {
        if (strongUp && allowLong) inLong = i;
        else if (strongDown && allowShort) inShort = i;
      }
    }
    return { data, trades };
  }

  // Custom / fallback: no signals
  return { data, trades };
}

/** Generate OHLC-only candles (no signals). Used when no exchange data; backtest runner then applies selected strategy. */
function generateSyntheticCandles(count: number): KlineCandle[] {
  const candles: KlineCandle[] = [];
  let currentPrice = 45000;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 500;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;
    const timestamp = new Date(Date.now() - (count - i) * 86400000).getTime();
    candles.push({ time: timestamp, open, high, low, close });
    currentPrice = close;
  }
  return candles;
}

const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  strategy: "rsi-oversold",
  direction: "both",
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  maFastType: "ema",
  maFastPeriod: 9,
  maSlowType: "ema",
  maSlowPeriod: 21,
  breakoutLookback: 20,
  breakoutThresholdPct: 0.5,
  meanReversionLookback: 20,
  meanReversionZScore: 2,
  momentumRocPeriod: 10,
  momentumMinPct: 1,
  volumeFilterEnabled: false,
  volumeMaPeriod: 20,
  atrPeriod: 14,
};

/** Build full BacktestConfig from form state (string inputs). */
function buildBacktestConfig(state: {
  strategy: string;
  direction: string;
  rsiPeriod: string;
  rsiOversold: string;
  rsiOverbought: string;
  maFastType: "sma" | "ema";
  maFastPeriod: string;
  maSlowType: "sma" | "ema";
  maSlowPeriod: string;
  breakoutLookback: string;
  breakoutThresholdPct: string;
  meanReversionLookback: string;
  meanReversionZScore: string;
  momentumRocPeriod: string;
  momentumMinPct: string;
  volumeFilterEnabled: boolean;
  volumeMaPeriod: string;
  atrPeriod: string;
}): BacktestConfig {
  const dir = state.direction === "long" || state.direction === "short" ? state.direction : "both";
  return {
    strategy: state.strategy,
    direction: dir,
    rsiPeriod: parseInt(state.rsiPeriod, 10) || 14,
    rsiOversold: parseInt(state.rsiOversold, 10) || 30,
    rsiOverbought: parseInt(state.rsiOverbought, 10) || 70,
    maFastType: state.maFastType,
    maFastPeriod: parseInt(state.maFastPeriod, 10) || 9,
    maSlowType: state.maSlowType,
    maSlowPeriod: parseInt(state.maSlowPeriod, 10) || 21,
    breakoutLookback: parseInt(state.breakoutLookback, 10) || 20,
    breakoutThresholdPct: parseFloat(state.breakoutThresholdPct) || 0.5,
    meanReversionLookback: parseInt(state.meanReversionLookback, 10) || 20,
    meanReversionZScore: parseFloat(state.meanReversionZScore) || 2,
    momentumRocPeriod: parseInt(state.momentumRocPeriod, 10) || 10,
    momentumMinPct: parseFloat(state.momentumMinPct) || 1,
    volumeFilterEnabled: state.volumeFilterEnabled,
    volumeMaPeriod: parseInt(state.volumeMaPeriod, 10) || 20,
    atrPeriod: parseInt(state.atrPeriod, 10) || 14,
  };
}

/** Build a small grid of BacktestConfig for the current strategy (for parameter optimization). */
function buildOptimizationGrid(base: BacktestConfig): BacktestConfig[] {
  const grids: BacktestConfig[] = [];
  const s = base.strategy;

  if (s === "rsi-oversold") {
    const periods = [10, 14, 21];
    const oversolds = [25, 30, 35];
    const overboughts = [65, 70, 75];
    for (const p of periods) {
      for (const ov of oversolds) {
        for (const ob of overboughts) {
          if (ov >= ob) continue;
          grids.push({ ...base, rsiPeriod: p, rsiOversold: ov, rsiOverbought: ob });
        }
      }
    }
    return grids.length > 0 ? grids : [base];
  }

  if (s === "ma-crossover") {
    const fastPeriods = [7, 9, 12];
    const slowPeriods = [21, 26, 34];
    for (const f of fastPeriods) {
      for (const sl of slowPeriods) {
        if (sl <= f) continue;
        grids.push({ ...base, maFastPeriod: f, maSlowPeriod: sl });
      }
    }
    return grids.length > 0 ? grids : [base];
  }

  if (s === "breakout") {
    const lookbacks = [14, 20, 26];
    const thresholds = [0.3, 0.5, 0.7];
    for (const lb of lookbacks) {
      for (const t of thresholds) {
        grids.push({ ...base, breakoutLookback: lb, breakoutThresholdPct: t });
      }
    }
    return grids;
  }

  if (s === "mean-reversion") {
    const lookbacks = [14, 20, 26];
    const zScores = [1.5, 2, 2.5];
    for (const lb of lookbacks) {
      for (const z of zScores) {
        grids.push({ ...base, meanReversionLookback: lb, meanReversionZScore: z });
      }
    }
    return grids;
  }

  if (s === "momentum") {
    const rocPeriods = [7, 10, 14];
    const minPcts = [0.5, 1, 1.5];
    for (const roc of rocPeriods) {
      for (const mp of minPcts) {
        grids.push({ ...base, momentumRocPeriod: roc, momentumMinPct: mp });
      }
    }
    return grids;
  }

  return [base];
}

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

// --- Risk Tier & Marketplace data model (UI only, no backend change) ---
// Scoring: 0–40 = LOW, 41–70 = MEDIUM, 71+ = HIGH. Lower score = lower risk.
// Factors: max drawdown (higher DD → higher score), trade count (more trades → lower score),
// ROI volatility proxy (higher abs ROI → higher score), avg trade duration (shorter → slightly higher).
function computeMaxDrawdownPercent(
  candles: Array<{ timestamp: number; close: number }>,
  trades: Array<{ entryIndex: number; exitIndex: number; entryPrice: number; exitPrice: number; direction: string }>,
  initialBalance: number
): number {
  if (!candles.length || !trades.length) return 0;
  let equity = initialBalance;
  let peak = initialBalance;
  let maxDd = 0;
  const sortedTrades = [...trades].sort((a, b) => a.exitIndex - b.exitIndex);
  for (const t of sortedTrades) {
    const pnl = t.direction === "long" ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice;
    equity += pnl;
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export type RiskTier = "LOW" | "MEDIUM" | "HIGH";

function getRiskTierFromMetrics(metrics: {
  maxDrawdownPercent: number;
  totalTrades: number;
  roi: number;
  avgTradeDurationMinutes: number | null;
}): RiskTier {
  const dd = metrics.maxDrawdownPercent;
  const trades = metrics.totalTrades;
  const roi = metrics.roi;
  const dur = metrics.avgTradeDurationMinutes ?? 60;
  let score = 0;
  if (dd <= 5) score += 10;
  else if (dd <= 10) score += 25;
  else if (dd <= 20) score += 45;
  else score += 70;
  if (trades <= 5) score += 25;
  else if (trades <= 20) score += 10;
  else score += 0;
  if (Math.abs(roi) >= 20) score += 20;
  else if (Math.abs(roi) >= 10) score += 10;
  if (dur < 30) score += 15;
  else if (dur < 120) score += 5;
  if (score <= 40) return "LOW";
  if (score <= 70) return "MEDIUM";
  return "HIGH";
}

const STRATEGY_TYPE_OPTIONS = ["Trend", "Mean Reversion", "Breakout", "Risk Managed", "Multi-Timeframe"] as const;
export type StrategyTypeLabel = (typeof STRATEGY_TYPE_OPTIONS)[number];

const CURATED_BACKTEST_PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"] as const;

const strategyOptions: Array<{
  id: string;
  name: string;
  description: string;
  strategy_type: StrategyTypeLabel;
}> = [
  { id: "rsi-oversold", name: "RSI Oversold/Overbought", description: "Buy when RSI < 30, Sell when RSI > 70", strategy_type: "Mean Reversion" },
  { id: "ma-crossover", name: "MA Crossover", description: "Golden/Death cross strategy", strategy_type: "Trend" },
  { id: "breakout", name: "Breakout Strategy", description: "Trade channel breakouts", strategy_type: "Breakout" },
  { id: "mean-reversion", name: "Mean Reversion", description: "Fade extreme moves", strategy_type: "Mean Reversion" },
  { id: "momentum", name: "Momentum Following", description: "Follow strong trends", strategy_type: "Trend" },
  { id: "custom", name: "Custom Strategy", description: "Upload your own logic", strategy_type: "Trend" },
];

interface StrategyBacktestProps {
  onNavigate: (view: string) => void;
}

export function StrategyBacktest({ onNavigate }: StrategyBacktestProps) {
  const { user } = useAuth();
  const { addDemoFromBacktest, isDemoMode } = useDemo();
  const [launchMode, setLaunchMode] = useState<"demo" | "live">("demo");
  // When platform is live (not in demo mode), do not show Demo/Live choice — only live launch
  const effectiveLaunchMode = isDemoMode ? launchMode : "live";
  const [entitlement, setEntitlement] = useState<{
    joiningFeePaid: boolean;
    status: string;
    activePackageId: string | null;
    remainingUsd: number;
  } | null>(null);
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [tradeBreakdownExpanded, setTradeBreakdownExpanded] = useState(true);

  // Available pairs (from Binance, same as Terminal) — loaded on mount
  const [availablePairs, setAvailablePairs] = useState<Array<{ symbol: string }>>([
    { symbol: "BTC/USDT" },
    { symbol: "ETH/USDT" },
    { symbol: "SOL/USDT" },
    { symbol: "BNB/USDT" },
  ]);
  const [pairsLoaded, setPairsLoaded] = useState(false);

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

  // Strategy-specific parameters (expert config)
  const [rsiPeriod, setRsiPeriod] = useState("14");
  const [rsiOversold, setRsiOversold] = useState("30");
  const [rsiOverbought, setRsiOverbought] = useState("70");
  const [maFastType, setMaFastType] = useState<"sma" | "ema">("ema");
  const [maFastPeriod, setMaFastPeriod] = useState("9");
  const [maSlowType, setMaSlowType] = useState<"sma" | "ema">("ema");
  const [maSlowPeriod, setMaSlowPeriod] = useState("21");
  const [breakoutLookback, setBreakoutLookback] = useState("20");
  const [breakoutThresholdPct, setBreakoutThresholdPct] = useState("0.5");
  const [meanReversionLookback, setMeanReversionLookback] = useState("20");
  const [meanReversionZScore, setMeanReversionZScore] = useState("2");
  const [momentumRocPeriod, setMomentumRocPeriod] = useState("10");
  const [momentumMinPct, setMomentumMinPct] = useState("1");
  const [volumeFilterEnabled, setVolumeFilterEnabled] = useState(false);
  const [volumeMaPeriod, setVolumeMaPeriod] = useState("20");
  const [atrPeriod, setAtrPeriod] = useState("14");
  const [strategyParamsOpen, setStrategyParamsOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const [backtestResult, setBacktestResult] = useState(() =>
    runBacktestFromRealCandles(generateSyntheticCandles(50), DEFAULT_BACKTEST_CONFIG)
  );
  const [backtestDataSource, setBacktestDataSource] = useState<"live" | "synthetic">("synthetic");
  const [backtestExchangeLabel, setBacktestExchangeLabel] = useState<string | null>(null);
  const [klinesError, setKlinesError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const lastCandlesRef = React.useRef<KlineCandle[] | null>(null);

  // Top-bar filters (UI only; strategy/backtest logic unchanged)
  const [strategyTypeFilter, setStrategyTypeFilter] = useState<StrategyTypeLabel | "all">("all");
  const [riskTierFilter, setRiskTierFilter] = useState<RiskTier | "all">("all");
  const [backtestMode, setBacktestMode] = useState<"single" | "multi">("single");

  const backtestCandles = backtestResult.data;
  const generatedTrades = backtestResult.trades;

  const tradeStats = React.useMemo(() => calculateTradeStatsFromTrades(generatedTrades), [generatedTrades]);

  const avgTradeDurationMinutes = React.useMemo(() => {
    if (!generatedTrades.length || !backtestCandles.length) return null;
    let totalMin = 0;
    generatedTrades.forEach((t) => {
      const entryTs = backtestCandles[t.entryIndex]?.timestamp ?? 0;
      const exitTs = backtestCandles[t.exitIndex]?.timestamp ?? 0;
      totalMin += (exitTs - entryTs) / (60 * 1000);
    });
    return totalMin / generatedTrades.length;
  }, [generatedTrades, backtestCandles]);

  const maxDrawdownPercent = React.useMemo(
    () => computeMaxDrawdownPercent(backtestCandles, generatedTrades, 10000),
    [backtestCandles, generatedTrades]
  );

  const riskTier = React.useMemo(
    () =>
      getRiskTierFromMetrics({
        maxDrawdownPercent,
        totalTrades: tradeStats.totalTrades,
        roi: tradeStats.totalPnlPercent,
        avgTradeDurationMinutes,
      }),
    [maxDrawdownPercent, tradeStats.totalTrades, tradeStats.totalPnlPercent, avgTradeDurationMinutes]
  );

  const kpis = {
    totalTrades: tradeStats.totalTrades,
    winRate: tradeStats.winRate,
    netPnl: tradeStats.totalPnl,
    roi: tradeStats.totalPnlPercent,
    avgPnl: tradeStats.avgPnl,
    maxDrawdown: maxDrawdownPercent,
    maxDrawdownPercent,
    sharpeRatio: 1.87,
    profitFactor: 2.34,
    avgTradeDurationMinutes,
    riskTier,
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

  const longShortCounts = React.useMemo(() => {
    const long = backtestTrades.filter((t) => t.direction === "Long").length;
    const short = backtestTrades.filter((t) => t.direction === "Short").length;
    return { long, short };
  }, [backtestTrades]);

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

    const backtestConfig = buildBacktestConfig({
      strategy,
      direction,
      rsiPeriod,
      rsiOversold,
      rsiOverbought,
      maFastType,
      maFastPeriod,
      maSlowType,
      maSlowPeriod,
      breakoutLookback,
      breakoutThresholdPct,
      meanReversionLookback,
      meanReversionZScore,
      momentumRocPeriod,
      momentumMinPct,
      volumeFilterEnabled,
      volumeMaPeriod,
      atrPeriod,
    });

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
          lastCandlesRef.current = rawCandles;
          const result = runBacktestFromRealCandles(rawCandles, backtestConfig);
          setBacktestResult(result);
          setBacktestDataSource("live");
          setBacktestExchangeLabel(`${dataConnection.exchange}${env === "testnet" ? " (testnet)" : ""}`);
          setHasResults(true);
          toast.success("Backtest completed with live data from " + dataConnection.exchange);
        } else {
          const synthetic = generateSyntheticCandles(200);
          lastCandlesRef.current = synthetic;
          const result = runBacktestFromRealCandles(synthetic, backtestConfig);
          setBacktestResult(result);
          setHasResults(true);
          toast.success("Backtest completed (no candles returned, using synthetic data with your strategy).");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load klines";
        setKlinesError(msg);
        const synthetic = generateSyntheticCandles(200);
        lastCandlesRef.current = synthetic;
        const result = runBacktestFromRealCandles(synthetic, backtestConfig);
        setBacktestResult(result);
        setHasResults(true);
        toast.warning("Using synthetic data with your strategy — " + msg);
      }
    } else {
      const synthetic = generateSyntheticCandles(200);
      lastCandlesRef.current = synthetic;
      const result = runBacktestFromRealCandles(synthetic, backtestConfig);
      setBacktestResult(result);
      setHasResults(true);
      toast.success("Backtest completed (synthetic data with your strategy). Connect an exchange for live prices.");
    }

    setIsBacktesting(false);
  };

  const handleOptimize = async () => {
    if (strategy === "custom") {
      toast.info("Optimization not available for custom strategies.");
      return;
    }
    setIsOptimizing(true);
    toast.info("Optimizing parameters...");

    let candles: KlineCandle[] | null = lastCandlesRef.current;
    if (!candles || candles.length === 0) {
      const dataConnection = connections.length > 0 ? connections[0] : null;
      const exchange = dataConnection?.exchange === "bybit" ? "bybit" : "binance";
      const env = (dataConnection?.environment === "testnet" ? "testnet" : "production") as "production" | "testnet";
      const symbolClean = symbol.replace("/", "").toUpperCase();
      if (dataConnection) {
        try {
          const { candles: raw } = await candlesApi.getKlines({
            exchange,
            symbol: symbolClean,
            interval: timeframe,
            limit: 500,
            env,
          });
          candles = raw.length > 0 ? raw : generateSyntheticCandles(200);
        } catch {
          candles = generateSyntheticCandles(200);
        }
      } else {
        candles = generateSyntheticCandles(200);
      }
      lastCandlesRef.current = candles;
    }

    const baseConfig = buildBacktestConfig({
      strategy,
      direction,
      rsiPeriod,
      rsiOversold,
      rsiOverbought,
      maFastType,
      maFastPeriod,
      maSlowType,
      maSlowPeriod,
      breakoutLookback,
      breakoutThresholdPct,
      meanReversionLookback,
      meanReversionZScore,
      momentumRocPeriod,
      momentumMinPct,
      volumeFilterEnabled,
      volumeMaPeriod,
      atrPeriod,
    });
    const grid = buildOptimizationGrid(baseConfig);
    let bestPnL = -Infinity;
    let bestResult: { data: ChartPoint[]; trades: Trade[] } | null = null;
    let bestConfig: BacktestConfig = baseConfig;

    for (const cfg of grid) {
      const result = runBacktestFromRealCandles(candles!, cfg);
      const pnl = result.trades.reduce((sum, t) => {
        const p = t.direction === "long" ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice;
        return sum + p;
      }, 0);
      if (pnl > bestPnL) {
        bestPnL = pnl;
        bestResult = result;
        bestConfig = cfg;
      }
    }

    if (bestResult) {
      setBacktestResult(bestResult);
      setHasResults(true);
      setRsiPeriod(String(bestConfig.rsiPeriod));
      setRsiOversold(String(bestConfig.rsiOversold));
      setRsiOverbought(String(bestConfig.rsiOverbought));
      setMaFastPeriod(String(bestConfig.maFastPeriod));
      setMaSlowPeriod(String(bestConfig.maSlowPeriod));
      setBreakoutLookback(String(bestConfig.breakoutLookback));
      setBreakoutThresholdPct(String(bestConfig.breakoutThresholdPct));
      setMeanReversionLookback(String(bestConfig.meanReversionLookback));
      setMeanReversionZScore(String(bestConfig.meanReversionZScore));
      setMomentumRocPeriod(String(bestConfig.momentumRocPeriod));
      setMomentumMinPct(String(bestConfig.momentumMinPct));
      const wins = bestResult.trades.filter((t) => (t.direction === "long" ? t.exitPrice > t.entryPrice : t.entryPrice > t.exitPrice)).length;
      const winRate = bestResult.trades.length > 0 ? ((wins / bestResult.trades.length) * 100).toFixed(1) : "0";
      toast.success(`Optimization complete. Best of ${grid.length} runs: ${bestResult.trades.length} trades, ${winRate}% win rate, PnL $${bestPnL.toFixed(2)}. Parameters updated.`);
    }

    setIsOptimizing(false);
  };

  const handleLaunchStrategy = () => {
    if (!riskAccepted) {
      toast.error("Please accept the risk disclaimer");
      return;
    }
    setLaunchDialogOpen(false);
    if (effectiveLaunchMode === "demo") {
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

  // Load available USDT pairs for symbol selector (same source as Terminal)
  useEffect(() => {
    fetchUsdtPairs(150)
      .then((list) => {
        setAvailablePairs(list.map((p) => ({ symbol: p.symbol })));
        setPairsLoaded(true);
      })
      .catch(() => setPairsLoaded(true));
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

  // Filter strategy templates by Strategy Type (top bar filter)
  const filteredStrategyOptions = React.useMemo(
    () =>
      strategyTypeFilter === "all"
        ? strategyOptions
        : strategyOptions.filter((s) => s.strategy_type === strategyTypeFilter),
    [strategyTypeFilter]
  );

  // When Strategy Type filter changes, if current strategy is not in the filtered list, select first available
  React.useEffect(() => {
    if (strategyTypeFilter === "all") return;
    const filtered = strategyOptions.filter((s) => s.strategy_type === strategyTypeFilter);
    if (filtered.length === 0) return;
    const currentInList = filtered.some((s) => s.id === strategy);
    if (!currentInList) setStrategy(filtered[0].id);
  }, [strategyTypeFilter]);

  const handleShare = React.useCallback(async () => {
    const name = selectedStrategy?.name ?? "Strategy";
    const pair = symbol.replace("/", "");
    const period = `${new Date(dateFrom).toLocaleDateString("en-US")} – ${new Date(dateTo).toLocaleDateString("en-US")}`;
    const summary = hasResults
      ? `Klineo Backtest: ${name}\nPair: ${pair} | TF: ${timeframe}\nPeriod: ${period}\nTrades: ${kpis.totalTrades} | Win rate: ${kpis.winRate.toFixed(1)}%\nPnL: ${kpis.netPnl >= 0 ? "+" : ""}$${kpis.netPnl.toFixed(2)} (${kpis.roi >= 0 ? "+" : ""}${kpis.roi.toFixed(2)}%)\nMax DD: ${kpis.maxDrawdownPercent.toFixed(1)}% | Risk: ${kpis.riskTier}`
      : `Klineo Backtest: ${name}\nPair: ${pair} | TF: ${timeframe}\nPeriod: ${period}\nRun a backtest to see results.`;
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Backtest summary copied to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [hasResults, selectedStrategy?.name, symbol, timeframe, dateFrom, dateTo, kpis]);


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

            {/* Symbol — all pairs from connected exchange (backtest pairs do not affect live copy) */}
            <div className="space-y-2">
              <Label>Trading Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  {availablePairs.map((p) => (
                    <SelectItem key={p.symbol} value={p.symbol}>
                      {p.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Backtest pairs do not affect live copy settings.
              </p>
            </div>

            {/* Strategy Selector — filtered by Strategy Type (top bar) when set */}
            <div className="space-y-2">
              <Label>Strategy Template</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredStrategyOptions.map((strat) => (
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

            {/* Strategy-specific parameters (expert) */}
            <Collapsible open={strategyParamsOpen} onOpenChange={setStrategyParamsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between px-0 h-8 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Strategy parameters
                  {strategyParamsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {strategy === "rsi-oversold" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">RSI period</Label>
                      <Input type="number" min={5} max={50} value={rsiPeriod} onChange={(e) => setRsiPeriod(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Oversold level</Label>
                      <Input type="number" min={10} max={50} value={rsiOversold} onChange={(e) => setRsiOversold(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Overbought level</Label>
                      <Input type="number" min={50} max={90} value={rsiOverbought} onChange={(e) => setRsiOverbought(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </>
                )}
                {strategy === "ma-crossover" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Fast MA type</Label>
                      <Select value={maFastType} onValueChange={(v: "sma" | "ema") => setMaFastType(v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sma">SMA</SelectItem>
                          <SelectItem value="ema">EMA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fast MA period</Label>
                      <Input type="number" min={1} max={99} value={maFastPeriod} onChange={(e) => setMaFastPeriod(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Slow MA type</Label>
                      <Select value={maSlowType} onValueChange={(v: "sma" | "ema") => setMaSlowType(v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sma">SMA</SelectItem>
                          <SelectItem value="ema">EMA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Slow MA period</Label>
                      <Input type="number" min={2} max={200} value={maSlowPeriod} onChange={(e) => setMaSlowPeriod(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </>
                )}
                {strategy === "breakout" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Lookback period</Label>
                      <Input type="number" min={5} max={100} value={breakoutLookback} onChange={(e) => setBreakoutLookback(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Breakout threshold (%)</Label>
                      <Input type="number" step="0.1" min={0} value={breakoutThresholdPct} onChange={(e) => setBreakoutThresholdPct(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </>
                )}
                {strategy === "mean-reversion" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Lookback period</Label>
                      <Input type="number" min={5} max={100} value={meanReversionLookback} onChange={(e) => setMeanReversionLookback(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Z-score threshold</Label>
                      <Input type="number" step="0.1" value={meanReversionZScore} onChange={(e) => setMeanReversionZScore(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </>
                )}
                {strategy === "momentum" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">ROC period</Label>
                      <Input type="number" min={1} max={50} value={momentumRocPeriod} onChange={(e) => setMomentumRocPeriod(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Min momentum (%)</Label>
                      <Input type="number" step="0.1" value={momentumMinPct} onChange={(e) => setMomentumMinPct(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </>
                )}
                {strategy === "custom" && (
                  <p className="text-xs text-muted-foreground">Custom strategy logic (upload or API) coming soon.</p>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Indicators & filters (expert) */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between px-0 h-8 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Indicators & filters
                  {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Volume filter (MA)</Label>
                  <Checkbox checked={volumeFilterEnabled} onCheckedChange={(c) => setVolumeFilterEnabled(!!c)} />
                </div>
                {volumeFilterEnabled && (
                  <div className="space-y-1">
                    <Label className="text-xs">Volume MA period</Label>
                    <Input type="number" min={5} max={50} value={volumeMaPeriod} onChange={(e) => setVolumeMaPeriod(e.target.value)} className="h-8 text-xs" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">ATR period (volatility)</Label>
                  <Input type="number" min={5} max={50} value={atrPeriod} onChange={(e) => setAtrPeriod(e.target.value)} className="h-8 text-xs" />
                </div>
              </CollapsibleContent>
            </Collapsible>

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
            {connections.length > 0 && (
              <p className="text-[11px] text-green-600 dark:text-green-400 text-center mt-1.5">
                Uses live charts from {connections[0]?.exchange || "exchange"}
              </p>
            )}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleOptimize} disabled={isOptimizing}>
                      {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      {isOptimizing ? "Optimizing…" : "Optimize"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    Optimization changes parameters, not market conditions.
                  </TooltipContent>
                </Tooltip>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            )}
          </div>

          {/* Top-of-page controls: Strategy Type, Risk Tier, Timeframe, Pairs, Backtest Mode */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-3 px-3 rounded-lg bg-muted/30 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground mr-1 sm:mr-0">Filters</span>
            <Select value={strategyTypeFilter} onValueChange={(v: StrategyTypeLabel | "all") => setStrategyTypeFilter(v)}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder="Strategy Type">{strategyTypeFilter === "all" ? "All types" : strategyTypeFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {STRATEGY_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">Risk</span>
            <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5">
              {(["LOW", "MEDIUM", "HIGH"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setRiskTierFilter(riskTierFilter === tier ? "all" : tier)}
                  className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                    riskTierFilter === tier
                      ? tier === "LOW"
                        ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : tier === "MEDIUM"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-red-500/20 text-red-600 dark:text-red-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[72px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1d</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={availablePairs.some((p) => p.symbol === symbol) ? symbol : availablePairs[0]?.symbol ?? "BTC/USDT"}
              onValueChange={setSymbol}
            >
              <SelectTrigger className="w-[100px] h-9 text-xs min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePairs.map((p) => (
                  <SelectItem key={p.symbol} value={p.symbol}>
                    {p.symbol.replace("/USDT", "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground hidden sm:inline">
              More pairs = more variance in results
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Mode:</span>
              <button
                type="button"
                onClick={() => setBacktestMode(backtestMode === "single" ? "multi" : "single")}
                className={`text-[10px] font-medium px-2 py-1 rounded border ${
                  backtestMode === "single"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Single Pair
              </button>
              <button
                type="button"
                onClick={() => setBacktestMode(backtestMode === "multi" ? "single" : "multi")}
                className={`text-[10px] font-medium px-2 py-1 rounded border ${
                  backtestMode === "multi"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Multi Pair
              </button>
            </div>
            {backtestMode === "multi" && (
              <p className="text-[10px] text-muted-foreground w-full sm:w-auto">
                Multi Pair: aggregated results (weighted by pair). Single backtest runs on selected pair.
              </p>
            )}
          </div>

          {/* Summary Statistics Header — only after a backtest run; KPIs update when user re-runs */}
          {hasResults && (
            <div className="space-y-5">
              {/* Strategy Summary Row — institutional style */}
              <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <span className="font-semibold text-foreground">{selectedStrategy?.name || "Strategy"}</span>
                  <span className="text-muted-foreground">
                    {selectedStrategy?.strategy_type ?? "—"}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      kpis.riskTier === "LOW"
                        ? "bg-green-500/10 text-green-600 border-green-500/30"
                        : kpis.riskTier === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          : "bg-red-500/10 text-red-600 border-red-500/30"
                    }
                  >
                    {kpis.riskTier} risk
                  </Badge>
                  <span className="text-muted-foreground">Pairs: {symbol}</span>
                  <span className="text-muted-foreground">TF: {timeframe}</span>
                  <span className="text-muted-foreground">Data: Binance (public)</span>
                  <span className="text-muted-foreground">
                    Period: {new Date(dateFrom).toLocaleDateString("en-US", { month: "short", year: "numeric" })} – {new Date(dateTo).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge className="bg-[#FFB000] text-black font-semibold px-2.5 py-1 shrink-0">
                    {kpis.totalTrades} trades
                  </Badge>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Backtest results</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {selectedStrategy?.name || 'Strategy'} · {symbol.replace('/', '')} · {timeframe} · {new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – {new Date(dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {/* Long / Short opens & exits summary — visible when strategy supports both */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {longShortCounts.long} Long
                      </span>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {longShortCounts.short} Short
                      </span>
                      <span className="text-[10px] text-muted-foreground">(opens & exits on chart)</span>
                    </div>
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
                <Button variant="outline" size="sm" className="shrink-0 w-full sm:w-auto" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              {/* KPI Cards — responsive numbers to fit boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                <div className="rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 sm:px-4 sm:py-3 min-w-0 overflow-hidden">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5 truncate">Total trades</div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold tabular-nums truncate" title={String(kpis.totalTrades)}>{kpis.totalTrades}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 sm:px-4 sm:py-3 min-w-0 overflow-hidden">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5 truncate">Win rate</div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-green-500 tabular-nums truncate" title={`${kpis.winRate.toFixed(1)}%`}>{kpis.winRate.toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 sm:px-4 sm:py-3 min-w-0 overflow-hidden">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5 truncate">PnL (USDT)</div>
                  <div className={`text-base sm:text-lg lg:text-xl font-bold tabular-nums truncate ${kpis.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`} title={`${kpis.netPnl >= 0 ? '+' : ''}$${kpis.netPnl.toFixed(2)}`}>
                    {kpis.netPnl >= 0 ? '+' : ''}${kpis.netPnl.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 sm:px-4 sm:py-3 min-w-0 overflow-hidden">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5 truncate">PnL (%)</div>
                  <div className={`text-base sm:text-lg lg:text-xl font-bold tabular-nums truncate ${kpis.roi >= 0 ? 'text-green-500' : 'text-red-500'}`} title={`${kpis.roi >= 0 ? '+' : ''}${kpis.roi.toFixed(2)}%`}>
                    {kpis.roi >= 0 ? '+' : ''}{kpis.roi.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 sm:px-4 sm:py-3 min-w-0 overflow-hidden">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5 truncate">Avg / trade</div>
                  <div className={`text-base sm:text-lg lg:text-xl font-bold tabular-nums truncate ${kpis.avgPnl >= 0 ? 'text-green-500' : 'text-red-500'}`} title={`${kpis.avgPnl >= 0 ? '+' : ''}$${kpis.avgPnl.toFixed(2)}`}>
                    {kpis.avgPnl >= 0 ? '+' : ''}${kpis.avgPnl.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Optimize Button */}
              <div className="flex justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button className="bg-[#FFB000] hover:bg-[#FFB000]/90 text-black font-semibold w-full sm:w-auto min-h-[44px] sm:min-h-0" onClick={handleOptimize} disabled={isOptimizing}>
                      {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {isOptimizing ? "Optimizing…" : "Optimize"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    Optimization changes parameters, not market conditions.
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Price Chart — Live market data when connected, else demo */}
              <Card id="backtest-chart" className="p-4 sm:p-6 bg-card/50 overflow-hidden flex flex-col gap-4">
                {/* Live / Demo data strip — like pro trading platforms */}
                <div className={`flex flex-wrap items-center gap-2 py-2 px-3 rounded-lg text-sm ${backtestDataSource === "live" ? "bg-green-500/10 border border-green-500/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
                  {backtestDataSource === "live" && backtestExchangeLabel ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-green-600 dark:text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Live market data
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-foreground">{symbol.replace("/", "")}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-foreground">{timeframe}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{backtestExchangeLabel}</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Demo data
                      </span>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        Connect an exchange in Settings to run backtest on live charts
                      </span>
                    </>
                  )}
                </div>
                <BacktestLightweightChart
                  data={backtestCandles}
                  trades={generatedTrades}
                  height={384}
                  className="min-h-[320px]"
                />
                <p className="text-[10px] text-muted-foreground/80 text-right">
                  Charts by{" "}
                  <a
                    href="https://www.tradingview.com/lightweight-charts/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-muted-foreground"
                  >
                    TradingView Lightweight Charts™
                  </a>
                </p>
              </Card>

              {/* Marketplace Strategy Card — how this strategy appears in Klineo Marketplace */}
              <Card className="p-4 sm:p-5 bg-card/50 border-border/60">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Preview in Marketplace</h3>
                <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-4">
                  {/* Top: Name, Risk badge, Type */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{selectedStrategy?.name || "Strategy"}</span>
                    <Badge
                      variant="outline"
                      className={
                        kpis.riskTier === "LOW"
                          ? "bg-green-500/10 text-green-600 border-green-500/30 text-[10px]"
                          : kpis.riskTier === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                            : "bg-red-500/10 text-red-600 border-red-500/30 text-[10px]"
                      }
                    >
                      {kpis.riskTier} risk
                    </Badge>
                    <span className="text-xs text-muted-foreground">{selectedStrategy?.strategy_type ?? "Trend"}</span>
                    <Badge variant="secondary" className="text-[10px]">Backtested</Badge>
                    {kpis.riskTier === "LOW" && (
                      <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-600">Beginner friendly</Badge>
                    )}
                  </div>
                  {/* Middle: Key metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Win rate</div>
                      <div className="font-semibold tabular-nums">{kpis.winRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Max drawdown</div>
                      <div className="font-semibold tabular-nums text-red-500">{kpis.maxDrawdownPercent.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total trades</div>
                      <div className="font-semibold tabular-nums">{kpis.totalTrades}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">PnL %</div>
                      <div className={`font-semibold tabular-nums ${kpis.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {kpis.roi >= 0 ? "+" : ""}{kpis.roi.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg duration</div>
                      <div className="font-semibold tabular-nums">
                        {kpis.avgTradeDurationMinutes != null ? `${Math.round(kpis.avgTradeDurationMinutes)}m` : "—"}
                      </div>
                    </div>
                  </div>
                  {/* Bottom: CTAs + disclaimer */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => document.getElementById("backtest-chart")?.scrollIntoView({ behavior: "smooth" })}
                    >
                      View backtest
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-[#FFB000] hover:bg-[#FFB000]/90 text-black"
                      onClick={async () => {
                        const text = `${selectedStrategy?.name ?? "Strategy"} (${selectedStrategy?.strategy_type ?? "Trend"})`;
                        try {
                          await navigator.clipboard.writeText(text);
                          toast.success("Strategy name copied. Use Strategy Config to run it.");
                        } catch {
                          toast.error("Could not copy.");
                        }
                      }}
                    >
                      Copy strategy
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] text-muted-foreground cursor-help border-b border-dotted border-muted-foreground">
                          Past performance does not guarantee future results.
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        Backtest results are based on historical data. Live results may differ.
                      </TooltipContent>
                    </Tooltip>
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
              <p className="text-sm text-muted-foreground mb-2 max-w-md px-2">
                Configure your strategy in the left panel and click "Run Backtest" to see results on the chart.
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-md px-2">
                {connections.length > 0
                  ? "Your backtest will use live market data from your connected exchange (same as live charts)."
                  : "Connect an exchange in Settings to backtest on live market data instead of demo data."}
              </p>
              <Button onClick={handleRunBacktest} className="w-full sm:w-auto min-h-[44px]">
                <Play className="h-4 w-4 mr-2" />
                Run Backtest {connections.length > 0 ? "on live data" : ""}
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

        {/* BOTTOM PANEL - Trade Breakdown (Long & Short opens & exits) */}
        {hasResults && !isBacktesting && (
          <div className={`border-t border-border transition-all duration-300 shrink-0 ${tradeBreakdownExpanded ? 'h-64 sm:h-80 lg:h-96' : 'h-auto'}`}>
            {/* Collapsible Header */}
            <div 
              className="flex items-center justify-between px-4 sm:px-6 py-3 bg-card/30 border-b border-border cursor-pointer hover:bg-card/50 transition-colors min-h-[52px]"
              onClick={() => setTradeBreakdownExpanded(!tradeBreakdownExpanded)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <ListOrdered className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold truncate">Trade breakdown</h3>
                  <p className="text-[11px] text-muted-foreground">Long & Short · opens & exits</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 font-mono text-xs">
                    {longShortCounts.long} Long
                  </Badge>
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-mono text-xs">
                    {longShortCounts.short} Short
                  </Badge>
                </div>
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
                      <TableRow className="border-border/80">
                        <TableHead className="w-12 text-muted-foreground font-medium">#</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Open</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Close</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Side</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Entry</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Exit</TableHead>
                        <TableHead className="text-muted-foreground font-medium">PnL</TableHead>
                        <TableHead className="text-muted-foreground font-medium">%</TableHead>
                        <TableHead className="w-12" />
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

          {/* Mode Selector — only when platform is in demo mode; when live, no Demo option */}
          {isDemoMode && (
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
          )}

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
              <strong className={effectiveLaunchMode === "live" ? "text-destructive" : "text-primary"}>
                {effectiveLaunchMode.toUpperCase()} MODE
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

            {effectiveLaunchMode === "live" && (
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
              className={effectiveLaunchMode === "live" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {effectiveLaunchMode === "live" ? "Launch Live Strategy" : "Launch Demo Strategy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}