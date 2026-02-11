/**
 * KLINEO — TradingView Lightweight Charts™ integration
 * https://github.com/tradingview/lightweight-charts
 *
 * Candlestick + volume overlay, KLINEO dark theme. Built-in zoom/pan.
 */

import { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

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
    scaleMargins: { top: 0.1, bottom: 0.4 },
  },
  timeScale: {
    borderColor: "#374151",
    visible: true,
    timeVisible: true,
    secondsVisible: true,
    borderVisible: true,
    ticksVisible: true,
    minimumHeight: 32,
    tickMarkMaxCharacterLength: 18,
    tickMarkFormatter: (time: UTCTimestamp, tickMarkType: TickMarkType, _locale: string) => {
      const d = new Date((time as number) * 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      const dd = pad(d.getUTCDate());
      const mo = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      const yy = d.getUTCFullYear();
      const hh = pad(d.getUTCHours());
      const mm = pad(d.getUTCMinutes());
      const ss = pad(d.getUTCSeconds());
      switch (tickMarkType) {
        case TickMarkType.Year:
          return `${yy}`;
        case TickMarkType.Month:
          return `${mo} ${yy}`;
        case TickMarkType.DayOfMonth:
          return `${dd} ${mo}`;
        case TickMarkType.Time:
          return `${hh}:${mm}`;
        case TickMarkType.TimeWithSeconds:
          return `${hh}:${mm}:${ss}`;
        default:
          return `${dd} ${mo} ${yy}, ${hh}:${mm}`;
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

export interface OhlcvItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LightweightChartsWidgetProps {
  data: OhlcvItem[];
  showVolume?: boolean;
  showSMA9?: boolean;
  showSMA20?: boolean;
  showSMA50?: boolean;
  showEMA9?: boolean;
  showEMA21?: boolean;
  showEMA50?: boolean;
  showBB?: boolean;
  showATR?: boolean;
  /** Fixed height in px. Ignored when autoSize is true. */
  height?: number;
  /** When true, chart fills container (use with a sized parent). Ensures time scale is not clipped. */
  autoSize?: boolean;
  className?: string;
}

function sma(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      out.push(sum / period);
    }
  }
  return out;
}

function ema(closes: number[], period: number): (number | null)[] {
  const mult = 2 / (period + 1);
  const out: (number | null)[] = [];
  if (closes.length === 0) return out;
  out.push(closes[0]);
  for (let i = 1; i < closes.length; i++) {
    const prev = out[i - 1] ?? closes[i];
    out.push((closes[i] - prev) * mult + prev);
  }
  return out;
}

function bb(closes: number[], period: number, mult: number): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      const m = middle[i]!;
      let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) sumSq += (closes[j] - m) ** 2;
      const std = Math.sqrt(sumSq / period);
      upper.push(m + mult * std);
      lower.push(m - mult * std);
    }
  }
  return { upper, middle, lower };
}

/** ATR(period) — Wilder smoothing of True Range. */
function atr(high: number[], low: number[], close: number[], period: number): (number | null)[] {
  const tr: number[] = [];
  for (let i = 0; i < high.length; i++) {
    if (i === 0) tr.push(high[i]! - low[i]!);
    else tr.push(Math.max(high[i]! - low[i]!, Math.abs(high[i]! - close[i - 1]!), Math.abs(low[i]! - close[i - 1]!)));
  }
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      sum += tr[i]!;
      out.push(null);
    } else if (i === period - 1) {
      sum += tr[i]!;
      out.push(sum / period);
    } else {
      sum = (sum * (period - 1) + tr[i]!) / period;
      out.push(sum);
    }
  }
  return out;
}

function toUtcTimestamp(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000) as unknown as import("lightweight-charts").UTCTimestamp;
}

const INDICATOR_COLORS = {
  SMA9: "#a78bfa",
  SMA20: "#FFB000",
  SMA50: "#3B82F6",
  EMA9: "#10B981",
  EMA21: "#F59E0B",
  EMA50: "#14b8a6",
  BB_UP: "rgba(139, 92, 246, 0.8)",
  BB_MID: "#8b5cf6",
  BB_LO: "rgba(139, 92, 246, 0.6)",
  ATR: "#f97316",
};

