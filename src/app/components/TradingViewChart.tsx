import { useRef, useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { TrendingUp, Minus, X, ZoomIn, ZoomOut, Maximize2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ReferenceLine,
} from 'recharts';

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
  
  // Zoom and Pan State
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 2 = 200%, etc.
  const [candlesToShow, setCandlesToShow] = useState(100); // Default show 100 candles
  const [startIndex, setStartIndex] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, index: 0 });
  const chartRef = useRef<any>(null);

  // Update start index when data changes
  useEffect(() => {
    const maxStart = Math.max(0, data.length - candlesToShow);
    setStartIndex(maxStart);
  }, [data.length, candlesToShow]);

  // Calculate indicators
  const calculateSMA = (data: any[], period: number) => {
    return data.map((item, index) => {
      if (index < period - 1) return null;
      const sum = data.slice(index - period + 1, index + 1).reduce((acc, d) => acc + d.close, 0);
      return sum / period;
    });
  };

  const calculateEMA = (data: any[], period: number) => {
    const k = 2 / (period + 1);
    let ema = data[0].close;
    return data.map((item, index) => {
      if (index === 0) return item.close;
      ema = item.close * k + ema * (1 - k);
      return ema;
    });
  };

  const calculateBollingerBands = (data: any[], period: number, stdDev: number) => {
    const sma = calculateSMA(data, period);
    return data.map((item, index) => {
      if (index < period - 1) return { upper: null, middle: null, lower: null };
      const slice = data.slice(index - period + 1, index + 1);
      const mean = slice.reduce((acc, d) => acc + d.close, 0) / period;
      const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      return {
        upper: mean + stdDev * std,
        middle: mean,
        lower: mean - stdDev * std,
      };
    });
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setCandlesToShow(prev => Math.max(20, Math.floor(prev * 0.7)));
  };

  const handleZoomOut = () => {
    setCandlesToShow(prev => Math.min(data.length, Math.floor(prev * 1.4)));
  };

  const handleResetZoom = () => {
    setCandlesToShow(100);
    setStartIndex(Math.max(0, data.length - 100));
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, index: startIndex });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const diff = e.clientX - panStart.x;
    const candlesPerPixel = candlesToShow / 800; // Approximate chart width
    const indexDiff = Math.floor(-diff * candlesPerPixel);
    
    const newStartIndex = Math.max(0, Math.min(data.length - candlesToShow, panStart.index + indexDiff));
    setStartIndex(newStartIndex);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  // Slice data for visible range
  const endIndex = Math.min(startIndex + candlesToShow, data.length);
  const visibleData = data.slice(startIndex, endIndex);

  // Prepare chart data with indicators
  const chartData = visibleData.map((d, index) => {
    const globalIndex = startIndex + index;
    const bb = showBB ? calculateBollingerBands(data, 20, 2)[globalIndex] : null;
    return {
      ...d,
      sma20: showSMA20 ? calculateSMA(data, 20)[globalIndex] : null,
      sma50: showSMA50 ? calculateSMA(data, 50)[globalIndex] : null,
      ema9: showEMA9 ? calculateEMA(data, 9)[globalIndex] : null,
      ema21: showEMA21 ? calculateEMA(data, 21)[globalIndex] : null,
      bbUpper: bb?.upper || null,
      bbMiddle: bb?.middle || null,
      bbLower: bb?.lower || null,
    };
  });

  const currentPrice = data[data.length - 1]?.close || 0;

  // Timeframe options
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '12h', '1D', '5D', '1W', '1M'];

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  // Format X-axis based on timeframe
  const formatXAxisTick = (value: string) => {
    // Try to parse the time value - it might be a date string or just time
    const date = new Date(value);
    
    // If invalid date, return original value
    if (isNaN(date.getTime())) {
      return value;
    }

    switch (timeframe) {
      case '1m':
      case '5m':
      case '15m':
      case '30m':
      case '1h':
      case '2h':
      case '4h':
        // Show time only: "10:30"
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      
      case '12h':
        // Show date and time: "Jan 15 14:30"
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }) + ' ' + date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      
      case '1D':
      case '5D':
      case '1W':
      case '1M':
        // Show date only: "Jan 15"
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      
      default:
        return value;
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 border border-border p-3 rounded shadow-lg">
          <div className="text-xs font-mono space-y-1">
            <div className="text-muted-foreground">{formatXAxisTick(data.time)}</div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">O:</span>
              <span>{data.open?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">H:</span>
              <span className="text-green-500">{data.high?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">L:</span>
              <span className="text-red-500">{data.low?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">C:</span>
              <span>{data.close?.toFixed(2)}</span>
            </div>
            {showVolume && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">V:</span>
                <span>{data.volume?.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
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

      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleZoomIn}
          className="h-8"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleZoomOut}
          className="h-8"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
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

      {/* Main Price Chart */}
      <div 
        className="w-full select-none" 
        style={{ height: 500, cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="2 2" stroke="#374151" strokeOpacity={0.5} vertical={true} />
            
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={{ stroke: '#374151' }}
              axisLine={{ stroke: '#374151' }}
              tickFormatter={formatXAxisTick}
            />
            
            <YAxis
              yAxisId="price"
              orientation="right"
              domain={['auto', 'auto']}
              stroke="#6b7280"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={{ stroke: '#374151' }}
              axisLine={{ stroke: '#374151' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '3 3' }} />
            
            {/* Bollinger Bands */}
            {showBB && (
              <>
                <Line yAxisId="price" type="monotone" dataKey="bbUpper" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                <Line yAxisId="price" type="monotone" dataKey="bbMiddle" stroke="#8b5cf6" strokeWidth={1} dot={false} />
                <Line yAxisId="price" type="monotone" dataKey="bbLower" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="3 3" />
              </>
            )}
            
            {/* Moving Averages */}
            {showSMA20 && <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#FFB000" strokeWidth={2} dot={false} />}
            {showSMA50 && <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#3B82F6" strokeWidth={2} dot={false} />}
            {showEMA9 && <Line yAxisId="price" type="monotone" dataKey="ema9" stroke="#10B981" strokeWidth={2} dot={false} />}
            {showEMA21 && <Line yAxisId="price" type="monotone" dataKey="ema21" stroke="#F59E0B" strokeWidth={2} dot={false} />}
            
            {/* Candlesticks using Recharts coordinate system */}
            <Bar
              yAxisId="price"
              dataKey="high"
              shape={(props: any) => {
                const { x, y, width, height, payload, index } = props;
                if (!payload || !payload.open || !payload.close || !payload.high || !payload.low) return null;

                const { open, close, high, low } = payload;
                const isGreen = close >= open;
                const color = isGreen ? '#10B981' : '#EF4444';
                
                // Get the Y-axis scale from Recharts
                // We need to find the y-coordinates for each price point
                const allPrices = chartData.flatMap(d => [d.high, d.low]).filter(p => p != null);
                const minPrice = Math.min(...allPrices);
                const maxPrice = Math.max(...allPrices);
                const priceRange = maxPrice - minPrice;
                
                // Chart dimensions (approximate)
                const chartHeight = 450;
                const marginTop = 10;
                const marginBottom = 30;
                const usableHeight = chartHeight - marginTop - marginBottom;
                
                // Scale function: map price to Y coordinate
                const priceToY = (price: number) => {
                  const ratio = (maxPrice - price) / priceRange;
                  return marginTop + ratio * usableHeight;
                };
                
                const highY = priceToY(high);
                const lowY = priceToY(low);
                const openY = priceToY(open);
                const closeY = priceToY(close);
                
                // Candle dimensions
                const candleWidth = Math.max(width * 0.8, 2);
                const candleX = x + (width - candleWidth) / 2;
                const wickX = x + width / 2;
                
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
                
                return (
                  <g key={`candle-${index}`}>
                    {/* High-Low Wick */}
                    <line
                      x1={wickX}
                      y1={highY}
                      x2={wickX}
                      y2={lowY}
                      stroke={color}
                      strokeWidth={1.5}
                    />
                    {/* Open-Close Body */}
                    <rect
                      x={candleX}
                      y={bodyTop}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={color}
                      stroke={color}
                      strokeWidth={1}
                    />
                  </g>
                );
              }}
            />
            
            {/* Current Price Line */}
            <ReferenceLine yAxisId="price" y={currentPrice} stroke="#FFB000" strokeDasharray="3 3" strokeWidth={1.5}>
              <text x="98%" y={-5} fill="#FFB000" fontSize={11} fontWeight="bold" textAnchor="end">
                {currentPrice.toFixed(2)}
              </text>
            </ReferenceLine>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      {showVolume && (
        <div className="w-full mt-2" style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#374151" strokeOpacity={0.3} />
              
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                tickLine={{ stroke: '#374151' }}
                tickFormatter={formatXAxisTick}
              />
              
              <YAxis
                orientation="right"
                stroke="#6b7280"
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                tickFormatter={(value) => (value / 1000).toFixed(0) + 'K'}
              />
              
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    return (
                      <div className="bg-background/95 border border-border p-2 rounded text-xs">
                        Volume: {payload[0].value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: "#6b7280", strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              
              <Bar
                dataKey="volume"
                fill="#10B981"
                opacity={0.6}
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const color = payload?.close >= payload?.open ? '#10B981' : '#EF4444';
                  return <rect x={x} y={y} width={width} height={height} fill={color} opacity={0.6} />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

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

                {/* Zoom Controls */}
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleZoomIn}
                    className="h-8"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleZoomOut}
                    className="h-8"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetZoom}
                    className="h-8"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
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

                {/* Fullscreen Price Chart */}
                <div 
                  className="w-full select-none" 
                  style={{ height: 'calc(100vh - 300px)', cursor: isPanning ? 'grabbing' : 'grab' }}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGreenFS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.3}/>
                        </linearGradient>
                        <linearGradient id="colorRedFS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      
                      <CartesianGrid strokeDasharray="2 2" stroke="#374151" strokeOpacity={0.5} vertical={true} />
                      
                      <XAxis
                        dataKey="time"
                        stroke="#6b7280"
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        tickLine={{ stroke: '#374151' }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={formatXAxisTick}
                      />
                      
                      <YAxis
                        yAxisId="price"
                        orientation="right"
                        domain={['auto', 'auto']}
                        stroke="#6b7280"
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        tickLine={{ stroke: '#374151' }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      
                      {/* Bollinger Bands */}
                      {showBB && (
                        <>
                          <Line yAxisId="price" type="monotone" dataKey="bbUpper" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                          <Line yAxisId="price" type="monotone" dataKey="bbMiddle" stroke="#8b5cf6" strokeWidth={1} dot={false} />
                          <Line yAxisId="price" type="monotone" dataKey="bbLower" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                        </>
                      )}
                      
                      {/* Moving Averages */}
                      {showSMA20 && <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#FFB000" strokeWidth={2} dot={false} />}
                      {showSMA50 && <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#3B82F6" strokeWidth={2} dot={false} />}
                      {showEMA9 && <Line yAxisId="price" type="monotone" dataKey="ema9" stroke="#10B981" strokeWidth={2} dot={false} />}
                      {showEMA21 && <Line yAxisId="price" type="monotone" dataKey="ema21" stroke="#F59E0B" strokeWidth={2} dot={false} />}
                      
                      {/* Candlesticks */}
                      <Bar
                        yAxisId="price"
                        dataKey="high"
                        shape={(props: any) => {
                          const { x, y, width, height, payload, index } = props;
                          if (!payload || !payload.open || !payload.close || !payload.high || !payload.low) return null;

                          const { open, close, high, low } = payload;
                          const isGreen = close >= open;
                          const color = isGreen ? '#10B981' : '#EF4444';
                          
                          const allPrices = chartData.flatMap(d => [d.high, d.low]).filter(p => p != null);
                          const minPrice = Math.min(...allPrices);
                          const maxPrice = Math.max(...allPrices);
                          const priceRange = maxPrice - minPrice;
                          
                          const chartHeight = 450;
                          const marginTop = 10;
                          const marginBottom = 30;
                          const usableHeight = chartHeight - marginTop - marginBottom;
                          
                          const priceToY = (price: number) => {
                            const ratio = (maxPrice - price) / priceRange;
                            return marginTop + ratio * usableHeight;
                          };
                          
                          const highY = priceToY(high);
                          const lowY = priceToY(low);
                          const openY = priceToY(open);
                          const closeY = priceToY(close);
                          
                          const candleWidth = Math.max(width * 0.8, 2);
                          const candleX = x + (width - candleWidth) / 2;
                          const wickX = x + width / 2;
                          
                          const bodyTop = Math.min(openY, closeY);
                          const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
                          
                          return (
                            <g key={`candle-fs-${index}`}>
                              <line
                                x1={wickX}
                                y1={highY}
                                x2={wickX}
                                y2={lowY}
                                stroke={color}
                                strokeWidth={1.5}
                              />
                              <rect
                                x={candleX}
                                y={bodyTop}
                                width={candleWidth}
                                height={bodyHeight}
                                fill={color}
                                stroke={color}
                                strokeWidth={1}
                              />
                            </g>
                          );
                        }}
                      />
                      
                      {/* Current Price Line */}
                      <ReferenceLine yAxisId="price" y={currentPrice} stroke="#FFB000" strokeDasharray="3 3" strokeWidth={1.5}>
                        <text x="98%" y={-5} fill="#FFB000" fontSize={11} fontWeight="bold" textAnchor="end">
                          {currentPrice.toFixed(2)}
                        </text>
                      </ReferenceLine>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Fullscreen Volume Chart */}
                {showVolume && (
                  <div className="w-full mt-2" style={{ height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#374151" strokeOpacity={0.3} />
                        
                        <XAxis
                          dataKey="time"
                          stroke="#6b7280"
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          tickLine={{ stroke: '#374151' }}
                          tickFormatter={formatXAxisTick}
                        />
                        
                        <YAxis
                          orientation="right"
                          stroke="#6b7280"
                          tick={{ fontSize: 9, fill: '#9ca3af' }}
                          tickFormatter={(value) => (value / 1000).toFixed(0) + 'K'}
                        />
                        
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                              return (
                                <div className="bg-background/95 border border-border p-2 rounded text-xs">
                                  Volume: {payload[0].value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ stroke: "#6b7280", strokeWidth: 1, strokeDasharray: "3 3" }}
                        />
                        
                        <Bar
                          dataKey="volume"
                          fill="#10B981"
                          opacity={0.6}
                          shape={(props: any) => {
                            const { x, y, width, height, payload } = props;
                            const color = payload?.close >= payload?.open ? '#10B981' : '#EF4444';
                            return <rect x={x} y={y} width={width} height={height} fill={color} opacity={0.6} />;
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}