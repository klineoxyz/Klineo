import { Sheet, SheetContent, SheetHeader } from "@/app/components/ui/sheet";
import { SidebarLogo } from "@/app/components/branding/Logo";
import {
  navigationSections,
  showAdminSection,
  showUIStatesDemo,
  showSmokeTest,
} from "@/app/config/navigation";
import { Shield, Sparkles, Zap } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

interface MobileNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeView: string;
  onNavigate: (view: string) => void;
  isAdmin?: boolean;
}

export function MobileNavSheet({
  open,
  onOpenChange,
  activeView,
  onNavigate,
  isAdmin,
}: MobileNavSheetProps) {
  const handleNav = (view: string) => {
    onNavigate(view);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[min(280px,85vw)] sm:max-w-[280px] p-0 flex flex-col gap-0"
        aria-label="Navigation menu"
      >
        <SheetHeader className="border-b border-border px-4 py-4 pr-12 flex-row items-center justify-between space-y-0">
          <SidebarLogo isCollapsed={false} />
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto py-4">
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 && (
                <div className="my-3 mx-4 border-t border-border/50" />
              )}
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.title}
                </span>
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-left text-sm transition-colors hover:bg-secondary/50 relative",
                      isActive && "bg-secondary text-primary"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                    )}
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        isActive ? "text-accent" : "text-muted-foreground"
                      )}
                    />
                    <span className={cn(isActive && "font-medium")}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}

          {showAdminSection(!!isAdmin) && (
            <>
              <div className="my-3 mx-4 border-t border-border" />
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Admin
                </span>
              </div>
              <button
                onClick={() => handleNav("admin")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-left text-sm transition-colors hover:bg-secondary/50 relative",
                  activeView === "admin" && "bg-secondary text-primary"
                )}
              >
                {activeView === "admin" && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                )}
                <Shield
                  className={cn(
                    "size-4 shrink-0",
                    activeView === "admin"
                      ? "text-accent"
                      : "text-muted-foreground"
                  )}
                />
                <span className={cn(activeView === "admin" && "font-medium")}>
                  Admin Panel
                </span>
              </button>
              {showUIStatesDemo(!!isAdmin) && (
                <button
                  onClick={() => handleNav("ui-states-demo")}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-left text-sm transition-colors hover:bg-secondary/50 relative",
                    activeView === "ui-states-demo" && "bg-secondary text-primary"
                  )}
                >
                  {activeView === "ui-states-demo" && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                  )}
                  <Sparkles
                    className={cn(
                      "size-4 shrink-0 text-accent",
                      activeView === "ui-states-demo" && "text-accent"
                    )}
                  />
                  <span
                    className={cn(
                      "flex items-center gap-2",
                      activeView === "ui-states-demo" && "font-medium"
                    )}
                  >
                    UI States
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-medium">
                      {import.meta.env.PROD ? "PROD" : "DEV"}
                    </span>
                  </span>
                </button>
              )}
              {showSmokeTest(!!isAdmin) && (
                <button
                  onClick={() => handleNav("smoke-test")}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-left text-sm transition-colors hover:bg-secondary/50 relative",
                    activeView === "smoke-test" && "bg-secondary text-primary"
                  )}
                >
                  {activeView === "smoke-test" && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                  )}
                  <Zap
                    className={cn(
                      "size-4 shrink-0",
                      activeView === "smoke-test"
                        ? "text-accent"
                        : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "flex items-center gap-2",
                      activeView === "smoke-test" && "font-medium"
                    )}
                  >
                    Smoke Test
                    {import.meta.env.PROD && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-medium">
                        PROD
                      </span>
                    )}
                  </span>
                </button>
              )}
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
