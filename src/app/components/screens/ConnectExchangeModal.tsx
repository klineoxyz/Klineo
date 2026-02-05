/**
 * Connect Exchange modal — Origami-inspired, full-screen overlay.
 * Two-column: Create Account form (left) + Step-by-step guidance (right).
 * Only Binance and Bybit are wired to the backend. Others show "Coming soon".
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/components/ui/utils";
import { exchangeConnections, sanitizeExchangeError, getApiErrorMessage, type ExchangeConnection } from "@/lib/api";
import {
  EXCHANGE_STEPS,
  EXCHANGE_NAMES,
  isSupported,
  EXCHANGES_REQUIRING_PASSPHRASE,
  type ExchangeId,
  type SupportedExchange,
} from "@/app/config/exchangeSteps";
import { toast } from "@/app/lib/toast";

const MIN_KEY_LEN = 10;
const MIN_SECRET_LEN = 10;

export interface ConnectExchangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (connection?: ExchangeConnection) => void;
  /** When set to 'bybit', show Bybit-specific title/subtitle and mute other exchanges */
  exchangeOnly?: 'bybit';
}

export function ConnectExchangeModal({
  open,
  onOpenChange,
  onComplete,
  exchangeOnly,
}: ConnectExchangeModalProps) {
  const initialExchange: ExchangeId = exchangeOnly === 'bybit' ? 'bybit' : 'binance';
  const [exchange, setExchange] = useState<ExchangeId>(initialExchange);
  const [environment, setEnvironment] = useState<"production" | "testnet">("testnet");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "verifying" | "connected" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdConnection, setCreatedConnection] = useState<ExchangeConnection | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const supported = isSupported(exchange);
  const showPassphrase = EXCHANGES_REQUIRING_PASSPHRASE.includes(exchange);
  const steps = supported ? EXCHANGE_STEPS[exchange as SupportedExchange] : [];

  const canSubmit =
    supported &&
    apiKey.trim().length >= MIN_KEY_LEN &&
    apiSecret.trim().length >= MIN_SECRET_LEN &&
    (!showPassphrase || passphrase.trim().length > 0);

  const reset = () => {
    setLabel("");
    setApiKey("");
    setApiSecret("");
    setPassphrase("");
    setLoading(false);
    setStatus("idle");
    setErrorMessage("");
    setCreatedConnection(null);
    setCapabilities([]);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreateAccount = async () => {
    if (!canSubmit || !supported) return;
    setLoading(true);
    setStatus("verifying");
    setErrorMessage("");
    try {
      const { connection } = await exchangeConnections.create({
        exchange: exchange as SupportedExchange,
        environment,
        label: label.trim() || undefined,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      setCreatedConnection(connection);
      setApiKey("");
      setApiSecret("");
      setPassphrase("");

      const testRes = await exchangeConnections.test(connection.id);
      if (testRes.ok) {
        setStatus("connected");
        const caps: string[] = ["Spot"];
        if (connection.supports_futures) caps.push("Futures");
        setCapabilities(caps);
        toast.success("Connected", { description: `Latency: ${testRes.latencyMs}ms` });
      } else {
        setStatus("error");
        setErrorMessage(sanitizeExchangeError(testRes.error || testRes.message || "Verification failed"));
      }
    } catch (e: unknown) {
      setStatus("error");
      setErrorMessage(sanitizeExchangeError(getApiErrorMessage(e)));
      toast.error("Connection failed", { description: getApiErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  const handleDone = () => {
    onComplete?.(createdConnection ?? undefined);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => handleClose(!!next)}>
      <DialogContent
        className={cn(
          "max-w-[1100px] w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-h-[90vh] sm:max-h-[85vh] p-0 gap-0 overflow-hidden",
          "rounded-xl sm:rounded-2xl shadow-2xl",
          "bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800",
          "border border-slate-700/50",
          "flex flex-col",
          "[&>button]:top-3 [&>button]:right-3 sm:[&>button]:top-4 sm:[&>button]:right-4 [&>button]:rounded-md [&>button]:p-2 [&>button]:text-slate-400 [&>button]:hover:text-white [&>button]:hover:bg-slate-700/50 [&>button]:touch-manipulation"
        )}
        onPointerDownOutside={(e) => loading && e.preventDefault()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {exchangeOnly === 'bybit' ? 'Connect Bybit' : 'Select an exchange'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {exchangeOnly === 'bybit'
            ? 'Klineo will guide you through connecting your Bybit account'
            : 'Klineo will help you set up and connect your exchange'}
        </DialogDescription>
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4 text-center">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            {exchangeOnly === 'bybit' ? 'Connect Bybit' : 'Select an exchange'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {exchangeOnly === 'bybit'
              ? 'Klineo will guide you through connecting your Bybit account'
              : 'Klineo will help you set up and connect your exchange'}
          </p>
        </div>

        {/* Exchange selector row */}
        <div className="shrink-0 px-4 sm:px-6 md:px-8 pb-3 sm:pb-4 overflow-x-auto -mx-1">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center min-w-0">
            {(['binance', 'bybit', 'okx', 'gate', 'kucoin', 'mexc', 'bitget', 'bingx', 'wallet'] as ExchangeId[]).map(
              (id) => {
                const isMuted = exchangeOnly === 'bybit' && id !== 'bybit';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (isMuted) return;
                      setExchange(id);
                      setStatus("idle");
                      setErrorMessage("");
                    }}
                    disabled={isMuted}
                    className={cn(
                      "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 touch-manipulation",
                      exchange === id
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white",
                      !isSupported(id) && "opacity-60",
                      isMuted && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {EXCHANGE_NAMES[id]}
                    {!isSupported(id) && !isMuted && (
                      <span className="ml-1.5 text-xs opacity-80">(soon)</span>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Main content: two columns - scrollable on mobile */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 sm:gap-6 px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 overflow-y-auto">
            {/* LEFT: Create Account form */}
            <div className="flex-shrink-0 w-full lg:w-[380px] xl:w-[420px] lg:max-h-[calc(90vh-12rem)] lg:overflow-y-auto">
              <Card className="p-4 sm:p-6 bg-slate-800/50 border-slate-700">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Create Account</h3>

                {!supported ? (
                  <p className="text-sm text-slate-400">
                    {EXCHANGE_NAMES[exchange]} support is coming soon. Use Binance or Bybit for now.
                  </p>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <Label className="text-slate-300">Account Name</Label>
                      <Input
                        placeholder="My Trading Account"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="mt-1.5 bg-slate-900/50 border-slate-600 text-white"
                        disabled={loading}
                      />
                    </div>

                    {(exchange === 'binance' || exchange === 'bybit') && (
                      <div>
                        <Label className="text-slate-300">Environment</Label>
                        <Select
                          value={environment}
                          onValueChange={(v: "production" | "testnet") => setEnvironment(v)}
                          disabled={loading}
                        >
                          <SelectTrigger className="mt-1.5 bg-slate-900/50 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="testnet">Testnet</SelectItem>
                            <SelectItem value="production">Production</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1">
                          Testnet uses fake funds. Get keys from{" "}
                          {exchange === "binance" ? (
                            <a href="https://testnet.binance.vision/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Binance</a>
                          ) : (
                            <a href="https://testnet.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer" className="text-primary underline">Bybit</a>
                          )}.
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-slate-300">API Key</Label>
                      <Input
                        type="password"
                        placeholder="Paste your API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="mt-1.5 bg-slate-900/50 border-slate-600 text-white font-mono"
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Secret Key</Label>
                      <Input
                        type="password"
                        placeholder="Paste your secret key"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        className="mt-1.5 bg-slate-900/50 border-slate-600 text-white font-mono"
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>
                    {showPassphrase && (
                      <div>
                        <Label className="text-slate-300">Passphrase</Label>
                        <Input
                          type="password"
                          placeholder="API passphrase"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          className="mt-1.5 bg-slate-900/50 border-slate-600 text-white"
                          disabled={loading}
                          autoComplete="off"
                        />
                      </div>
                    )}

                    {status === "connected" ? (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <span className="size-2 rounded-full bg-emerald-400" />
                          Connected
                        </div>
                        {capabilities.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {capabilities.map((c) => (
                              <Badge key={c} variant="secondary" className="bg-slate-700 text-slate-200">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Button onClick={handleDone} className="w-full mt-2 min-h-[44px] touch-manipulation">
                          Done
                        </Button>
                      </div>
                    ) : status === "error" ? (
                      <div className="space-y-2 pt-2">
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
                          {errorMessage}
                        </div>
                        <Button variant="outline" onClick={handleRetry} className="w-full min-h-[44px] touch-manipulation">
                          Retry verification
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleCreateAccount}
                        disabled={!canSubmit || loading}
                        className="w-full mt-2 min-h-[44px] touch-manipulation"
                      >
                        {loading ? "Verifying connection…" : "Create Account"}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* RIGHT: Step-by-step guidance */}
            <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
              <div className="space-y-2 sm:space-y-3">
                {steps.map((step, i) => (
                  <Card
                    key={i}
                    className="p-3 sm:p-4 bg-slate-800/30 border-slate-700"
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="shrink-0 border-slate-600 text-slate-400 text-[10px] sm:text-xs px-1.5 py-0">
                        {step.label}
                      </Badge>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-xs sm:text-sm text-slate-300">{step.text}</p>
                        {step.note && (
                          <p className="text-xs text-slate-500">{step.note}</p>
                        )}
                        {step.warning && (
                          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-200">
                            {step.warning}
                          </div>
                        )}
                        {step.linkText && step.linkHref && (
                          <a
                            href={step.linkHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 text-xs sm:text-sm text-primary hover:underline touch-manipulation py-1"
                          >
                            {step.linkText}
                            <span className="size-3.5">↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
