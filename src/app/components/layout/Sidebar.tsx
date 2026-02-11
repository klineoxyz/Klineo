import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Shield, Sparkles, Zap } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { SidebarLogo } from "@/app/components/branding/Logo";
import {
  navigationSections,
  showAdminSection,
  showUIStatesDemo,
  showSmokeTest,
} from "@/app/config/navigation";
import { pathForView } from "@/app/config/routes";

const ONBOARDING_NAV_KEYS: Record<string, string> = {
  marketplace: "nav-marketplace",
  "copy-trading": "nav-copy-trading",
  subscription: "nav-packages",
  settings: "nav-settings",
  "dca-bots": "nav-dca-bots",
  "strategy-backtest": "nav-strategy-backtest",
  referrals: "nav-referrals",
};

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isAdmin?: boolean;
}

export function Sidebar({ activeView, onNavigate, isCollapsed, onToggleCollapse, isAdmin }: SidebarProps) {
  return (
    <div
      className={cn(
        "h-full border-r border-border bg-card hidden md:flex flex-col transition-all duration-300 shrink-0",
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
              const to = pathForView(item.id);
              return (
                <Link
                  key={item.id}
                  to={to}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                    isActive && "bg-secondary text-primary",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? item.label : undefined}
                  {...(ONBOARDING_NAV_KEYS[item.id] ? { "data-onboarding": ONBOARDING_NAV_KEYS[item.id] } : {})}
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
                </Link>
              );
            })}
          </div>
        ))}

        {/* Developer section: Smoke Test visible in dev for non-admins (admins see it in Admin below) */}
        {import.meta.env.DEV && !isAdmin && (
          <>
            <div className={cn("my-3 border-t border-border/50", isCollapsed ? "mx-2" : "mx-4")} />
            {!isCollapsed && (
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Developer
                </span>
              </div>
            )}
            <Link
              to={pathForView("smoke-test")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                activeView === "smoke-test" && "bg-secondary text-primary",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Smoke Test" : undefined}
            >
              {activeView === "smoke-test" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
              <Zap className={cn("size-4 shrink-0", activeView === "smoke-test" ? "text-accent" : "text-muted-foreground")} />
              {!isCollapsed && (
                <span className={cn("flex items-center gap-2", activeView === "smoke-test" && "font-medium")}>
                  Smoke Test
                </span>
              )}
            </Link>
          </>
        )}

        {/* Admin Section */}
        {showAdminSection(!!isAdmin) && (
          <>
            <div className={cn("my-3 border-t border-border", isCollapsed ? "mx-2" : "mx-4")} />
            {!isCollapsed && (
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Admin
                </span>
              </div>
            )}
            <Link
              to={pathForView("admin")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                activeView === "admin" && "bg-secondary text-primary",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Admin" : undefined}
            >
              {activeView === "admin" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
              <Shield className={cn("size-4 shrink-0", activeView === "admin" ? "text-accent" : "text-muted-foreground")} />
              {!isCollapsed && <span className={cn(activeView === "admin" && "font-medium")}>Admin Panel</span>}
            </Link>
            {showUIStatesDemo(!!isAdmin) && (
              <Link
                to={pathForView("ui-states-demo")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                  activeView === "ui-states-demo" && "bg-secondary text-primary",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? "UI States" : undefined}
              >
                {activeView === "ui-states-demo" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                <Sparkles className={cn("size-4 shrink-0 text-accent", activeView === "ui-states-demo" && "text-accent")} />
                {!isCollapsed && (
                  <span className={cn("flex items-center gap-2", activeView === "ui-states-demo" && "font-medium")}>
                    UI States
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-medium">
                      {import.meta.env.PROD ? "PROD" : "DEV"}
                    </span>
                  </span>
                )}
              </Link>
            )}
            {showSmokeTest(!!isAdmin) && (
              <Link
                to={pathForView("smoke-test")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
                  activeView === "smoke-test" && "bg-secondary text-primary",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? "Smoke Test" : undefined}
              >
                {activeView === "smoke-test" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                <Zap className={cn("size-4 shrink-0", activeView === "smoke-test" ? "text-accent" : "text-muted-foreground")} />
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
              </Link>
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