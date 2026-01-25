# KLINEO - QUICK REFERENCE GUIDE
**For Developers & Designers**

---

## 🎨 DESIGN TOKENS

### Colors
```css
--background: #0B0D10       /* Terminal Black */
--accent: #FFB000           /* Amber */
--success: #10B981          /* Green (PnL positive only) */
--destructive: #EF4444      /* Red (PnL negative only) */
--muted-foreground: #8B8B8B /* Secondary text */
```

### Typography
```tsx
// Headings
<h1 className="text-2xl font-semibold">Page Title</h1>
<h2 className="text-xl font-semibold">Section</h2>
<h3 className="text-lg font-semibold">Card Title</h3>

// Labels (all uppercase with tracking)
<div className="text-xs text-muted-foreground uppercase tracking-wide">
  TOTAL EQUITY
</div>

// Numbers (always monospace)
<div className="text-2xl font-mono font-bold">$24,567.82</div>
<div className="text-xs font-mono">+1.42%</div>
```

### Spacing
```tsx
// Gaps
gap-2  // 0.5rem (8px)
gap-3  // 0.75rem (12px)
gap-4  // 1rem (16px)
gap-6  // 1.5rem (24px)

// Padding
p-4    // 1rem (16px) - default card padding
p-5    // 1.25rem (20px) - enhanced cards
p-6    // 1.5rem (24px) - sections

// Space-y
space-y-2  // Vertical stack with 0.5rem gap
space-y-4  // Vertical stack with 1rem gap
space-y-6  // Vertical stack with 1.5rem gap
```

---

## 🧩 COMPONENT PATTERNS

### Risk Badges
```tsx
// Low Risk
<Badge className="bg-green-500/15 text-green-400 border-green-500/30 font-semibold">
  Low Risk
</Badge>

// Medium Risk
<Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold">
  Medium Risk
</Badge>

// High Risk
<Badge className="bg-red-500/15 text-red-400 border-red-500/30 font-bold">
  <AlertTriangle className="size-3 mr-1" />
  High Risk
</Badge>
```

### Metric Cards
```tsx
<Card className="p-4 space-y-2">
  <div className="text-xs text-muted-foreground uppercase tracking-wide">
    TOTAL EQUITY
  </div>
  <div className="text-2xl font-mono font-bold">
    $24,567.82
  </div>
  <div className="text-xs text-muted-foreground">
    USDT
  </div>
</Card>
```

### Metric Cards with Sparkline
```tsx
<Card className="p-4 space-y-3">
  <div className="text-xs text-muted-foreground uppercase tracking-wide">
    TOTAL EQUITY (30D)
  </div>
  <div className="text-2xl font-mono font-bold">
    $24,567.82
  </div>
  <Sparkline data={portfolioData} width={180} height={40} color="#10B981" />
  <div className="text-xs text-muted-foreground">
    USDT
  </div>
</Card>
```

### Empty States
```tsx
import { EmptyPositions } from "@/app/components/ui/empty-state";

// Pre-built states
<EmptyPositions />
<EmptyTraders onNavigate={handleNavigate} />
<EmptySearchResults onClearFilters={handleClear} />

// Custom empty state
<EmptyState
  icon={Icon}
  title="No Data"
  description="Explanation text"
  action={{
    label: "Primary Action",
    onClick: handler
  }}
/>
```

### Error States
```tsx
import { APIKeyError, ExchangeDisconnectedError } from "@/app/components/ui/error-state";

<APIKeyError
  onRetry={handleRetry}
  onSetup={() => navigate("settings")}
/>

<ExchangeDisconnectedError
  onReconnect={handleReconnect}
/>
```

---

## 📱 RESPONSIVE PATTERNS

### Grid Layouts
```tsx
// 4 → 2 → 1 (Dashboard metrics)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// 3 → 2 → 1 (Marketplace cards)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// 3 → 3 → 1 (Secondary metrics)
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
```

### Breakpoints
```
sm: 640px   (tablet small)
md: 768px   (tablet)
lg: 1024px  (laptop)
xl: 1280px  (desktop)
2xl: 1536px (large desktop)
```

### Mobile-First Approach
```tsx
// Start with mobile (1 column), add breakpoints
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// NOT the reverse
className="grid-cols-3 lg:grid-cols-2 md:grid-cols-1"
```

---

## 🔢 NUMBER FORMATTING

### Always Use Monospace
```tsx
// ✅ CORRECT
<div className="font-mono font-bold">$24,567.82</div>
<div className="font-mono">+1.42%</div>

// ❌ INCORRECT
<div className="font-bold">$24,567.82</div>
<div>+1.42%</div>
```

