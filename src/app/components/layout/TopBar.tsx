import { TopBarLogo } from "@/app/components/branding/Logo";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Bell, User, Settings, LogOut, Clock, Pause, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ConnectionStatus } from "@/app/components/ui/error-state";
import { useDemo } from "@/app/contexts/DemoContext";
import { useUnreadNotificationsCount } from "@/app/hooks/useUnreadNotificationsCount";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface TopBarProps {
  activeView?: string;
  onNavigate: (view: string) => void;
  onLogout?: () => void;
  sidebarCollapsed?: boolean;
  onOpenMobileNav?: () => void;
  connectionStatus?: "connected" | "connecting" | "disconnected" | "error";
  activeCopies?: number;
  exchangeLatency?: number;
}

export function TopBar({ 
  activeView,
  onNavigate, 
  onLogout,
  sidebarCollapsed = false,
  onOpenMobileNav,
  connectionStatus = "connected",
  activeCopies = 3,
  exchangeLatency = 45
}: TopBarProps) {
  const { isDemoMode, clearDemo, demoCopySetups } = useDemo();
  const demoActiveCount = demoCopySetups.filter((s) => s.status === "active").length;
  const displayedActiveCopies = isDemoMode ? demoActiveCount : activeCopies;
  const unreadNotifications = useUnreadNotificationsCount(activeView);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPauseModal, setShowPauseModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toISOString().substr(11, 8);
  };

  const handleEmergencyPause = () => {
    setShowPauseModal(true);
  };

  const confirmPause = () => {
    // Implement pause logic here
    setShowPauseModal(false);
    // Show success toast
  };

  return (
    <>
      <div className="h-14 border-b border-border bg-card flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
          {isDemoMode && (
            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 shrink-0 text-xs">
              Demo
            </Badge>
          )}
          {/* Mobile menu trigger */}
          {onOpenMobileNav && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden size-9 shrink-0"
              onClick={onOpenMobileNav}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
          )}
          <TopBarLogo sidebarCollapsed={sidebarCollapsed} />
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-secondary text-xs">
                PRO PLAN
              </Badge>
              <span className="text-xs text-muted-foreground">
                Expires: Mar 15, 2026
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("copy-trading")}
              className="flex items-center gap-2 px-2 py-1 bg-accent/10 rounded border border-accent/20 hover:bg-accent/20 transition-colors text-left"
              title="View in Copy Trading"
            >
              <div className="size-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium text-accent">
                {displayedActiveCopies} Active Copies{isDemoMode ? " (Demo)" : ""}
              </span>
            </button>
          </div>
        </div>

        {/* Center - System Time & Exchange Info (hidden on small screens) */}
        <div className="hidden xl:flex items-center gap-4 lg:gap-6 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="size-3 text-muted-foreground" />
            <span className="font-mono font-medium">{formatTime(currentTime)} UTC</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`size-1.5 rounded-full ${
              connectionStatus === "connected" ? "bg-green-500" :
              connectionStatus === "connecting" ? "bg-amber-500 animate-pulse" :
              "bg-red-500"
            }`} />
            <span className="text-muted-foreground">
              Binance: <span className="font-mono font-medium text-foreground">{exchangeLatency}ms</span>
            </span>
          </div>
          <div className="text-muted-foreground">
            Last Update: <span className="font-mono font-medium text-foreground">2s ago</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
          {/* Emergency Pause Button - icon only on small screens */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEmergencyPause}
            className="border-amber-500/30 text-amber-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all gap-2 size-9 sm:size-auto sm:px-3"
            title="Pause all copy trading"
          >
            <Pause className="size-3 shrink-0" />
            <span className="hidden sm:inline text-xs font-semibold">PAUSE ALL</span>
          </Button>

          <ConnectionStatus status={connectionStatus} />

          <Button variant="ghost" size="icon" className="size-9 relative" onClick={() => onNavigate("notifications-center")} aria-label={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : "Notifications"}>
            <Bell className="size-4" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-[#EF4444] animate-pulse" aria-hidden />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9">
                <User className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onNavigate("settings")}>
                <Settings className="size-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate("support")}>
                <User className="size-4 mr-2" />
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="size-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Emergency Pause Confirmation Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="size-5 text-amber-500" />
              Pause All Copy Trading
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-4">
              <p>This will immediately pause all active copy trading sessions:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>No new trades will be copied</li>
                <li>Existing open positions remain active</li>
                <li>You can resume copying at any time</li>
              </ul>
              <p className="text-amber-500 text-sm font-medium mt-4">
                ⚠️ This does NOT close your current positions
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPauseModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={confirmPause}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Confirm Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}