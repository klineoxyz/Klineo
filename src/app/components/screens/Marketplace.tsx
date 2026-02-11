import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Search, TrendingUp, TrendingDown, Users, Eye, RefreshCw, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { MarketplaceLoading } from "./MarketplaceLoading";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { AdvancedFiltersModal, AdvancedFiltersButton, type FilterValues } from "./AdvancedFiltersModal";
import { api, marketplaceStrategies, type MarketplaceStrategy } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { EmptyTraders } from "@/app/components/ui/empty-state";
import { ErrorState } from "@/app/components/ui/error-state";

interface Trader {
  id: string;
  name: string;
  slug: string;
  roi: number;
  drawdown: number;
  daysActive: number;
  followers: number;
  status: string;
  exchange?: string;
  verified?: boolean;
}

interface MarketplaceProps {
  onNavigate: (view: string, data?: any) => void;
}

export function Marketplace({ onNavigate }: MarketplaceProps) {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [strategies, setStrategies] = useState<MarketplaceStrategy[]>([]);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterValues | null>(null);

  const loadStrategies = async () => {
    setStrategiesLoading(true);
    try {
      const data = await marketplaceStrategies.list({ limit: 50 });
      setStrategies(data.strategies || []);
    } catch (err: any) {
      toast.error("Failed to load strategies", { description: err?.message });
      setStrategies([]);
    } finally {
      setStrategiesLoading(false);
    }
  };

  const loadTraders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<{ traders: Trader[]; total: number }>("/api/traders?limit=100");
      setTraders(data.traders || []);
    } catch (err: any) {
      const message = err?.message || "Failed to load traders";
      setError(message);
      toast.error("Failed to load traders", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTraders();
  }, []);

  useEffect(() => {
    loadStrategies();
  }, []);

  const handleRefresh = () => {
    loadTraders();
    loadStrategies();
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
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold mb-1">Marketplace</h1>
            <p className="text-sm text-muted-foreground">Browse and copy professional traders</p>
          </div>
          <Button
            asChild
            className="bg-primary text-primary-foreground w-full sm:w-auto"
          >
            <Link to={ROUTES.masterTraderApplication}>Become a Master Trader</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2">
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

        <Tabs defaultValue="traders" className="space-y-4">
          <TabsList className="grid w-full max-w-[280px] grid-cols-2">
            <TabsTrigger value="traders">Traders</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
          </TabsList>

          <TabsContent value="traders" className="space-y-4">
        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            title="Failed to load traders"
            message={error}
            action={
              <Button onClick={loadTraders} variant="outline">
                Try Again
              </Button>
            }
          />
        )}

        {/* Empty State */}
        {!error && !isLoading && traders.length === 0 && (
          <EmptyTraders
            action={
              <Button onClick={loadTraders} variant="outline">
                Refresh
              </Button>
            }
          />
        )}

        {/* Trader Cards */}
        {!error && traders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {traders.map((trader) => {
              // Determine risk level from drawdown
              const risk = trader.drawdown > -10 ? "Low" : trader.drawdown > -15 ? "Medium" : "High";
              
              return (
                <Card key={trader.id} className="p-5 space-y-4 hover:border-accent/50 transition-colors">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg mb-2">{trader.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={
                            risk === "Low" 
                              ? "bg-green-500/15 text-green-400 border-green-500/30 font-semibold" 
                              : risk === "Medium" 
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold" 
                              : "bg-red-500/15 text-red-400 border-red-500/30 font-bold"
                          }
                        >
                          {risk === "High" && <AlertTriangle className="size-3 mr-1" />}
                          {risk} Risk
                        </Badge>
                        <Badge variant={trader.status === "approved" ? "default" : "secondary"}>
                          {trader.status === "approved" ? "Active" : trader.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Primary Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">ROI</div>
                      <div className={`text-xl font-mono font-bold flex items-center gap-1 ${trader.roi > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {trader.roi > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                        {trader.roi > 0 ? "+" : ""}{trader.roi.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Max Drawdown</div>
                      <div className="text-xl font-mono font-bold text-[#EF4444]">{trader.drawdown.toFixed(1)}%</div>
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
                      onClick={() => onNavigate("trader-profile", { id: trader.id, slug: trader.slug })}
                      className="gap-1"
                    >
                      <Eye className="size-3" />
                      View & Copy
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

          </TabsContent>

          <TabsContent value="strategies" className="space-y-4">
            {strategiesLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading strategies…</div>
            ) : strategies.length === 0 ? (
              <Card className="p-8 text-center">
                <BarChart3 className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No strategies listed yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Master Traders can list backtest strategies from Strategy Backtest.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strategies.map((strat) => {
                  const roi = strat.roi ?? (strat.backtestSummary?.roi as number) ?? null;
                  return (
                    <Card key={strat.id} className="p-5 space-y-4 hover:border-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg mb-1 truncate">{strat.name}</div>
                          <div className="text-xs text-muted-foreground">
                            by {strat.trader?.name ?? "Master Trader"} · {strat.symbol} {strat.interval}
                          </div>
                          {strat.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{strat.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {roi != null && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">Backtest ROI</div>
                            <div className={`text-lg font-mono font-bold ${Number(roi) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                              {Number(roi) >= 0 ? "+" : ""}{Number(roi).toFixed(1)}%
                            </div>
                          </div>
                        )}
                        {strat.winRate != null && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">Win rate</div>
                            <div className="text-lg font-mono font-bold">{Number(strat.winRate).toFixed(1)}%</div>
                          </div>
                        )}
                        {strat.maxDrawdown != null && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">Max DD</div>
                            <div className="text-lg font-mono font-bold text-[#EF4444]">{Number(strat.maxDrawdown).toFixed(1)}%</div>
                          </div>
                        )}
                        {strat.totalTrades != null && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">Trades</div>
                            <div className="text-lg font-mono font-bold">{Number(strat.totalTrades)}</div>
                          </div>
                        )}
                      </div>
                      <div className="pt-4 border-t border-border flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() =>
                            strat.trader
                              ? onNavigate("trader-profile", { id: strat.trader.id, slug: strat.trader.slug })
                              : null
                          }
                          disabled={!strat.trader}
                        >
                          <Eye className="size-3" />
                          View & Copy
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

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