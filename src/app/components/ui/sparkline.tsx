import { useState, useCallback, useId } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  /** Format tooltip value. Default: (v) => v.toFixed(2) */
  valueFormatter?: (value: number, index: number) => string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = "#FFB000",
  className = "",
  valueFormatter = (v) => v.toFixed(2),
}: SparklineProps) {
  const [hovered, setHovered] = useState<{ index: number; x: number; y: number } | null>(null);
  const gradientId = useId().replace(/:/g, "-");

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const index = Math.min(data.length - 1, Math.floor(pct * data.length));
      setHovered({ index, x, y: e.clientY - rect.top });
    },
    [data.length]
  );

  const handleMouseLeave = useCallback(() => setHovered(null), []);

  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const divisor = Math.max(1, data.length - 1);
  const points = data.map((value, index) => {
    const x = (index / divisor) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y, value, index };
  });

  const pathData = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaPathData = `${pathData} L ${width},${height} L 0,${height} Z`;

  const hoveredPoint = hovered ? points[hovered.index] : null;
  const tooltipLeft = hovered ? Math.max(4, Math.min(width - 84, hovered.x)) : 0;
  const tooltipTop = hovered
    ? hovered.y < height / 2
      ? Math.min(height - 32, hovered.y + 10)
      : Math.max(4, hovered.y - 26)
    : 0;

  return (
    <div className="relative inline-block" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        className={`cursor-crosshair ${className}`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={`gradient-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPathData} fill={`url(#gradient-${gradientId})`} />
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              y1={hoveredPoint.y}
              x2={hoveredPoint.x}
              y2={height}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4"
              fill={color}
              stroke="var(--background, #0B0D10)"
              strokeWidth="1.5"
            />
          </>
        )}
      </svg>
      {hoveredPoint && hovered && (
        <div
          className="absolute z-10 pointer-events-none px-2 py-1 rounded text-xs font-medium bg-card border border-border shadow-lg whitespace-nowrap"
          style={{ left: tooltipLeft, top: tooltipTop }}
        >
          Day {hoveredPoint.index + 1}: {valueFormatter(hoveredPoint.value, hoveredPoint.index)}
        </div>
      )}
    </div>
  );
}

export function generateSparklineData(
  days: number,
  baseValue: number,
  volatility: number = 0.1,
  trend: number = 0
): number[] {
  const data: number[] = [];
  let currentValue = baseValue;

  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * baseValue * volatility;
    const trendChange = (trend / days) * baseValue;
    currentValue = currentValue + change + trendChange;
    data.push(currentValue);
  }

  return data;
}
