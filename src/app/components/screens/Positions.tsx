import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ErrorState } from "@/app/components/ui/error-state";
import { formatDistanceToNow } from "date-fns";

interface Position {
  id: string;
  copySetupId?: string;
  trader?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  currentPrice?: number | null;
  unrealizedPnl?: number | null;
  exchangeOrderId?: string;
  openedAt: string;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PositionsResponse {
  positions: Position[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadPositions = async (pageNum: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<PositionsResponse>(`/api/positions?page=${pageNum}&limit=50`);
      setPositions(data.positions || []);
      setPage(data.page);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      const message = err?.message || "Failed to load positions";
      setError(message);
      if (!message.includes("VITE_API_BASE_URL not set")) {
        toast.error("Failed to load positions", { description: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPositions(1);
  }, []);

  // Calculate summary stats
  const openPositions = positions.filter((p) => !p.closedAt);
  const totalUnrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

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

  if (error && positions.length === 0) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load positions"
          message={error.includes("VITE_API_BASE_URL not set") 
            ? "Backend not configured. Please try again later."
            : error}
          action={
            <Button onClick={() => loadPositions(page)} variant="outline">
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
        <h1 className="text-2xl font-semibold mb-1">Positions</h1>
        <p className="text-sm text-muted-foreground">Active trading positions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Open Positions</div>
          <div className="text-2xl font-semibold">{openPositions.length}</div>
          <div className="text-xs text-muted-foreground">of {total} total</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Unrealized PnL</div>
          <div className={`text-2xl font-semibold ${totalUnrealizedPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {totalUnrealizedPnl !== 0 ? `${((totalUnrealizedPnl / Math.abs(totalUnrealizedPnl)) * 100).toFixed(2)}%` : "0%"}
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Closed Positions</div>
          <div className="text-2xl font-semibold">{positions.length - openPositions.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Positions</div>
          <div className="text-2xl font-semibold">{total}</div>
          <div className="text-xs text-muted-foreground">All time</div>
        </Card>
      </div>

      {/* Positions Table */}
      {positions.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={X}
            title="No positions yet"
            description="Your trading positions will appear here once you start copying traders or place manual trades."
          />
        </Card>
      ) : (
        <Card>
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">All Positions</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Entry Price</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>PnL</TableHead>
                <TableHead>Linked Trader</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-mono font-semibold">{position.symbol}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={position.side === "long" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                    >
                      {position.side.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{position.size.toFixed(8)}</TableCell>
                  <TableCell className="font-mono">${position.entryPrice.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">
                    {position.currentPrice ? `$${position.currentPrice.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    {position.unrealizedPnl !== null && position.unrealizedPnl !== undefined ? (
                      <div className={`font-mono ${position.unrealizedPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {position.unrealizedPnl >= 0 ? "+" : ""}${position.unrealizedPnl.toFixed(2)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {position.trader ? (
                      <Badge variant="outline" className="text-xs">
                        {position.trader.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Manual</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(position.openedAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    {position.closedAt ? (
                      <Badge variant="secondary">Closed</Badge>
                    ) : (
                      <Badge variant="default">Open</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
                  onClick={() => loadPositions(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPositions(page + 1)}
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
