/**
 * Connect Exchange modal — Origami-style, single popup.
 * Two-column: Create Account form (left 45%) + Step-by-step guide (right 55%).
 * Only Binance and Bybit are clickable; others show (soon).
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
  EXCHANGE_SELECTOR_ORDER,
  isSupported,
  type ExchangeId,
  type SupportedExchange,
} from "@/app/config/exchangeSteps";
import { toast } from "@/app/lib/toast";
import { ExternalLink } from "lucide-react";

const MIN_KEY_LEN = 10;
const MIN_SECRET_LEN = 10;

export interface ConnectExchangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (connection?: ExchangeConnection) => void;
}

export function ConnectExchangeModal({
  open,
  onOpenChange,
  onComplete,
}: ConnectExchangeModalProps) {
  const [exchange, setExchange] = useState<ExchangeId>("binance");
  const [environment, setEnvironment] = useState<"production" | "testnet">("testnet");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "verifying" | "connected" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdConnection, setCreatedConnection] = useState<ExchangeConnection | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const supported = isSupported(exchange);
  const steps = supported ? EXCHANGE_STEPS[exchange as SupportedExchange] : [];

  const canSubmit =
    supported &&
    apiKey.trim().length >= MIN_KEY_LEN &&
    apiSecret.trim().length >= MIN_SECRET_LEN;

  const reset = () => {
    setLabel("");
    setApiKey("");
    setApiSecret("");
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
          "max-w-[1100px] w-[calc(100vw-0.5rem)] sm:w-[calc(100vw-2rem)] max-h-[95vh] sm:max-h-[88vh] p-0 gap-0 overflow-hidden",
          "rounded-xl sm:rounded-2xl shadow-2xl",
          "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
          "border border-slate-700/50",
          "flex flex-col",
          "[&>button]:top-2.5 [&>button]:right-2.5 sm:[&>button]:top-4 sm:[&>button]:right-4 [&>button]:rounded-md [&>button]:p-2 [&>button]:text-slate-400 [&>button]:hover:text-white [&>button]:hover:bg-slate-700/50 [&>button]:touch-manipulation"
        )}
        onPointerDownOutside={(e) => loading && e.preventDefault()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
      >
        <DialogTitle className="sr-only">Select an exchange</DialogTitle>
        <DialogDescription className="sr-only">
          Klineo will help you set up and connect your exchange
        </DialogDescription>

        {/* Header */}
        <div className="shrink-0 px-3 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-2 sm:pb-4 text-center">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            Select an exchange
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Klineo will help you set up and connect your exchange
          </p>
        </div>

        {/* Exchange selector row - horizontal scroll on mobile */}
        <div className="shrink-0 px-3 sm:px-6 md:px-8 pb-3 sm:pb-4 overflow-x-auto overflow-y-hidden -mx-1 scroll-smooth">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center min-w-0">
            {EXCHANGE_SELECTOR_ORDER.map((id) => {
              const enabled = isSupported(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (!enabled) return;
                    setExchange(id);
                    setStatus("idle");
                    setErrorMessage("");
                  }}
                  disabled={!enabled}
                  className={cn(
                    "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 touch-manipulation",
                    exchange === id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                      : enabled
                        ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                        : "bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-60"
                  )}
                >
                  {EXCHANGE_NAMES[id]}
                  {!enabled && <span className="ml-1 opacity-80">(soon)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content: 45% left, 55% right - PC side-by-side, mobile stacked */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 sm:gap-6 px-3 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 overflow-y-auto overflow-x-hidden">
            {/* LEFT: Create Account form (45%) */}
            <div className="flex-shrink-0 w-full lg:w-[45%] lg:min-w-[340px] lg:max-w-[420px] lg:max-h-[calc(88vh-11rem)] lg:overflow-y-auto">
            <Card className="p-4 sm:p-6 bg-slate-800/50 border-slate-700/80">
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
                        <a href="https://testnet.binance.vision/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Binance</a>
                      ) : (
                        <a href="https://testnet.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Bybit</a>
                      )}.
                    </p>
                  </div>

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
                      {loading ? "Verifying…" : "Create Account"}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT: Step-by-step guide (55%), scrollable */}
          <div className="flex-1 min-w-0 min-h-[200px] overflow-y-auto overflow-x-hidden">
            <div className="space-y-2.5 sm:space-y-3">
              {steps.map((step, i) => (
                <Card
                  key={i}
                  className="p-3 sm:p-4 bg-slate-800/30 border-slate-700/80 relative overflow-hidden"
                >
                  <Badge
                    variant="outline"
                    className="absolute top-3 right-3 shrink-0 border-slate-600 text-slate-400 text-[10px] sm:text-xs px-1.5 py-0"
                  >
                    {step.label}
                  </Badge>
                  <div className="pr-16 sm:pr-20">
                    <p className="text-xs sm:text-sm text-slate-300">{step.text}</p>
                    {(step.linkText && step.linkHref) || (step.linkTextSecondary && step.linkHrefSecondary) ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {step.linkText && step.linkHref && (
                          <a
                            href={step.linkHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary hover:underline touch-manipulation py-1"
                          >
                            {step.linkText}
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                        {step.linkTextSecondary && step.linkHrefSecondary && (
                          <a
                            href={step.linkHrefSecondary}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 hover:underline touch-manipulation py-1"
                          >
                            {step.linkTextSecondary}
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    ) : null}
                    {step.checklist && step.checklist.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-slate-400">
                        {step.checklist.map((item, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            {item}
                          </li>
                        ))}
                        {step.checklistDoNot && (
                          <li className="flex items-start gap-2 text-amber-400">
                            <span className="mt-0.5">✗</span>
                            {step.checklistDoNot}
                          </li>
                        )}
                      </ul>
                    )}
                    {step.showScreenshot && (
                      <div className="mt-3 rounded-lg border border-slate-600/60 bg-slate-900/40 overflow-hidden">
                        {step.screenshotSrc ? (
                          <img
                            src={step.screenshotSrc}
                            alt=""
                            className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[260px] object-contain object-top rounded"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-24 sm:h-28 flex items-center justify-center text-slate-500 text-xs border border-dashed border-slate-600">
                            Screenshot placeholder
                          </div>
                        )}
                      </div>
                    )}
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
