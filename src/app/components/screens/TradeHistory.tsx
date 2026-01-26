import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Download, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ErrorState } from "@/app/components/ui/error-state";
import { formatDistanceToNow, format } from "date-fns";

interface Trade {
  id: string;
  orderId?: string;
  positionId?: string;
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  fee: number;
  executedAt: string;
  createdAt: string;
}

interface TradesResponse {
  trades: Trade[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const loadTrades = async (pageNum: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<TradesResponse>(`/api/trades?page=${pageNum}&limit=50`);
      setTrades(data.trades || []);
      setPage(data.page);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      const message = err?.message || "Failed to load trades";
      setError(message);
      if (!message.includes("VITE_API_BASE_URL not set")) {
        toast.error("Failed to load trades", { description: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrades(1);
  }, []);

  // Filter trades by search term
  const filteredTrades = trades.filter((trade) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      trade.symbol.toLowerCase().includes(term) ||
      trade.id.toLowerCase().includes(term)
    );
  });

  // Calculate summary stats
  const todayTrades = trades.filter((t) => {
    const today = new Date();
    const tradeDate = new Date(t.executedAt);
    return tradeDate.toDateString() === today.toDateString();
  });

  const totalVolume = trades.reduce((sum, t) => sum + (t.amount * t.price), 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error && trades.length === 0) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load trades"
          message={error.includes("VITE_API_BASE_URL not set") 
            ? "Backend not configured. Please try again later."
            : error}
          action={
            <Button onClick={() => loadTrades(page)} variant="outline">
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

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
          <div className="text-2xl font-semibold">{todayTrades.length}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Volume</div>
          <div className="text-2xl font-semibold">${(totalVolume / 1000).toFixed(1)}k</div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Trades</div>
          <div className="text-2xl font-semibold">{total}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Fees Paid</div>
          <div className="text-2xl font-semibold">${totalFees.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Exchange + Platform</div>
        </Card>
      </div>

      {/* Filters & Export */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search by symbol, trade ID..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" className="gap-2" disabled>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Trade History Table */}
      {filteredTrades.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Search}
            title={searchTerm ? "No trades found" : "No trades yet"}
            description={searchTerm 
              ? "Try adjusting your search terms."
              : "Your executed trades will appear here once you start copying traders or place manual trades."}
          />
        </Card>
      ) : (
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
                <TableHead>Amount</TableHead>
                <TableHead>Total (USDT)</TableHead>
                <TableHead>Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.map((trade) => {
                const total = trade.amount * trade.price;
                return (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono text-xs">{trade.id.substring(0, 8)}...</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(trade.executedAt), "MMM dd, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={trade.side === "buy" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                      >
                        {trade.side.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">${trade.price.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{trade.amount.toFixed(8)}</TableCell>
                    <TableCell className="font-mono">${total.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">${trade.fee.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTrades(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTrades(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
