/**
 * Shared app navigation config used by Sidebar and MobileNavSheet.
 */
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
  Sparkles,
  BarChart3,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigationSections: NavSection[] = [
  {
    title: "Primary",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "marketplace", label: "Marketplace", icon: Store },
      { id: "copy-trading", label: "Copy Trading", icon: Copy },
    ],
  },
  {
    title: "Trading",
    items: [
      { id: "trading-terminal", label: "Terminal", icon: BarChart3 },
      { id: "positions", label: "Positions", icon: TrendingUp },
      { id: "orders", label: "Orders", icon: ListOrdered },
      { id: "trade-history", label: "Trade History", icon: History },
    ],
  },
  {
    title: "Portfolio",
    items: [
      { id: "portfolio", label: "Portfolio", icon: Briefcase },
      { id: "strategy-backtest", label: "Strategy Backtest", icon: Zap },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "subscription", label: "Packages", icon: CreditCard },
      { id: "referrals", label: "Referrals", icon: Users },
      { id: "fees", label: "Fees", icon: Receipt },
    ],
  },
  {
    title: "System",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "support", label: "Support", icon: HelpCircle },
    ],
  },
];

export function showAdminSection(isAdmin: boolean): boolean {
  return !!isAdmin;
}

export function showUIStatesDemo(isAdmin: boolean): boolean {
  return import.meta.env.DEV || (import.meta.env.PROD && !!isAdmin);
}

/** In prod, smoke test is shown only when VITE_ENABLE_SMOKE_TEST_PAGE=true and user is admin. Dev: always show. */
export function showSmokeTest(isAdmin: boolean): boolean {
  if (import.meta.env.DEV) return true;
  return !!(
    import.meta.env.PROD &&
    isAdmin &&
    import.meta.env.VITE_ENABLE_SMOKE_TEST_PAGE === 'true'
  );
}
