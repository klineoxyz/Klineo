import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Download, Search, Loader2, LayoutGrid, Users } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { useDemo } from "@/app/contexts/DemoContext";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ErrorState } from "@/app/components/ui/error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { formatDistanceToNow, format } from "date-fns";

type SourceFilter = "all" | "copy" | "dca";

interface Trade {
  id: string;
  orderId?: string;
  positionId?: string;
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  fee: number;
  source?: "copy" | "dca";
  dcaBotId?: string | null;
  dcaBotName?: string | null;
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
  const { isDemoMode, demoTrades, clearDemo } = useDemo();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const displayTrades = isDemoMode ? demoTrades : trades;

  const loadTrades = async (pageNum: number = 1, source: SourceFilter = sourceFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: "50" });
      if (source !== "all") params.set("source", source);
      const data = await api.get<TradesResponse>(`/api/trades?${params.toString()}`);
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
    if (!isDemoMode) loadTrades(1, sourceFilter);
    else setIsLoading(false);
  }, [isDemoMode, sourceFilter]);

  // Filter trades by search term
  const filteredTrades = displayTrades.filter((trade) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      trade.symbol.toLowerCase().includes(term) ||
      trade.id.toLowerCase().includes(term)
    );
  });

  // Calculate summary stats
  const todayTrades = displayTrades.filter((t) => {
    const today = new Date();
    const tradeDate = new Date(t.executedAt);
    return tradeDate.toDateString() === today.toDateString();
  });

  const totalVolume = displayTrades.reduce((sum, t) => sum + (t.amount * t.price), 0);
  const totalFees = displayTrades.reduce((sum, t) => sum + t.fee, 0);

  if (!isDemoMode && isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isDemoMode && error && trades.length === 0) {
    return (
      <div className="p-4 sm:p-6">
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Trade History</h1>
          <p className="text-sm text-muted-foreground">Complete history of executed trades</p>
        </div>
        {isDemoMode && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">Demo</Badge>
            <Button variant="ghost" size="sm" onClick={clearDemo}>Exit demo</Button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Today's Trades</div>
          <div className="text-xl sm:text-2xl font-semibold">{todayTrades.length}</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Volume</div>
          <div className="text-xl sm:text-2xl font-semibold">${(totalVolume / 1000).toFixed(1)}k</div>
          <div className="text-xs text-muted-foreground">USDT</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Trades</div>
          <div className="text-xl sm:text-2xl font-semibold">{total}</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Fees Paid</div>
          <div className="text-xl sm:text-2xl font-semibold">${totalFees.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Exchange + Platform</div>
        </Card>
      </div>

      {/* Source filter + Search & Export */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          {!isDemoMode && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Source:</span>
              <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)} className="w-auto">
                <TabsList className="h-9">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="copy" className="gap-1"><Users className="size-3.5" /> Copy Trading</TabsTrigger>
                  <TabsTrigger value="dca" className="gap-1"><LayoutGrid className="size-3.5" /> DCA Bots</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="w-full sm:max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by symbol, trade ID..." 
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline" className="gap-2 w-full sm:w-auto shrink-0" disabled>
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Trade History Table */}
      {filteredTrades.length === 0 ? (
        <Card className="p-6 sm:p-12">
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
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="text-base sm:text-lg font-semibold">Executed Trades</h3>
          </div>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Trade ID</TableHead>
                <TableHead>Source</TableHead>
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
                    <TableCell>
                      {trade.source === "dca" ? (
                        <a href="#/dca-bots" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <LayoutGrid className="size-3.5" />
                          <Badge variant="secondary">{trade.dcaBotName ?? "DCA Bot"}</Badge>
                        </a>
                      ) : (
                        <Badge variant="outline" className="gap-1"><Users className="size-3.5" /> Copy Trading</Badge>
                      )}
                    </TableCell>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t">
              <div className="text-sm text-muted-foreground order-2 sm:order-1">
                Page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTrades(page - 1, sourceFilter)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTrades(page + 1, sourceFilter)}
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
