import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Settings,
  Trash2,
  Filter,
  X,
  Loader2,
  Tag
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ErrorState } from "@/app/components/ui/error-state";
import { formatDistanceToNow } from "date-fns";

interface NotificationsCenterProps {
  onNavigate: (view: string) => void;
}

type NotificationType = "trade" | "risk" | "system" | "account" | "discount_assigned";
type NotificationPriority = "high" | "medium" | "low";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export function NotificationsCenter({ onNavigate }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | NotificationType>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  const loadNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<NotificationsResponse>("/api/notifications?limit=100");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      const message = err?.message || "Failed to load notifications";
      setError(message);
      if (!message.includes("VITE_API_BASE_URL not set")) {
        toast.error("Failed to load notifications", { description: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    setMarkingRead(id);
    try {
      await api.post("/api/notifications/read", { notificationIds: [id] });
      setNotifications(notifications.map((n) => 
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
      toast.success("Notification marked as read");
    } catch (err: any) {
      toast.error("Failed to mark as read", { description: err?.message });
    } finally {
      setMarkingRead(null);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await api.post("/api/notifications/read", { notificationIds: unreadIds });
      setNotifications(notifications.map((n) => 
        unreadIds.includes(n.id) 
          ? { ...n, read: true, readAt: new Date().toISOString() }
          : n
      ));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err: any) {
      toast.error("Failed to mark all as read", { description: err?.message });
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filter === "all" || n.type === filter;
    const matchesRead = !showUnreadOnly || !n.read;
    return matchesFilter && matchesRead;
  });

  // Categorize by type
  const tradeAlerts = notifications.filter((n) => n.type === "trade").length;
  const riskAlerts = notifications.filter((n) => n.type === "risk").length;
  const systemAlerts = notifications.filter((n) => n.type === "system").length;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Failed to load notifications"
          message={error.includes("VITE_API_BASE_URL not set") 
            ? "Backend not configured. Please try again later."
            : error}
          action={
            <Button onClick={loadNotifications} variant="outline">
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  const getIcon = (type: string) => {
    if (type === "trade") return <TrendingUp className="size-5" />;
    if (type === "risk") return <AlertTriangle className="size-5" />;
    if (type === "system") return <Info className="size-5" />;
    if (type === "account") return <CheckCircle className="size-5" />;
    if (type === "discount_assigned") return <Tag className="size-5" />;
    return <Bell className="size-5" />;
  };

  const getPriorityColor = (type: string) => {
    if (type === "risk") return "text-[#EF4444]";
    if (type === "trade") return "text-accent";
    return "text-muted-foreground";
  };

  const getTypeColor = (type: string) => {
    if (type === "trade") return "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]";
    if (type === "risk") return "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]";
    if (type === "account") return "bg-accent/10 border-accent/20 text-accent";
    if (type === "discount_assigned") return "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]";
    return "bg-secondary border-border text-muted-foreground";
  };

  const getDisplayTitle = (n: Notification): string => {
    const t = (n.title || "").trim();
    if (t) return t;
    switch (n.type) {
      case "trade": return "Trade update";
      case "risk": return "Risk alert";
      case "system": return "System message";
      case "account": return "Account update";
      case "discount_assigned": return "You have a new discount";
      default: return "Notification";
    }
  };

  const getDisplayBody = (n: Notification): string | null => {
    const b = (n.body || "").trim();
    return b || null;
  };

  /** For discount_assigned: parse body as { scope, summary, code?, claimUrl? } for Claim action */
  const getDiscountPayload = (n: Notification): { scope: string; summary: string; code?: string; claimUrl?: string } | null => {
    if (n.type !== "discount_assigned" || !n.body?.trim()) return null;
    try {
      const parsed = JSON.parse(n.body) as { scope?: string; summary?: string; code?: string; claimUrl?: string };
      if (parsed?.scope && parsed?.summary) return { scope: parsed.scope, summary: parsed.summary, code: parsed.code, claimUrl: parsed.claimUrl };
    } catch {
      /* body not JSON, use as summary */
      return { scope: "onboarding", summary: n.body.trim() };
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={markAllAsRead} 
            disabled={unreadCount === 0}
            className="flex-1 sm:flex-initial"
          >
            Mark All Read
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("settings")} className="flex-1 sm:flex-initial">
            <Settings className="size-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <Bell className="size-4 text-muted-foreground" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold">{notifications.length}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Unread</span>
            <div className="size-2 rounded-full bg-[#EF4444] animate-pulse"></div>
          </div>
          <div className="text-xl sm:text-2xl font-semibold">{unreadCount}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Trade Alerts</span>
            <TrendingUp className="size-4 text-[#10B981]" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold">{tradeAlerts}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Risk Alerts</span>
            <AlertTriangle className="size-4 text-[#EF4444]" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold">{riskAlerts}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "trade" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("trade")}
            >
              Trade
            </Button>
            <Button
              variant={filter === "risk" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("risk")}
            >
              Risk
            </Button>
            <Button
              variant={filter === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("system")}
            >
              System
            </Button>
            <Button
              variant={filter === "account" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("account")}
            >
              Account
            </Button>
            <Button
              variant={filter === "discount_assigned" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("discount_assigned")}
            >
              Discount
            </Button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              id="unread-only"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="size-4 rounded"
            />
            <label htmlFor="unread-only" className="text-sm text-muted-foreground">
              Unread only
            </label>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Bell}
            title={showUnreadOnly ? "No unread notifications" : "No notifications"}
            description={showUnreadOnly 
              ? "You're all caught up!"
              : "You'll receive notifications about trades, risks, and account updates here."}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const discountPayload = getDiscountPayload(notification);
            const displayBody = notification.type === "discount_assigned"
              ? discountPayload?.summary ?? getDisplayBody(notification)
              : getDisplayBody(notification);
            return (
            <Card 
              key={notification.id} 
              className={`p-4 transition-colors ${!notification.read ? "border-accent/50 bg-accent/5" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{getDisplayTitle(notification)}</h4>
                      {displayBody ? (
                        <p className="text-sm text-muted-foreground mt-1">{displayBody}</p>
                      ) : null}
                      {notification.type === "discount_assigned" && discountPayload?.code && (
                        <p className="text-sm font-mono mt-1 text-primary">Coupon code: {discountPayload.code}</p>
                      )}
                    </div>
                    {!notification.read && (
                      <div className="size-2 rounded-full bg-accent ml-2" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-2">
                      {notification.type === "discount_assigned" && discountPayload && (
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground"
                          onClick={() => {
                            onNavigate(
                              discountPayload.scope === "onboarding" ? "payments" : "subscription"
                            );
                          }}
                        >
                          Claim
                        </Button>
                      )}
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          disabled={markingRead === notification.id}
                        >
                          {markingRead === notification.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            "Mark as read"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ); })}
        </div>
      )}
    </div>
  );
}
