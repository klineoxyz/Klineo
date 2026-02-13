/**
 * Create DCA Bot modal — 5-step stepper. Optional preset prefill.
 */
import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "@/app/lib/toast";
import { dcaBots, exchangeSpot, type DcaBotConfig, type DcaBot, type TopBot } from "@/lib/api";
import type { DcaPreset } from "@/app/data/dcaPresets";

const STEPS = 5;
const TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "1d"];
const PAIRS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT", "AVAX/USDT", "DOGE/USDT", "MATIC/USDT"];

/** Fallback min base order (USDT) when exchange API is unavailable. */
const FALLBACK_MIN_BASE_ORDER_USDT = 10;

export interface CreateBotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (bot: DcaBot) => void;
  preset?: DcaPreset | null;
  /** When set, modal is in edit mode: prefills from this bot and submit calls update. */
  editBot?: DcaBot | null;
  /** When set, modal prefills from this template (e.g. from leaderboard) for copy & run. */
  templateBot?: TopBot | null;
  /** When true, show notice that user is at plan limit and cannot start more bots until upgrade. */
  atBotLimit?: boolean;
  /** e.g. "5" or "Unlimited" for display. */
  limitLabel?: string;
}

const defaultConfig: DcaBotConfig = {
  baseOrderSizeUsdt: 20,
  gridStepPct: 1.5,
  maxSafetyOrders: 5,
  safetyOrderMultiplier: 1.2,
  maxTotalPositionCapPct: 20,
  tpPct: 2,
  tpLadder: false,
  tpLadderLevels: [{ pct: 1.5, sharePct: 40 }, { pct: 2.5, sharePct: 35 }, { pct: 4, sharePct: 25 }],
  dailyLossLimitPct: 5,
  maxDrawdownStopPct: 10,
  cooldownMinutes: 60,
  trendFilter: true,
  volatilityFilter: false,
  flattenOnStop: false,
};

function applyPresetToConfig(preset: DcaPreset): DcaBotConfig {
  return {
    baseOrderSizeUsdt: preset.baseOrderSizeUsdt ?? defaultConfig.baseOrderSizeUsdt,
    gridStepPct: preset.gridStepPct,
    maxSafetyOrders: preset.maxSafetyOrders,
    safetyOrderMultiplier: preset.safetyOrderMultiplier,
    maxTotalPositionCapPct: preset.maxTotalPositionCapPct ?? defaultConfig.maxTotalPositionCapPct,
    tpPct: preset.tpPct,
    tpLadder: false,
    tpLadderLevels: defaultConfig.tpLadderLevels,
    dailyLossLimitPct: preset.dailyLossLimitPct ?? defaultConfig.dailyLossLimitPct,
    maxDrawdownStopPct: preset.maxDrawdownStopPct ?? defaultConfig.maxDrawdownStopPct,
    cooldownMinutes: preset.cooldownMinutes ?? defaultConfig.cooldownMinutes,
    trendFilter: preset.trendFilter ?? true,
    volatilityFilter: preset.volatilityFilter ?? false,
  };
}

