import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";

interface CopySetupProps {
  onNavigate: (view: string) => void;
  traderData?: any;
}

export function CopySetup({ onNavigate, traderData }: CopySetupProps) {
  const [allocationMethod, setAllocationMethod] = useState("percentage");
  const [allocationValue, setAllocationValue] = useState("");
  const [maxPositionPct, setMaxPositionPct] = useState("");
  const [spotOnly, setSpotOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trader = traderData || { name: "Unknown Trader", id: null };

  const handleSubmit = async () => {
    if (!trader.id) {
      toast.error("Invalid trader", { description: "Trader ID is required" });
      return;
    }

    // Validation
    if (allocationMethod === "percentage") {
      const pct = parseFloat(allocationValue);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        toast.error("Invalid allocation", { description: "Percentage must be between 1 and 100" });
        return;
      }
    } else {
      const amount = parseFloat(allocationValue);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Invalid allocation", { description: "Amount must be greater than 0" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        traderId: trader.id,
      };

      if (allocationMethod === "percentage") {
        payload.allocationPct = parseFloat(allocationValue);
      } else {
        // For fixed amount, we'll use 100% allocation (backend handles this)
        payload.allocationPct = 100;
      }

      if (maxPositionPct) {
        const maxPct = parseFloat(maxPositionPct);
        if (!isNaN(maxPct) && maxPct > 0 && maxPct <= 100) {
          payload.maxPositionPct = maxPct;
        }
      }

      await api.post("/api/copy-setups", payload);
      toast.success("Copy setup created", { description: `You're now copying ${trader.name}` });
      onNavigate("copy-trading");
    } catch (err: any) {
      const message = err?.message || "Failed to create copy setup";
      toast.error("Error", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

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
                      <SelectItem value="percentage">Percentage of Portfolio</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (USDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {allocationMethod === "fixed" ? (
                  <div>
                    <Label>Copy Amount (USDT)</Label>
                    <Input 
                      type="number" 
                      placeholder="1000.00" 
                      className="mt-2"
                      value={allocationValue}
                      onChange={(e) => setAllocationValue(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter the amount to allocate</p>
                  </div>
                ) : (
                  <div>
                    <Label>Portfolio Percentage (%)</Label>
                    <Input 
                      type="number" 
                      placeholder="10" 
                      className="mt-2"
                      value={allocationValue}
                      onChange={(e) => setAllocationValue(e.target.value)}
                      min="1"
                      max="100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Max: 100% per trader</p>
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
                  <Label>Max Position Size (%)</Label>
                  <Input 
                    type="number" 
                    placeholder="25" 
                    className="mt-2"
                    value={maxPositionPct}
                    onChange={(e) => setMaxPositionPct(e.target.value)}
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Per individual position (optional)</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label>Spot Trading Only</Label>
                    <p className="text-xs text-muted-foreground mt-1">Disable futures/leveraged trading (coming soon)</p>
                  </div>
                  <Switch checked={spotOnly} onCheckedChange={setSpotOnly} disabled />
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
                <span className="font-medium">
                  {allocationValue ? (
                    allocationMethod === "percentage" ? `${allocationValue}%` : `$${allocationValue} USDT`
                  ) : (
                    "Not set"
                  )}
                </span>
              </div>
              {maxPositionPct && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Position:</span>
                  <span className="font-medium">{maxPositionPct}%</span>
                </div>
              )}
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
            <Button 
              className="w-full bg-primary text-primary-foreground" 
              onClick={handleSubmit}
              disabled={isSubmitting || !allocationValue}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Confirm & Start Copying"
              )}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onNavigate("trader-profile", trader)}>
              Cancel
            </Button>
          </div>

          <Card className="p-4 bg-secondary/30">
            <div className="text-xs text-muted-foreground space-y-2">
              <p>• Your profit allowance is used as you earn from copied trades</p>
              <p>• When you hit the cap, buy another package in Packages</p>
              <p>• You can manage multiple copy setups</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
