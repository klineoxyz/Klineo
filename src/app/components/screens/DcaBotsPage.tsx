/**
 * DCA Bots page — grid-style DCA ladders, presets, and My Bots table.
 */
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "@/app/lib/toast";
import { dcaBots, type DcaBot } from "@/lib/api";
import { getPresetsByRisk, filterPresetsBySearch, type DcaPreset, type DcaPresetRisk } from "@/app/data/dcaPresets";
import { CreateBotModal } from "@/app/components/screens/dca/CreateBotModal";

interface DcaBotsPageProps {
  onNavigate: (view: string) => void;
}

export function DcaBotsPage({ onNavigate }: DcaBotsPageProps) {
  const [bots, setBots] = useState<DcaBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [presetForCreate, setPresetForCreate] = useState<DcaPreset | null>(null);
  const [presetTab, setPresetTab] = useState<DcaPresetRisk | "all">("all");
  const [presetSearch, setPresetSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadBots = async () => {
    setLoading(true);
    try {
      const { bots: list } = await dcaBots.list();
      setBots(list ?? []);
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

  const activeBots = bots.filter((b) => b.status === "running");
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

  const handleUsePreset = (preset: DcaPreset) => {
    setPresetForCreate(preset);
    setCreateModalOpen(true);
  };

  const handleCreateBot = () => {
    setPresetForCreate(null);
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
      toast.error("Update failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setUpdatingId(null);
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
      <Card>
        <div className="p-4 sm:p-6 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold">My Bots</h3>
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
                <TableHead>Allocated</TableHead>
                <TableHead>DCA Progress</TableHead>
                <TableHead>Avg Entry</TableHead>
                <TableHead>TP Target</TableHead>
                <TableHead>Unrealized PnL</TableHead>
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
                    </TableCell>
                    <TableCell className="font-mono">${allocated.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">0 / {bot.config?.maxSafetyOrders ?? 0}</TableCell>
                    <TableCell className="font-mono">—</TableCell>
                    <TableCell className="font-mono">{bot.config?.tpPct ?? "—"}%</TableCell>
                    <TableCell className="font-mono">—</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
                            disabled={updatingId === bot.id}
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
                        <Button variant="outline" size="sm" disabled>
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

      <CreateBotModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
        preset={presetForCreate}
      />
    </div>
  );
}
