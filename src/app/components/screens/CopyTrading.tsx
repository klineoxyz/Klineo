import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Activity, Pause, StopCircle, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { notifyCopySetupsUpdated } from "@/lib/copySetupsEvents";
import { useDemo } from "@/app/contexts/DemoContext";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ErrorState } from "@/app/components/ui/error-state";
import { formatDistanceToNow } from "date-fns";

interface CopyTradingProps {
  onNavigate: (view: string) => void;
}

interface CopySetup {
  id: string;
  traderId: string;
  trader: {
    id: string;
    name: string;
    slug: string;
    avatarUrl?: string;
    status: string;
  } | null;
  allocationPct: number;
  maxPositionPct: number | null;
  status: "active" | "paused" | "stopped";
  createdAt: string;
  updatedAt: string;
  pnlUsd?: number;
}

export function CopyTrading({ onNavigate }: CopyTradingProps) {
  const { isDemoMode, demoCopySetups, clearDemo } = useDemo();
  const [copySetups, setCopySetups] = useState<CopySetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const displaySetups = isDemoMode ? [...(demoCopySetups as CopySetup[]), ...copySetups] : copySetups;

  const loadCopySetups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<{ copySetups: CopySetup[] }>("/api/copy-setups");
      setCopySetups(data.copySetups || []);
      notifyCopySetupsUpdated();
    } catch (err: any) {
      const message = err?.message || "Failed to load copy setups";
      setError(message);
      toast.error("Failed to load copy setups", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isDemoMode) loadCopySetups();
    else setIsLoading(false);
  }, [isDemoMode]);

  const handleStatusChange = async (id: string, newStatus: "active" | "paused" | "stopped") => {
    setUpdatingId(id);
    try {
      await api.put(`/api/copy-setups/${id}`, { status: newStatus });
      toast.success(`Copy setup ${newStatus === "active" ? "resumed" : newStatus === "paused" ? "paused" : "stopped"}`);
      loadCopySetups();
    } catch (err: any) {
      toast.error("Failed to update", { description: err?.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const activeSetups = displaySetups.filter((s) => s.status === "active");
  const totalAllocated = displaySetups.reduce((sum, s) => sum + s.allocationPct, 0);

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

  if (error && copySetups.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Failed to load copy setups"
          message={error}
          action={
            <Button onClick={loadCopySetups} variant="outline">
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Copy Trading</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage your active copy positions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isDemoMode && (
            <>
              <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">Demo</Badge>
              <Button variant="ghost" size="sm" onClick={clearDemo}>Exit demo</Button>
            </>
          )}
          <Button onClick={() => onNavigate("marketplace")} className="bg-primary text-primary-foreground w-full sm:w-auto">
            Browse Traders
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Copies</div>
          <div className="text-xl sm:text-2xl font-semibold">{activeSetups.length}</div>
          <div className="text-xs text-muted-foreground">of {displaySetups.length} total</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Allocated</div>
          <div className="text-xl sm:text-2xl font-semibold">{totalAllocated.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">of portfolio</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Paused</div>
          <div className="text-xl sm:text-2xl font-semibold">
            {displaySetups.filter((s) => s.status === "paused").length}
          </div>
          <div className="text-xs text-muted-foreground">copy setups</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Copy Engine</div>
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${activeSetups.length > 0 ? "bg-[#10B981]" : "bg-muted"}`} />
            <span className="font-medium">{activeSetups.length > 0 ? "Running" : "Idle"}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {activeSetups.length} active
          </div>
        </Card>
      </div>

      {/* Active Copy Traders */}
      {displaySetups.length === 0 ? (
        <Card className="p-6 sm:p-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">No copy setups yet</p>
            <Button onClick={() => onNavigate("marketplace")} className="bg-primary text-primary-foreground w-full sm:w-auto">
              Browse Traders
            </Button>
          </div>
        </Card>
      ) : (
        <Card data-onboarding="copytrading-table">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="text-base sm:text-lg font-semibold">Active Copy Positions</h3>
          </div>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Trader</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PnL</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Max Position</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySetups.map((setup) => {
                const isDemo = (setup as CopySetup & { _isDemo?: boolean })._isDemo ?? setup.id.startsWith("demo-");
                return (
                <TableRow key={setup.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded bg-muted flex items-center justify-center text-xs font-semibold">
                        {setup.trader?.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {setup.trader?.name || "Unknown Trader"}
                          {isDemo && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Demo</Badge>
                          )}
                        </div>
                        {!isDemo && setup.trader?.status !== "approved" && (
                          <div className="text-xs text-muted-foreground">Trader not approved</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={setup.status === "active" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {setup.status === "active" ? (
                        <><Activity className="size-3" /> Active</>
                      ) : setup.status === "paused" ? (
                        <><Pause className="size-3" /> Paused</>
                      ) : (
                        <><StopCircle className="size-3" /> Stopped</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {typeof setup.pnlUsd === "number"
                      ? (setup.pnlUsd >= 0 ? "+" : "") + setup.pnlUsd.toFixed(2)
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono">{setup.allocationPct.toFixed(1)}%</TableCell>
                  <TableCell className="font-mono">
                    {setup.maxPositionPct ? `${setup.maxPositionPct.toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(setup.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right" data-onboarding="copytrading-actions">
                    <div className="flex items-center justify-end gap-2">
                      {isDemo ? (
                        <span className="text-xs text-muted-foreground">Use Exit demo to clear</span>
                      ) : (
                        <>
                          {setup.status === "active" ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusChange(setup.id, "paused")}
                              disabled={updatingId === setup.id}
                            >
                              {updatingId === setup.id ? (
                                <Loader2 className="size-3 mr-1 animate-spin" />
                              ) : (
                                <Pause className="size-3 mr-1" />
                              )}
                              Pause
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusChange(setup.id, "active")}
                              disabled={updatingId === setup.id}
                              title={setup.status === "stopped" ? "Start copying again" : "Resume"}
                            >
                              {updatingId === setup.id ? (
                                <Loader2 className="size-3 mr-1 animate-spin" />
                              ) : (
                                <Activity className="size-3 mr-1" />
                              )}
                              {setup.status === "stopped" ? "Start" : "Resume"}
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[#EF4444] border-[#EF4444]/50 hover:bg-[#EF4444]/10"
                            onClick={() => handleStatusChange(setup.id, "stopped")}
                            disabled={updatingId === setup.id || setup.status === "stopped"}
                            title={setup.status === "stopped" ? "Already stopped" : "Stop copying"}
                          >
                            {updatingId === setup.id ? (
                              <Loader2 className="size-3 mr-1 animate-spin" />
                            ) : (
                              <StopCircle className="size-3 mr-1" />
                            )}
                            Stop
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ); })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
