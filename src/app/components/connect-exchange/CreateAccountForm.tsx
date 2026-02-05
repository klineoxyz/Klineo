/**
 * Create Account form card — left column of Connect Exchange modal.
 */

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { EXCHANGE_NAMES, type ExchangeId, type SupportedExchange } from "@/app/config/exchangeSteps";

interface CreateAccountFormProps {
  exchange: ExchangeId;
  supported: boolean;
  environment: "production" | "testnet";
  onEnvironmentChange: (v: "production" | "testnet") => void;
  label: string;
  onLabelChange: (v: string) => void;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  apiSecret: string;
  onApiSecretChange: (v: string) => void;
  loading: boolean;
  status: "idle" | "verifying" | "connected" | "error";
  errorMessage: string;
  capabilities: string[];
  canSubmit: boolean;
  onCreateAccount: () => void;
  onRetry: () => void;
  onDone: () => void;
}

export function CreateAccountForm({
  exchange,
  supported,
  environment,
  onEnvironmentChange,
  label,
  onLabelChange,
  apiKey,
  onApiKeyChange,
  apiSecret,
  onApiSecretChange,
  loading,
  status,
  errorMessage,
  capabilities,
  canSubmit,
  onCreateAccount,
  onRetry,
  onDone,
}: CreateAccountFormProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-5">Create Account</h3>

      {!supported ? (
        <p className="text-sm text-slate-400 leading-relaxed">
          {EXCHANGE_NAMES[exchange]} support is coming soon. Use Binance or Bybit for now.
        </p>
      ) : (
        <div className="space-y-5">
          <div>
            <Label className="text-slate-300 text-sm font-medium">Account Name</Label>
            <Input
              placeholder="My Trading Account"
              value={label}
              onChange={(e) => onLabelChange(e.target.value)}
              className="mt-2 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary/50"
              disabled={loading}
            />
          </div>

          <div>
            <Label className="text-slate-300 text-sm font-medium">Environment</Label>
            <Select value={environment} onValueChange={onEnvironmentChange} disabled={loading}>
              <SelectTrigger className="mt-2 h-11 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="testnet">Testnet</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {environment === "testnet" ? (
                <>
                  Testnet uses fake funds. Get keys from{" "}
                  {exchange === "binance" ? (
                    <a
                      href="https://testnet.binance.vision/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 hover:underline"
                    >
                      Binance
                    </a>
                  ) : (
                    <a
                      href="https://testnet.bybit.com/app/user/api-management"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 hover:underline"
                    >
                      Bybit
                    </a>
                  )}
                  .
                </>
              ) : (
                <>
                  Production uses real funds. Get API keys from{" "}
                  {exchange === "binance" ? (
                    <a
                      href="https://www.binance.com/en/my/settings/api-management"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 hover:underline"
                    >
                      Binance
                    </a>
                  ) : (
                    <a
                      href="https://www.bybit.com/app/user/api-management"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 hover:underline"
                    >
                      Bybit
                    </a>
                  )}
                  .
                </>
              )}
            </p>
          </div>

          <div>
            <Label className="text-slate-300 text-sm font-medium">API Key</Label>
            <Input
              type="password"
              placeholder="Paste your API key"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="mt-2 h-11 bg-white/5 border-white/10 text-white font-mono placeholder:text-slate-500 focus:border-primary/50"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-sm font-medium">Secret Key</Label>
            <Input
              type="password"
              placeholder="Paste your secret key"
              value={apiSecret}
              onChange={(e) => onApiSecretChange(e.target.value)}
              className="mt-2 h-11 bg-white/5 border-white/10 text-white font-mono placeholder:text-slate-500 focus:border-primary/50"
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {status === "connected" ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="size-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              {capabilities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {capabilities.map((c) => (
                    <Badge key={c} variant="secondary" className="bg-white/10 text-slate-200 border-white/10">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
              <Button
                onClick={onDone}
                className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-primary/25 transition-shadow"
              >
                Done
              </Button>
            </div>
          ) : status === "error" ? (
            <div className="space-y-3 pt-1">
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-200 leading-relaxed">
                {errorMessage}
              </div>
              <Button
                variant="outline"
                onClick={onRetry}
                className="w-full h-12 border-white/20 text-slate-200 hover:bg-white/5"
              >
                Retry verification
              </Button>
            </div>
          ) : (
            <Button
              onClick={onCreateAccount}
              disabled={!canSubmit || loading}
              className="w-full h-12 mt-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Create Account"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
