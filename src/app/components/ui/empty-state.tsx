import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { LucideIcon, Inbox, TrendingUp, History, Users, DollarSign, Search, Bell } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className = ""
}: EmptyStateProps) {
  return (
    <Card className={`p-12 flex flex-col items-center justify-center text-center ${className}`}>
      {Icon && (
        <div className="size-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <Icon className="size-8 text-muted-foreground" />
        </div>
      )}
      
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}

      {children}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <Button 
              variant={action.variant || "default"}
              onClick={action.onClick}
              className={action.variant === "default" ? "bg-accent hover:bg-accent/90" : ""}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

// Preset empty states for common scenarios
export function EmptyStateNoCopies({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No Active Copy Trading"
      description="You're not currently copying any traders. Browse the marketplace to find verified master traders and start copying their strategies."
      action={{
        label: "Browse Marketplace",
        onClick: () => onNavigate("marketplace")
      }}
      secondaryAction={{
        label: "Learn How It Works",
        onClick: () => onNavigate("how-it-works")
      }}
    />
  );
}

// Alias for UIStatesDemo compatibility
export function EmptyTraders({ onNavigate }: { onNavigate?: (view: string) => void }) {
  if (!onNavigate) {
    return (
      <EmptyState
        icon={Users}
        title="No Traders Available"
        description="No traders match your current criteria. Try adjusting your filters."
      />
    );
  }
  return <EmptyStateNoCopies onNavigate={onNavigate} />;
}

export function EmptyStateNoPositions() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No Open Positions"
      description="You don't have any open positions at the moment. Your copied traders haven't opened any positions yet, or all positions have been closed."
    />
  );
}

// Alias for UIStatesDemo compatibility
export function EmptyPositions() {
  return <EmptyStateNoPositions />;
}

export function EmptyStateNoOrders() {
  return (
    <EmptyState
      icon={Inbox}
      title="No Pending Orders"
      description="You don't have any pending orders. Orders will appear here when your copied traders place limit or stop orders."
    />
  );
}

// Alias for UIStatesDemo compatibility
export function EmptyOrders() {
  return <EmptyStateNoOrders />;
}

export function EmptyStateNoHistory() {
  return (
    <EmptyState
      icon={History}
      title="No Trade History"
      description="No trades have been executed yet. Once you start copying traders and they execute trades, your trade history will appear here."
    />
  );
}

// Alias for UIStatesDemo compatibility
export function EmptyTradeHistory() {
  return <EmptyStateNoHistory />;
}

export function EmptyStateNoReferrals({ onNavigate }: { onNavigate?: (view: string) => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No Referrals Yet"
      description="Share your unique referral link to earn 10% commission on your direct referrals and 5% on their referrals. Start building your passive income today!"
      action={onNavigate ? {
        label: "View Referral Dashboard",
        onClick: () => onNavigate("referrals")
      } : undefined}
    />
  );
}

// Alias for UIStatesDemo compatibility
export function EmptyReferrals({ onNavigate }: { onNavigate?: (view: string) => void }) {
  return <EmptyStateNoReferrals onNavigate={onNavigate} />;
}

export function EmptyStateNoSearchResults({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No Traders Found"
      description="No traders match your current filter criteria. Try adjusting your filters or clearing them to see all available traders."
      action={onClearFilters ? {
        label: "Clear All Filters",
        onClick: onClearFilters,
        variant: "outline"
      } : undefined}
    />
  );
}

// Alias for UIStatesDemo compatibility
export function EmptySearchResults({ onClearFilters }: { onClearFilters?: () => void }) {
  return <EmptyStateNoSearchResults onClearFilters={onClearFilters} />;
}

// NEW: Empty Notifications
export function EmptyNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="No Notifications"
      description="You're all caught up! New notifications will appear here when there are updates about your copy trading activity."
    />
  );
}

// NEW: Empty Fees
export function EmptyFees() {
  return (
    <EmptyState
      icon={DollarSign}
      title="No Fee History"
      description="You haven't used any profit allowance yet. Buy a package in Packages to unlock your trading allowance."
    />
  );
}

export function EmptyStateError({ 
  title = "Something Went Wrong",
  description = "We encountered an error loading this data. Please try again.",
  onRetry 
}: { 
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry
      } : undefined}
    />
  );
}