/**
 * DCA Bots page — grid-style DCA ladders, presets, and My Bots table.
 */
import { useState, useEffect, useRef } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Activity,
  Pause,
  Play,
  StopCircle,
  Loader2,
  LayoutGrid,
  Search,
  Pencil,
  Trophy,
  TrendingUp,
  CopyPlus,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { toast } from "@/app/lib/toast";
import { api, dcaBots, type DcaBot, type DcaBotFeatured, type TopBot, type EntitlementResponse } from "@/lib/api";
import { getPresetsByRisk, filterPresetsBySearch, type DcaPreset, type DcaPresetRisk } from "@/app/data/dcaPresets";
import { CreateBotModal } from "@/app/components/screens/dca/CreateBotModal";
import { ExecutionLogsModal } from "@/app/components/screens/ExecutionLogsModal";

interface DcaBotsPageProps {
  onNavigate: (view: string) => void;
}

export function DcaBotsPage({ onNavigate }: DcaBotsPageProps) {
  const [bots, setBots] = useState<DcaBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<DcaBot | null>(null);
  const [presetForCreate, setPresetForCreate] = useState<DcaPreset | null>(null);
  const [presetTab, setPresetTab] = useState<DcaPresetRisk | "all">("all");
  const [presetSearch, setPresetSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [maxDcaBots, setMaxDcaBots] = useState<number>(1);
  const [featuredBots, setFeaturedBots] = useState<DcaBotFeatured[]>([]);
  const [topBots, setTopBots] = useState<TopBot[]>([]);
  const [templateBot, setTemplateBot] = useState<TopBot | null>(null);
  const [triggerTickId, setTriggerTickId] = useState<string | null>(null);
  const [executionLogsOpen, setExecutionLogsOpen] = useState(false);
  const [runnerActive, setRunnerActive] = useState<boolean>(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const myBotsSectionRef = useRef<HTMLDivElement>(null);

  const loadBots = async () => {
    setLoading(true);
    try {
      const [{ bots: list, runnerActive: active }, { featured: featuredList }, { topBots: topList }] = await Promise.all([
        dcaBots.list(),
        dcaBots.featured().catch(() => ({ featured: [] as DcaBotFeatured[] })),
        dcaBots.getTopBots().catch(() => ({ topBots: [] as TopBot[] })),
      ]);
      setBots(list ?? []);
      setRunnerActive(active ?? true);
      setFeaturedBots(featuredList ?? []);
      setTopBots(topList ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load bots";
      toast.error("Failed to load DCA bots", { description: msg });
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBots();
  }, []);

  useEffect(() => {
    api.get<EntitlementResponse>("/api/me/entitlement").then((r) => setMaxDcaBots(r.maxDcaBots ?? 1)).catch(() => {});
  }, []);

  const activeBots = bots.filter((b) => b.status === "running");
  const activeSpotBots = bots.filter((b) => b.status === "running" && (b.market ?? "spot") === "spot");
  const atBotLimit = (maxDcaBots ?? 1) > 0 && activeSpotBots.length >= (maxDcaBots ?? 1);
  const limitLabel = (maxDcaBots ?? 0) === 0 ? "Unlimited" : String(maxDcaBots);
  const totalAllocated = bots.reduce((sum, b) => {
    const base = b.config?.baseOrderSizeUsdt ?? 0;
    const max = b.config?.maxSafetyOrders ?? 0;
    const mult = b.config?.safetyOrderMultiplier ?? 1.2;
    let exp = base;
    let m = 1;
    for (let i = 0; i < max; i++) {
      m *= mult;
      exp += base * m;
    }
    return sum + exp;
  }, 0);
  const unrealizedPnl = 0; // placeholder
  const realizedPnl = 0; // placeholder

  const presetsByTab = getPresetsByRisk(presetTab);
  const filteredPresets = filterPresetsBySearch(presetsByTab, presetSearch);

  const handleCreateBot = () => {
    setPresetForCreate(null);
    setEditingBot(null);
    setTemplateBot(null);
    setCreateModalOpen(true);
  };

  const handleEditBot = (bot: DcaBot) => {
    setEditingBot(bot);
    setPresetForCreate(null);
    setTemplateBot(null);
    setCreateModalOpen(true);
  };

  const handleUsePreset = (preset: DcaPreset) => {
    setPresetForCreate(preset);
    setEditingBot(null);
    setTemplateBot(null);
    setCreateModalOpen(true);
  };

  const handleCreateModalOpenChange = (open: boolean) => {
    setCreateModalOpen(open);
    if (!open) {
      setEditingBot(null);
      setTemplateBot(null);
    }
  };

  const handleCopyBot = (bot: TopBot) => {
    setTemplateBot(bot);
    setPresetForCreate(null);
    setEditingBot(null);
    setCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    loadBots();
  };

  const handleStatusChange = async (id: string, status: "running" | "paused" | "stopped") => {
    setUpdatingId(id);
    try {
      await dcaBots.updateStatus(id, status);
      toast.success(status === "running" ? "Bot resumed" : status === "paused" ? "Bot paused" : "Bot stopped");
      loadBots();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
      let msg = raw;
      let code: string | undefined;
      const jsonMatch = raw.replace(/^\d+\s*:\s*/, "").trim();
      if (jsonMatch.startsWith("{")) {
        try {
          const body = JSON.parse(jsonMatch) as { message?: string; code?: string; error?: string };
          msg = body.message ?? body.error ?? msg;
          code = body.code ?? body.error;
        } catch {
          /* use raw */
        }
      }
      if (code === "DCA_BOT_LIMIT_REACHED" || code === "DCA_BOT_LIMIT") {
        toast.error("Bot limit reached", { description: msg });
      } else {
        toast.error("Update failed", { description: msg });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTriggerTick = async (id: string) => {
    setTriggerTickId(id);
    try {
      const res = await api.post<{ success: boolean; status: string; error?: string; message?: string }>(
        `/api/dca-bots/${id}/trigger-tick`
      );
      await loadBots();
      if (res.success) {
        toast.success("Tick completed", { description: res.message ?? "Bot was processed successfully." });
      } else {
        toast.error("Tick failed", {
          description: res.error ?? res.message ?? "Check connection and backend ENABLE_STRATEGY_RUNNER.",
        });
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
      let msg = raw;
      try {
        const body = typeof raw === "string" && raw.startsWith("{") ? (JSON.parse(raw) as { message?: string }) : null;
        if (body?.message) msg = body.message;
      } catch {
        /* use raw */
      }
      toast.error("Run tick failed", { description: msg });
      loadBots();
    } finally {
      setTriggerTickId(null);
    }
  };

  if (loading && bots.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">DCA Bots</h1>
          <p className="text-sm text-muted-foreground">
            Grid-style DCA ladders with built-in risk controls
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleCreateBot} className="bg-primary text-primary-foreground">
            Create Bot
          </Button>
          <Button variant="outline" onClick={handleCreateBot}>
            Import Preset
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate("strategy-backtest")}
          >
            View Backtests
          </Button>
        </div>
      </div>

      {!runnerActive && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-3 text-sm">
          Runner not active — bots won&apos;t execute automatically. Enable <code className="bg-muted px-1 rounded">ENABLE_STRATEGY_RUNNER</code> on the server, or use &quot;Run tick&quot; for testing.
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card className="p-2.5 sm:p-3 space-y-2">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Active Bots</div>
          <div className="text-base sm:text-lg font-mono font-bold">{activeBots.length}</div>
        </Card>
        <Card className="p-2.5 sm:p-3 space-y-2">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Total Allocated (USDT)</div>
          <div className="text-base sm:text-lg font-mono font-bold">
            ${totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-2.5 sm:p-3 space-y-2">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Unrealized PnL</div>
          <div className={`text-base sm:text-lg font-mono font-bold ${unrealizedPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
          </div>
        </Card>
        <Card className="p-2.5 sm:p-3 space-y-2">
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Realized PnL</div>
          <div className={`text-base sm:text-lg font-mono font-bold ${realizedPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Site-wide: Top 10 Bots by ROI — everyone can see and copy & run */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          Top 10 Bots by ROI
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Best-performing bots on the platform. Copy & run any bot to trade the same strategy with your account.</p>
        {topBots.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No bots with returns yet. Be the first to run a bot and appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {topBots.map((bot, i) => {
              const userRunningSame = bots.some(
                (b) => b.status === "running" && b.pair === bot.pair && b.exchange === bot.exchange
              );
              return (
                <Card key={bot.id} className="p-3 sm:p-4 flex flex-col gap-2 border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{bot.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{bot.pair}</p>
                    </div>
                    {userRunningSame && (
                      <Badge variant="default" className="shrink-0 text-xs">Running</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <TrendingUp className="size-4 text-[#10B981]" />
                    <span className={`font-mono font-semibold text-sm ${bot.realizedPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                      {bot.realizedPnl >= 0 ? "+" : ""}${bot.realizedPnl.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">({bot.roiPct >= 0 ? "+" : ""}{bot.roiPct.toFixed(1)}% ROI)</span>
                  </div>
                  {userRunningSame ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full mt-auto"
                      onClick={() => myBotsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                      View in My Bots
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full mt-auto" onClick={() => handleCopyBot(bot)}>
                      <CopyPlus className="size-3.5 mr-1.5" />
                      Copy & run
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Per-user: My top performers (highest realized returns) */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          My top performers
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Your bots with the highest realized returns</p>
        {featuredBots.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No bots yet, or no returns recorded. Create a bot and run it to see your top performers here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {featuredBots.map((bot, i) => (
              <Card key={bot.id} className="p-3 sm:p-4 flex flex-col gap-2 border-2 border-transparent bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold text-sm">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{bot.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{bot.pair}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp className="size-4 text-[#10B981]" />
                  <span className={`font-mono font-semibold ${bot.realizedPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {bot.realizedPnl >= 0 ? "+" : ""}${bot.realizedPnl.toFixed(2)} USDT
                  </span>
                </div>
                <Badge variant="outline" className="w-fit text-xs capitalize">
                  {bot.status}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Preset Library */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3">Preset Library</h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            {(["low", "medium", "high", "all"] as const).map((risk) => (
              <Button
                key={risk}
                variant={presetTab === risk ? "default" : "outline"}
                size="sm"
                onClick={() => setPresetTab(risk)}
              >
                {risk === "all" ? "All" : risk === "low" ? "Low Risk" : risk === "medium" ? "Medium Risk" : "High Risk"}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or pair"
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        {filteredPresets.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No presets found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPresets.map((preset) => (
              <Card key={preset.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium">{preset.name}</h4>
                  <Badge
                    variant="outline"
                    className={
                      preset.risk === "low"
                        ? "border-[#10B981]/50 text-[#10B981] bg-[#10B981]/10"
                        : preset.risk === "medium"
                          ? "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                          : "border-[#EF4444]/50 text-[#EF4444] bg-[#EF4444]/10"
                    }
                  >
                    {preset.risk === "low" ? "Low" : preset.risk === "medium" ? "Medium" : "High"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Best for: {preset.bestMarketType}</p>
                <p className="text-xs">Pairs: {preset.suggestedPairs.join(", ")}</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Grid step: {preset.gridStepPct}% · Max safety: {preset.maxSafetyOrders} · TP: {preset.tpPct}% · TF: {preset.timeframe}</p>
                </div>
                <Button variant="outline" size="sm" className="mt-auto w-fit" onClick={() => handleUsePreset(preset)}>
                  Use Preset
                </Button>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* My Bots table */}
      <div ref={myBotsSectionRef}>
        <Card>
        <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold">My Bots</h3>
          <Button variant="outline" size="sm" onClick={() => setExecutionLogsOpen(true)}>
            <ScrollText className="size-4 mr-1.5" />
            Execution Logs
          </Button>
        </div>
        <div className="px-4 sm:px-6 pb-2">
          {atBotLimit && activeBots.length > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-500">You&apos;re at your plan limit ({limitLabel} running bot{limitLabel !== "Unlimited" && Number(limitLabel) !== 1 ? "s" : ""}). Upgrade to run more.</p>
          )}
        </div>
        {bots.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <LayoutGrid className="size-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No bots yet</p>
            <Button onClick={handleCreateBot} className="bg-primary text-primary-foreground">
              Create your first DCA Bot
            </Button>
          </div>
        ) : (
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Bot Name</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last tick</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>DCA Progress</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>TP status</TableHead>
                <TableHead>Avg Entry</TableHead>
                <TableHead>TP Target</TableHead>
                <TableHead>Realized PnL</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bots.map((bot) => {
                const allocated =
                  (bot.config?.baseOrderSizeUsdt ?? 0) *
                  (() => {
                    let sum = 1;
                    let m = 1;
                    const mult = bot.config?.safetyOrderMultiplier ?? 1.2;
                    for (let i = 0; i < (bot.config?.maxSafetyOrders ?? 0); i++) {
                      m *= mult;
                      sum += m;
                    }
                    return sum;
                  })();
                return (
                  <TableRow key={bot.id}>
                    <TableCell className="font-medium">{bot.name}</TableCell>
                    <TableCell className="capitalize">{bot.exchange}</TableCell>
                    <TableCell className="font-mono">{bot.pair}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <Badge
                          variant={bot.status === "running" ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {bot.status === "running" ? (
                            <><Activity className="size-3" /> Running</>
                          ) : bot.status === "paused" ? (
                            <><Pause className="size-3" /> Paused</>
                          ) : (
                            <><StopCircle className="size-3" /> Stopped</>
                          )}
                        </Badge>
                        {(bot.status === "stopped" || bot.status === "paused") && (bot.status_reason || bot.last_tick_error) && (
                          <p className="text-xs text-muted-foreground max-w-[180px] truncate" title={bot.status_reason || bot.last_tick_error || undefined}>
                            {bot.status_reason || bot.last_tick_error}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[220px]">
                      {bot.last_tick_at ? (
                        <span title={bot.last_tick_error ?? undefined}>
                          {new Date(bot.last_tick_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                          {bot.last_tick_status && (
                            <span className="ml-1 text-xs">· {bot.last_tick_status}</span>
                          )}
                          {bot.last_tick_error && (
                            <span className="block truncate text-xs text-destructive" title={bot.last_tick_error}>
                              {bot.last_tick_error}
                            </span>
                          )}
                        </span>
                      ) : bot.last_tick_error ? (
                        <span className="block text-xs text-destructive" title={bot.last_tick_error}>
                          Error: {bot.last_tick_error}
                        </span>
                      ) : bot.status === "running" ? (
                        <span className="text-muted-foreground text-xs" title="Backend needs ENABLE_STRATEGY_RUNNER=true. Use «Run tick» to test.">
                          No tick yet
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">${allocated.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">
                      {Math.min(bot.safety_orders_filled ?? 0, bot.config?.maxSafetyOrders ?? 0)} / {bot.config?.maxSafetyOrders ?? 0}
                    </TableCell>
                    <TableCell className="font-mono">
                      {bot.position_size != null && Number(bot.position_size) > 0 ? Number(bot.position_size).toFixed(6) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {bot.position_size != null && Number(bot.position_size) > 0
                        ? (bot.last_tp_order_id ? "Active" : "Missing")
                        : "Filled"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {bot.avg_entry_price != null ? `$${Number(bot.avg_entry_price).toFixed(4)}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono">{bot.config?.tpPct ?? "—"}%</TableCell>
                    <TableCell className="font-mono">
                      {bot.realized_pnl != null ? (
                        <span className={bot.realized_pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}>
                          {bot.realized_pnl >= 0 ? "+" : ""}${bot.realized_pnl.toFixed(2)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setSyncingId(bot.id);
                            try {
                              await dcaBots.sync(bot.id);
                              toast.success("Synced from exchange");
                              await loadBots();
                            } catch (e) {
                              toast.error("Sync failed", { description: e instanceof Error ? e.message : undefined });
                            } finally {
                              setSyncingId(null);
                            }
                          }}
                          disabled={syncingId === bot.id}
                          title="Sync orders and trades from exchange"
                        >
                          {syncingId === bot.id ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                          Sync
                        </Button>
                        {bot.status === "running" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(bot.id, "paused")}
                            disabled={updatingId === bot.id}
                          >
                            {updatingId === bot.id ? <Loader2 className="size-3 animate-spin" /> : <Pause className="size-3" />}
                            Pause
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(bot.id, "running")}
                            disabled={updatingId === bot.id || atBotLimit}
                            title={atBotLimit ? `Upgrade to run more bots (limit: ${limitLabel})` : undefined}
                          >
                            {updatingId === bot.id ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                            Resume
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/50 hover:bg-destructive/10"
                          onClick={() => handleStatusChange(bot.id, "stopped")}
                          disabled={updatingId === bot.id || bot.status === "stopped"}
                        >
                          Stop
                        </Button>
                        {bot.status === "running" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTriggerTick(bot.id)}
                            disabled={triggerTickId === bot.id}
                            title="Run one tick now to see why trades might not execute"
                          >
                            {triggerTickId === bot.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <RefreshCw className="size-3 mr-1" />
                            )}
                            Run tick
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBot(bot)}
                        >
                          <Pencil className="size-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        </Card>
      </div>

      <ExecutionLogsModal
        open={executionLogsOpen}
        onOpenChange={setExecutionLogsOpen}
        source="DCA"
        title="DCA Execution Logs"
      />

      <CreateBotModal
        open={createModalOpen}
        onOpenChange={handleCreateModalOpenChange}
        onSuccess={handleCreateSuccess}
        preset={presetForCreate}
        editBot={editingBot}
        templateBot={templateBot}
        atBotLimit={atBotLimit}
        limitLabel={limitLabel}
      />
    </div>
  );
}