### PnL Color Rules
```tsx
// Positive PnL - Green
<div className="font-mono font-bold text-[#10B981]">+$342.18</div>

// Negative PnL - Red
<div className="font-mono font-bold text-[#EF4444]">-$128.45</div>

// Neutral (no PnL) - Default foreground
<div className="font-mono font-bold">$24,567.82</div>
```

### Percentage Formatting
```tsx
// Always include sign for PnL
+1.42%  // Positive
-0.52%  // Negative

// No sign for static metrics
67.4%   // Win Rate
1.84    // Sharpe Ratio
```

---

## 🎯 TOP BAR INDICATORS

### Live UTC Clock
```tsx
const [currentTime, setCurrentTime] = useState(new Date());

useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);
  return () => clearInterval(timer);
}, []);

const formatTime = (date: Date) => {
  return date.toISOString().substr(11, 8); // HH:MM:SS
};

<span className="font-mono font-medium">
  {formatTime(currentTime)} UTC
</span>
```

### Exchange Latency
```tsx
<span className="text-muted-foreground">
  Binance: <span className="font-mono font-medium text-foreground">45ms</span>
</span>
```

### Active Copies Badge
```tsx
<div className="flex items-center gap-2 px-2 py-1 bg-accent/10 rounded border border-accent/20">
  <div className="size-1.5 rounded-full bg-accent animate-pulse" />
  <span className="text-xs font-medium text-accent">
    3 Active Copies
  </span>
</div>
```

---

## 🚨 EMERGENCY PAUSE BUTTON

```tsx
import { Pause } from "lucide-react";
import { Dialog, DialogContent, ... } from "@/app/components/ui/dialog";

const [showPauseModal, setShowPauseModal] = useState(false);

<Button 
  variant="outline" 
  size="sm"
  onClick={() => setShowPauseModal(true)}
  className="border-amber-500/30 text-amber-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all gap-2"
>
  <Pause className="size-3" />
  <span className="text-xs font-semibold">PAUSE ALL</span>
</Button>

<Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
  <DialogContent>
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
    <DialogFooter>
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
```

---

## 🎛 ADVANCED FILTERS

```tsx
import { AdvancedFiltersModal, AdvancedFiltersButton, type FilterValues } from "./AdvancedFiltersModal";

const [showFilters, setShowFilters] = useState(false);
const [filters, setFilters] = useState<FilterValues | null>(null);

const handleApplyFilters = (newFilters: FilterValues) => {
  setFilters(newFilters);
  // Apply filters to data
};

const getActiveFilterCount = () => {
  if (!filters) return 0;
  let count = 0;
  if (filters.roiRange[0] > 0 || filters.roiRange[1] < 100) count++;
  if (filters.maxDrawdown < 50) count++;
  // ... check other filters
  return count;
};

<AdvancedFiltersButton
  onClick={() => setShowFilters(true)}
  activeFilterCount={getActiveFilterCount()}
/>

<AdvancedFiltersModal
  open={showFilters}
  onOpenChange={setShowFilters}
  onApply={handleApplyFilters}
/>
```

---

## 📊 SPARKLINES

```tsx
import { Sparkline, generateSparklineData } from "@/app/components/ui/sparkline";
import { useMemo } from "react";

const portfolioData = useMemo(() => 
  generateSparklineData(30, 24000, 0.02, 500), 
  []
);

<Sparkline 
  data={portfolioData} 
  width={180} 
  height={40} 
  color="#10B981" // or "#EF4444" for negative trends
/>
```

---

## 🎨 ICON USAGE

### Lucide Icons (Recommended)
```tsx
import { 
  TrendingUp,      // Positive PnL
  TrendingDown,    // Negative PnL
  AlertTriangle,   // High Risk
  Clock,           // Time/Duration
  Users,           // Followers/Users
  Eye,             // View action
  Pause,           // Emergency pause
  RefreshCw,       // Refresh/Reload
  Activity,        // Running status
  Bell,            // Notifications
  Search,          // Search
  SlidersHorizontal // Filters
} from "lucide-react";

// Standard sizes
<Icon className="size-3" />  // 12px - Small (badges, inline)
<Icon className="size-4" />  // 16px - Default (buttons, text)
<Icon className="size-5" />  // 20px - Medium (headings)
<Icon className="size-8" />  // 32px - Large (empty states)
```

---

## 🔍 NAVIGATION PATTERNS

