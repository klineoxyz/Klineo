import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { TrendingUp, Minus, X, Maximize2, Clock } from 'lucide-react';
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
  onTimeframeChange?: (timeframe: Timeframe) => void;
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
  onTimeframeChange,
}: TradingViewChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [drawingMode, setDrawingMode] = useState<'none' | 'trendline' | 'horizontal'>('none');
  const [drawings, setDrawings] = useState<Array<{ type: string; price: number; time: number }>>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Timeframe options
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '12h', '1D', '5D', '1W', '1M'];

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  return (
    <div className="relative">
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

      {/* Timeframe Selector */}
      <div className="flex gap-0.5 p-0.5">
        <div className="flex items-center gap-1 px-2 py-1.5 border-r border-border">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">TF</span>
        </div>
        <div className="flex gap-0.5 p-0.5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all min-w-[36px] ${
                timeframe === tf
                  ? 'bg-primary text-background font-bold shadow-sm'
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
        height={500}
        className="w-full"
      />

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
                  <div className="flex gap-0.5 p-0.5">
                    {timeframes.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => handleTimeframeChange(tf)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all min-w-[36px] ${
                          timeframe === tf
                            ? 'bg-primary text-background font-bold shadow-sm'
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