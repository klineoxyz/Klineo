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
  type IChartApi,
  type ISeriesApi,
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
    timeVisible: true,
    secondsVisible: false,
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
  height?: number;
  className?: string;
}

function toUtcTimestamp(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000) as unknown as import("lightweight-charts").UTCTimestamp;
}

export function LightweightChartsWidget({
  data,
  showVolume = true,
  height = 500,
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
    const chart = createChart(el, {
      width: w,
      height,
      layout: THEME.layout,
      grid: THEME.grid,
      rightPriceScale: THEME.rightPriceScale,
      timeScale: THEME.timeScale,
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
    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? {};
      const next = Math.max(100, width ?? el.clientWidth ?? el.offsetWidth ?? 400);
      chart.applyOptions({ width: next });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candlestickRef.current = null;
      volumeRef.current = null;
    };
  }, [height, showVolume]);

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
        style={{ height }}
      >
        No chart data
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full ${className}`}
      style={{ height }}
    />
  );
}