### Sidebar Section Structure
```tsx
const navigationSections = [
  {
    title: "Primary",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "marketplace", label: "Marketplace", icon: Store },
    ]
  },
  // ... more sections
];

{navigationSections.map((section, index) => (
  <div key={section.title}>
    {index > 0 && (
      <div className="my-3 border-t border-border/50 mx-4" />
    )}
    
    {!isCollapsed && (
      <div className="px-4 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {section.title}
        </span>
      </div>
    )}
    
    {section.items.map((item) => (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50 relative",
          isActive && "bg-secondary text-primary",
          isCollapsed && "justify-center px-2"
        )}
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
    ))}
  </div>
))}
```

---

## ⚡ PERFORMANCE TIPS

### Memoize Expensive Calculations
```tsx
import { useMemo } from "react";

// ✅ GOOD - Memoized sparkline data
const portfolioData = useMemo(() => 
  generateSparklineData(30, 24000, 0.02, 500), 
  []
);

// ❌ BAD - Recalculates every render
const portfolioData = generateSparklineData(30, 24000, 0.02, 500);
```

### Lazy Load Heavy Components
```tsx
import { lazy, Suspense } from "react";

const TradingTerminal = lazy(() => import("./TradingTerminal"));

<Suspense fallback={<LoadingWrapper />}>
  <TradingTerminal />
</Suspense>
```

### Use Loading Wrappers
```tsx
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";

<LoadingWrapper
  isLoading={isLoading}
  loadingComponent={<SkeletonLoader />}
>
  <ActualContent />
</LoadingWrapper>
```

---

## 📋 CHECKLIST FOR NEW FEATURES

### Before Implementing
- [ ] Read existing component patterns
- [ ] Check if similar component exists
- [ ] Verify color tokens match brand
- [ ] Plan responsive behavior
- [ ] Consider empty/error states

### During Implementation
- [ ] Use monospace for all numbers
- [ ] Apply uppercase tracking to labels
- [ ] Add responsive grid classes
- [ ] Include hover/active states
- [ ] Add proper ARIA labels
- [ ] Test with empty data
- [ ] Test with error states

### After Implementation
- [ ] Test on mobile (< 768px)
- [ ] Test on tablet (768-1024px)
- [ ] Test on desktop (> 1024px)
- [ ] Verify colors match brand
- [ ] Check typography hierarchy
- [ ] Verify spacing consistency
- [ ] Test keyboard navigation
- [ ] Check for console errors

---

## 🐛 COMMON PITFALLS

### ❌ Don't Do This
```tsx
// Non-monospace numbers
<div>$24,567.82</div>

// Inconsistent spacing
<div className="gap-5">  // Use gap-4 or gap-6, not gap-5

// Wrong color usage
<div className="text-blue-500">  // KLINEO doesn't use blue

// Hardcoded sizes
<div style={{ width: 200 }}>  // Use Tailwind classes

// Missing responsive
<div className="grid grid-cols-3">  // Always start with grid-cols-1
```

### ✅ Do This Instead
```tsx
// Monospace numbers
<div className="font-mono">$24,567.82</div>

// Standard spacing
<div className="gap-4">

// Brand colors
<div className="text-accent">  // or text-[#10B981] for green

// Tailwind classes
<div className="w-48">

// Responsive first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

---

## 📚 RESOURCES

### Key Files
- `/src/app/components/layout/TopBar.tsx` - Top bar with emergency controls
- `/src/app/components/layout/Sidebar.tsx` - Grouped navigation
- `/src/app/components/ui/empty-state.tsx` - Empty state patterns
- `/src/app/components/ui/error-state.tsx` - Error handling
- `/src/app/components/ui/sparkline.tsx` - Trend visualization
- `/src/styles/theme.css` - Design tokens

### Documentation
- `/UX_IMPROVEMENTS_IMPLEMENTED.md` - Technical details
- `/BEFORE_AFTER_COMPARISON.md` - Visual comparisons
- `/COMPLETION_REPORT.md` - Comprehensive summary
- `/QUICK_REFERENCE.md` - This guide

### External Resources
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [Radix UI Primitives](https://www.radix-ui.com)

---

## 💡 QUICK TIPS

1. **Always start mobile-first** with responsive classes
2. **Use monospace for ALL numbers** - no exceptions
3. **Red/Green ONLY for PnL** - respect the brand rule
4. **Empty states are required** - never show blank screens
5. **Error states need retry actions** - always give users a way out
6. **Uppercase labels with tracking** - for professional look
7. **Consistent spacing** - stick to gap-2/3/4/6
8. **Icons should match text size** - use size-4 with text-sm
9. **Always add hover states** - for interactive elements
10. **Test on mobile** - before considering it done

---

**Last Updated:** January 24, 2026  
**Version:** 1.0  
**Status:** Production Ready
