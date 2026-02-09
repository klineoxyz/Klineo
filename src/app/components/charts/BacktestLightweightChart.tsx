/**
 * Strategy Backtest chart using TradingView Lightweight Charts™.
 * Candlestick + buy/sell markers + TA overlays (SMA 20, Bollinger Bands, RSI).
 * TA toolbar (toggle indicators) + replay/playback bar (fast-forward through time).
 *
 * Implementation follows the official library:
 * https://www.tradingview.com/lightweight-charts/
 * https://tradingview.github.io/lightweight-charts/docs
 */

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Button } from "@/app/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

const THEME = {
  layout: {
    background: { type: "solid" as const, color: "#0a0e13" },
    textColor: "#9ca3af",
  },
  grid: {
    vertLines: { color: "#1f2937" },
    horzLines: { color: "#1f2937" },
  },
  rightPriceScale: {
    borderColor: "#374151",
    scaleMargins: { top: 0.1, bottom: 0.25 },
  },
  timeScale: {
    borderColor: "#374151",
    visible: true,
    timeVisible: true,
    secondsVisible: false,
    borderVisible: true,
    ticksVisible: true,
    minimumHeight: 36,
    tickMarkMaxCharacterLength: 14,
    tickMarkFormatter: (time: UTCTimestamp, tickMarkType: TickMarkType, _locale: string) => {
      const d = new Date((time as number) * 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      const dd = pad(d.getUTCDate());
      const mo = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      const yy = d.getUTCFullYear();
      switch (tickMarkType) {
        case TickMarkType.Year:
          return `${yy}`;
        case TickMarkType.Month:
          return `${mo} ${yy}`;
        case TickMarkType.DayOfMonth:
          return `${dd} ${mo}`;
        default:
          return `${dd} ${mo}`;
      }
    },
  },
  localization: {
    dateFormat: "dd MMM yyyy",
    locale: "en-US",
  },
  crosshair: {
    vertLine: { color: "#6b7280", labelBackgroundColor: "#FFB000" },
    horzLine: { color: "#6b7280", labelBackgroundColor: "#FFB000" },
  },
  green: "#10B981",
  red: "#EF4444",
};

export interface BacktestChartPoint {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  buySignal: number | null;
  sellSignal: number | null;
  tradeId: number | null;
}

interface BacktestLightweightChartProps {
  data: BacktestChartPoint[];
  height?: number;
  className?: string;
  /** Show TA toolbar (toggle indicators) and legend. Default true. */
  showTAToolbar?: boolean;
  /** Show replay/playback bar. Default true. */
  showReplayBar?: boolean;
}

function toUtcTimestamp(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as unknown as UTCTimestamp;
}

function sma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    return sum / period;
  });
}

function bollingerBands(closes: number[], period: number, mult: number): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (middle[i] == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = closes.slice(Math.max(0, i - period + 1), i + 1);
    const variance = slice.reduce((s, x) => s + (x - middle[i]!) ** 2, 0) / slice.length;
    const std = Math.sqrt(variance) || 1e-8;
    upper.push(middle[i]! + mult * std);
    lower.push(middle[i]! - mult * std);
  }
  return { upper, middle, lower };
}

