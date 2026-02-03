/**
 * Reusable modal to enable Futures on an exchange connection.
 * Used in Settings (Manage Futures) and Terminal (Futures Quick Actions).
 * Sets leverage, margin mode, position mode; calls exchangeConnections.futuresEnable.
 */

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Input } from "@/app/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exchangeConnections, getApiErrorMessage, sanitizeExchangeError, type ExchangeConnection } from "@/lib/api";

export interface FuturesEnableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ExchangeConnection | null;
  onSuccess?: () => void;
}

const MAX_LEVERAGE_DEFAULT = 125;

export function FuturesEnableModal({
  open,
  onOpenChange,
  connection,
  onSuccess,
}: FuturesEnableModalProps) {
  const [leverage, setLeverage] = useState(
    String(connection?.default_leverage ?? 3)
  );
  const [marginMode, setMarginMode] = useState<"isolated" | "cross">(
    connection?.margin_mode ?? "isolated"
  );
  const [positionMode, setPositionMode] = useState<"one_way" | "hedge">(
    connection?.position_mode ?? "one_way"
  );
  const [loading, setLoading] = useState(false);

  const maxLeverage = Math.min(
    connection?.max_leverage_allowed ?? MAX_LEVERAGE_DEFAULT,
    MAX_LEVERAGE_DEFAULT
  );

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setLeverage(String(connection?.default_leverage ?? 3));
      setMarginMode(connection?.margin_mode ?? "isolated");
      setPositionMode(connection?.position_mode ?? "one_way");
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!connection) return;
    const lev = Math.min(
      Math.max(1, parseInt(leverage, 10) || 3),
      maxLeverage
    );
    setLoading(true);
    try {
      await exchangeConnections.futuresEnable(connection.id, {
        default_leverage: lev,
        margin_mode: marginMode,
        position_mode: positionMode,
      });
      toast.success("Futures ON");
      onSuccess?.();
      handleOpenChange(false);
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e);
      const isRestricted = /451|restricted|eligibility|region|unavailable.*location/i.test(msg);
      toast.error(isRestricted ? "Futures not available in your region" : "Enable failed", {
        description: sanitizeExchangeError(msg),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enable Futures</DialogTitle>
          <DialogDescription>
            Set leverage, margin mode, and position mode for this connection.
            Applies to BTCUSDT (and other symbols when you run strategies).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Leverage (1–{maxLeverage})</Label>
            <Input
              type="number"
              min={1}
              max={maxLeverage}
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Margin mode</Label>
            <Select
              value={marginMode}
              onValueChange={(v: "isolated" | "cross") => setMarginMode(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="isolated">Isolated</SelectItem>
                <SelectItem value="cross">Cross</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Position mode</Label>
            <Select
              value={positionMode}
              onValueChange={(v: "one_way" | "hedge") => setPositionMode(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_way">One-way</SelectItem>
                <SelectItem value="hedge">Hedge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Enable Futures
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
