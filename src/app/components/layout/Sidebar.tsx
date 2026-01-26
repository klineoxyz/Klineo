import { 
  LayoutDashboard, 
  Store, 
  Copy, 
  Briefcase, 
  TrendingUp, 
  ListOrdered,
  History,
  Receipt,
  Users,
  CreditCard,
  Settings,
  HelpCircle,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Zap
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { SidebarLogo } from "@/app/components/branding/Logo";

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isAdmin?: boolean;
}

// Grouped navigation structure based on UX audit
const navigationSections = [
  {
    title: "Primary",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "marketplace", label: "Marketplace", icon: Store },
      { id: "copy-trading", label: "Copy Trading", icon: Copy },
    ]
  },
  {
    title: "Trading",
    items: [
      { id: "trading-terminal", label: "Terminal", icon: BarChart3 },
      { id: "positions", label: "Positions", icon: TrendingUp },
      { id: "orders", label: "Orders", icon: ListOrdered },
      { id: "trade-history", label: "Trade History", icon: History },
    ]
  },
  {
    title: "Portfolio",
    items: [
      { id: "portfolio", label: "Portfolio", icon: Briefcase },
      { id: "strategy-backtest", label: "Strategy Backtest", icon: Zap },
    ]
  },
  {
    title: "Account",
    items: [
      { id: "subscription", label: "Subscription", icon: CreditCard },
      { id: "referrals", label: "Referrals", icon: Users },
      { id: "fees", label: "Fees", icon: Receipt },
    ]
  },
  {
    title: "System",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "support", label: "Support", icon: HelpCircle },
    ]
  }
];

export function Sidebar({ activeView, onNavigate, isCollapsed, onToggleCollapse, isAdmin }: SidebarProps) {
  return (
    <div 
      className={cn(
        "h-full border-r border-border bg-card flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "flex items-center justify-center border-b border-border",
        isCollapsed ? "h-14 py-3" : "h-16 py-4"
      )}>
        <SidebarLogo isCollapsed={isCollapsed} />
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* Section Divider */}
            {sectionIndex > 0 && (
              <div className={cn("my-3 border-t border-border/50", isCollapsed ? "mx-2" : "mx-4")} />
            )}

            {/* Section Label - Only show when NOT collapsed */}
            {!isCollapsed && (
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.title}
                </span>
              </div>
            )}

            {/* Section Items */}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                    isActive && "bg-secondary text-primary",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                  <Icon className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-accent" : "text-muted-foreground"
                  )} />
                  {!isCollapsed && (
                    <span className={cn(isActive && "font-medium")}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Admin Section */}
        {(() => {
          // Debug logging in development
          if (import.meta.env.DEV) {
            console.log('[Sidebar] isAdmin:', isAdmin, 'isProd:', import.meta.env.PROD);
          }
          return isAdmin;
        })() && (
          <>
            <div className={cn("my-3 border-t border-border", isCollapsed ? "mx-2" : "mx-4")} />
            
            {!isCollapsed && (
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Admin
                </span>
              </div>
            )}

            <button
              onClick={() => onNavigate("admin")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                activeView === "admin" && "bg-secondary text-primary",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Admin" : undefined}
            >
              {activeView === "admin" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
              <Shield className={cn(
                "size-4 shrink-0",
                activeView === "admin" ? "text-accent" : "text-muted-foreground"
              )} />
              {!isCollapsed && (
                <span className={cn(activeView === "admin" && "font-medium")}>
                  Admin Panel
                </span>
              )}
            </button>

            {/* UI States Demo - Dev always, or prod if admin */}
            {(() => {
              const isDev = import.meta.env.DEV;
              const isProduction = import.meta.env.PROD;
              return isDev || (isProduction && isAdmin);
            })() && (
              <button
                onClick={() => onNavigate("ui-states-demo")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                  activeView === "ui-states-demo" && "bg-secondary text-primary",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? "UI States" : undefined}
              >
                {activeView === "ui-states-demo" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                <Sparkles className={cn(
                  "size-4 shrink-0 text-accent",
                  activeView === "ui-states-demo" && "text-accent"
                )} />
                {!isCollapsed && (
                  <span className={cn("flex items-center gap-2", activeView === "ui-states-demo" && "font-medium")}>
                    UI States
                    {import.meta.env.PROD ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-medium">
                        PROD
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-medium">
                        DEV
                      </span>
                    )}
                  </span>
                )}
              </button>
            )}
            {/* Smoke Test - Dev always, or prod if admin */}
            {(() => {
              const isDev = import.meta.env.DEV;
              const isProduction = import.meta.env.PROD;
              return isDev || (isProduction && isAdmin);
            })() && (
              <button
                onClick={() => onNavigate("smoke-test")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                  activeView === "smoke-test" && "bg-secondary text-primary",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? "Smoke Test" : undefined}
              >
                {activeView === "smoke-test" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                <Zap className={cn(
                  "size-4 shrink-0",
                  activeView === "smoke-test" ? "text-accent" : "text-muted-foreground"
                )} />
                {!isCollapsed && (
                  <span className={cn("flex items-center gap-2", activeView === "smoke-test" && "font-medium")}>
                    Smoke Test
                    {import.meta.env.PROD && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-medium">
                        PROD
                      </span>
                    )}
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>

      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="w-full"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>
    </div>
  );
}