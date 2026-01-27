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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">Fees & Allowance</h1>
        <p className="text-sm text-muted-foreground">Profit allowance usage and payment history</p>
      </div>

      {/* Allowance / Credit-based explanation */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="size-4 text-primary" />
        <AlertDescription>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Credit-based allowance</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Your package grants a profit allowance (e.g. $300, $1,000, $5,000)</li>
              <li>• Trade until you earn up to that amount in profit</li>
              <li>• When you hit the cap, buy another package to unlock more allowance</li>
              <li>• No per-trade fee</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">This Month's Profit</div>
          <div className="text-xl sm:text-2xl font-semibold text-[#10B981]">$1,245.50</div>
          <div className="text-xs text-muted-foreground">From copied trades</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Allowance used</div>
          <div className="text-xl sm:text-2xl font-semibold text-primary">$249.10</div>
          <div className="text-xs text-muted-foreground">Of your profit allowance</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Packages purchased</div>
          <div className="text-xl sm:text-2xl font-semibold">$741.12</div>
          <div className="text-xs text-muted-foreground">Since account creation</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Net Profit (After Fees)</div>
          <div className="text-xl sm:text-2xl font-semibold text-[#10B981]">$2,964.48</div>
          <div className="text-xs text-muted-foreground">All time</div>
        </Card>
      </div>

      {/* Fee Ledger */}
      <Card>
        <div className="p-4 sm:p-6 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold">Allowance & payments</h3>
        </div>
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Realized Profit</TableHead>
              <TableHead>Allowance used</TableHead>
              <TableHead>Status</TableHead>
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
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Current Period Breakdown (Jan 2026)</h3>
        <div className="space-y-3">
          {[
            { trader: "ProTrader_XYZ", profit: 567.30, fee: 113.46 },
            { trader: "AlphaStrategist", profit: 324.80, fee: 64.96 },
            { trader: "QuantMaster_Pro", profit: 353.40, fee: 70.68 },
          ].map((item, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-secondary/30 rounded border border-border">
              <div>
                <div className="font-semibold mb-1">{item.trader}</div>
                <div className="text-sm text-muted-foreground">Realized Profit: <span className="text-[#10B981] font-mono">${item.profit.toFixed(2)}</span></div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Allowance used</div>
                <div className="text-lg font-semibold text-primary">${item.fee.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
