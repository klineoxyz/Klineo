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
  /** Fixed height in px. Ignored when autoSize is true. */
  height?: number;
  /** When true, chart fills container (use with a sized parent). Ensures time scale is not clipped. */
  autoSize?: boolean;
  className?: string;
}

function toUtcTimestamp(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000) as unknown as import("lightweight-charts").UTCTimestamp;
}

export function LightweightChartsWidget({
  data,
  showVolume = true,
  height = 500,
  autoSize = false,
  className = "",
}: LightweightChartsWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const { candleData, volumeData } = useMemo(() => {
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
    return { candleData: candles, volumeData: vols };
  }, [data]);

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
      };
    }
    return () => {
      chart.remove();
      chartRef.current = null;
      candlestickRef.current = null;
      volumeRef.current = null;
    };
  }, [height, showVolume, autoSize]);

  useEffect(() => {
    const candlestick = candlestickRef.current;
    const volume = volumeRef.current;
    if (!candlestick || !candleData.length) return;
    candlestick.setData(candleData);
    if (showVolume && volume && volumeData.length) volume.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [candleData, volumeData, showVolume]);

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
