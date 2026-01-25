/**
 * KLINEO Confirmation Dialog System
 * 
 * For destructive and critical actions requiring user confirmation.
 * Includes danger levels and double-confirmation for irreversible actions.
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Label } from "@/app/components/ui/label";
import { AlertTriangle, XCircle, Info } from "lucide-react";

type DangerLevel = "warning" | "danger" | "critical";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  dangerLevel?: DangerLevel;
  requiresAcknowledgment?: boolean;
  acknowledgmentText?: string;
  isLoading?: boolean;
}

const dangerStyles = {
  warning: {
    icon: Info,
    iconColor: "text-accent",
    iconBg: "bg-accent/10",
    buttonClass: "bg-accent text-background hover:bg-accent/90",
  },
  danger: {
    icon: AlertTriangle,
    iconColor: "text-[#FFB000]",
    iconBg: "bg-[#FFB000]/10",
    buttonClass: "bg-[#FFB000] text-background hover:bg-[#FFB000]/90",
  },
  critical: {
    icon: XCircle,
    iconColor: "text-[#EF4444]",
    iconBg: "bg-[#EF4444]/10",
    buttonClass: "bg-[#EF4444] text-white hover:bg-[#EF4444]/90",
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  dangerLevel = "warning",
  requiresAcknowledgment = false,
  acknowledgmentText = "I understand this action cannot be undone",
  isLoading = false,
}: ConfirmationDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const style = dangerStyles[dangerLevel];
  const Icon = style.icon;

  const canConfirm = !requiresAcknowledgment || acknowledged;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setAcknowledged(false); // Reset for next time
    }
  };

  const handleCancel = () => {
    setAcknowledged(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`size-12 rounded-lg ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`size-6 ${style.iconColor}`} />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm leading-relaxed">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {requiresAcknowledgment && (
          <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-md border border-border">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="acknowledge"
              className="text-sm leading-relaxed cursor-pointer select-none"
            >
              {acknowledgmentText}
            </Label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={style.buttonClass}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Pre-configured confirmation dialogs for common KLINEO actions
 */

export function useStopCopyingDialog(traderName: string, onConfirm: () => void) {
  const [open, setOpen] = useState(false);

  return {
    open: () => setOpen(true),
    dialog: (
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Stop Copying Trader"
        description={`Are you sure you want to stop copying ${traderName}? Your existing positions will remain open, but new trades will not be copied.`}
        confirmLabel="Stop Copying"
        dangerLevel="warning"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      />
    ),
  };
}

export function useClosePositionDialog(symbol: string, onConfirm: () => void) {
  const [open, setOpen] = useState(false);

  return {
    open: () => setOpen(true),
    dialog: (
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Close Position"
        description={`Close your ${symbol} position at market price? This action is immediate and cannot be undone.`}
        confirmLabel="Close Position"
        dangerLevel="danger"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      />
    ),
  };
}

export function useCloseAllPositionsDialog(count: number, onConfirm: () => void) {
  const [open, setOpen] = useState(false);

  return {
    open: () => setOpen(true),
    dialog: (
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Close All Positions"
        description={`You are about to close ${count} open positions at market price. This will execute ${count} sell orders immediately. This action cannot be reversed.`}
        confirmLabel="Close All Positions"
        dangerLevel="critical"
        requiresAcknowledgment
        acknowledgmentText="I understand this will immediately close all positions and cannot be undone"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      />
    ),
  };
}

export function useDeleteAPIKeyDialog(exchange: string, onConfirm: () => void) {
  const [open, setOpen] = useState(false);

  return {
    open: () => setOpen(true),
    dialog: (
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete API Key"
        description={`Delete ${exchange} API key? This will stop all copy trading on this exchange. Your funds remain safe in your exchange account.`}
        confirmLabel="Delete API Key"
        dangerLevel="critical"
        requiresAcknowledgment
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      />
    ),
  };
}

export function useCancelSubscriptionDialog(onConfirm: () => void) {
  const [open, setOpen] = useState(false);

  return {
    open: () => setOpen(true),
    dialog: (
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel Subscription"
        description="Your subscription will remain active until the end of your current billing period. After that, you'll lose access to copy trading features."
        confirmLabel="Cancel Subscription"
        dangerLevel="warning"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      />
    ),
  };
}
