import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Search, TrendingUp, TrendingDown, Users, Eye, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import { MarketplaceLoading } from "./MarketplaceLoading";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { AdvancedFiltersModal, AdvancedFiltersButton, type FilterValues } from "./AdvancedFiltersModal";

const traders = [
  {
    name: "ProTrader_XYZ",
    roi: 24.3,
    drawdown: -8.2,
    daysActive: 156,
    followers: 342,
    risk: "Medium",
    status: "Active",
    winRate: 67.4,
    sharpeRatio: 1.84,
    avgTradeDuration: "4.2 hrs",
    openPositions: 3,
    maxPositions: 8,
  },
  {
    name: "AlphaStrategist",
    roi: 18.7,
    drawdown: -5.4,
    daysActive: 203,
    followers: 587,
    risk: "Low",
    status: "Active",
    winRate: 72.1,
    sharpeRatio: 2.14,
    avgTradeDuration: "8.5 hrs",
    openPositions: 5,
    maxPositions: 10,
  },
  {
    name: "QuantMaster_Pro",
    roi: 31.2,
    drawdown: -12.1,
    daysActive: 89,
    followers: 198,
    risk: "High",
    status: "Active",
    winRate: 61.8,
    sharpeRatio: 1.52,
    avgTradeDuration: "2.1 hrs",
    openPositions: 7,
    maxPositions: 12,
  },
  {
    name: "SwingKing_Elite",
    roi: 15.9,
    drawdown: -6.8,
    daysActive: 267,
    followers: 423,
    risk: "Low",
    status: "Active",
    winRate: 69.5,
    sharpeRatio: 1.98,
    avgTradeDuration: "12.3 hrs",
    openPositions: 2,
    maxPositions: 6,
  },
  {
    name: "Momentum_Trader",
    roi: 28.4,
    drawdown: -10.3,
    daysActive: 112,
    followers: 256,
    risk: "Medium",
    status: "Active",
    winRate: 64.2,
    sharpeRatio: 1.67,
    avgTradeDuration: "5.8 hrs",
    openPositions: 4,
    maxPositions: 8,
  },
  {
    name: "CryptoWhale_99",
    roi: 42.1,
    drawdown: -15.7,
    daysActive: 67,
    followers: 891,
    risk: "High",
    status: "Limited",
    winRate: 58.3,
    sharpeRatio: 1.41,
    avgTradeDuration: "1.5 hrs",
    openPositions: 9,
    maxPositions: 15,
  },
];

interface MarketplaceProps {
  onNavigate: (view: string, data?: any) => void;
}

export function Marketplace({ onNavigate }: MarketplaceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterValues | null>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleApplyFilters = (filters: FilterValues) => {
    setAdvancedFilters(filters);
    // In a real app, this would filter the traders array
    console.log("Applied filters:", filters);
  };

  const getActiveFilterCount = () => {
    if (!advancedFilters) return 0;
    let count = 0;
    if (advancedFilters.roiRange && (advancedFilters.roiRange[0] > 0 || advancedFilters.roiRange[1] < 100)) count++;
    if (advancedFilters.maxDrawdown && advancedFilters.maxDrawdown < 50) count++;
    if (advancedFilters.minWinRate && advancedFilters.minWinRate > 0) count++;
    if (advancedFilters.minSharpeRatio && advancedFilters.minSharpeRatio > 0) count++;
    if (advancedFilters.tradingStyles && advancedFilters.tradingStyles.length > 0) count++;
    if (advancedFilters.exchanges && advancedFilters.exchanges.length > 0) count++;
    if (advancedFilters.riskLevels && advancedFilters.riskLevels.length > 0) count++;
    return count;
  };

  return (
    <LoadingWrapper
      isLoading={isLoading}
      loadingComponent={<MarketplaceLoading />}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Marketplace</h1>
            <p className="text-sm text-muted-foreground">Browse and copy professional traders</p>
          </div>
          <Button 
            onClick={() => onNavigate("master-trader-application")}
            className="bg-primary text-primary-foreground"
          >
            Become a Master Trader
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-5 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search traders..." className="pl-9" />
            </div>
            <Select defaultValue="all-risk">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-risk">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="roi-desc">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roi-desc">ROI: High to Low</SelectItem>
                <SelectItem value="roi-asc">ROI: Low to High</SelectItem>
                <SelectItem value="dd-asc">Drawdown: Low to High</SelectItem>
                <SelectItem value="followers-desc">Most Followers</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-status">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="limited">Limited Capacity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Advanced Filters Button */}
        <div className="flex justify-end mt-2">
          <AdvancedFiltersButton
            onClick={() => setShowAdvancedFilters(true)}
            activeFilterCount={getActiveFilterCount()}
          />
        </div>

        {/* Trader Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {traders.map((trader, i) => (
            <Card key={i} className="p-5 space-y-4 hover:border-accent/50 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-lg mb-2">{trader.name}</div>
                  <div className="flex items-center gap-2">
                    {/* Enhanced Risk Badge with background */}
                    <Badge 
                      className={
                        trader.risk === "Low" 
                          ? "bg-green-500/15 text-green-400 border-green-500/30 font-semibold" 
                          : trader.risk === "Medium" 
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold" 
                          : "bg-red-500/15 text-red-400 border-red-500/30 font-bold"
                      }
                    >
                      {trader.risk === "High" && <AlertTriangle className="size-3 mr-1" />}
                      {trader.risk} Risk
                    </Badge>
                    <Badge variant={trader.status === "Active" ? "default" : "secondary"}>
                      {trader.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Primary Metrics - Existing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">ROI (YTD)</div>
                  <div className={`text-xl font-mono font-bold flex items-center gap-1 ${trader.roi > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {trader.roi > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    +{trader.roi}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Max Drawdown</div>
                  <div className="text-xl font-mono font-bold text-[#EF4444]">{trader.drawdown}%</div>
                </div>
              </div>

              {/* NEW: Secondary Metrics */}
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Win Rate</div>
                  <div className="text-lg font-mono font-semibold">{trader.winRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Avg Trade</div>
                  <div className="text-lg font-mono font-semibold flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground" />
                    {trader.avgTradeDuration}
                  </div>
                </div>
              </div>

              {/* NEW: Tertiary Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Sharpe Ratio</div>
                  <div className="text-lg font-mono font-semibold">{trader.sharpeRatio}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Open Positions</div>
                  <div className="text-lg font-mono font-semibold">
                    {trader.openPositions}/{trader.maxPositions}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="size-3" />
                    <span className="font-mono">{trader.followers}</span>
                  </div>
                  <div className="font-mono">{trader.daysActive} days</div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onNavigate("trader-profile", trader)}
                  className="gap-1"
                >
                  <Eye className="size-3" />
                  View & Copy
                </Button>
              </div>
            </Card>
          ))}
        </div>

      {/* Refresh Button */}
      <div className="flex justify-center mt-4">
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleRefresh}
        >
          <RefreshCw className="size-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Advanced Filters Modal */}
      <AdvancedFiltersModal
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
        onApply={handleApplyFilters}
      />
    </div>
    </LoadingWrapper>
  );
}