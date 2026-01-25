/**
 * KLINEO Error State System
 * 
 * Comprehensive error handling UI with retry patterns and recovery flows.
 */

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  AlertCircle,
  WifiOff,
  Server,
  Lock,
  RefreshCw,
  Home,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface ErrorStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  errorCode?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  retryable?: boolean;
  isRetrying?: boolean;
  compact?: boolean;
}

export function ErrorState({
  icon: Icon,
  title,
  description,
  errorCode,
  primaryAction,
  secondaryAction,
  retryable = false,
  isRetrying = false,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div className="text-center py-8">
        <Icon className="size-8 text-[#EF4444] mx-auto mb-3" />
        <div className="text-sm font-medium text-foreground mb-1">{title}</div>
        <div className="text-xs text-muted-foreground mb-4">{description}</div>
        {primaryAction && (
          <Button
            size="sm"
            onClick={primaryAction.onClick}
            disabled={isRetrying}
            className="bg-accent text-background hover:bg-accent/90"
          >
            {isRetrying && <RefreshCw className="size-3 mr-2 animate-spin" />}
            {primaryAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="p-12 text-center border-[#EF4444]/20">
      <div className="max-w-md mx-auto">
        <div className="size-16 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-6">
          <Icon className="size-8 text-[#EF4444]" />
        </div>
        {errorCode && (
          <Badge variant="outline" className="mb-4 text-xs text-muted-foreground">
            Error {errorCode}
          </Badge>
        )}
        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {description}
        </p>
        <div className="flex items-center justify-center gap-3">
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              disabled={isRetrying}
              className="bg-accent text-background hover:bg-accent/90"
            >
              {isRetrying && <RefreshCw className="size-4 mr-2 animate-spin" />}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Full-page error screens for routing errors
 */

export function Error404({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="size-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="size-10 text-accent" />
        </div>
        <Badge variant="outline" className="mb-4">
          Error 404
        </Badge>
        <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={() => onNavigate("dashboard")}
            className="bg-accent text-background hover:bg-accent/90"
          >
            <Home className="size-4 mr-2" />
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Error500({ onRetry }: { onRetry: () => void }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetry();
    setIsRetrying(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="size-20 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-6">
          <Server className="size-10 text-[#EF4444]" />
        </div>
        <Badge variant="outline" className="mb-4 border-[#EF4444]/20">
          Error 500
        </Badge>
        <h1 className="text-3xl font-bold mb-4">Server Error</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Something went wrong on our end. We've been notified and are working on a fix.
        </p>
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          className="bg-accent text-background hover:bg-accent/90"
        >
          {isRetrying && <RefreshCw className="size-4 mr-2 animate-spin" />}
          Try Again
        </Button>
      </div>
    </div>
  );
}

export function Error401({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="size-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="size-10 text-accent" />
        </div>
        <Badge variant="outline" className="mb-4">
          Error 401
        </Badge>
        <h1 className="text-3xl font-bold mb-4">Session Expired</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Your session has expired for security reasons. Please log in again to continue.
        </p>
        <Button
          onClick={() => onNavigate("login")}
          className="bg-accent text-background hover:bg-accent/90"
        >
          Log In Again
        </Button>
      </div>
    </div>
  );
}

export function Error403({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="size-20 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="size-10 text-[#EF4444]" />
        </div>
        <Badge variant="outline" className="mb-4 border-[#EF4444]/20">
          Error 403
        </Badge>
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          You don't have permission to access this resource. Contact support if you believe this is an error.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={() => onNavigate("dashboard")}
            className="bg-accent text-background hover:bg-accent/90"
          >
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => onNavigate("support")}>
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline component errors
 */

export function APIKeyError({
  onRetry,
  onSetup,
}: {
  onRetry: () => void;
  onSetup: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetry();
    setIsRetrying(false);
  };

  return (
    <ErrorState
      icon={Lock}
      title="API Key Connection Failed"
      description="Unable to connect to your exchange API. Please check your API key permissions or reconnect."
      errorCode="API_001"
      primaryAction={{
        label: isRetrying ? "Retrying..." : "Retry Connection",
        onClick: handleRetry,
      }}
      secondaryAction={{
        label: "Reconfigure API Key",
        onClick: onSetup,
      }}
      isRetrying={isRetrying}
      compact
    />
  );
}

export function ExchangeDisconnectedError({ onReconnect }: { onReconnect: () => void }) {
  return (
    <ErrorState
      icon={WifiOff}
      title="Exchange Disconnected"
      description="Lost connection to your exchange. Copy trading is paused until connection is restored."
      errorCode="EXCHANGE_002"
      primaryAction={{
        label: "Reconnect",
        onClick: onReconnect,
      }}
      compact
    />
  );
}

export function RateLimitError() {
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  return (
    <ErrorState
      icon={Clock}
      title="Rate Limit Exceeded"
      description={`Too many requests. Please wait ${cooldown} seconds before trying again.`}
      errorCode="RATE_003"
      compact
    />
  );
}

export function NetworkOfflineError({ onRetry }: { onRetry: () => void }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetry();
    setIsRetrying(false);
  };

  return (
    <ErrorState
      icon={WifiOff}
      title="No Internet Connection"
      description="Please check your internet connection and try again."
      primaryAction={{
        label: "Retry",
        onClick: handleRetry,
      }}
      isRetrying={isRetrying}
      compact
    />
  );
}

/**
 * Connection Status Indicator for TopBar
 */
export function ConnectionStatus({
  status,
}: {
  status: "connected" | "connecting" | "disconnected" | "error";
}) {
  const statusConfig = {
    connected: {
      color: "#10B981",
      label: "Exchange Connected",
      animate: false,
    },
    connecting: {
      color: "#FFB000",
      label: "Connecting...",
      animate: true,
    },
    disconnected: {
      color: "#6B7280",
      label: "Disconnected",
      animate: false,
    },
    error: {
      color: "#EF4444",
      label: "Connection Error",
      animate: true,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`size-2 rounded-full ${config.animate ? "animate-pulse" : ""}`}
        style={{ backgroundColor: config.color }}
      />
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}
