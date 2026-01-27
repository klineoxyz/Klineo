import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Download } from "lucide-react";
import { Button } from "@/app/components/ui/button";

const payments = [
  {
    id: "INV-2026-003",
    amount: "$79.00",
    currency: "USDT",
    status: "Paid",
    date: "Jan 15, 2026",
    method: "Crypto",
  },
  {
    id: "INV-2025-012",
    amount: "$79.00",
    currency: "USDT",
    status: "Paid",
    date: "Dec 15, 2025",
    method: "Crypto",
  },
  {
    id: "INV-2025-011",
    amount: "$79.00",
    currency: "USDT",
    status: "Paid",
    date: "Nov 15, 2025",
    method: "Crypto",
  },
  {
    id: "INV-2025-010",
    amount: "$426.60",
    currency: "USDT",
    status: "Paid",
    date: "Oct 15, 2025",
    method: "Crypto",
  },
];

interface PaymentsProps {
  onNavigate: (view: string) => void;
}

export function Payments({ onNavigate }: PaymentsProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Payment History</h1>
        <p className="text-sm text-muted-foreground">View your payment history (joining fee & packages)</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</div>
          <div className="text-2xl font-semibold">$663.60</div>
          <div className="text-xs text-muted-foreground">All time</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Last Payment</div>
          <div className="text-2xl font-semibold">$79.00</div>
          <div className="text-xs text-muted-foreground">Jan 15, 2026</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Next Payment</div>
          <div className="text-2xl font-semibold">$79.00</div>
          <div className="text-xs text-muted-foreground">Feb 15, 2026</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method</div>
          <div className="text-xl font-semibold">Crypto</div>
          <div className="text-xs text-muted-foreground">CoinPayments</div>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">Payment History</h3>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" />
            Export
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm font-semibold">{payment.id}</TableCell>
                <TableCell className="font-mono text-lg">{payment.amount}</TableCell>
                <TableCell><Badge variant="outline">{payment.currency}</Badge></TableCell>
                <TableCell className="text-sm">{payment.method}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-[#10B981]/50 text-[#10B981] bg-[#10B981]/10">
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{payment.date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    View Invoice
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Invoice Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Latest Invoice Details</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice Number:</span>
              <span className="font-mono font-semibold">INV-2026-003</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Issue Date:</span>
              <span>Jan 15, 2026</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-semibold">Pro (Monthly)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Period:</span>
              <span>Jan 15, 2026 - Feb 15, 2026</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono">$79.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount:</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax:</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border">
              <span className="font-semibold">Total:</span>
              <span className="font-mono text-xl font-semibold">$79.00</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
