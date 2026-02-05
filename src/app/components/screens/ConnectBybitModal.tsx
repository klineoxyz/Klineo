/**
 * Connect Bybit modal — Bybit-specific Connect Exchange flow.
 * Uses ConnectExchangeModal with exchangeOnly="bybit" for:
 * - Title: "Connect Bybit"
 * - Subtitle: "Klineo will guide you through connecting your Bybit account"
 * - Bybit selected, other exchanges muted
 * - 6-step Bybit guidance (system-generated key, UTA, no passphrase, no withdrawals)
 */

import { ConnectExchangeModal } from "./ConnectExchangeModal";
import type { ExchangeConnection } from "@/lib/api";

export interface ConnectBybitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (connection?: ExchangeConnection) => void;
}

export function ConnectBybitModal({
  open,
  onOpenChange,
  onComplete,
}: ConnectBybitModalProps) {
  return (
    <ConnectExchangeModal
      open={open}
      onOpenChange={onOpenChange}
      onComplete={onComplete}
      exchangeOnly="bybit"
    />
  );
}
