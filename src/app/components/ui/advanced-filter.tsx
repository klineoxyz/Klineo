/**
 * KLINEO Advanced Filtering System
 * 
 * Multi-select filters, date ranges, presets, and saved views
 * for trader marketplace and data tables.
 */

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Slider } from "@/app/components/ui/slider";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Filter, X, Save, RotateCcw, ChevronDown } from "lucide-react";

export interface FilterConfig {
  exchanges?: string[];
  riskLevels?: string[];
  minROI?: number;
  maxROI?: number;
  minWinRate?: number;
  maxWinRate?: number;
  minFollowers?: number;
  maxFollowers?: number;
  minDrawdown?: number;
  maxDrawdown?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface AdvancedFilterProps {
  onFilterChange: (filters: FilterConfig) => void;
  availableExchanges?: string[];
  availableRiskLevels?: string[];
  presets?: FilterPreset[];
  onSavePreset?: (name: string, filters: FilterConfig) => void;
}

interface FilterPreset {
  name: string;
  filters: FilterConfig;
}

const DEFAULT_FILTERS: FilterConfig = {
  exchanges: [],
  riskLevels: [],
  minROI: 0,
  maxROI: 500,
  minWinRate: 0,
  maxWinRate: 100,
  minFollowers: 0,
  maxFollowers: 10000,
  minDrawdown: 0,
  maxDrawdown: 100,
  sortBy: "roi",
  sortOrder: "desc",
};

export function AdvancedFilter({
  onFilterChange,
  availableExchanges = ["Binance", "Bybit", "OKX", "Bitget"],
  availableRiskLevels = ["Low", "Medium", "High"],
  presets = [],
  onSavePreset,
}: AdvancedFilterProps) {
  const [filters, setFilters] = useState<FilterConfig>(DEFAULT_FILTERS);
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterUpdate = (updates: Partial<FilterConfig>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleExchangeToggle = (exchange: string) => {
    const current = filters.exchanges || [];
    const newExchanges = current.includes(exchange)
      ? current.filter((e) => e !== exchange)
      : [...current, exchange];
    handleFilterUpdate({ exchanges: newExchanges });
  };

  const handleRiskLevelToggle = (level: string) => {
    const current = filters.riskLevels || [];
    const newLevels = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    handleFilterUpdate({ riskLevels: newLevels });
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    onFilterChange(preset.filters);
    setIsOpen(false);
  };

  const activeFilterCount = () => {
    let count = 0;
    if (filters.exchanges && filters.exchanges.length > 0) count++;
    if (filters.riskLevels && filters.riskLevels.length > 0) count++;
    if (filters.minROI !== DEFAULT_FILTERS.minROI) count++;
    if (filters.maxROI !== DEFAULT_FILTERS.maxROI) count++;
    if (filters.minWinRate !== DEFAULT_FILTERS.minWinRate) count++;
    if (filters.maxWinRate !== DEFAULT_FILTERS.maxWinRate) count++;
    if (filters.minFollowers !== DEFAULT_FILTERS.minFollowers) count++;
    return count;
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="size-4" />
            Filters
            {activeFilterCount() > 0 && (
              <Badge variant="outline" className="ml-1 bg-accent/20 text-accent border-accent/30">
                {activeFilterCount()}
              </Badge>
            )}
            <ChevronDown className="size-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Advanced Filters</h3>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="size-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
            {/* Presets */}
            {presets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick Presets</Label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Exchanges */}
            <div className="space-y-2">
              <Label>Exchanges</Label>
              <div className="grid grid-cols-2 gap-3">
                {availableExchanges.map((exchange) => (
                  <div key={exchange} className="flex items-center gap-2">
                    <Checkbox
                      id={`exchange-${exchange}`}
                      checked={filters.exchanges?.includes(exchange)}
                      onCheckedChange={() => handleExchangeToggle(exchange)}
                    />
                    <Label
                      htmlFor={`exchange-${exchange}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {exchange}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Levels */}
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <div className="flex gap-3">
                {availableRiskLevels.map((level) => (
                  <div key={level} className="flex items-center gap-2">
                    <Checkbox
                      id={`risk-${level}`}
                      checked={filters.riskLevels?.includes(level)}
                      onCheckedChange={() => handleRiskLevelToggle(level)}
                    />
                    <Label
                      htmlFor={`risk-${level}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {level}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* ROI Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>ROI Range</Label>
                <span className="text-sm text-muted-foreground">
                  {filters.minROI}% - {filters.maxROI}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12">Min:</span>
                  <Slider
                    value={[filters.minROI || 0]}
                    onValueChange={([value]) => handleFilterUpdate({ minROI: value })}
                    min={0}
                    max={500}
                    step={10}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12">Max:</span>
                  <Slider
                    value={[filters.maxROI || 500]}
                    onValueChange={([value]) => handleFilterUpdate({ maxROI: value })}
                    min={0}
                    max={500}
                    step={10}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Win Rate Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Win Rate</Label>
                <span className="text-sm text-muted-foreground">
                  {filters.minWinRate}% - {filters.maxWinRate}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12">Min:</span>
                  <Slider
                    value={[filters.minWinRate || 0]}
                    onValueChange={([value]) => handleFilterUpdate({ minWinRate: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12">Max:</span>
                  <Slider
                    value={[filters.maxWinRate || 100]}
                    onValueChange={([value]) => handleFilterUpdate({ maxWinRate: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Followers Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Minimum Followers</Label>
                <span className="text-sm text-muted-foreground">
                  {filters.minFollowers?.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[filters.minFollowers || 0]}
                onValueChange={([value]) => handleFilterUpdate({ minFollowers: value })}
                min={0}
                max={10000}
                step={100}
              />
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleFilterUpdate({ sortBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roi">ROI</SelectItem>
                    <SelectItem value="winRate">Win Rate</SelectItem>
                    <SelectItem value="followers">Followers</SelectItem>
                    <SelectItem value="drawdown">Max Drawdown</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value: "asc" | "desc") =>
                    handleFilterUpdate({ sortOrder: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">High to Low</SelectItem>
                    <SelectItem value="asc">Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              {onSavePreset && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const name = prompt("Enter preset name:");
                    if (name) {
                      onSavePreset(name, filters);
                    }
                  }}
                >
                  <Save className="size-4 mr-2" />
                  Save Preset
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="bg-accent text-background hover:bg-accent/90"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {activeFilterCount() > 0 && (
        <div className="flex items-center gap-2">
          {filters.exchanges &&
            filters.exchanges.map((exchange) => (
              <Badge
                key={exchange}
                variant="outline"
                className="gap-1 bg-secondary"
              >
                {exchange}
                <button
                  onClick={() => handleExchangeToggle(exchange)}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          {filters.riskLevels &&
            filters.riskLevels.map((level) => (
              <Badge
                key={level}
                variant="outline"
                className="gap-1 bg-secondary"
              >
                {level} Risk
                <button
                  onClick={() => handleRiskLevelToggle(level)}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          {filters.minROI !== DEFAULT_FILTERS.minROI && (
            <Badge variant="outline" className="bg-secondary">
              ROI ≥ {filters.minROI}%
            </Badge>
          )}
          {filters.minWinRate !== DEFAULT_FILTERS.minWinRate && (
            <Badge variant="outline" className="bg-secondary">
              Win Rate ≥ {filters.minWinRate}%
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Quick filter buttons for common scenarios
 */
interface QuickFiltersProps {
  onFilterChange: (filters: FilterConfig) => void;
}

export function QuickFilters({ onFilterChange }: QuickFiltersProps) {
  const presets: FilterPreset[] = [
    {
      name: "Top Performers",
      filters: {
        ...DEFAULT_FILTERS,
        minROI: 100,
        minWinRate: 60,
        sortBy: "roi",
        sortOrder: "desc",
      },
    },
    {
      name: "Safe & Steady",
      filters: {
        ...DEFAULT_FILTERS,
        riskLevels: ["Low"],
        minWinRate: 65,
        maxDrawdown: 20,
        sortBy: "winRate",
        sortOrder: "desc",
      },
    },
    {
      name: "Popular Traders",
      filters: {
        ...DEFAULT_FILTERS,
        minFollowers: 1000,
        sortBy: "followers",
        sortOrder: "desc",
      },
    },
    {
      name: "High Risk/Reward",
      filters: {
        ...DEFAULT_FILTERS,
        riskLevels: ["High"],
        minROI: 150,
        sortBy: "roi",
        sortOrder: "desc",
      },
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.name}
          variant="outline"
          size="sm"
          onClick={() => onFilterChange(preset.filters)}
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}