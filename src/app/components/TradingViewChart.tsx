import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { TrendingUp, Minus, X, Maximize2, Clock, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { LightweightChartsWidget } from '@/app/components/charts/LightweightChartsWidget';

type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '12h' | '1D' | '5D' | '1W' | '1M';

interface TradingViewChartProps {
  data: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  showVolume?: boolean;
  showRSI?: boolean;
  showMACD?: boolean;
  showBB?: boolean;
  showSMA20?: boolean;
  showSMA50?: boolean;
  showEMA9?: boolean;
  showEMA21?: boolean;
  /** When set, timeframe selector is controlled by parent (sync selection + full history). */
  selectedTimeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  /** When provided, show TA tools sidebar on the left for toggling indicators. */
  onToggleVolume?: () => void;
  onToggleSMA20?: () => void;
  onToggleSMA50?: () => void;
  onToggleEMA9?: () => void;
  onToggleEMA21?: () => void;
  onToggleBB?: () => void;
  onToggleRSI?: () => void;
  onToggleMACD?: () => void;
}

export function TradingViewChart({
  data,
  showVolume = true,
  showRSI = false,
  showMACD = false,
  showBB = false,
  showSMA20 = false,
  showSMA50 = false,
  showEMA9 = false,
  showEMA21 = false,
  selectedTimeframe,
  onTimeframeChange,
  onToggleVolume,
  onToggleSMA20,
  onToggleSMA50,
  onToggleEMA9,
  onToggleEMA21,
  onToggleBB,
  onToggleRSI,
  onToggleMACD,
}: TradingViewChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>(selectedTimeframe ?? '1h');
  const [drawingMode, setDrawingMode] = useState<'none' | 'trendline' | 'horizontal'>('none');
  const [drawings, setDrawings] = useState<Array<{ type: string; price: number; time: number }>>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const effectiveTimeframe = selectedTimeframe ?? timeframe;
  useEffect(() => {
    if (selectedTimeframe != null) setTimeframe(selectedTimeframe);
  }, [selectedTimeframe]);

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '12h', '1D', '5D', '1W', '1M'];

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  const hasTATools = [onToggleVolume, onToggleSMA20, onToggleSMA50, onToggleEMA9, onToggleEMA21, onToggleBB, onToggleRSI, onToggleMACD].some(Boolean);

  return (
    <div className="relative flex flex-col h-full min-h-[320px] flex-1 min-h-0">
      {/* Left TA Tools sidebar */}
      {hasTATools && (
        <div className="absolute left-0 top-0 bottom-0 z-10 w-9 sm:w-10 flex flex-col items-center py-2 gap-1 border-r border-border/50 bg-[#0a0e13]/95 rounded-l overflow-hidden">
          {onToggleVolume && (
            <button
              type="button"
              onClick={onToggleVolume}
              title="Volume"
              className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${showVolume ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
            >
              <BarChart3 className="size-4" />
            </button>
          )}
          {onToggleSMA20 && (
            <button type="button" onClick={onToggleSMA20} title="MA(20)" className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${showSMA20 ? 'bg-[#FFB000]/20 text-[#FFB000]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>MA20</button>
          )}
          {onToggleSMA50 && (
            <button type="button" onClick={onToggleSMA50} title="MA(50)" className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${showSMA50 ? 'bg-[#3B82F6]/20 text-[#3B82F6]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>MA50</button>
          )}
          {onToggleEMA9 && (
            <button type="button" onClick={onToggleEMA9} title="EMA(9)" className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${showEMA9 ? 'bg-[#10B981]/20 text-[#10B981]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>E9</button>
          )}
          {onToggleEMA21 && (
            <button type="button" onClick={onToggleEMA21} title="EMA(21)" className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${showEMA21 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>E21</button>
          )}
          {onToggleBB && (
            <button type="button" onClick={onToggleBB} title="Bollinger Bands" className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${showBB ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>BB</button>
          )}
          {onToggleRSI && (
            <button type="button" onClick={onToggleRSI} title="RSI" className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${showRSI ? 'bg-[#ec4899]/20 text-[#ec4899]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>RSI</button>
          )}
          {onToggleMACD && (
            <button type="button" onClick={onToggleMACD} title="MACD" className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${showMACD ? 'bg-[#06b6d4]/20 text-[#06b6d4]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>MACD</button>
          )}
        </div>
      )}
      {/* Drawing Tools (top-left, above chart) */}
      <div className="absolute top-2 z-10 flex gap-2" style={{ left: hasTATools ? 52 : 8 }}>
        <Button
          size="sm"
          variant={drawingMode === 'trendline' ? 'default' : 'outline'}
          onClick={() => setDrawingMode(drawingMode === 'trendline' ? 'none' : 'trendline')}
          className="h-8"
        >
          <TrendingUp className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={drawingMode === 'horizontal' ? 'default' : 'outline'}
          onClick={() => setDrawingMode(drawingMode === 'horizontal' ? 'none' : 'horizontal')}
          className="h-8"
        >
          <Minus className="h-4 w-4" />
        </Button>
        {drawings.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDrawings([])}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsFullscreen(true)}
          className="h-8"
          title="Fullscreen Chart"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Timeframe Selector — selected TF highlighted (yellow/primary) */}
      <div className="flex gap-0.5 p-0.5 shrink-0">
        <div className="flex items-center gap-1 px-2 py-1.5 border-r border-border">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">TF</span>
        </div>
        <div className="flex gap-0.5 p-0.5 flex-wrap">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all min-w-[36px] ${
                effectiveTimeframe === tf
                  ? 'bg-[#FFB000] text-[#0a0e13] font-bold shadow-sm ring-1 ring-[#FFB000]/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full relative flex flex-col overflow-hidden" style={{ marginLeft: hasTATools ? 40 : 0 }}>
        <LightweightChartsWidget
          data={data}
          showVolume={showVolume}
          showSMA20={showSMA20}
          showSMA50={showSMA50}
          showEMA9={showEMA9}
          showEMA21={showEMA21}
          showBB={showBB}
          autoSize
          className="w-full flex-1 min-h-0"
        />
        {/* Visible time axis from candle data (so users always see date/time per candle) */}
        {data.length > 0 && (
          <div
            className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[#0a0e13] border-t border-[#374151] text-[10px] sm:text-xs font-mono text-[#9ca3af] shrink-0"
            aria-label="Chart time range"
          >
            {(() => {
              const times = data.map((d) => new Date(d.time));
              const pad = (n: number) => String(n).padStart(2, "0");
              const fmt = (d: Date) =>
                `${pad(d.getUTCDate())} ${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
              if (times.length === 0) return null;
              if (times.length === 1) return <span>{fmt(times[0])}</span>;
              const n = Math.min(5, times.length);
              const indices = n <= 2 ? [0, times.length - 1] : Array.from({ length: n }, (_, i) => Math.floor((i / (n - 1)) * (times.length - 1)));
              const seen = new Set<number>();
              const unique = indices.filter((i) => {
                if (seen.has(i)) return false;
                seen.add(i);
                return true;
              });
              return (
                <>
                  {unique.map((i) => (
                    <span key={i}>{fmt(times[i])}</span>
                  ))}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* RSI Panel */}
      {showRSI && (
        <div className="mt-2 h-32 bg-[#0a0e13] border border-border/30 rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">RSI(14)</div>
          <div className="h-full bg-[#0B0D10] rounded flex items-center justify-center text-muted-foreground text-sm">
            RSI Indicator
          </div>
        </div>
      )}

      {/* MACD Panel */}
      {showMACD && (
        <div className="mt-2 h-32 bg-[#0a0e13] border border-border/30 rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">MACD(12,26,9)</div>
          <div className="h-full bg-[#0B0D10] rounded flex items-center justify-center text-muted-foreground text-sm">
            MACD Indicator
          </div>
        </div>
      )}

      {/* Fullscreen Chart Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0">
          <div className="h-full flex flex-col bg-background">
            {/* Fullscreen Chart Header */}
            <DialogHeader className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-primary">Chart - Fullscreen View</DialogTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsFullscreen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            {/* Fullscreen Chart Content */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="relative h-full">
                {/* Drawing Tools */}
                <div className="absolute top-2 left-2 z-10 flex gap-2">
                  <Button
                    size="sm"
                    variant={drawingMode === 'trendline' ? 'default' : 'outline'}
                    onClick={() => setDrawingMode(drawingMode === 'trendline' ? 'none' : 'trendline')}
                    className="h-8"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={drawingMode === 'horizontal' ? 'default' : 'outline'}
                    onClick={() => setDrawingMode(drawingMode === 'horizontal' ? 'none' : 'horizontal')}
                    className="h-8"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  {drawings.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDrawings([])}
                      className="h-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Timeframe Selector */}
                <div className="flex gap-0.5 p-0.5 mb-4">
                  <div className="flex items-center gap-1 px-2 py-1.5 border-r border-border">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">TF</span>
                  </div>
                  <div className="flex gap-0.5 p-0.5 flex-wrap">
                    {timeframes.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => handleTimeframeChange(tf)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all min-w-[36px] ${
                          effectiveTimeframe === tf
                            ? 'bg-[#FFB000] text-[#0a0e13] font-bold shadow-sm ring-1 ring-[#FFB000]/50'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <LightweightChartsWidget
                  data={data}
                  showVolume={showVolume}
                  showSMA20={showSMA20}
                  showSMA50={showSMA50}
                  showEMA9={showEMA9}
                  showEMA21={showEMA21}
                  showBB={showBB}
                  height={560}
                  className="w-full min-h-[400px]"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}