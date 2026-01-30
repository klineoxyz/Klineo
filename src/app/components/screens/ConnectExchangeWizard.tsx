/**
 * Connect Exchange (API Keys) Wizard — production-grade guided flow for Binance + Bybit with Futures.
 * Steps: 1) Exchange + env, 2) Permissions, 3) API keys, 4) Save + test, 5) Futures, 6) Done.
 * No secrets ever shown after input; errors sanitized.
 */

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Shield,
  AlertTriangle,
  Zap,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/app/lib/toast";
import { exchangeConnections, sanitizeExchangeError, type ExchangeConnection } from "@/lib/api";

const STEPS = 6;
const MIN_KEY_LEN = 10;
const MIN_SECRET_LEN = 10;

export interface ConnectExchangeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (connection?: ExchangeConnection) => void;
  onNavigate?: (view: string) => void;
}

export function ConnectExchangeWizard({
  open,
  onOpenChange,
  onComplete,
  onNavigate,
}: ConnectExchangeWizardProps) {
  const [step, setStep] = useState(1);
  const [exchange, setExchange] = useState<"binance" | "bybit">("binance");
  const [environment, setEnvironment] = useState<"production" | "testnet">("testnet");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [testAfterSaveStatus, setTestAfterSaveStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [testAfterSaveError, setTestAfterSaveError] = useState("");
  const [createdConnection, setCreatedConnection] = useState<ExchangeConnection | null>(null);
  const [futuresTestLoading, setFuturesTestLoading] = useState(false);
  const [futuresTestOk, setFuturesTestOk] = useState(false);
  const [futuresEnableLoading, setFuturesEnableLoading] = useState(false);
  const [futuresEnabled, setFuturesEnabled] = useState(false);
  const [futuresLeverage, setFuturesLeverage] = useState("3");
  const [futuresMarginMode, setFuturesMarginMode] = useState<"isolated" | "cross">("isolated");
  const [futuresPositionMode, setFuturesPositionMode] = useState<"one_way" | "hedge">("one_way");
  const [killSwitch, setKillSwitch] = useState(false);
  const [killSwitchUpdating, setKillSwitchUpdating] = useState(false);

  const canNextStep1 = true;
  const canNextStep2 = true;
  const canNextStep3 = apiKey.trim().length >= MIN_KEY_LEN && apiSecret.trim().length >= MIN_SECRET_LEN;
  const connectionForFutures = createdConnection;

  const resetWizard = () => {
    setStep(1);
    setExchange("binance");
    setEnvironment("testnet");
    setLabel("");
    setApiKey("");
    setApiSecret("");
    setSaveLoading(false);
    setTestAfterSaveStatus("idle");
    setTestAfterSaveError("");
    setCreatedConnection(null);
    setFuturesTestOk(false);
    setFuturesEnabled(false);
    setFuturesLeverage("3");
    setFuturesMarginMode("isolated");
    setFuturesPositionMode("one_way");
    setKillSwitch(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetWizard();
    onOpenChange(open);
  };

  const handleSaveAndTest = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) return;
    setSaveLoading(true);
    setTestAfterSaveStatus("idle");
    setTestAfterSaveError("");
    try {
      const { connection } = await exchangeConnections.create({
        exchange,
        environment,
        label: label.trim() || undefined,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      setCreatedConnection(connection);
      setApiKey("");
      setApiSecret("");
      setTestAfterSaveStatus("loading");
      const testRes = await exchangeConnections.test(connection.id);
      if (testRes.ok) {
        setTestAfterSaveStatus("ok");
        toast.success("Connected: OK", { description: `Latency: ${testRes.latencyMs}ms` });
      } else {
        setTestAfterSaveStatus("fail");
        setTestAfterSaveError(sanitizeExchangeError(testRes.message || "Test failed"));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTestAfterSaveStatus("fail");
      setTestAfterSaveError(sanitizeExchangeError(msg));
      toast.error("Save or test failed", { description: sanitizeExchangeError(msg) });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFuturesTest = async () => {
    if (!connectionForFutures) return;
    setFuturesTestLoading(true);
    try {
      const res = await exchangeConnections.futuresTest(connectionForFutures.id);
      setFuturesTestOk(res.ok);
      if (res.ok) toast.success(`Futures API OK (${res.latencyMs}ms)`);
      else toast.error(sanitizeExchangeError(res.error ?? "Futures test failed"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Futures test failed", { description: sanitizeExchangeError(msg) });
    } finally {
      setFuturesTestLoading(false);
    }
  };

  const handleFuturesEnable = async () => {
    if (!connectionForFutures) return;
    setFuturesEnableLoading(true);
    try {
      await exchangeConnections.futuresEnable(connectionForFutures.id, {
        default_leverage: Math.min(parseInt(futuresLeverage, 10) || 3, connectionForFutures.max_leverage_allowed ?? 125),
        margin_mode: futuresMarginMode,
        position_mode: futuresPositionMode,
      });
      setFuturesEnabled(true);
      setCreatedConnection((c) => (c ? { ...c, futures_enabled: true } : null));
      toast.success("Futures ON");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Enable failed", { description: sanitizeExchangeError(msg) });
    } finally {
      setFuturesEnableLoading(false);
    }
  };

  const handleKillSwitch = async (enabled: boolean) => {
    if (!connectionForFutures) return;
    setKillSwitchUpdating(true);
    try {
      await exchangeConnections.setKillSwitch(connectionForFutures.id, enabled);
      setKillSwitch(enabled);
      toast.success(enabled ? "Kill switch ON" : "Kill switch OFF");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(sanitizeExchangeError(msg));
    } finally {
      setKillSwitchUpdating(false);
    }
  };

  const handleDone = () => {
    onComplete?.(createdConnection ?? undefined);
    handleClose(false);
  };

  const goToBacktest = () => {
    handleClose(false);
    onNavigate?.("strategy-backtest");
  };

  const goToTerminal = () => {
    handleClose(false);
    onNavigate?.("trading-terminal");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="size-5" />
            Connect Exchange (API Keys)
          </DialogTitle>
          <DialogDescription>
            Step {step} of {STEPS}. Connect Binance or Bybit with the correct permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Exchange + environment */}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Use testnet first if you are unsure. Never enable withdrawals for API keys.
              </p>
              <div className="space-y-2">
                <Label>Exchange</Label>
                <Select value={exchange} onValueChange={(v: "binance" | "bybit") => setExchange(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="bybit">Bybit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={environment} onValueChange={(v: "production" | "testnet") => setEnvironment(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testnet">Testnet</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Testnet uses fake funds. Get testnet keys from{" "}
                  {exchange === "binance" ? (
                    <a href="https://testnet.binance.vision/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Binance Spot Testnet
                    </a>
                  ) : (
                    <a href="https://testnet.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Bybit Testnet
                    </a>
                  )}
                </p>
              </div>
            </>
          )}

          {/* Step 2: Permission checklist */}
          {step === 2 && (
            <>
              <Alert className="border-amber-500/50 bg-amber-500/5">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  Never enable withdrawals for API keys. Use testnet first if you are unsure.
                </AlertDescription>
              </Alert>
              <Card className="p-4 space-y-3">
                <p className="text-sm font-medium">Set these permissions on your API key:</p>
                <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Enable: Read-only access</li>
                  <li>Enable: Spot trading</li>
                  <li>Enable: Futures trading (USDT perpetual)</li>
                  <li className="text-destructive font-medium">Disable: Withdrawals (must be OFF)</li>
                </ul>
                <p className="text-xs text-muted-foreground">If you use IP restrictions, add our backend IP (optional).</p>
              </Card>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Where to set permissions:</p>
                {exchange === "binance" ? (
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Binance: API Management → Create API → enable Reading, Spot & Margin, Futures; leave Withdrawals OFF</li>
                    <li>Testnet: testnet.binance.vision → same steps</li>
                  </ul>
                ) : (
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Bybit: API Management → Create API → enable Read-Write (Spot + Futures); leave Withdrawals OFF</li>
                    <li>Testnet: testnet.bybit.com → same steps</li>
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={exchange === "binance" ? "https://www.binance.com/en/my/settings/api-management" : "https://www.bybit.com/app/user/api-management"} target="_blank" rel="noopener noreferrer">
                    Open {exchange === "binance" ? "Binance" : "Bybit"} API <ExternalLink className="size-3 ml-1" />
                  </a>
                </Button>
              </div>
            </>
          )}

          {/* Step 3: API Key + Secret */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Label (optional)</Label>
                <Input
                  placeholder={exchange === "binance" ? "My Binance" : "My Bybit"}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={40}
                />
              </div>
              <div className="space-y-2">
                <Label>API Key (required, min {MIN_KEY_LEN} chars)</Label>
                <Input
                  type="password"
                  placeholder="Paste your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>API Secret (required, min {MIN_SECRET_LEN} chars)</Label>
                <Input
                  type="password"
                  placeholder="Paste your API secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="font-mono"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">Your secret is never shown again after you leave this step.</p>
              </div>
            </>
          )}

          {/* Step 4: Save + Auto-Test */}
          {step === 4 && (
            <>
              {!createdConnection ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Save your connection and we will test it immediately. Keys are encrypted and never logged.
                  </p>
                  {apiKey.trim().length >= MIN_KEY_LEN && apiSecret.trim().length >= MIN_SECRET_LEN ? (
                    <Button
                      onClick={handleSaveAndTest}
                      disabled={saveLoading}
                      className="w-full"
                    >
                      {saveLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                      Save and test connection
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Go back to Step 3 and enter API Key and Secret.</p>
                  )}
                </>
              ) : (
                <>
                  {testAfterSaveStatus === "loading" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Testing connection…
                    </div>
                  )}
                  {testAfterSaveStatus === "ok" && (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle2 className="size-4 text-green-600" />
                      <AlertDescription>Connected: OK. You can continue to Futures setup.</AlertDescription>
                    </Alert>
                  )}
                  {testAfterSaveStatus === "fail" && (
                    <Alert variant="destructive">
                      <XCircle className="size-4" />
                      <AlertDescription>
                        {testAfterSaveError || "Test failed."} Check: wrong permissions, IP restrictions, invalid key, testnet mismatch, or timestamp drift.
                      </AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Connection saved. {testAfterSaveStatus === "ok" ? "Click Next to set up Futures (optional)." : "Fix the error above or click Next to skip Futures."}
                  </p>
                </>
              )}
            </>
          )}

          {/* Step 5: Futures */}
          {step === 5 && connectionForFutures && (
            <>
              <p className="text-sm text-muted-foreground">
                Test Futures API, then enable Futures with leverage and margin settings.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleFuturesTest} disabled={futuresTestLoading}>
                  {futuresTestLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Test Futures
                </Button>
                {futuresTestOk && !futuresEnabled && (
                  <Button size="sm" onClick={handleFuturesEnable} disabled={futuresEnableLoading}>
                    {futuresEnableLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Enable Futures
                  </Button>
                )}
              </div>
              {futuresTestOk && (
                <Card className="p-4 space-y-3">
                  <Label>Futures settings (used when you Enable)</Label>
                  <div className="grid gap-2">
                    <div>
                      <Label className="text-xs">Leverage (1–{connectionForFutures.max_leverage_allowed ?? 125})</Label>
                      <Input
                        type="number"
                        min={1}
                        max={connectionForFutures.max_leverage_allowed ?? 125}
                        value={futuresLeverage}
                        onChange={(e) => setFuturesLeverage(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Margin mode</Label>
                      <Select value={futuresMarginMode} onValueChange={(v: "isolated" | "cross") => setFuturesMarginMode(v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="isolated">Isolated</SelectItem>
                          <SelectItem value="cross">Cross</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Position mode</Label>
                      <Select value={futuresPositionMode} onValueChange={(v: "one_way" | "hedge") => setFuturesPositionMode(v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_way">One-way</SelectItem>
                          <SelectItem value="hedge">Hedge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}
              {futuresEnabled && (
                <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Futures ON</Badge>
              )}
            </>
          )}

          {/* Step 6: Done */}
          {step === 6 && (
            <>
              <Card className="p-4 space-y-3">
                <p className="font-medium">Connection summary</p>
                <div className="text-sm space-y-1">
                  <div>Exchange: {connectionForFutures?.exchange ?? exchange}</div>
                  <div>Environment: {connectionForFutures?.environment ?? environment}</div>
                  {connectionForFutures?.label && <div>Label: {connectionForFutures.label}</div>}
                  <div>Spot: <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">OK</Badge></div>
                  <div>Futures: {futuresEnabled ? <Badge className="bg-green-500/15 text-green-600 border-green-500/30">ON</Badge> : <Badge variant="secondary">OFF</Badge>}</div>
                  {connectionForFutures && (
                    <div className="flex items-center gap-2 pt-2">
                      <Label className="text-xs">Kill switch (no futures orders when ON)</Label>
                      <Switch
                        checked={killSwitch}
                        onCheckedChange={handleKillSwitch}
                        disabled={killSwitchUpdating}
                      />
                    </div>
                  )}
                </div>
              </Card>
              <div className="flex flex-col gap-2">
                <Button onClick={goToBacktest} variant="outline" className="w-full gap-2">
                  <Zap className="size-4" /> Go to Strategy Backtest
                </Button>
                <Button onClick={goToTerminal} className="w-full gap-2">
                  <Zap className="size-4" /> Go to Terminal
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 1 && step < 6 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="size-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < STEPS ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 3 && !canNextStep3) ||
                  (step === 4 && !createdConnection)
                }
              >
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleDone}>Done</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
