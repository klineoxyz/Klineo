/**
 * KLINEO Chart Components (Recharts)
 * 
 * Professional trading charts with the terminal aesthetic.
 */

import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

// KLINEO terminal colors
const COLORS = {
  accent: "#FFB000",
  green: "#10B981",
  red: "#EF4444",
  muted: "#6B7280",
  background: "#0B0D10",
  border: "#1F2937",
};

/**
 * Equity Curve Chart - Portfolio value over time
 */
interface EquityCurveChartProps {
  data: Array<{ date: string; value: number }>;
  title?: string;
  height?: number;
}

export function EquityCurveChart({
  data,
  title = "Portfolio Equity Curve",
  height = 300,
}: EquityCurveChartProps) {
  const startValue = data[0]?.value || 0;
  const endValue = data[data.length - 1]?.value || 0;
  const change = endValue - startValue;
  const changePercent = (change / startValue) * 100;
  const isPositive = change >= 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">
              ${endValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <Badge
              variant="outline"
              className={
                isPositive
                  ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30"
                  : "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30"
              }
            >
              <span className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {isPositive ? "+" : ""}
                {changePercent.toFixed(2)}%
              </span>
            </Badge>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? COLORS.green : COLORS.red}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? COLORS.green : COLORS.red}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
          <XAxis
            dataKey="date"
            stroke={COLORS.muted}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
          />
          <YAxis
            stroke={COLORS.muted}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
            }}
            labelStyle={{ color: COLORS.muted }}
            itemStyle={{ color: isPositive ? COLORS.green : COLORS.red }}
            formatter={(value: number) => [
              `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              "Value",
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? COLORS.green : COLORS.red}
            strokeWidth={2}
            fill="url(#equityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * PnL Bar Chart - Daily profit/loss
 */
interface PnLBarChartProps {
  data: Array<{ date: string; pnl: number }>;
  title?: string;
  height?: number;
}

export function PnLBarChart({
  data,
  title = "Daily PnL",
  height = 300,
}: PnLBarChartProps) {
  const totalPnL = data.reduce((sum, item) => sum + item.pnl, 0);
  const isPositive = totalPnL >= 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span
              className={`text-xl font-bold ${
                isPositive ? "text-[#10B981]" : "text-[#EF4444]"
              }`}
            >
              {isPositive ? "+" : ""}${totalPnL.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
          <XAxis
            dataKey="date"
            stroke={COLORS.muted}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
          />
          <YAxis
            stroke={COLORS.muted}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
            }}
            labelStyle={{ color: COLORS.muted }}
            formatter={(value: number) => [
              `${value >= 0 ? "+" : ""}$${value.toLocaleString()}`,
              "PnL",
            ]}
            cursor={{ fill: "rgba(255, 176, 0, 0.1)" }}
          />
          <Bar
            dataKey="pnl"
            fill={COLORS.accent}
            radius={[4, 4, 0, 0]}
            shape={(props: any) => {
              const { x, y, width, height, value } = props;
              const fill = value >= 0 ? COLORS.green : COLORS.red;
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={fill}
                  rx={4}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Win Rate Pie Chart
 */
interface WinRateChartProps {
  wins: number;
  losses: number;
  title?: string;
  height?: number;
}

export function WinRateChart({
  wins,
  losses,
  title = "Win Rate",
  height = 300,
}: WinRateChartProps) {
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const data = [
    { name: "Wins", value: wins, color: COLORS.green },
    { name: "Losses", value: losses, color: COLORS.red },
  ];

  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="text-4xl font-bold text-accent">
          {winRate.toFixed(1)}%
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {wins}W / {losses}L ({total} total trades)
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
            }}
            formatter={(value: number) => [value, "Trades"]}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-[#10B981]" />
          <span className="text-sm text-muted-foreground">Wins ({wins})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-[#EF4444]" />
          <span className="text-sm text-muted-foreground">Losses ({losses})</span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Portfolio Allocation Chart
 */
interface AllocationData {
  symbol: string;
  value: number;
  percentage: number;
}

interface PortfolioAllocationChartProps {
  data: AllocationData[];
  title?: string;
  height?: number;
}

export function PortfolioAllocationChart({
  data,
  title = "Portfolio Allocation",
  height = 300,
}: PortfolioAllocationChartProps) {
  const CHART_COLORS = [
    COLORS.accent,
    COLORS.green,
    "#8B5CF6",
    "#3B82F6",
    "#EC4899",
    "#F59E0B",
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">{title}</h3>

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ symbol, percentage }) => `${symbol} ${percentage.toFixed(1)}%`}
            outerRadius={100}
            fill={COLORS.accent}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
            }}
            formatter={(value: number) => [
              `$${value.toLocaleString()}`,
              "Value",
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {data.map((item, index) => (
          <div key={item.symbol} className="flex items-center gap-2">
            <div
              className="size-3 rounded-full"
              style={{
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
            <span className="text-sm text-muted-foreground">
              {item.symbol}: ${item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Performance Comparison Line Chart
 */
interface PerformanceData {
  date: string;
  trader1: number;
  trader2: number;
  trader3?: number;
}

interface PerformanceComparisonChartProps {
  data: PerformanceData[];
  traders: string[];
  title?: string;
  height?: number;
}

export function PerformanceComparisonChart({
  data,
  traders,
  title = "Trader Performance Comparison",
  height = 300,
}: PerformanceComparisonChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">{title}</h3>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
          <XAxis
            dataKey="date"
            stroke={COLORS.muted}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
          />
          <YAxis
            stroke={COLORS.muted}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.background,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
            }}
            labelStyle={{ color: COLORS.muted }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, ""]}
          />
          <Legend
            wrapperStyle={{ color: COLORS.muted }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="trader1"
            stroke={COLORS.accent}
            strokeWidth={2}
            name={traders[0] || "Trader 1"}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="trader2"
            stroke={COLORS.green}
            strokeWidth={2}
            name={traders[1] || "Trader 2"}
            dot={false}
          />
          {data[0]?.trader3 !== undefined && (
            <Line
              type="monotone"
              dataKey="trader3"
              stroke="#3B82F6"
              strokeWidth={2}
              name={traders[2] || "Trader 3"}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Generate mock data helpers
 */
export const generateEquityCurveData = (days: number = 30, startValue: number = 10000) => {
  const data = [];
  let value = startValue;

  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.48) * 200; // Slight upward bias
    value = Math.max(value + change, startValue * 0.7); // Don't go below 70% of start
    
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(value * 100) / 100,
    });
  }

  return data;
};

export const generatePnLData = (days: number = 14) => {
  const data = [];

  for (let i = 0; i < days; i++) {
    const pnl = (Math.random() - 0.45) * 500; // Slight upward bias
    
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pnl: Math.round(pnl * 100) / 100,
    });
  }

  return data;
};

export const generatePerformanceData = (days: number = 30) => {
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      trader1: Math.random() * 20 - 5 + i * 0.5,
      trader2: Math.random() * 15 - 3 + i * 0.3,
      trader3: Math.random() * 25 - 8 + i * 0.4,
    });
  }

  return data;
};
