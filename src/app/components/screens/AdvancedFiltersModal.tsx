import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Slider } from "@/app/components/ui/slider";
import { Badge } from "@/app/components/ui/badge";
import { SlidersHorizontal, X, Save } from "lucide-react";

interface AdvancedFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filters: FilterValues) => void;
}

export interface FilterValues {
  roiRange: [number, number];
  maxDrawdown: number;
  minWinRate: number;
  minSharpeRatio: number;
  minDaysActive: number;
  minCopiers: number;
  tradingStyles: string[];
  exchanges: string[];
  riskLevels: string[];
}

const defaultFilters: FilterValues = {
  roiRange: [0, 100],
  maxDrawdown: 50,
  minWinRate: 0,
  minSharpeRatio: 0,
  minDaysActive: 0,
  minCopiers: 0,
  tradingStyles: [],
  exchanges: [],
  riskLevels: [],
};

export function AdvancedFiltersModal({
  open,
  onOpenChange,
  onApply,
}: AdvancedFiltersModalProps) {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  const handleApply = () => {
    onApply(filters);
    onOpenChange(false);
  };

  const handleTradingStyleToggle = (style: string) => {
    setFilters((prev) => ({
      ...prev,
      tradingStyles: prev.tradingStyles.includes(style)
        ? prev.tradingStyles.filter((s) => s !== style)
        : [...prev.tradingStyles, style],
    }));
  };

  const handleExchangeToggle = (exchange: string) => {
    setFilters((prev) => ({
      ...prev,
      exchanges: prev.exchanges.includes(exchange)
        ? prev.exchanges.filter((e) => e !== exchange)
        : [...prev.exchanges, exchange],
    }));
  };

  const handleRiskLevelToggle = (level: string) => {
    setFilters((prev) => ({
      ...prev,
      riskLevels: prev.riskLevels.includes(level)
        ? prev.riskLevels.filter((l) => l !== level)
        : [...prev.riskLevels, level],
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.roiRange[0] > 0 || filters.roiRange[1] < 100) count++;
    if (filters.maxDrawdown < 50) count++;
    if (filters.minWinRate > 0) count++;
    if (filters.minSharpeRatio > 0) count++;
    if (filters.minDaysActive > 0) count++;
    if (filters.minCopiers > 0) count++;
    if (filters.tradingStyles.length > 0) count++;
    if (filters.exchanges.length > 0) count++;
    if (filters.riskLevels.length > 0) count++;
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-accent" />
            Advanced Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Refine your search to find the perfect traders for your strategy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Performance Metrics */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              Performance Metrics
            </h4>

            {/* ROI Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">ROI Range (%)</Label>
                <span className="text-xs font-mono font-semibold">
                  {filters.roiRange[0]}% - {filters.roiRange[1]}%
                </span>
              </div>
              <Slider
                value={filters.roiRange}
                onValueChange={(value) =>
                  setFilters({ ...filters, roiRange: value as [number, number] })
                }
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Max Drawdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Max Drawdown (%)</Label>
                <span className="text-xs font-mono font-semibold">
                  {filters.maxDrawdown}%
                </span>
              </div>
              <Slider
                value={[filters.maxDrawdown]}
                onValueChange={(value) =>
                  setFilters({ ...filters, maxDrawdown: value[0] })
                }
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            {/* Min Win Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Min Win Rate (%)</Label>
                <span className="text-xs font-mono font-semibold">
                  {filters.minWinRate}%
                </span>
              </div>
              <Slider
                value={[filters.minWinRate]}
                onValueChange={(value) =>
                  setFilters({ ...filters, minWinRate: value[0] })
                }
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Min Sharpe Ratio */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Min Sharpe Ratio</Label>
                <span className="text-xs font-mono font-semibold">
                  {filters.minSharpeRatio.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[filters.minSharpeRatio]}
                onValueChange={(value) =>
                  setFilters({ ...filters, minSharpeRatio: value[0] })
                }
                min={0}
                max={5}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          {/* Experience & Activity */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-semibold text-sm">Experience & Activity</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Min Days Active
                </Label>
                <Input
                  type="number"
                  value={filters.minDaysActive}
                  onChange={(e) =>
                    setFilters({ ...filters, minDaysActive: parseInt(e.target.value) || 0 })
                  }
                  className="font-mono"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Min Copiers
                </Label>
                <Input
                  type="number"
                  value={filters.minCopiers}
                  onChange={(e) =>
                    setFilters({ ...filters, minCopiers: parseInt(e.target.value) || 0 })
                  }
                  className="font-mono"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Trading Style */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-semibold text-sm">Trading Style</h4>
            <div className="grid grid-cols-2 gap-3">
              {["Scalping", "Day Trading", "Swing Trading", "Position Trading"].map(
                (style) => (
                  <label
                    key={style}
                    className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded"
                  >
                    <Checkbox
                      checked={filters.tradingStyles.includes(style)}
                      onCheckedChange={() => handleTradingStyleToggle(style)}
                    />
                    <span className="text-sm">{style}</span>
                  </label>
                )
              )}
            </div>
          </div>

          {/* Exchange */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-semibold text-sm">Exchange</h4>
            <div className="grid grid-cols-3 gap-3">
              {["Binance", "Bybit", "OKX"].map((exchange) => (
                <label
                  key={exchange}
                  className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded"
                >
                  <Checkbox
                    checked={filters.exchanges.includes(exchange)}
                    onCheckedChange={() => handleExchangeToggle(exchange)}
                  />
                  <span className="text-sm">{exchange}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Risk Level */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-semibold text-sm">Risk Level</h4>
            <div className="grid grid-cols-3 gap-3">
              {["Low", "Medium", "High"].map((level) => (
                <label
                  key={level}
                  className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded"
                >
                  <Checkbox
                    checked={filters.riskLevels.includes(level)}
                    onCheckedChange={() => handleRiskLevelToggle(level)}
                  />
                  <span className="text-sm">{level} Risk</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            <X className="size-4 mr-2" />
            Reset All
          </Button>
          <Button variant="outline">
            <Save className="size-4 mr-2" />
            Save Preset
          </Button>
          <Button onClick={handleApply} className="bg-accent hover:bg-accent/90">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Advanced Filters Button Component
export function AdvancedFiltersButton({ onClick, activeFilterCount }: { onClick: () => void; activeFilterCount?: number }) {
  return (
    <Button variant="outline" onClick={onClick} className="gap-2">
      <SlidersHorizontal className="size-4" />
      Advanced Filters
      {activeFilterCount && activeFilterCount > 0 && (
        <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px]">
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  );
}