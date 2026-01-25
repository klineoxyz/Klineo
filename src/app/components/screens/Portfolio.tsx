import { Card } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const equityData = [
  { date: "Jan 15", value: 20000 },
  { date: "Jan 16", value: 20450 },
  { date: "Jan 17", value: 20280 },
  { date: "Jan 18", value: 21100 },
  { date: "Jan 19", value: 22300 },
  { date: "Jan 20", value: 22850 },
  { date: "Jan 21", value: 23420 },
  { date: "Jan 22", value: 24150 },
  { date: "Jan 23", value: 24567 },
];

const assets = [
  { symbol: "USDT", balance: 8234.50, equity: 8234.50, unrealizedPnL: 0, allocation: 33.5 },
  { symbol: "BTC", balance: 0.3456, equity: 13567.80, unrealizedPnL: 245.60, allocation: 55.2 },
  { symbol: "ETH", balance: 1.2340, equity: 2765.70, unrealizedPnL: -128.45, allocation: 11.3 },
];

export function Portfolio() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Portfolio</h1>
        <p className="text-sm text-muted-foreground">Overview of your asset balances and equity</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Equity</div>
          <div className="text-2xl font-semibold">$24,567.82</div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Unrealized PnL</div>
          <div className="text-2xl font-semibold text-[#10B981]">+$117.15</div>
          <div className="text-xs text-muted-foreground">+0.48%</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Realized PnL (24h)</div>
          <div className="text-2xl font-semibold text-[#10B981]">+$342.18</div>
          <div className="text-xs text-muted-foreground">+1.42%</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Margin Usage</div>
          <div className="text-2xl font-semibold">23.4%</div>
          <div className="text-xs text-muted-foreground">$5,750 / $24,567</div>
        </Card>
      </div>

      {/* Equity Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Equity Chart</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" />
            <XAxis dataKey="date" stroke="#8B8B8B" />
            <YAxis stroke="#8B8B8B" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#12151A",
                border: "1px solid #2A2D35",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#8B8B8B" }}
              formatter={(value: number) => [`$${value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Equity"]}
              cursor={{ stroke: "#374151", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#10B981", stroke: "#12151A", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Asset Balances */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Asset Balances</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Equity (USDT)</TableHead>
              <TableHead>Unrealized PnL</TableHead>
              <TableHead>Portfolio %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {asset.symbol.charAt(0)}
                    </div>
                    <span className="font-semibold">{asset.symbol}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{asset.balance.toFixed(4)}</TableCell>
                <TableCell className="font-mono">${asset.equity.toFixed(2)}</TableCell>
                <TableCell className={`font-mono ${asset.unrealizedPnL >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {asset.unrealizedPnL >= 0 ? "+" : ""}${asset.unrealizedPnL.toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${asset.allocation}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono w-12 text-right">{asset.allocation}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
