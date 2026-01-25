import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface CopySetupProps {
  onNavigate: (view: string) => void;
  traderData?: any;
}

export function CopySetup({ onNavigate, traderData }: CopySetupProps) {
  const [allocationMethod, setAllocationMethod] = useState("fixed");
  const [spotOnly, setSpotOnly] = useState(false);

  const trader = traderData || { name: "ProTrader_XYZ" };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("trader-profile", trader)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold mb-1">Copy Setup</h1>
          <p className="text-sm text-muted-foreground">Configure risk parameters for copying {trader.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="col-span-2 space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Allocation Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Allocation Method</Label>
                  <Select value={allocationMethod} onValueChange={setAllocationMethod}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount (USDT)</SelectItem>
                      <SelectItem value="percentage">Percentage of Portfolio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {allocationMethod === "fixed" ? (
                  <div>
                    <Label>Copy Amount (USDT)</Label>
                    <Input type="number" placeholder="1000.00" className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">Available: $24,567.82 USDT</p>
                  </div>
                ) : (
                  <div>
                    <Label>Portfolio Percentage (%)</Label>
                    <Input type="number" placeholder="10" className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">Max: 25% per trader</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Risk Controls</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Max Leverage</Label>
                  <Select defaultValue="5">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x (No Leverage)</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="5">5x</SelectItem>
                      <SelectItem value="10">10x</SelectItem>
                      <SelectItem value="20">20x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Max Position Size (USDT)</Label>
                  <Input type="number" placeholder="500.00" className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Per individual position</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Daily Loss (%)</Label>
                    <Input type="number" placeholder="5" className="mt-2" />
                  </div>
                  <div>
                    <Label>Max Drawdown (%)</Label>
                    <Input type="number" placeholder="15" className="mt-2" />
                  </div>
                </div>

                <div>
                  <Label>Allowed Symbols</Label>
                  <Input placeholder="BTC, ETH, SOL (leave empty for all)" className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label>Spot Trading Only</Label>
                    <p className="text-xs text-muted-foreground mt-1">Disable futures/leveraged trading</p>
                  </div>
                  <Switch checked={spotOnly} onCheckedChange={setSpotOnly} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Summary & Actions */}
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Configuration Summary</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trader:</span>
                <span className="font-medium">{trader.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Allocation:</span>
                <span className="font-medium">$1,000 USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Leverage:</span>
                <span className="font-medium">5x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Position:</span>
                <span className="font-medium">$500 USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Loss Limit:</span>
                <span className="font-medium">5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Drawdown Limit:</span>
                <span className="font-medium">15%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trading Mode:</span>
                <span className="font-medium">{spotOnly ? "Spot Only" : "All Markets"}</span>
              </div>
            </div>
          </Card>

          <Alert className="border-[#FFB000]/20 bg-[#FFB000]/5">
            <AlertTriangle className="size-4 text-[#FFB000]" />
            <AlertDescription className="text-xs">
              Copy trading will begin immediately. You can pause or stop at any time from the Copy Trading screen.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button className="w-full bg-primary text-primary-foreground" onClick={() => {
              onNavigate("copy-trading");
            }}>
              Confirm & Start Copying
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onNavigate("trader-profile", trader)}>
              Cancel
            </Button>
          </div>

          <Card className="p-4 bg-secondary/30">
            <div className="text-xs text-muted-foreground space-y-2">
              <p>• Platform fee: 20% of profitable trades</p>
              <p>• No fees on losing trades</p>
              <p>• Your Pro plan allows up to 5 simultaneous copies</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
