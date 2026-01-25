import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Activity, Pause, StopCircle, AlertTriangle } from "lucide-react";

const activeCopies = [
  {
    trader: "ProTrader_XYZ",
    status: "paused",
    allocation: "$1,000.00",
    pnl: "+$245.50",
    lastTrade: "2 min ago",
    errors: 0,
  },
  {
    trader: "AlphaStrategist",
    status: "running",
    allocation: "$1,500.00",
    pnl: "+$387.20",
    lastTrade: "15 sec ago",
    errors: 0,
  },
  {
    trader: "QuantMaster_Pro",
    status: "running",
    allocation: "$2,000.00",
    pnl: "+$612.80",
    lastTrade: "1 min ago",
    errors: 0,
  },
];

interface CopyTradingProps {
  onNavigate: (view: string) => void;
}

export function CopyTrading({ onNavigate }: CopyTradingProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Copy Trading</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage your active copy positions</p>
        </div>
        <Button onClick={() => onNavigate("marketplace")} className="bg-primary text-primary-foreground">
          Browse Traders
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Copies</div>
          <div className="text-2xl font-semibold">3</div>
          <div className="text-xs text-muted-foreground">of 5 max</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Allocated</div>
          <div className="text-2xl font-semibold">$4,500.00</div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total PnL</div>
          <div className="text-2xl font-semibold text-[#10B981]">+$1,245.50</div>
          <div className="text-xs text-muted-foreground">+27.68%</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Copy Engine</div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#10B981]" />
            <span className="font-medium">Running</span>
          </div>
          <div className="text-xs text-muted-foreground">No errors</div>
        </Card>
      </div>

      {/* Active Copy Traders */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Active Copy Positions</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trader</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead>PnL</TableHead>
              <TableHead>Last Trade</TableHead>
              <TableHead>Errors</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeCopies.map((copy, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-muted flex items-center justify-center text-xs font-semibold">
                      {copy.trader.charAt(0)}
                    </div>
                    <div className="font-medium">{copy.trader}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={copy.status === "running" ? "default" : "secondary"}
                    className="gap-1"
                  >
                    {copy.status === "running" ? (
                      <><Activity className="size-3" /> Running</>
                    ) : (
                      <><Pause className="size-3" /> Paused</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">{copy.allocation}</TableCell>
                <TableCell className="font-mono text-[#10B981]">{copy.pnl}</TableCell>
                <TableCell className="text-muted-foreground">{copy.lastTrade}</TableCell>
                <TableCell>
                  {copy.errors > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="size-3" />
                      {copy.errors}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm">
                      {copy.status === "running" ? "Pause" : "Resume"}
                    </Button>
                    <Button variant="outline" size="sm" className="text-[#EF4444] border-[#EF4444]/50 hover:bg-[#EF4444]/10">
                      <StopCircle className="size-3 mr-1" />
                      Stop
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Risk Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Risk Status</h3>
        <div className="grid grid-cols-3 gap-6">
          {activeCopies.map((copy, i) => (
            <div key={i} className="space-y-3">
              <div className="font-medium">{copy.trader}</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Daily Loss:</span>
                  <span className="text-[#10B981]">-2.3% of 5.0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Drawdown:</span>
                  <span className="text-[#10B981]">-4.1% of 15.0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open Positions:</span>
                  <span>2 / 10 max</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