export function LightweightChartsWidget({
  data,
  showVolume = true,
  showSMA9 = false,
  showSMA20 = false,
  showSMA50 = false,
  showEMA9 = false,
  showEMA21 = false,
  showEMA50 = false,
  showBB = false,
  showATR = false,
  height = 500,
  autoSize = false,
  className = "",
}: LightweightChartsWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lineSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  const { candleData, volumeData, indicatorSeries } = useMemo(() => {
    const candles = data.map((d) => ({
      time: toUtcTimestamp(d.time),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    const vols = data.map((d) => ({
      time: toUtcTimestamp(d.time),
      value: d.volume,
      color: d.close >= d.open ? THEME.green : THEME.red,
    }));
    const closes = data.map((d) => d.close);
    const times = data.map((d) => toUtcTimestamp(d.time));
    const toLineData = (vals: (number | null)[]): { time: number; value: number }[] =>
      times.map((t, i) => ({ time: t, value: vals[i] })).filter((x): x is { time: number; value: number } => x.value != null);
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const sma9 = showSMA9 ? toLineData(sma(closes, 9)) : [];
    const sma20 = showSMA20 ? toLineData(sma(closes, 20)) : [];
    const sma50 = showSMA50 ? toLineData(sma(closes, 50)) : [];
    const ema9 = showEMA9 ? toLineData(ema(closes, 9)) : [];
    const ema21 = showEMA21 ? toLineData(ema(closes, 21)) : [];
    const ema50 = showEMA50 ? toLineData(ema(closes, 50)) : [];
    const bbData = showBB ? bb(closes, 20, 2) : null;
    const bbUpper = bbData ? toLineData(bbData.upper) : [];
    const bbMid = bbData ? toLineData(bbData.middle) : [];
    const bbLower = bbData ? toLineData(bbData.lower) : [];
    const atr14 = showATR ? toLineData(atr(highs, lows, closes, 14)) : [];
    return {
      candleData: candles,
      volumeData: vols,
      indicatorSeries: { sma9, sma20, sma50, ema9, ema21, ema50, bbUpper, bbMid, bbLower, atr14 },
    };
  }, [data, showSMA9, showSMA20, showSMA50, showEMA9, showEMA21, showEMA50, showBB, showATR]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !candleData.length) return;

    const w = Math.max(100, el.clientWidth || el.offsetWidth || 400);
    const h = autoSize ? 0 : height;
    const chart = createChart(el, {
      width: autoSize ? 0 : w,
      height: h,
      autoSize,
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
    candlestick.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.4 } });
    candlestickRef.current = candlestick;

    if (showVolume && volumeData.length) {
      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      volume.priceScale().applyOptions({
        scaleMargins: { top: 0.7, bottom: 0 },
      });
      volume.setData(volumeData);
      volumeRef.current = volume;
    }

    const lineMap = new Map<string, ISeriesApi<"Line">>();
    if (indicatorSeries.sma9.length) {
      const s = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.SMA9, lineWidth: 2, title: "SMA(9)" });
      s.setData(indicatorSeries.sma9);
      lineMap.set("sma9", s);
    }
    if (indicatorSeries.sma20.length) {
      const s = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.SMA20, lineWidth: 2, title: "SMA(20)" });
      s.setData(indicatorSeries.sma20);
      lineMap.set("sma20", s);
    }
    if (indicatorSeries.sma50.length) {
      const s = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.SMA50, lineWidth: 2, title: "SMA(50)" });
      s.setData(indicatorSeries.sma50);
      lineMap.set("sma50", s);
    }
    if (indicatorSeries.ema9.length) {
      const s = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.EMA9, lineWidth: 2, title: "EMA(9)" });
      s.setData(indicatorSeries.ema9);
      lineMap.set("ema9", s);
    }
    if (indicatorSeries.ema21.length) {
      const s = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.EMA21, lineWidth: 2, title: "EMA(21)" });
      s.setData(indicatorSeries.ema21);
      lineMap.set("ema21", s);
    }
    if (indicatorSeries.ema50.length) {
      const s = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.EMA50, lineWidth: 2, title: "EMA(50)" });
      s.setData(indicatorSeries.ema50);
      lineMap.set("ema50", s);
    }
    if (indicatorSeries.bbMid.length) {
      const su = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.BB_UP, lineWidth: 1, title: "BB Upper" });
      su.setData(indicatorSeries.bbUpper);
      lineMap.set("bbUpper", su);
      const sm = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.BB_MID, lineWidth: 2, title: "BB Mid" });
      sm.setData(indicatorSeries.bbMid);
      lineMap.set("bbMid", sm);
      const sl = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.BB_LO, lineWidth: 1, title: "BB Lower" });
      sl.setData(indicatorSeries.bbLower);
      lineMap.set("bbLower", sl);
    }
    if (indicatorSeries.atr14.length) {
      const s = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.ATR, lineWidth: 1, title: "ATR(14)" });
      s.setData(indicatorSeries.atr14);
      lineMap.set("atr14", s);
    }
    lineSeriesRef.current = lineMap;

    chart.timeScale().fitContent();
    chart.timeScale().applyOptions({
      visible: true,
      timeVisible: true,
      secondsVisible: true,
      borderVisible: true,
      ticksVisible: true,
      minimumHeight: 48,
      tickMarkFormatter: THEME.timeScale.tickMarkFormatter,
      tickMarkMaxCharacterLength: THEME.timeScale.tickMarkMaxCharacterLength,
    });
    chartRef.current = chart;

    if (!autoSize) {
      const ro = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        const nextW = Math.max(100, rect?.width ?? el.clientWidth ?? el.offsetWidth ?? 400);
        chart.applyOptions({ width: nextW });
      });
      ro.observe(el);
      return () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        candlestickRef.current = null;
        volumeRef.current = null;
        lineSeriesRef.current.clear();
      };
    }
    return () => {
      chart.remove();
      chartRef.current = null;
      candlestickRef.current = null;
      volumeRef.current = null;
      lineSeriesRef.current.clear();
    };
  }, [height, showVolume, autoSize, showSMA9, showSMA20, showSMA50, showEMA9, showEMA21, showEMA50, showBB, showATR, candleData.length]);

  useEffect(() => {
    const candlestick = candlestickRef.current;
    const volume = volumeRef.current;
    const lineMap = lineSeriesRef.current;
    if (!candlestick || !candleData.length) return;
    candlestick.setData(candleData);
    if (showVolume && volume && volumeData.length) volume.setData(volumeData);
    if (indicatorSeries.sma9.length && lineMap.has("sma9")) lineMap.get("sma9")!.setData(indicatorSeries.sma9);
    if (indicatorSeries.sma20.length && lineMap.has("sma20")) lineMap.get("sma20")!.setData(indicatorSeries.sma20);
    if (indicatorSeries.sma50.length && lineMap.has("sma50")) lineMap.get("sma50")!.setData(indicatorSeries.sma50);
    if (indicatorSeries.ema9.length && lineMap.has("ema9")) lineMap.get("ema9")!.setData(indicatorSeries.ema9);
    if (indicatorSeries.ema21.length && lineMap.has("ema21")) lineMap.get("ema21")!.setData(indicatorSeries.ema21);
    if (indicatorSeries.ema50.length && lineMap.has("ema50")) lineMap.get("ema50")!.setData(indicatorSeries.ema50);
    if (indicatorSeries.atr14.length && lineMap.has("atr14")) lineMap.get("atr14")!.setData(indicatorSeries.atr14);
    if (indicatorSeries.bbMid.length && lineMap.has("bbUpper")) {
      lineMap.get("bbUpper")!.setData(indicatorSeries.bbUpper);
      lineMap.get("bbMid")!.setData(indicatorSeries.bbMid);
      lineMap.get("bbLower")!.setData(indicatorSeries.bbLower);
    }
    chartRef.current?.timeScale().fitContent();
  }, [candleData, volumeData, showVolume, indicatorSeries]);

  if (!data.length) {
    return (
      <div
        className={`flex items-center justify-center bg-[#0a0e13] text-muted-foreground text-sm ${className}`}
        style={autoSize ? { minHeight: 200 } : { height }}
      >
        No chart data
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full ${className}`}
      style={autoSize ? { minHeight: 200, height: "100%" } : { height }}
    />
  );
}
