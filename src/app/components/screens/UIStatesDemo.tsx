/**
 * KLINEO UI States Demo Screen
 * 
 * Showcases all production UX systems including:
 * - Toast notifications
 * - Confirmation dialogs
 * - Empty states
 * - Error states
 * - Form validation
 * - Loading states
 */

import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ValidatedInput, ValidatedNumberInput, ValidatedPasswordInput } from "@/app/components/ui/validated-input";
import { validateAPIKey, validateEmail, validatePassword, validateLeverage, validatePercentage } from "@/app/lib/form-validation";
import { DataExportDialog, QuickExportButton } from "@/app/components/ui/data-export";
import { RealTimePrice, RealTimePnL, usePriceTicker, usePortfolioUpdates } from "@/app/lib/realtime-data";
import {
  EquityCurveChart,
  PnLBarChart,
  WinRateChart,
  PortfolioAllocationChart,
  PerformanceComparisonChart,
  generateEquityCurveData,
  generatePnLData,
  generatePerformanceData,
} from "@/app/components/charts/EquityCurveChart";
import { AdvancedFilter, QuickFilters, FilterConfig } from "@/app/components/ui/advanced-filter";
import {
  ROITooltip,
  WinRateTooltip,
  MaxDrawdownTooltip,
  LeverageTooltip,
  HelpTooltip,
} from "@/app/components/ui/help-tooltip";
import { toast } from "@/app/lib/toast";
import {
  ConfirmationDialog,
  useStopCopyingDialog,
  useClosePositionDialog,
  useCloseAllPositionsDialog,
  useDeleteAPIKeyDialog,
  useCancelSubscriptionDialog,
} from "@/app/components/ui/confirmation-dialog";
import {
  EmptyPositions,
  EmptyTraders,
  EmptyTradeHistory,
  EmptyReferrals,
  EmptyOrders,
  EmptySearchResults,
  EmptyNotifications,
  EmptyFees,
} from "@/app/components/ui/empty-state";
import {
  ErrorState,
  Error404,
  Error500,
  Error401,
  Error403,
  APIKeyError,
  ExchangeDisconnectedError,
  RateLimitError,
  NetworkOfflineError,
  ConnectionStatus,
} from "@/app/components/ui/error-state";

interface UIStatesDemoProps {
  onNavigate: (view: string) => void;
}

