import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Download, Search } from "lucide-react";

const trades = [
  {
    id: "TRD-2024-001",
    symbol: "BTCUSDT",
    side: "BUY",
    price: 43250.00,
    size: 0.156,
    total: 6747.00,
    fee: 6.75,
    trader: "ProTrader_XYZ",
    leaderTradeId: "LDR-001",
    time: "Jan 23, 2026 14:32:15",
  },
  {
    id: "TRD-2024-002",
    symbol: "ETHUSDT",
    side: "SELL",
    price: 2245.30,
    size: 2.340,
    total: 5254.00,
    fee: 5.25,
    trader: null,
    leaderTradeId: null,
    time: "Jan 23, 2026 13:15:42",
  },
  {
    id: "TRD-2024-003",
    symbol: "SOLUSDT",
    side: "BUY",
    price: 98.45,
    size: 45.2,
    total: 4450.14,
    fee: 4.45,
    trader: "QuantMaster_Pro",
    leaderTradeId: "LDR-023",
    time: "Jan 23, 2026 12:08:28",
  },
  {
    id: "TRD-2024-004",
    symbol: "BTCUSDT",
    side: "SELL",
    price: 42850.00,
    size: 0.100,
    total: 4285.00,
    fee: 4.29,
    trader: "ProTrader_XYZ",
    leaderTradeId: "LDR-018",
    time: "Jan 23, 2026 10:45:11",
  },
];

export function TradeHistory() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Trade History</h1>
        <p className="text-sm text-muted-foreground">Complete history of executed trades</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Today's Trades</div>
          <div className="text-2xl font-semibold">18</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Volume (24h)</div>
          <div className="text-2xl font-semibold">$45,287</div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Copied Trades</div>
          <div className="text-2xl font-semibold">12</div>
          <div className="text-xs text-muted-foreground">66.7% of total</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Fees Paid</div>
          <div className="text-2xl font-semibold">$142.35</div>
          <div className="text-xs text-muted-foreground">Exchange + Platform</div>
        </Card>
      </div>

      {/* Filters & Export */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search by symbol, trader..." className="pl-9" />
            </div>
            <Select defaultValue="all-symbols">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-symbols">All Symbols</SelectItem>
                <SelectItem value="btc">BTC</SelectItem>
                <SelectItem value="eth">ETH</SelectItem>
                <SelectItem value="sol">SOL</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-traders">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-traders">All Traders</SelectItem>
                <SelectItem value="manual">Manual Only</SelectItem>
                <SelectItem value="copied">Copied Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Trade History Table */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Executed Trades</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trade ID</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Total (USDT)</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Leader Trade ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{trade.id}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{trade.time}</TableCell>
                <TableCell className="font-mono font-semibold">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={trade.side === "BUY" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                  >
                    {trade.side}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">${trade.price.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.size}</TableCell>
                <TableCell className="font-mono">${trade.total.toFixed(2)}</TableCell>
                <TableCell className="font-mono text-muted-foreground">${trade.fee.toFixed(2)}</TableCell>
                <TableCell>
                  {trade.trader ? (
                    <Badge variant="outline" className="text-xs">{trade.trader}</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Manual</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {trade.leaderTradeId || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
