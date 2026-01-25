import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { X } from "lucide-react";

const positions = [
  {
    symbol: "BTCUSDT",
    side: "LONG",
    size: 0.156,
    entry: 43250.00,
    mark: 43820.50,
    liquidation: 38500.00,
    pnl: 88.98,
    pnlPercent: 1.32,
    trader: "ProTrader_XYZ",
  },
  {
    symbol: "ETHUSDT",
    side: "SHORT",
    size: 2.340,
    entry: 2285.60,
    mark: 2245.30,
    liquidation: 2650.00,
    pnl: 94.30,
    pnlPercent: 1.76,
    trader: null,
  },
  {
    symbol: "SOLUSDT",
    side: "LONG",
    size: 45.2,
    entry: 98.45,
    mark: 95.20,
    liquidation: 85.00,
    pnl: -146.90,
    pnlPercent: -3.30,
    trader: "QuantMaster_Pro",
  },
];

export function Positions() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Positions</h1>
        <p className="text-sm text-muted-foreground">Active trading positions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Open Positions</div>
          <div className="text-2xl font-semibold">{positions.length}</div>
          <div className="text-xs text-muted-foreground">3 active</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Unrealized PnL</div>
          <div className="text-2xl font-semibold text-[#10B981]">+$36.38</div>
          <div className="text-xs text-muted-foreground">+0.15%</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Margin Used</div>
          <div className="text-2xl font-semibold">$5,750.00</div>
          <div className="text-xs text-muted-foreground">23.4% of equity</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg Leverage</div>
          <div className="text-2xl font-semibold">3.2x</div>
          <div className="text-xs text-muted-foreground">Cross margin</div>
        </Card>
      </div>

      {/* Positions Table */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Open Positions</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Mark Price</TableHead>
              <TableHead>Liq. Price</TableHead>
              <TableHead>PnL</TableHead>
              <TableHead>Linked Trader</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono font-semibold">{position.symbol}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={position.side === "LONG" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                  >
                    {position.side}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">{position.size}</TableCell>
                <TableCell className="font-mono">${position.entry.toFixed(2)}</TableCell>
                <TableCell className="font-mono">${position.mark.toFixed(2)}</TableCell>
                <TableCell className="font-mono text-[#EF4444]">${position.liquidation.toFixed(2)}</TableCell>
                <TableCell>
                  <div className={`font-mono ${position.pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                  </div>
                  <div className={`text-xs font-mono ${position.pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    ({position.pnlPercent >= 0 ? "+" : ""}{position.pnlPercent.toFixed(2)}%)
                  </div>
                </TableCell>
                <TableCell>
                  {position.trader ? (
                    <Badge variant="outline" className="text-xs">
                      {position.trader}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">Manual</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="gap-1">
                    <X className="size-3" />
                    Close
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
