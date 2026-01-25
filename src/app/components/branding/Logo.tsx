/**
 * KLINEO Logo Component
 * 
 * Provides standardized logo usage across the application following brand guidelines.
 * See /src/app/components/branding/LogoUsageGuide.md for complete usage rules.
 */

// Using optimized K badge logo with transparent background
import klineoLogo from "@/assets/6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png";
import { cn } from "@/app/components/ui/utils";

type LogoVariant = "icon" | "wordmark";
type LogoSize = "favicon" | "small" | "medium" | "large";
type LogoTheme = "dark" | "light";

interface LogoProps {
  /** Use "icon" for standalone K badge, "wordmark" for KLINEO text */
  variant: LogoVariant;
  /** Size preset - affects both icon and wordmark appropriately */
  size?: LogoSize;
  /** Theme - only affects wordmark (icon is always light on dark) */
  theme?: LogoTheme;
  /** Additional CSS classes */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
}

/**
 * KLINEO Logo Component
 * 
 * @example Icon for collapsed sidebar
 * <Logo variant="icon" size="small" />
 * 
 * @example Wordmark for expanded sidebar (dark theme)
 * <Logo variant="wordmark" size="medium" theme="dark" />
 * 
 * @example Large icon for splash screen
 * <Logo variant="icon" size="large" />
 */
export function Logo({ 
  variant, 
  size = "medium", 
  theme = "dark",
  className,
  alt = "KLINEO"
}: LogoProps) {
  // Size mappings for icon - increased for better visibility
  const iconSizeClasses = {
    favicon: "h-6 w-6",
    small: "h-9 w-9",
    medium: "h-12 w-12",
    large: "h-24 w-24"
  };

  // Size mappings for wordmark (using same logo but wider aspect) - increased
  const wordmarkSizeClasses = {
    favicon: "h-6 w-auto",
    small: "h-9 w-auto",
    medium: "h-12 w-auto",
    large: "h-16 w-auto"
  };

  const sizeClass = variant === "icon" ? iconSizeClasses[size] : wordmarkSizeClasses[size];

  return (
    <img
      src={klineoLogo}
      alt={alt}
      className={cn(
        sizeClass,
        "object-contain bg-transparent",
        className
      )}
      style={{ 
        imageRendering: 'crisp-edges',
        background: 'transparent'
      }}
    />
  );
}

/**
 * Convenience components for common use cases
 */

/** Sidebar logo - automatically switches between icon and wordmark */
export function SidebarLogo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <Logo 
      variant={isCollapsed ? "icon" : "wordmark"}
      size={isCollapsed ? "medium" : "medium"}
      theme="dark"
    />
  );
}

/** TopBar logo - automatically switches between icon and wordmark */
export function TopBarLogo({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  return (
    <Logo 
      variant={sidebarCollapsed ? "icon" : "wordmark"}
      size="small"
      theme="dark"
    />
  );
}

/** Splash screen logo */
export function SplashLogo() {
  return (
    <Logo 
      variant="icon"
      size="large"
      className="animate-fade-in"
    />
  );
}