function rsi(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const ch = closes[j]! - closes[j - 1]!;
      if (ch > 0) gains += ch;
      else losses -= ch;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) {
      out.push(100);
    } else {
      const rs = avgGain / avgLoss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

const REPLAY_SPEED = 0.015; // fraction of chart per 100ms at 1x

export function BacktestLightweightChart({
  data,
  height = 400,
  className = "",
  showTAToolbar = true,
  showReplayBar = true,
}: BacktestLightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const seriesMarkersRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null);
  const sma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiRef = useRef<ISeriesApi<"Line"> | null>(null);
  const replayAnimRef = useRef<number | null>(null);

  const [showSMA, setShowSMA] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [replayPosition, setReplayPosition] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const { candleData, markers, sma20Data, bbUpperData, bbMiddleData, bbLowerData, rsiData } = useMemo(() => {
    const closes = data.map((d) => d.close);
    const candles = data.map((d) => ({
      time: toUtcTimestamp(d.timestamp),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    const marks: Array<{
      time: UTCTimestamp;
      position: "aboveBar" | "belowBar";
      color: string;
      shape: "arrowUp" | "arrowDown";
      text: string;
    }> = [];
    data.forEach((d) => {
      const t = toUtcTimestamp(d.timestamp);
      if (d.buySignal != null) {
        marks.push({ time: t, position: "belowBar", color: THEME.green, shape: "arrowUp", text: "B" });
      }
      if (d.sellSignal != null) {
        marks.push({ time: t, position: "aboveBar", color: THEME.red, shape: "arrowDown", text: "S" });
      }
    });

    const sma20 = sma(closes, 20);
    const bb = bollingerBands(closes, 20, 2);
    const rsi14 = rsi(closes, 14);

    const toLine = (arr: (number | null)[]) =>
      data
        .map((d, i) => ({ time: toUtcTimestamp(d.timestamp), value: arr[i] }))
        .filter((p) => p.value != null) as { time: UTCTimestamp; value: number }[];

    return {
      candleData: candles,
      markers: marks,
      sma20Data: toLine(sma20),
      bbUpperData: toLine(bb.upper),
      bbMiddleData: toLine(bb.middle),
      bbLowerData: toLine(bb.lower),
      rsiData: toLine(rsi14),
    };
  }, [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !candleData.length) return;

    const w = Math.max(100, el.clientWidth || el.offsetWidth || 400);
    // Chart options per https://tradingview.github.io/lightweight-charts/docs
    const chart = createChart(el, {
      width: w,
      height,
      layout: THEME.layout,
      grid: THEME.grid,
      rightPriceScale: THEME.rightPriceScale,
      timeScale: THEME.timeScale,
      localization: THEME.localization,
      crosshair: THEME.crosshair,
      attributionLogo: false,
    });

    const candlestick = chart.addSeries(CandlestickSeries, {
      upColor: THEME.green,
      downColor: THEME.red,
      borderUpColor: THEME.green,
      borderDownColor: THEME.red,
    });
    candlestick.setData(candleData);
    candlestick.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.5 } });
    candlestickRef.current = candlestick;

    seriesMarkersRef.current = createSeriesMarkers(candlestick, markers);

    // SMA 20 overlay
    const sma20Series = chart.addSeries(LineSeries, { color: "#FFB000", lineWidth: 2, priceScaleId: "right" });
    sma20Series.setData(sma20Data);
    sma20Ref.current = sma20Series;

    // Bollinger Bands overlay
    const bbOpt = { lineWidth: 1, priceScaleId: "right" as const };
    const bbUpper = chart.addSeries(LineSeries, { ...bbOpt, color: "#9333EA", lineStyle: 2 });
    const bbMiddle = chart.addSeries(LineSeries, { ...bbOpt, color: "#9333EA" });
    const bbLower = chart.addSeries(LineSeries, { ...bbOpt, color: "#9333EA", lineStyle: 2 });
    bbUpper.setData(bbUpperData);
    bbMiddle.setData(bbMiddleData);
    bbLower.setData(bbLowerData);
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    // RSI in lower pane (separate price scale 0–100)
    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#FFB000",
      lineWidth: 2,
      priceScaleId: "rsi",
    });
    rsiSeries.setData(rsiData);
    rsiSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.75, bottom: 0.05 },
      borderVisible: true,
      scaleBorderColor: "#374151",
      visible: true,
    });
    rsiRef.current = rsiSeries;

    chart.timeScale().fitContent();
    chart.timeScale().applyOptions({
      visible: true,
      timeVisible: true,
      minimumHeight: 36,
      tickMarkFormatter: THEME.timeScale.tickMarkFormatter,
      tickMarkMaxCharacterLength: THEME.timeScale.tickMarkMaxCharacterLength,
    });
    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      const nextW = Math.max(100, rect?.width ?? el.clientWidth ?? el.offsetWidth ?? 400);
      chart.applyOptions({ width: nextW });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      seriesMarkersRef.current = null;
      sma20Ref.current = null;
      bbUpperRef.current = null;
      bbMiddleRef.current = null;
      bbLowerRef.current = null;
      rsiRef.current = null;
      chart.remove();
      chartRef.current = null;
      candlestickRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const candlestick = candlestickRef.current;
    if (!candlestick || !candleData.length) return;
    candlestick.setData(candleData);
    if (seriesMarkersRef.current) seriesMarkersRef.current.setMarkers(markers);
    if (sma20Ref.current) sma20Ref.current.setData(showSMA ? sma20Data : []);
    if (bbUpperRef.current) bbUpperRef.current.setData(showBB ? bbUpperData : []);
    if (bbMiddleRef.current) bbMiddleRef.current.setData(showBB ? bbMiddleData : []);
    if (bbLowerRef.current) bbLowerRef.current.setData(showBB ? bbLowerData : []);
    if (rsiRef.current) rsiRef.current.setData(showRSI ? rsiData : []);
    chartRef.current?.timeScale().fitContent();
  }, [candleData, markers, sma20Data, bbUpperData, bbMiddleData, bbLowerData, rsiData, showSMA, showBB, showRSI]);

  const len = candleData.length;
  useEffect(() => {
    setReplayPosition(1);
    setIsPlaying(false);
  }, [data.length]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || len === 0) return;
    const timeScale = chart.timeScale();
    if (replayPosition >= 1) {
      timeScale.fitContent();
      return;
    }
    const visibleBars = Math.max(30, Math.round(replayPosition * len));
    const to = Math.min(len - 1, visibleBars - 1);
    const from = Math.max(0, to - 80);
    timeScale.setVisibleLogicalRange({ from, to: to + 5 });
  }, [replayPosition, len]);

  useEffect(() => {
    if (!isPlaying || len === 0) return;
    const start = performance.now();
    const startPos = replayPosition;
    const run = (now: number) => {
      const elapsed = (now - start) / 1000;
      const next = Math.min(1, startPos + REPLAY_SPEED * 10 * elapsed);
      setReplayPosition(next);
      if (next < 1) {
        replayAnimRef.current = requestAnimationFrame(run);
      } else {
        setIsPlaying(false);
      }
    };
    replayAnimRef.current = requestAnimationFrame(run);
    return () => {
      if (replayAnimRef.current != null) {
        cancelAnimationFrame(replayAnimRef.current);
        replayAnimRef.current = null;
      }
    };
  }, [isPlaying, len]);

  const onPlayPause = useCallback(() => {
    if (replayPosition >= 1) setReplayPosition(0);
    setIsPlaying((p) => !p);
  }, [replayPosition]);
  const onReset = useCallback(() => {
    setIsPlaying(false);
    setReplayPosition(1);
  }, []);

  if (!data.length) {
    return (
      <div
        className={`flex items-center justify-center bg-[#0a0e13] text-muted-foreground text-sm rounded-lg ${className}`}
        style={{ height }}
      >
        No chart data
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {showTAToolbar && (
        <div className="flex flex-wrap items-center gap-3 py-1.5 px-2 rounded-md bg-[#0a0e13]/80 border border-border/50">
          <span className="text-xs font-medium text-muted-foreground mr-1">Indicators</span>
          <Button
            variant={showSMA ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowSMA((v) => !v)}
          >
            <span className="w-2 h-2 rounded-full bg-[#FFB000] mr-1.5 inline-block" />
            SMA 20
          </Button>
          <Button
            variant={showBB ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowBB((v) => !v)}
          >
            <span className="w-2 h-2 rounded-full bg-[#9333EA] mr-1.5 inline-block" />
            Bollinger Bands
          </Button>
          <Button
            variant={showRSI ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowRSI((v) => !v)}
          >
            <span className="w-2 h-2 rounded-full bg-[#FFB000] mr-1.5 inline-block opacity-80" />
            RSI(14)
          </Button>
          <span className="text-[10px] text-muted-foreground/80 ml-auto hidden sm:inline">
            Price · Buy/Sell markers
          </span>
        </div>
      )}
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" style={{ height }} />
      {showReplayBar && (
        <div className="flex items-center gap-2 py-2 px-2 rounded-md bg-[#0a0e13]/80 border border-border/50">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onReset} title="Reset view">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onPlayPause} title={isPlaying ? "Pause" : "Play replay"}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <input
            type="range"
            min={0}
            max={100}
            value={replayPosition * 100}
            onChange={(e) => {
              setIsPlaying(false);
              setReplayPosition(Number(e.target.value) / 100);
            }}
            className="flex-1 h-2 rounded-full accent-[#FFB000] bg-muted cursor-pointer"
            title="Scrub timeline"
          />
          <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
            {Math.round(replayPosition * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
