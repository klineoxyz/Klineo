import { Card } from "@/app/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown, Activity, RefreshCw, Package, LayoutGrid, Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useState, useMemo, useEffect, useCallback } from "react";
import { DashboardLoading } from "./DashboardLoading";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { Sparkline, generateSparklineData } from "@/app/components/ui/sparkline";
import { api, exchangeConnections } from "@/lib/api";
import type { EntitlementResponse } from "@/lib/api";
import { useDemo } from "@/app/contexts/DemoContext";
import { useDcaBotSummary } from "@/app/hooks/useDcaBotSummary";
import { CreateBotModal } from "@/app/components/screens/dca/CreateBotModal";

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

interface PortfolioSummary {
  totalPnl: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalVolume: number;
  openPositions: number;
  activeCopySetups: number;
}

interface CopySetup {
  id: string;
  traderId: string;
  trader: { id: string; name: string; slug: string; status: string } | null;
  status: "active" | "paused" | "stopped";
  pnlUsd?: number;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { isDemoMode } = useDemo();
  const [isLoading, setIsLoading] = useState(false);
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [copySetups, setCopySetups] = useState<CopySetup[]>([]);
  const [usdtEquity, setUsdtEquity] = useState<number | null>(null);
  const [dcaCreateModalOpen, setDcaCreateModalOpen] = useState(false);

