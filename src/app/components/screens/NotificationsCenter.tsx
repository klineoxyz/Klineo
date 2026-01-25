import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
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
  X
} from "lucide-react";
import { useState } from "react";

interface NotificationsCenterProps {
  onNavigate: (view: string) => void;
}

type NotificationType = "trade" | "risk" | "system" | "account";
type NotificationPriority = "high" | "medium" | "low";

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionable?: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "trade",
    priority: "high",
    title: "Trade Executed",
    message: "Copied trade from @CryptoWizard: BTC/USDT LONG at $67,245",
    timestamp: "2 min ago",
    read: false,
    actionable: true,
  },
  {
    id: "2",
    type: "risk",
    priority: "high",
    title: "Risk Alert",
    message: "Daily loss limit approaching: 85% used ($850/$1,000)",
    timestamp: "15 min ago",
    read: false,
    actionable: true,
  },
  {
    id: "3",
    type: "trade",
    priority: "medium",
    title: "Position Closed",
    message: "ETH/USDT LONG closed with +$145.50 profit (+12.5%)",
    timestamp: "1 hour ago",
    read: false,
  },
  {
    id: "4",
    type: "account",
    priority: "medium",
    title: "Subscription Renewal",
    message: "Your Pro subscription will renew in 7 days ($79)",
    timestamp: "3 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "system",
    priority: "low",
    title: "Platform Update",
    message: "New features: Enhanced risk controls and portfolio analytics",
    timestamp: "1 day ago",
    read: true,
  },
  {
    id: "6",
    type: "trade",
    priority: "medium",
    title: "Trade Executed",
    message: "Copied trade from @TradeMaster: SOL/USDT SHORT at $98.45",
    timestamp: "1 day ago",
    read: true,
  },
  {
    id: "7",
    type: "risk",
    priority: "high",
    title: "Margin Alert",
    message: "Position #8234 margin ratio at 75% - consider adding funds",
    timestamp: "2 days ago",
    read: true,
    actionable: true,
  },
  {
    id: "8",
    type: "system",
    priority: "low",
    title: "Maintenance Complete",
    message: "Scheduled maintenance completed. All systems operational.",
    timestamp: "3 days ago",
    read: true,
  },
];

export function NotificationsCenter({ onNavigate }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<"all" | NotificationType>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filter === "all" || n.type === filter;
    const matchesRead = !showUnreadOnly || !n.read;
    return matchesFilter && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: NotificationType, priority: NotificationPriority) => {
    if (type === "trade") return <TrendingUp className="size-5" />;
    if (type === "risk") return <AlertTriangle className="size-5" />;
    if (type === "system") return <Info className="size-5" />;
    if (type === "account") return <CheckCircle className="size-5" />;
    return <Bell className="size-5" />;
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    if (priority === "high") return "text-[#EF4444]";
    if (priority === "medium") return "text-accent";
    return "text-muted-foreground";
  };

  const getTypeColor = (type: NotificationType) => {
    if (type === "trade") return "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]";
    if (type === "risk") return "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]";
    if (type === "account") return "bg-accent/10 border-accent/20 text-accent";
    return "bg-secondary border-border text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Mark All Read
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("settings")}>
            <Settings className="size-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <Bell className="size-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">{notifications.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Unread</span>
            <div className="size-2 rounded-full bg-[#EF4444] animate-pulse"></div>
          </div>
          <div className="text-2xl font-semibold">{unreadCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Trade Alerts</span>
            <TrendingUp className="size-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-semibold">
            {notifications.filter(n => n.type === "trade").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Risk Alerts</span>
            <AlertTriangle className="size-4 text-[#EF4444]" />
          </div>
          <div className="text-2xl font-semibold">
            {notifications.filter(n => n.type === "risk").length}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="size-4 text-muted-foreground" />
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="trade">Trades</TabsTrigger>
                <TabsTrigger value="risk">Risk</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-muted-foreground">Unread only</span>
            </label>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10">
                <Trash2 className="size-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="size-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
            <p className="text-sm text-muted-foreground">
              {showUnreadOnly 
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."}
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 transition hover:border-primary/50 ${
                !notification.read ? "border-primary/30 bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded ${getTypeColor(notification.type)}`}>
                  {getIcon(notification.type, notification.priority)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{notification.title}</h4>
                      {!notification.read && (
                        <div className="size-2 rounded-full bg-primary"></div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {notification.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {notification.actionable && (
                      <>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          View Details
                        </Button>
                        {notification.type === "risk" && (
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Adjust Limits
                          </Button>
                        )}
                      </>
                    )}
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-[#EF4444]"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Notification Settings Preview */}
      <Card className="p-6 bg-secondary/30">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold mb-2">Notification Preferences</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Customize which notifications you receive and how you're alerted
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                Trade Alerts: ON
              </Badge>
              <Badge variant="outline" className="bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20">
                Risk Alerts: ON
              </Badge>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                Email Notifications: ON
              </Badge>
              <Badge variant="outline">
                Telegram Alerts: OFF
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => onNavigate("settings")}>
            Configure
          </Button>
        </div>
      </Card>
    </div>
  );
}
