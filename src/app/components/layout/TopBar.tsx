import { TopBarLogo } from "@/app/components/branding/Logo";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Bell, User, Settings, LogOut, Clock, Pause, Menu, Loader2 } from "lucide-react";
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
import { useTopBarLiveData } from "@/app/hooks/useTopBarLiveData";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";

interface TopBarProps {
  activeView?: string;
  onNavigate: (view: string) => void;
  onLogout?: () => void;
  sidebarCollapsed?: boolean;
  onOpenMobileNav?: () => void;
}

function planLabelFromPackage(pkg: string | null): string {
  if (!pkg) return "—";
  const c = pkg.toLowerCase();
  if (/pro|200|level_200/i.test(c)) return "PRO PLAN";
  if (/elite|500|level_500/i.test(c)) return "ELITE";
  if (/entry|100/i.test(c)) return "ENTRY";
  return "Active";
}

export function TopBar({ 
  activeView,
  onNavigate, 
  onLogout,
  sidebarCollapsed = false,
  onOpenMobileNav,
}: TopBarProps) {
  const { isDemoMode, setDemoMode, clearDemo, demoCopySetups } = useDemo();
  const liveData = useTopBarLiveData(isDemoMode);
  const demoActiveCount = demoCopySetups.filter((s) => s.status === "active").length;
  const displayedActiveCopies = isDemoMode ? demoActiveCount : liveData.activeCopies;
  const connectionStatus = isDemoMode ? "connected" : liveData.connectionStatus;
  const exchangeLatency = liveData.exchangeLatency;
  const unreadNotifications = useUnreadNotificationsCount(activeView);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toISOString().substr(11, 8);

  const handleEmergencyPause = () => setShowPauseModal(true);

  const confirmPause = useCallback(async () => {
    if (isDemoMode) {
      setShowPauseModal(false);
      toast.info("Demo mode", { description: "Pause is not available in demo." });
      return;
    }
    const toPause = liveData.copySetups.filter((s) => s.status === "active");
    if (toPause.length === 0) {
      setShowPauseModal(false);
      toast.info("Already paused", { description: "No active copy setups to pause." });
      return;
    }
    setIsPausing(true);
    try {
      await Promise.all(toPause.map((s) => api.put(`/api/copy-setups/${s.id}`, { status: "paused" })));
      toast.success("All copies paused");
      liveData.refresh();
      setShowPauseModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to pause";
      toast.error("Pause failed", { description: msg });
    } finally {
      setIsPausing(false);
    }
  }, [isDemoMode, liveData]);

  return (
    <>
      <div className="h-14 border-b border-border bg-card flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
          <button
            type="button"
            onClick={() => setDemoMode(!isDemoMode)}
            className="shrink-0 focus:outline-none focus:ring-2 focus:ring-ring rounded"
            title={isDemoMode ? "Switch to Live — connect real Binance/Bybit API" : "Switch to Demo — play with sample data"}
            aria-label={isDemoMode ? "Switch to Live" : "Switch to Demo"}
          >
            {isDemoMode ? (
              <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 shrink-0 text-xs cursor-pointer hover:opacity-90">
                Demo
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-xs border-green-500/50 text-green-600 dark:text-green-400 cursor-pointer hover:opacity-90">
                Live
              </Badge>
            )}
          </button>
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
            {!isDemoMode && liveData.entitlement && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-secondary text-xs">
                  {liveData.entitlement.status === "active"
                    ? planLabelFromPackage(liveData.entitlement.activePackageId ?? null)
                    : liveData.entitlement.status === "exhausted"
                    ? "Exhausted"
                    : "—"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {liveData.entitlement.status === "active"
                    ? `$${liveData.entitlement.remainingUsd.toFixed(0)} left`
                    : liveData.entitlement.status === "exhausted"
                    ? "Buy package"
                    : "—"}
                </span>
              </div>
            )}
            {isDemoMode && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-secondary text-xs">PRO PLAN</Badge>
                <span className="text-xs text-muted-foreground">Expires: Mar 15, 2026</span>
              </div>
            )}
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
              {isDemoMode ? "Binance: 45ms" : exchangeLatency != null ? `${exchangeLatency}ms` : connectionStatus === "connected" ? "Connected" : "Disconnected"}
            </span>
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
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => {
                  setDemoMode(!isDemoMode);
                  onNavigate(isDemoMode ? "portfolio" : "copy-trading");
                }}
              >
                <span className="size-4 mr-2 flex items-center justify-center rounded border border-current text-[10px] font-bold">
                  {isDemoMode ? "L" : "D"}
                </span>
                {isDemoMode ? "Switch to Live" : "Switch to Demo"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
              disabled={isPausing}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isPausing ? <><Loader2 className="size-4 animate-spin mr-2" /> Pausing...</> : "Confirm Pause"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}