export function UIStatesDemo({ onNavigate }: UIStatesDemoProps) {
  // State for form validation demo
  const [email, setEmail] = useState("");
  const [apiKeyDemo, setApiKeyDemo] = useState("");
  const [password, setPassword] = useState("");
  const [leverageDemo, setLeverageDemo] = useState("");
  const [positionSize, setPositionSize] = useState("");

  // Mock data for export demo
  const mockTradeData = [
    { date: "2026-01-20", symbol: "BTC/USDT", side: "BUY", quantity: "0.5", price: "42000", pnl: "+450" },
    { date: "2026-01-21", symbol: "ETH/USDT", side: "SELL", quantity: "2.0", price: "2200", pnl: "+120" },
    { date: "2026-01-22", symbol: "SOL/USDT", side: "BUY", quantity: "10", price: "95", pnl: "-30" },
  ];

  const [confirmDialog, setConfirmDialog] = useState(false);
  const stopCopying = useStopCopyingDialog("John Trading", () => {
    toast.success("Stopped copying John Trading");
  });
  const closePosition = useClosePositionDialog("BTC/USDT", () => {
    toast.success("Position closed");
  });
  const closeAllPositions = useCloseAllPositionsDialog(5, () => {
    toast.success("All positions closed");
  });
  const deleteAPIKey = useDeleteAPIKeyDialog("Binance", () => {
    toast.success("API key deleted");
  });
  const cancelSubscription = useCancelSubscriptionDialog(() => {
    toast.info("Subscription cancelled");
  });

  const handleExport = async (format: any, dateRange: string) => {
    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">UI States Demo</h1>
        <p className="text-sm text-muted-foreground">
          Comprehensive showcase of all KLINEO production UX systems
        </p>
      </div>

      <Tabs defaultValue="toasts" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-10 min-w-max">
            <TabsTrigger value="toasts">Toasts</TabsTrigger>
            <TabsTrigger value="dialogs">Dialogs</TabsTrigger>
            <TabsTrigger value="empty">Empty</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="realtime">Real-time</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>
        </div>

        {/* Toast Notifications */}
        <TabsContent value="toasts" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Toast Notifications</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Test all toast variants with different messages and actions
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Success Toasts */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Success Toasts</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("Trade executed successfully")}
                  className="w-full justify-start"
                >
                  Simple Success
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.success("API key connected", {
                      description: "Your Binance API key is now active",
                    })
                  }
                  className="w-full justify-start"
                >
                  Success with Description
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.tradeExecuted("BTC/USDT", "BUY", "0.5")}
                  className="w-full justify-start"
                >
                  Trade Executed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.copyStarted("John Trading")}
                  className="w-full justify-start"
                >
                  Copy Started
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.apiKeyConnected("Binance")}
                  className="w-full justify-start"
                >
                  API Key Connected
                </Button>
              </div>

              {/* Error Toasts */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#EF4444]">Error Toasts</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.error("Failed to execute order")}
                  className="w-full justify-start"
                >
                  Simple Error
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.error("Connection failed", {
                      description: "Unable to reach exchange API",
                    })
                  }
                  className="w-full justify-start"
                >
                  Error with Description
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.orderFailed("Insufficient balance")}
                  className="w-full justify-start"
                >
                  Order Failed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.connectionLost()}
                  className="w-full justify-start"
                >
                  Connection Lost (No Auto-dismiss)
                </Button>
              </div>

              {/* Warning Toasts */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Warning Toasts</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.warning("Risk limit approaching")}
                  className="w-full justify-start"
                >
                  Simple Warning
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.warning("High volatility detected", {
                      description: "Consider adjusting position sizes",
                    })
                  }
                  className="w-full justify-start"
                >
                  Warning with Description
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.riskLimitHit("Daily Loss")}
                  className="w-full justify-start"
                >
                  Risk Limit Hit (with Action)
                </Button>
              </div>

              {/* Info Toasts */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Info Toasts</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("System maintenance scheduled")}
                  className="w-full justify-start"
                >
                  Simple Info
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.info("New feature available", {
                      description: "Check out advanced risk controls",
                      action: {
                        label: "Learn More",
                        onClick: () => console.log("Navigate to feature"),
                      },
                    })
                  }
                  className="w-full justify-start"
                >
                  Info with Action
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.copyStopped("John Trading")}
                  className="w-full justify-start"
                >
                  Copy Stopped
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Confirmation Dialogs */}
        <TabsContent value="dialogs" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Confirmation Dialogs</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Test different danger levels and confirmation patterns
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Warning Level</h3>
                <Button
                  variant="outline"
                  onClick={() => stopCopying.open()}
                  className="w-full justify-start"
                >
                  Stop Copying Trader
                </Button>
                <Button
                  variant="outline"
                  onClick={() => cancelSubscription.open()}
                  className="w-full justify-start"
                >
                  Cancel Subscription
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#FFB000]">Danger Level</h3>
                <Button
                  variant="outline"
                  onClick={() => closePosition.open()}
                  className="w-full justify-start"
                >
                  Close Position
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#EF4444]">Critical Level</h3>
                <Button
                  variant="outline"
                  onClick={() => closeAllPositions.open()}
                  className="w-full justify-start"
                >
                  Close All Positions (with checkbox)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => deleteAPIKey.open()}
                  className="w-full justify-start"
                >
                  Delete API Key (with checkbox)
                </Button>
              </div>
            </div>

            {/* Render dialogs */}
            {stopCopying.dialog}
            {closePosition.dialog}
            {closeAllPositions.dialog}
            {deleteAPIKey.dialog}
            {cancelSubscription.dialog}
          </Card>
        </TabsContent>

        {/* Empty States */}
        <TabsContent value="empty" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Empty Positions</h3>
              <EmptyPositions onNavigate={onNavigate} />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Empty Traders</h3>
              <EmptyTraders onNavigate={onNavigate} />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Empty Trade History</h3>
              <EmptyTradeHistory onNavigate={onNavigate} />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Empty Referrals</h3>
              <EmptyReferrals referralLink="https://klineo.com/ref/ABC123" />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Empty Orders</h3>
              <EmptyOrders onNavigate={onNavigate} />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">No Search Results</h3>
              <EmptySearchResults
                onClearFilters={() => toast.info("Filters cleared")}
                searchTerm="day trader"
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Empty Notifications</h3>
              <EmptyNotifications />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Empty Fees</h3>
              <EmptyFees />
            </Card>
          </div>
        </TabsContent>

        {/* Error States */}
        <TabsContent value="errors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">API Key Error</h3>
              <APIKeyError
                onRetry={() => toast.info("Retrying connection...")}
                onSetup={() => onNavigate("settings")}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Exchange Disconnected</h3>
              <ExchangeDisconnectedError
                onReconnect={() => toast.info("Reconnecting...")}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Rate Limit</h3>
              <RateLimitError />
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium mb-4">Network Offline</h3>
              <NetworkOfflineError onRetry={() => toast.info("Checking connection...")} />
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-sm font-medium mb-4">Full-Page Errors (Preview)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              These would normally take over the entire screen
            </p>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => window.alert("This would show the 404 page")}
                className="w-full justify-start"
              >
                404 - Page Not Found
              </Button>
              <Button
                variant="outline"
                onClick={() => window.alert("This would show the 500 page")}
                className="w-full justify-start"
              >
                500 - Server Error
              </Button>
              <Button
                variant="outline"
                onClick={() => window.alert("This would show the 401 page")}
                className="w-full justify-start"
              >
                401 - Session Expired
              </Button>
              <Button
                variant="outline"
                onClick={() => window.alert("This would show the 403 page")}
                className="w-full justify-start"
              >
                403 - Access Denied
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Form Validation */}
        <TabsContent value="forms" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Form Validation</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Test different form validation scenarios
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Email Validation</h3>
                <ValidatedInput
                  label="Email"
                  name="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Enter your email"
                  validator={validateEmail}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">API Key Validation</h3>
                <ValidatedInput
                  label="API Key"
                  name="apiKey"
                  value={apiKeyDemo}
                  onChange={setApiKeyDemo}
                  placeholder="Enter your API key"
                  validator={validateAPIKey}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Password Validation</h3>
                <ValidatedPasswordInput
                  label="Password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your password"
                  validator={validatePassword}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Leverage Validation</h3>
                <ValidatedNumberInput
                  label="Leverage"
                  name="leverage"
                  value={leverageDemo}
                  onChange={setLeverageDemo}
                  placeholder="Enter leverage"
                  validator={validateLeverage}
                  unit="x"
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Position Size Validation</h3>
                <ValidatedNumberInput
                  label="Position Size"
                  name="positionSize"
                  value={positionSize}
                  onChange={setPositionSize}
                  placeholder="Enter position size"
                  validator={(val) => validatePercentage(val, 1, 100, "Position size")}
                  unit="%"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Data Export */}
        <TabsContent value="export" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Data Export</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Test data export functionality
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Export Dialog</h3>
                <DataExportDialog
                  exportType="trade-history"
                  onExport={handleExport}
                  availableColumns={["date", "symbol", "side", "quantity", "price", "pnl"]}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Quick Export Button</h3>
                <QuickExportButton
                  data={mockTradeData}
                  filename="klineo_trades"
                  format="csv"
                  columns={["date", "symbol", "side", "quantity", "price", "pnl"]}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Real-time Data */}
        <TabsContent value="realtime" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Real-time Data</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Test real-time data updates with animations
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Real-time Price</h3>
                <RealTimePrice symbol="BTC/USDT" basePrice={42000} showChange />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-accent">Real-time PnL</h3>
                <RealTimePnL value={450.23} percent={2.15} />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts" className="space-y-6">
          <div className="space-y-4">
            <EquityCurveChart data={generateEquityCurveData()} />
            <PnLBarChart data={generatePnLData()} />
            <WinRateChart wins={70} losses={30} />
          </div>
        </TabsContent>

        {/* Filters */}
        <TabsContent value="filters" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Advanced Filters</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Test multi-select filters and presets
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-accent mb-3">Advanced Filter</h3>
                <AdvancedFilter
                  onFilterChange={(filters) => console.log("Filters:", filters)}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-accent mb-3">Quick Filters</h3>
                <QuickFilters
                  onFilterChange={(filters) => console.log("Quick filters:", filters)}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Help Tooltips */}
        <TabsContent value="help" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Help Tooltips</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Hover over the help icons to see tooltips
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm">ROI (Return on Investment)</span>
                <ROITooltip />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">Win Rate</span>
                <WinRateTooltip />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">Max Drawdown</span>
                <MaxDrawdownTooltip />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">Leverage</span>
                <LeverageTooltip />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}