export function CreateBotModal({ open, onOpenChange, onSuccess, preset, editBot, templateBot, atBotLimit, limitLabel }: CreateBotModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [exchange, setExchange] = useState<"binance" | "bybit">("binance");
  const [market, setMarket] = useState<"spot" | "futures">("spot");
  const [pair, setPair] = useState("");
  const [timeframe, setTimeframe] = useState("1h");
  const [config, setConfig] = useState<DcaBotConfig>(defaultConfig);
  const [createLoading, setCreateLoading] = useState(false);
  const [pairFilters, setPairFilters] = useState<{ minNotional: number } | null>(null);
  const [pairFiltersLoading, setPairFiltersLoading] = useState(false);
  const [pairFiltersError, setPairFiltersError] = useState<string | null>(null);

  useEffect(() => {
    if (open && editBot) {
      setName(editBot.name ?? "");
      setExchange((editBot.exchange as "binance" | "bybit") ?? "binance");
      setMarket((editBot.market === "futures" ? "futures" : "spot") ?? "spot");
      setPair(editBot.pair ?? "BTC/USDT");
      setTimeframe(editBot.timeframe ?? "1h");
      setConfig({ ...defaultConfig, ...editBot.config });
    } else if (open && templateBot) {
      setName("Copy of " + (templateBot.name || "Top Bot"));
      setExchange(templateBot.exchange ?? "binance");
      setMarket(templateBot.market ?? "spot");
      setPair(templateBot.pair ?? "BTC/USDT");
      setTimeframe(templateBot.timeframe ?? "1h");
      setConfig({ ...defaultConfig, ...templateBot.config });
    } else if (open && preset) {
      setName(preset.name);
      setPair(preset.suggestedPairs[0] ?? "BTC/USDT");
      setTimeframe(preset.timeframe);
      setConfig(applyPresetToConfig(preset));
    } else if (open && !preset && !editBot && !templateBot) {
      setName("");
      setExchange("binance");
      setMarket("spot");
      setPair("BTC/USDT");
      setTimeframe("1h");
      setConfig({ ...defaultConfig });
    }
  }, [open, preset, editBot, templateBot]);

  useEffect(() => {
    if (!open) setStep(1);
  }, [open]);

  // Fetch exchange min notional for the selected pair when on step 2 (so we use the exchange's rule, not our own).
  useEffect(() => {
    if (!open || step !== 2 || !exchange || !pair.trim()) {
      setPairFilters(null);
      setPairFiltersError(null);
      return;
    }
    let cancelled = false;
    setPairFiltersLoading(true);
    setPairFiltersError(null);
    exchangeSpot
      .getSymbolFilters(exchange, pair.trim())
      .then((res) => {
        if (!cancelled) {
          setPairFilters({ minNotional: res.minNotional });
          setPairFiltersError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPairFilters(null);
          setPairFiltersError(err instanceof Error ? err.message : "Failed to load minimum");
        }
      })
      .finally(() => {
        if (!cancelled) setPairFiltersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, step, exchange, pair]);

  const canNextStep1 = name.trim().length > 0 && pair.trim().length > 0;
  const minBaseOrderUsdt = pairFilters?.minNotional ?? FALLBACK_MIN_BASE_ORDER_USDT;
  const baseOrderBelowMin =
    typeof config.baseOrderSizeUsdt === "number" &&
    config.baseOrderSizeUsdt > 0 &&
    config.baseOrderSizeUsdt < minBaseOrderUsdt;
  const canNextStep2 =
    typeof config.baseOrderSizeUsdt === "number" &&
    config.baseOrderSizeUsdt >= minBaseOrderUsdt &&
    typeof config.gridStepPct === "number" &&
    config.gridStepPct > 0 &&
    typeof config.maxSafetyOrders === "number" &&
    config.maxSafetyOrders >= 1;

  const handleCreate = async () => {
    if (!name.trim() || !pair.trim()) return;
    setCreateLoading(true);
    try {
      const { bot } = await dcaBots.create({
        name: name.trim(),
        exchange,
        market,
        pair: pair.trim(),
        timeframe: timeframe || "1h",
        config,
      });
      toast.success("DCA Bot created", { description: bot.name });
      onOpenChange(false);
      onSuccess?.(bot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create bot";
      toast.error("Create failed", { description: msg });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editBot || !name.trim() || !pair.trim()) return;
    setCreateLoading(true);
    try {
      const { bot } = await dcaBots.update(editBot.id, {
        name: name.trim(),
        pair: pair.trim(),
        timeframe: timeframe || "1h",
        config,
      });
      toast.success("DCA Bot updated", { description: bot.name });
      onOpenChange(false);
      onSuccess?.(bot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update bot";
      toast.error("Update failed", { description: msg });
    } finally {
      setCreateLoading(false);
    }
  };

  const estimatedMaxExposure =
    config.baseOrderSizeUsdt != null && config.maxSafetyOrders != null && config.safetyOrderMultiplier != null
      ? (() => {
          let sum = config.baseOrderSizeUsdt;
          let mult = 1;
          for (let i = 0; i < config.maxSafetyOrders; i++) {
            mult *= config.safetyOrderMultiplier;
            sum += config.baseOrderSizeUsdt * mult;
          }
          return sum;
        })()
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editBot ? "Edit DCA Bot" : templateBot ? `Copy & run: ${templateBot.name}` : preset ? `Use preset: ${preset.name}` : "Create DCA Bot"}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {Array.from({ length: STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`flex items-center gap-1 ${s === step ? "text-primary font-medium" : ""}`}
            >
              <span
                className={`size-6 rounded-full flex items-center justify-center border ${
                  s === step ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                {s}
              </span>
              {s < STEPS && <ChevronRight className="size-3 opacity-50" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[280px] space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Bot name</Label>
                <Input
                  placeholder="e.g. BTC Range Bot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Exchange</Label>
                <Select value={exchange} onValueChange={(v) => setExchange(v as "binance" | "bybit")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="bybit">Bybit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Market</Label>
                <Select value={market} onValueChange={(v) => setMarket(v as "spot" | "futures")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spot">Spot</SelectItem>
                    <SelectItem value="futures" disabled>Futures (Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pair</Label>
                <Select value={pair} onValueChange={setPair}>
                  <SelectTrigger><SelectValue placeholder="Select pair" /></SelectTrigger>
                  <SelectContent>
                    {(preset?.suggestedPairs ?? PAIRS).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                    {!(preset?.suggestedPairs ?? PAIRS).includes(pair) && pair ? (
                      <SelectItem value={pair}>{pair}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                {preset && (
                  <p className="text-xs text-muted-foreground">
                    Recommended: {preset.suggestedPairs.join(", ")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Base order size (USDT)</Label>
                <Input
                  type="number"
                  min={minBaseOrderUsdt}
                  value={config.baseOrderSizeUsdt ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      baseOrderSizeUsdt: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
                {pairFiltersLoading ? (
                  <p className="text-xs text-muted-foreground">Loading minimum for {pair}…</p>
                ) : pairFiltersError ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Could not load exchange minimum ({pairFiltersError}). Using {FALLBACK_MIN_BASE_ORDER_USDT} USDT. Increase base order if orders fail at runtime.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Minimum for this pair ({exchange === "binance" ? "Binance" : "Bybit"} spot): {minBaseOrderUsdt} USDT. Orders below the exchange minimum will fail when the bot runs.
                  </p>
                )}
                {baseOrderBelowMin && (
                  <p className="text-xs text-destructive font-medium">
                    Base order must be at least {minBaseOrderUsdt} USDT for this pair.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Grid step %</Label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={config.gridStepPct ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      gridStepPct: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max safety orders</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.maxSafetyOrders ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      maxSafetyOrders: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Safety order multiplier</Label>
                <Input
                  type="number"
                  min={1}
                  step={0.1}
                  value={config.safetyOrderMultiplier ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      safetyOrderMultiplier: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max total position cap %</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.maxTotalPositionCapPct ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      maxTotalPositionCapPct: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center justify-between">
                <Label>TP ladder (multi-target take profit)</Label>
                <Switch
                  checked={config.tpLadder ?? false}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, tpLadder: v }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                When TP ladder is on, take profit uses 3 levels below. When off, the single target % is used.
              </p>
              <div className="space-y-2">
                <Label className={config.tpLadder ? "opacity-60" : ""}>Take profit % (single target)</Label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={config.tpPct ?? ""}
                  disabled={config.tpLadder ?? false}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      tpPct: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
                {config.tpLadder && (
                  <p className="text-xs text-muted-foreground">Single target is disabled when TP ladder is on.</p>
                )}
              </div>
              {config.tpLadder && config.tpLadderLevels && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {config.tpLadderLevels.map((level, i) => (
                    <div key={i} className="space-y-1">
                      <Label>Level {i + 1} TP %</Label>
                      <Input
                        type="number"
                        value={level.pct}
                        onChange={(e) => {
                          const next = [...(config.tpLadderLevels ?? [])];
                          next[i] = { ...next[i], pct: Number(e.target.value) || 0 };
                          setConfig((c) => ({ ...c, tpLadderLevels: next }));
                        }}
                      />
                      <Label>Share %</Label>
                      <Input
                        type="number"
                        value={level.sharePct}
                        onChange={(e) => {
                          const next = [...(config.tpLadderLevels ?? [])];
                          next[i] = { ...next[i], sharePct: Number(e.target.value) || 0 };
                          setConfig((c) => ({ ...c, tpLadderLevels: next }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Daily loss limit %</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.dailyLossLimitPct ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      dailyLossLimitPct: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max drawdown stop %</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.maxDrawdownStopPct ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      maxDrawdownStopPct: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cooldown (minutes) after stop</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.cooldownMinutes ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      cooldownMinutes: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Trend filter</Label>
                <Switch
                  checked={config.trendFilter ?? true}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, trendFilter: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Volatility filter</Label>
                <Switch
                  checked={config.volatilityFilter ?? false}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, volatilityFilter: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Flatten position on Stop</Label>
                <Switch
                  checked={config.flattenOnStop ?? false}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, flattenOnStop: v }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">When enabled, the bot will market-sell the full position when stopped (e.g. by max drawdown).</p>
            </>
          )}

          {step === 5 && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {name || "—"}</p>
              <p><span className="text-muted-foreground">Exchange:</span> {exchange}</p>
              <p><span className="text-muted-foreground">Market:</span> {market}</p>
              <p><span className="text-muted-foreground">Pair:</span> {pair || "—"}</p>
              <p><span className="text-muted-foreground">Timeframe:</span> {timeframe}</p>
              <p><span className="text-muted-foreground">Base order:</span> {config.baseOrderSizeUsdt ?? "—"} USDT</p>
              <p><span className="text-muted-foreground">Grid step:</span> {config.gridStepPct ?? "—"}%</p>
              <p><span className="text-muted-foreground">Max safety orders:</span> {config.maxSafetyOrders ?? "—"}</p>
              <p><span className="text-muted-foreground">TP:</span> {config.tpPct ?? "—"}%</p>
              <div className="pt-2 border-t">
                <p className="font-medium">Estimated max exposure</p>
                <p className="text-lg font-mono">${estimatedMaxExposure.toFixed(2)} USDT</p>
              </div>
            </div>
          )}
        </div>

        {atBotLimit && (
          <div className="px-1 py-2 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
            You&apos;re at your plan limit ({limitLabel ?? "—"} running bot{limitLabel !== "Unlimited" && Number(limitLabel) !== 1 ? "s" : ""}). You can create a bot but won&apos;t be able to start it until you upgrade or pause another bot.
          </div>
        )}
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="size-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < STEPS ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && !canNextStep1) ||
                  (step === 2 && !canNextStep2)
                }
              >
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={editBot ? handleUpdate : handleCreate}
                disabled={createLoading}
              >
                {createLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                {editBot ? "Save changes" : "Create Bot"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
