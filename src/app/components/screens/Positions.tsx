import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { X, Loader2, LayoutGrid, Copy, User } from "lucide-react";
import { api, dcaBots, type DcaBot } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { useDemo } from "@/app/contexts/DemoContext";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ErrorState } from "@/app/components/ui/error-state";
import { formatDistanceToNow } from "date-fns";

type PositionSource = "manual" | "copy" | "dca";

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

/** Derive display source for a position */
function positionSource(p: Position): PositionSource {
  if (p.copySetupId || p.trader) return "copy";
  return "manual";
}

interface PositionsResponse {
  positions: Position[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PositionsProps {
  onNavigate?: (view: string) => void;
}

export function Positions({ onNavigate }: PositionsProps) {
  const { isDemoMode, demoPositions, clearDemo } = useDemo();
  const [positions, setPositions] = useState<Position[]>([]);
  const [dcaBotsList, setDcaBotsList] = useState<DcaBot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dcaLoading, setDcaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const displayPositions = isDemoMode ? (demoPositions as Position[]) : positions;
  const runningDcaBots = dcaBotsList.filter((b) => b.status === "running");

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
    if (!isDemoMode) loadPositions(1);
    else setIsLoading(false);
  }, [isDemoMode]);

  const loadDcaBots = async () => {
    setDcaLoading(true);
    try {
      const { bots } = await dcaBots.list();
      setDcaBotsList(bots ?? []);
    } catch {
      setDcaBotsList([]);
    } finally {
      setDcaLoading(false);
    }
  };

  useEffect(() => {
    if (!isDemoMode) loadDcaBots();
  }, [isDemoMode]);

  // Calculate summary stats
  const openPositions = displayPositions.filter((p) => !p.closedAt);
  const totalUnrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

  if (!isDemoMode && isLoading) {
    return (
      <div className="p-4 sm:p-6">
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

  if (!isDemoMode && error && positions.length === 0) {
    return (
      <div className="p-4 sm:p-6">
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Positions</h1>
          <p className="text-sm text-muted-foreground">Open & closed positions from Terminal, Copy Trading (including Futures), and DCA Bots</p>
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
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Open Positions</div>
          <div className="text-xl sm:text-2xl font-semibold">{openPositions.length}</div>
          <div className="text-xs text-muted-foreground">of {isDemoMode ? displayPositions.length : total} total</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Unrealized PnL</div>
          <div className={`text-xl sm:text-2xl font-semibold ${totalUnrealizedPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {totalUnrealizedPnl !== 0 ? `${((totalUnrealizedPnl / Math.abs(totalUnrealizedPnl)) * 100).toFixed(2)}%` : "0%"}
          </div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Closed Positions</div>
          <div className="text-xl sm:text-2xl font-semibold">{displayPositions.length - openPositions.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Positions</div>
          <div className="text-xl sm:text-2xl font-semibold">{isDemoMode ? displayPositions.length : total}</div>
          <div className="text-xs text-muted-foreground">All time</div>
        </Card>
      </div>

      {/* DCA Bots summary — running bots (positions from DCA will appear in table when execution is live) */}
      {!isDemoMode && (runningDcaBots.length > 0 || dcaLoading) && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <LayoutGrid className="size-4" />
              DCA Bots
            </h3>
            {onNavigate && (
              <Button variant="outline" size="sm" onClick={() => onNavigate("dca-bots")}>
                View all
              </Button>
            )}
          </div>
          {dcaLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading DCA bots…
            </div>
          ) : runningDcaBots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No running DCA bots. Positions from DCA Bots will appear in the table above when execution is enabled.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                {runningDcaBots.length} running bot{runningDcaBots.length !== 1 ? "s" : ""}. DCA grid positions will appear in the table above when execution is live.
              </p>
              <div className="flex flex-wrap gap-2">
                {runningDcaBots.slice(0, 6).map((bot) => (
                  <Badge key={bot.id} variant="secondary" className="font-mono text-xs">
                    {bot.name} · {bot.pair}
                  </Badge>
                ))}
                {runningDcaBots.length > 6 && (
                  <Badge variant="outline">+{runningDcaBots.length - 6} more</Badge>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Positions Table */}
      {displayPositions.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={X}
            title="No positions yet"
            description="Positions from Terminal, Copy Trading (Futures), and DCA Bots will appear here once you have open or closed trades."
          />
        </Card>
      ) : (
        <Card>
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="text-base sm:text-lg font-semibold">All Positions</h3>
            <p className="text-xs text-muted-foreground mt-1">Terminal, Copy Trading (Spot & Futures), and DCA Bots</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Entry Price</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>PnL</TableHead>
                <TableHead>Linked Trader / Bot</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPositions.map((position) => {
                const source = positionSource(position);
                return (
                <TableRow key={position.id}>
                  <TableCell>
                    {source === "copy" ? (
                      <Badge variant="outline" className="text-xs gap-1 border-blue-500/50 text-blue-600 dark:text-blue-400">
                        <Copy className="size-3" /> Copy
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Terminal</Badge>
                    )}
                  </TableCell>
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
                      <Badge variant="outline" className="text-xs gap-1">
                        <User className="size-3" /> {position.trader.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
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
              ); })}
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