  const dcaSummary = useDcaBotSummary(!isDemoMode);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL ?? "";
    if (!base?.trim()) return;
    api.get<EntitlementResponse>("/api/me/entitlement").then(setEntitlement).catch(() => setEntitlement(null));
  }, []);

  const loadLiveData = useCallback(async () => {
    const base = import.meta.env.VITE_API_BASE_URL ?? "";
    if (!base?.trim() || isDemoMode) return;
    try {
      const [summaryRes, copyRes, balanceRes] = await Promise.allSettled([
        api.get<PortfolioSummary>("/api/portfolio/summary"),
        api.get<{ copySetups: CopySetup[] }>("/api/copy-setups"),
        exchangeConnections.getBalance(),
      ]);
      if (summaryRes.status === "fulfilled") setPortfolioSummary(summaryRes.value);
      if (copyRes.status === "fulfilled") setCopySetups(copyRes.value.copySetups ?? []);
      if (balanceRes.status === "fulfilled" && balanceRes.value.connected && balanceRes.value.balances?.USDT) {
        const usdt = balanceRes.value.balances.USDT;
        const total = parseFloat(usdt?.free ?? "0") + parseFloat(usdt?.locked ?? "0");
        setUsdtEquity(total);
      } else {
        setUsdtEquity(null);
      }
    } catch {
      /* ignore */
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    loadLiveData();
  }, [isDemoMode, loadLiveData]);

  // Demo mode: mock sparklines; Live: derive from real data or empty
  const portfolioData = useMemo(() => generateSparklineData(30, 24000, 0.02, 500), []);
  const dailyPnLData = useMemo(() => generateSparklineData(30, 300, 0.3, 40), []);

  const handleRefresh = () => {
    setIsLoading(true);
    if (isDemoMode) {
      setTimeout(() => setIsLoading(false), 800);
      return;
    }
    loadLiveData().finally(() => setIsLoading(false));
  };

  // Live data
  const totalEquity = !isDemoMode && usdtEquity != null ? usdtEquity : null;
  const totalPnl = !isDemoMode && portfolioSummary ? portfolioSummary.totalPnl : null;
  const unrealizedPnl = !isDemoMode && portfolioSummary ? portfolioSummary.unrealizedPnl : null;
  const activeCount = !isDemoMode && portfolioSummary ? portfolioSummary.activeCopySetups : null;
  const maxCopies = 5;
  const pausedSetups = !isDemoMode ? copySetups.filter((s) => s.status === "paused") : [];

  return (
    <LoadingWrapper
      isLoading={isLoading}
      loadingComponent={<DashboardLoading />}
    >
      <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Overview of your trading activity</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5 w-full sm:w-auto shrink-0"
          >
            <RefreshCw className="size-3.5" />
            Refresh Data
          </Button>
        </div>

        {/* Demo mode banner */}
        {isDemoMode && (
          <Alert className="bg-primary/10 border-primary/30">
            <AlertDescription>
              Demo mode — dashboard shows sample data. Switch to <strong>Live</strong> via the user menu (top right) to see real portfolio and exchange data.
            </AlertDescription>
          </Alert>
        )}

        {/* Allowance exhausted banner */}
        {entitlement?.status === "exhausted" && (
          <Alert className="border-[#EF4444]/30 bg-[#EF4444]/5 py-2.5 px-3 sm:px-4">
            <Package className="size-3.5 text-[#EF4444] shrink-0" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
              <span>Your package allowance is exhausted. Buy a new package to continue copy trading.</span>
              {onNavigate && (
                <Button variant="outline" size="sm" className="border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10 shrink-0 h-8 text-xs" onClick={() => onNavigate("subscription")}>
                  <Package className="size-3 mr-1" />
                  Buy package
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* System Alerts - real paused traders in Live, sample in Demo */}
        {(isDemoMode || pausedSetups.length > 0) && (
          <Alert className="border-[#FFB000]/20 bg-[#FFB000]/5 py-2.5 px-3 sm:px-4">
            <AlertCircle className="size-3.5 text-[#FFB000] shrink-0" />
            <AlertDescription className="text-xs sm:text-sm">
              {isDemoMode ? (
                <>Copy trader <span className="font-medium">ProTrader_XYZ</span> has been paused due to max daily loss limit</>
              ) : (
                <>Copy trader{pausedSetups.length > 1 ? "s" : ""} <span className="font-medium">{pausedSetups.map((s) => s.trader?.name ?? "Unknown").join(", ")}</span> {pausedSetups.length > 1 ? "have" : "has"} been paused</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics with Sparklines */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card className="p-2.5 sm:p-3 space-y-2">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Total Equity (30d)</div>
            <div className="text-base sm:text-lg font-mono font-bold truncate">
              {isDemoMode ? "$24,567.82" : totalEquity != null ? `$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
            </div>
            <Sparkline
              data={portfolioData}
              width={140}
              height={32}
              color="#10B981"
              valueFormatter={(v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />
            <div className="text-[10px] text-muted-foreground">USDT</div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-2">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Total PnL</div>
            <div className={`text-base sm:text-lg font-mono font-bold flex items-center gap-1 truncate ${(totalPnl ?? 342.18) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
              {(totalPnl ?? 342.18) >= 0 ? <TrendingUp className="size-4 shrink-0" /> : <TrendingDown className="size-4 shrink-0" />}
              {isDemoMode ? "+$342.18" : totalPnl != null ? `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}` : "—"}
            </div>
            <Sparkline
              data={dailyPnLData}
              width={140}
              height={32}
              color="#10B981"
              valueFormatter={(v) => `${v >= 0 ? "+" : ""}$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />
            <div className="text-[10px] font-mono text-muted-foreground">
              {isDemoMode ? "+1.42%" : totalPnl != null && usdtEquity != null && usdtEquity > 0 ? `${((totalPnl / usdtEquity) * 100).toFixed(2)}%` : "—"}
            </div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-1.5">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Unrealized PnL</div>
            <div className={`text-base sm:text-lg font-mono font-bold flex items-center gap-1 ${(unrealizedPnl ?? -128.45) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
              {(unrealizedPnl ?? -128.45) >= 0 ? <TrendingUp className="size-4 shrink-0" /> : <TrendingDown className="size-4 shrink-0" />}
              {isDemoMode ? "-$128.45" : unrealizedPnl != null ? `${unrealizedPnl >= 0 ? "+" : ""}$${unrealizedPnl.toFixed(2)}` : "—"}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {isDemoMode ? "-0.52%" : unrealizedPnl != null && usdtEquity != null && usdtEquity > 0 ? `${((unrealizedPnl / usdtEquity) * 100).toFixed(2)}%` : "—"}
            </div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-1.5">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Active Copied</div>
            <div className="text-base sm:text-lg font-mono font-bold">
              {isDemoMode ? "3" : activeCount != null ? activeCount : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">of {maxCopies} max</div>
          </Card>
        </div>

        {/* Secondary Metrics - real in Live where available */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="p-2.5 sm:p-3 space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Platform Fees</div>
            <div className="text-base sm:text-lg font-mono font-bold">{isDemoMode ? "$45.23" : "—"}</div>
            <div className="text-[10px] text-muted-foreground">{isDemoMode ? "This month" : "Coming soon"}</div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Referral Earnings</div>
            <div className="text-base sm:text-lg font-mono font-bold text-[#FFB000]">{isDemoMode ? "$127.50" : "—"}</div>
            <div className="text-[10px] text-muted-foreground">{isDemoMode ? "$85 pending" : "Coming soon"}</div>
          </Card>

          <Card className="p-2.5 sm:p-3 space-y-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Copy Engine</div>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[#10B981]" />
              <span className="font-medium text-sm">Running</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{isDemoMode ? "Last sync: 2s ago" : "Live"}</div>
          </Card>

          {/* DCA Bots widget */}
          <Card className="p-2.5 sm:p-3 space-y-1.5 flex flex-col min-h-0">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <LayoutGrid className="size-3 shrink-0" />
              DCA Bots
            </div>
            {dcaSummary.loading ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground py-1">
                <Loader2 className="size-3.5 animate-spin shrink-0" />
                Loading…
              </div>
            ) : dcaSummary.error ? (
              <div className="text-xs text-muted-foreground py-1">Could not load DCA bots</div>
            ) : dcaSummary.totalBots === 0 ? (
              <>
                <div className="text-xs text-muted-foreground py-0.5">No DCA Bots yet</div>
                <div className="flex flex-col gap-1.5 mt-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs w-full"
                    onClick={() => setDcaCreateModalOpen(true)}
                  >
                    <Plus className="size-3 mr-1" />
                    Create your first bot
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs w-full"
                    onClick={() => onNavigate?.("dca-bots")}
                  >
                    Browse presets
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`size-1.5 rounded-full shrink-0 ${
                      dcaSummary.activeBotsCount > 0
                        ? "bg-[#10B981]"
                        : dcaSummary.pausedBotsCount > 0
                          ? "bg-[#FFB000]"
                          : "bg-muted-foreground/50"
                    }`}
                  />
                  <span className="font-medium text-sm">
                    {dcaSummary.activeBotsCount > 0
                      ? "Running"
                      : dcaSummary.pausedBotsCount > 0
                        ? "Paused"
                        : "No bots"}
                  </span>
                </div>
                <div className="text-base sm:text-lg font-mono font-bold">{dcaSummary.activeBotsCount}</div>
                <div className="text-[10px] text-muted-foreground">
                  Paused: {dcaSummary.pausedBotsCount} · Total: {dcaSummary.totalBots}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Allocated: {dcaSummary.totalAllocatedUSDT != null ? `${dcaSummary.totalAllocatedUSDT.toFixed(0)} USDT` : "—"}
                </div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs flex-1 min-w-0"
                    onClick={() => onNavigate?.("dca-bots")}
                  >
                    Open DCA Bots
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => setDcaCreateModalOpen(true)}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Active Copy Traders - real in Live, mock in Demo */}
        <Card className="p-3 sm:p-4">
          <h3 className="text-sm font-semibold mb-3">Active Copy Traders</h3>
          <div className="space-y-2">
            {(isDemoMode
              ? [
                  { name: "ProTrader_XYZ", status: "paused" as const, pnl: 1245 },
                  { name: "AlphaStrategist", status: "running" as const, pnl: 892.5 },
                  { name: "QuantMaster_Pro", status: "running" as const, pnl: 1567.2 },
                ]
              : copySetups.filter((s) => s.status === "active" || s.status === "paused")
            ).map((trader, i) => {
              const name = isDemoMode ? (trader as { name: string }).name : (trader as CopySetup).trader?.name ?? "Unknown";
              const status = trader.status;
              const pnl = isDemoMode ? (trader as { pnl: number }).pnl : (trader as CopySetup).pnlUsd ?? 0;
              const key = isDemoMode ? `demo-${i}` : (trader as CopySetup).id;
              return (
                <div key={key} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-md bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{name}</div>
                      <div className="text-[10px] text-muted-foreground">PnL {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</div>
                    </div>
                  </div>
                  <Badge variant={status === "active" ? "default" : "secondary"} className="text-[10px] px-2 py-0 h-5 min-w-[4.5rem] justify-center">
                    {status === "active" ? (
                      <><Activity className="size-2.5 mr-1" /> Running</>
                    ) : (
                      "Paused"
                    )}
                  </Badge>
                </div>
              );
            })}
            {!isDemoMode && copySetups.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No copy setups yet. Connect an exchange and add traders in Copy Trading.</p>
            )}
          </div>
        </Card>

        <CreateBotModal
          open={dcaCreateModalOpen}
          onOpenChange={setDcaCreateModalOpen}
          onSuccess={() => {
            dcaSummary.refetch();
            setDcaCreateModalOpen(false);
          }}
          preset={null}
        />
      </div>
    </LoadingWrapper>
  );
}