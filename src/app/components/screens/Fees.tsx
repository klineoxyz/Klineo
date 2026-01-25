import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Info } from "lucide-react";

const feeLedger = [
  {
    period: "Jan 2026",
    realizedProfit: 1245.50,
    platformFee: 249.10,
    status: "Collected",
    settlementDate: "Jan 23, 2026",
  },
  {
    period: "Dec 2025",
    realizedProfit: 892.30,
    platformFee: 178.46,
    status: "Collected",
    settlementDate: "Dec 28, 2025",
  },
  {
    period: "Nov 2025",
    realizedProfit: 1567.80,
    platformFee: 313.56,
    status: "Collected",
    settlementDate: "Nov 29, 2025",
  },
  {
    period: "Oct 2025",
    realizedProfit: -245.00,
    platformFee: 0,
    status: "No Fee",
    settlementDate: "—",
  },
];

export function Fees() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Fees</h1>
        <p className="text-sm text-muted-foreground">Platform fee ledger for copied trades</p>
      </div>

      {/* Fee Structure Explanation */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="size-4 text-primary" />
        <AlertDescription>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Platform Fee Structure</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Platform fees are charged at <span className="text-foreground font-medium">20% of profitable copied trades</span></li>
              <li>• Fees are calculated on realized profits only</li>
              <li>• No fees charged on losing trades</li>
              <li>• Fees are settled at the end of each trading period</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">This Month's Profit</div>
          <div className="text-2xl font-semibold text-[#10B981]">$1,245.50</div>
          <div className="text-xs text-muted-foreground">From copied trades</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Platform Fee (Due)</div>
          <div className="text-2xl font-semibold text-primary">$249.10</div>
          <div className="text-xs text-muted-foreground">20% of profit</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Fees Paid (All Time)</div>
          <div className="text-2xl font-semibold">$741.12</div>
          <div className="text-xs text-muted-foreground">Since account creation</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Net Profit (After Fees)</div>
          <div className="text-2xl font-semibold text-[#10B981]">$2,964.48</div>
          <div className="text-xs text-muted-foreground">All time</div>
        </Card>
      </div>

      {/* Fee Ledger */}
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Platform Fee Ledger</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Realized Profit</TableHead>
              <TableHead>Platform Fee (20%)</TableHead>
              <TableHead>Fee Status</TableHead>
              <TableHead>Settlement Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeLedger.map((fee, i) => (
              <TableRow key={i}>
                <TableCell className="font-semibold">{fee.period}</TableCell>
                <TableCell className={`font-mono ${fee.realizedProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {fee.realizedProfit >= 0 ? "+" : ""}${fee.realizedProfit.toFixed(2)}
                </TableCell>
                <TableCell className="font-mono font-semibold text-primary">
                  ${fee.platformFee.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={fee.status === "Collected" ? "default" : "secondary"}
                    className={
                      fee.status === "Collected" 
                        ? "border-[#10B981]/50 text-[#10B981] bg-[#10B981]/10" 
                        : fee.status === "No Fee"
                        ? "border-muted-foreground/50 text-muted-foreground"
                        : ""
                    }
                  >
                    {fee.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{fee.settlementDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Fee Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Current Period Breakdown (Jan 2026)</h3>
        <div className="space-y-3">
          {[
            { trader: "ProTrader_XYZ", profit: 567.30, fee: 113.46 },
            { trader: "AlphaStrategist", profit: 324.80, fee: 64.96 },
            { trader: "QuantMaster_Pro", profit: 353.40, fee: 70.68 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded border border-border">
              <div>
                <div className="font-semibold mb-1">{item.trader}</div>
                <div className="text-sm text-muted-foreground">Realized Profit: <span className="text-[#10B981] font-mono">${item.profit.toFixed(2)}</span></div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Platform Fee (20%)</div>
                <div className="text-lg font-semibold text-primary">${item.fee.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
