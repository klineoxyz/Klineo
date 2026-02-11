/**
 * Small RSI and MACD sub-charts using lightweight-charts (same theme as main chart).
 * Defensive: guards and try/catch to avoid black screen on error.
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, LineSeries, HistogramSeries } from "lightweight-charts";
import type { IChartApi, UTCTimestamp } from "lightweight-charts";
import { computeRSI, computeMACD, type OhlcvRow } from "./indicators";

const THEME = {
  layout: { background: { type: "solid" as const, color: "#0a0e13" }, textColor: "#9ca3af" },
  grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
  rightPriceScale: { borderColor: "#374151", scaleMargins: { top: 0.1, bottom: 0.1 } },
  timeScale: { borderColor: "#374151", visible: true, timeVisible: true, secondsVisible: false },
};

function toUtc(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000) as unknown as UTCTimestamp;
}

export function RsiChart({ data, height = 100 }: { data: OhlcvRow[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiData = computeRSI(data);
  const seriesData = rsiData.map((d) => ({ time: toUtc(d.time), value: d.value }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el || seriesData.length === 0) return;
    if (chartRef.current) return;
    const chart = createChart(el, {
      width: el.clientWidth || 400,
      height,
      layout: THEME.layout,
      grid: THEME.grid,
      rightPriceScale: { ...THEME.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: THEME.timeScale,
      attributionLogo: false,
    });
    const series = chart.addSeries(LineSeries, { color: "#ec4899", lineWidth: 2 });
    series.setData(seriesData);
    series.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    chart.timeScale().fitContent();
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth || 400 }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [height, seriesData.length]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || seriesData.length === 0) return;
    const series = chart.series()[0];
    if (series) series.setData(seriesData);
    chart.timeScale().fitContent();
  }, [seriesData]);

  if (seriesData.length === 0) {
    return (
      <div className="flex items-center justify-center bg-[#0a0e13] text-muted-foreground text-xs" style={{ height }}>
        RSI — need more data
      </div>
    );
  }
  return <div ref={containerRef} className="w-full rounded border border-border/30 overflow-hidden" style={{ height }} />;
}

export function MacdChart({ data, height = 120 }: { data: OhlcvRow[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { macdSeriesData, signalSeriesData, histSeriesData } = useMemo(() => {
    if (!data?.length || data.length < 27) return { macdSeriesData: [], signalSeriesData: [], histSeriesData: [] };
    try {
      const { macd, signal, histogram } = computeMACD(data);
      return {
        macdSeriesData: macd.map((d) => ({ time: toUtc(d.time), value: d.value })),
        signalSeriesData: signal.map((d) => ({ time: toUtc(d.time), value: d.value })),
        histSeriesData: histogram.map((d) => ({ time: toUtc(d.time), value: d.value, color: d.color })),
      };
    } catch {
      return { macdSeriesData: [], signalSeriesData: [], histSeriesData: [] };
    }
  }, [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || macdSeriesData.length === 0) return;
    if (chartRef.current) return;
    try {
      const chart = createChart(el, {
        width: Math.max(el.clientWidth || 400, 100),
        height,
        layout: THEME.layout,
        grid: THEME.grid,
        rightPriceScale: { ...THEME.rightPriceScale, scaleMargins: { top: 0.2, bottom: 0.2 } },
        timeScale: THEME.timeScale,
        attributionLogo: false,
      });
      const hist = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "" });
      hist.setData(histSeriesData);
      hist.priceScale().applyOptions({ scaleMargins: { top: 0.5, bottom: 0.5 } });
      const macdLine = chart.addSeries(LineSeries, { color: "#06b6d4", lineWidth: 2 });
      macdLine.setData(macdSeriesData);
      const signalLine = chart.addSeries(LineSeries, { color: "#FFB000", lineWidth: 1 });
      signalLine.setData(signalSeriesData);
      chart.timeScale().fitContent();
      chartRef.current = chart;
      const ro = new ResizeObserver(() => {
        const w = el.clientWidth || 400;
        if (chartRef.current) chartRef.current.applyOptions({ width: Math.max(w, 100) });
      });
      ro.observe(el);
      return () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chart error");
      return undefined;
    }
  }, [height, macdSeriesData.length]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || macdSeriesData.length === 0) return;
    try {
      const series = chart.series();
      if (series[0]) series[0].setData(histSeriesData);
      if (series[1]) series[1].setData(macdSeriesData);
      if (series[2]) series[2].setData(signalSeriesData);
      chart.timeScale().fitContent();
    } catch {
      // ignore update errors
    }
  }, [macdSeriesData, signalSeriesData, histSeriesData]);

  if (error) {
    return (
      <div className="flex items-center justify-center bg-[#0a0e13] text-muted-foreground text-xs" style={{ height }}>
        MACD — {error}
      </div>
    );
  }
  if (macdSeriesData.length === 0) {
    return (
      <div className="flex items-center justify-center bg-[#0a0e13] text-muted-foreground text-xs" style={{ height }}>
        MACD — need more data (min 27 bars)
      </div>
    );
  }
  return <div ref={containerRef} className="w-full rounded border border-border/30 overflow-hidden" style={{ height }} />;
}
