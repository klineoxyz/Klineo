/**
 * KLINEO Toast Notification System
 * 
 * Terminal-styled toast notifications with success, error, warning, and info variants.
 * Built on Sonner with custom styling for the KLINEO aesthetic.
 */

import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Custom toast styling for KLINEO terminal aesthetic
const toastStyles = {
  success: {
    icon: CheckCircle2,
    iconColor: "#10B981", // green
    borderColor: "#10B981",
  },
  error: {
    icon: XCircle,
    iconColor: "#EF4444", // red
    borderColor: "#EF4444",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "#FFB000", // amber
    borderColor: "#FFB000",
  },
  info: {
    icon: Info,
    iconColor: "#FFB000", // amber
    borderColor: "#FFB000",
  },
};

function createToast(type: ToastType, message: string, options?: ToastOptions) {
  const style = toastStyles[type];
  const Icon = style.icon;

  return sonnerToast.custom(
    (t) => (
      <div
        className="bg-card border-l-4 rounded-md shadow-lg p-4 min-w-[320px] max-w-[420px]"
        style={{ borderLeftColor: style.borderColor }}
      >
        <div className="flex items-start gap-3">
          <Icon
            className="size-5 mt-0.5 flex-shrink-0"
            style={{ color: style.iconColor }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground">{message}</div>
            {options?.description && (
              <div className="text-xs text-muted-foreground mt-1">
                {options.description}
              </div>
            )}
            {options?.action && (
              <button
                onClick={() => {
                  options.action?.onClick();
                  sonnerToast.dismiss(t);
                }}
                className="text-xs text-accent hover:text-accent/80 mt-2 font-medium"
              >
                {options.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => sonnerToast.dismiss(t)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    ),
    {
      duration: options?.duration || 4000,
    }
  );
}

/**
 * KLINEO Toast API
 * 
 * @example
 * toast.success("Trade executed successfully");
 * toast.error("Failed to connect API key", { description: "Check your permissions" });
 * toast.warning("Risk limit approaching", { action: { label: "View", onClick: () => {} } });
 */
export const toast = {
  success: (message: string, options?: ToastOptions) =>
    createToast("success", message, options),
  
  error: (message: string, options?: ToastOptions) =>
    createToast("error", message, options),
  
  warning: (message: string, options?: ToastOptions) =>
    createToast("warning", message, options),
  
  info: (message: string, options?: ToastOptions) =>
    createToast("info", message, options),

  // Trading-specific convenience methods
  tradeExecuted: (symbol: string, side: "BUY" | "SELL", quantity: string) =>
    createToast("success", `${side} ${quantity} ${symbol}`, {
      description: "Trade executed successfully",
      duration: 3000,
    }),

  copyStarted: (traderName: string) =>
    createToast("success", `Copying ${traderName}`, {
      description: "Copy configuration activated",
      duration: 3000,
    }),

  copyStopped: (traderName: string) =>
    createToast("info", `Stopped copying ${traderName}`, {
      description: "All positions remain open",
      duration: 3000,
    }),

  apiKeyConnected: (exchange: string) =>
    createToast("success", `${exchange} connected`, {
      description: "API key validated successfully",
      duration: 3000,
    }),

  orderFailed: (reason: string) =>
    createToast("error", "Order failed", {
      description: reason,
      duration: 5000,
    }),

  riskLimitHit: (limitType: string) =>
    createToast("warning", `${limitType} limit reached`, {
      description: "No new positions will be opened",
      duration: 6000,
      action: {
        label: "Adjust Limits",
        onClick: () => console.log("Navigate to risk settings"),
      },
    }),

  connectionLost: () =>
    createToast("error", "Connection lost", {
      description: "Attempting to reconnect...",
      duration: Infinity, // Don't auto-dismiss
    }),

  connectionRestored: () =>
    createToast("success", "Connection restored", {
      description: "All systems operational",
      duration: 3000,
    }),
};
