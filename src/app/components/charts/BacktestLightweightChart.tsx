/**
 * Strategy Backtest chart using TradingView Lightweight Charts™.
 * Candlestick + buy/sell markers + TA overlays (SMA 20, Bollinger Bands, RSI).
 *
 * Built with the official library (~35KB, HTML5 Canvas):
 * https://www.tradingview.com/lightweight-charts/
 * API: https://tradingview.github.io/lightweight-charts/docs/api
 */

import { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  LineStyle,
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

export function BacktestLightweightChart({
  data,
  height = 400,
  className = "",
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

    // Bollinger Bands overlay (LineStyle from official API)
    const bbOpt = { lineWidth: 1, priceScaleId: "right" as const };
    const bbUpper = chart.addSeries(LineSeries, { ...bbOpt, color: "#9333EA", lineStyle: LineStyle.Dashed });
    const bbMiddle = chart.addSeries(LineSeries, { ...bbOpt, color: "#9333EA" });
    const bbLower = chart.addSeries(LineSeries, { ...bbOpt, color: "#9333EA", lineStyle: LineStyle.Dashed });
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
    if (sma20Ref.current && sma20Data.length) sma20Ref.current.setData(sma20Data);
    if (bbUpperRef.current && bbUpperData.length) bbUpperRef.current.setData(bbUpperData);
    if (bbMiddleRef.current && bbMiddleData.length) bbMiddleRef.current.setData(bbMiddleData);
    if (bbLowerRef.current && bbLowerData.length) bbLowerRef.current.setData(bbLowerData);
    if (rsiRef.current && rsiData.length) rsiRef.current.setData(rsiData);
    chartRef.current?.timeScale().fitContent();
  }, [candleData, markers, sma20Data, bbUpperData, bbMiddleData, bbLowerData, rsiData]);

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
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ height }}
      />
      <a
        href="https://www.tradingview.com/lightweight-charts/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-muted-foreground hover:text-foreground self-end mr-1"
      >
        Lightweight Charts™
      </a>
    </div>
  );
}
