/**
 * Connect Exchange modal — premium Origami-style popup.
 * Two-column: Create Account form (left 45%) + Step-by-step guide (right 55%).
 */

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { exchangeConnections, sanitizeExchangeError, getApiErrorMessage, type ExchangeConnection } from "@/lib/api";
import {
  EXCHANGE_STEPS,
  isSupported,
  type ExchangeId,
  type SupportedExchange,
} from "@/app/config/exchangeSteps";
import { toast } from "@/app/lib/toast";
import { ExchangeSelectorRow } from "@/app/components/connect-exchange/ExchangeSelectorRow";
import { CreateAccountForm } from "@/app/components/connect-exchange/CreateAccountForm";
import { ExchangeStepGuide } from "@/app/components/connect-exchange/ExchangeStepGuide";

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

  const handleExchangeSelect = (id: ExchangeId) => {
    if (!isSupported(id)) return;
    setExchange(id);
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => handleClose(!!v)}>
      <DialogPrimitive.Portal>
        {/* Overlay: strong backdrop blur + dark */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        {/* Modal content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-[calc(100vw-0.5rem)] sm:w-[calc(100vw-2rem)] max-w-[1200px] h-[85vh] sm:h-[80vh] max-h-[820px]",
            "rounded-2xl sm:rounded-[18px] border border-white/[0.08] shadow-2xl",
            "bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/90",
            "flex flex-col overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          onPointerDownOutside={(e) => loading && e.preventDefault()}
          onEscapeKeyDown={(e) => loading && e.preventDefault()}
        >
          {/* Close button */}
          <DialogPrimitive.Close
            className={cn(
              "absolute top-5 right-5 z-10 rounded-lg p-2",
              "text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            )}
            aria-label="Close"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>

          {/* Header */}
          <div className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-5 text-center">
            <h2 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">
              Select an exchange
            </h2>
            <p className="text-sm sm:text-[15px] text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              Klineo will help you set up and connect your exchange
            </p>
          </div>

          {/* Exchange selector row */}
          <div className="shrink-0 px-4 sm:px-8 pb-4 sm:pb-6 overflow-x-auto">
            <ExchangeSelectorRow selected={exchange} onSelect={handleExchangeSelect} />
          </div>

          {/* Main content: 45% left, 55% right — top-aligned */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[45%_1fr] gap-4 sm:gap-6 px-4 sm:px-8 pb-6 sm:pb-8 overflow-hidden items-start">
            {/* Left column: Create Account form */}
            <div className="min-w-0 flex flex-col overflow-y-auto max-h-full">
              <CreateAccountForm
                exchange={exchange}
                supported={supported}
                environment={environment}
                onEnvironmentChange={setEnvironment}
                label={label}
                onLabelChange={setLabel}
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
                apiSecret={apiSecret}
                onApiSecretChange={setApiSecret}
                loading={loading}
                status={status}
                errorMessage={errorMessage}
                capabilities={capabilities}
                canSubmit={canSubmit}
                onCreateAccount={handleCreateAccount}
                onRetry={handleRetry}
                onDone={handleDone}
              />
            </div>

            {/* Right column: Step guide — scrollable */}
            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
              <ExchangeStepGuide steps={steps} />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
