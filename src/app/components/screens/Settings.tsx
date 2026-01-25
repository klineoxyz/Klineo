import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { AlertTriangle, Key, Shield } from "lucide-react";

export function Settings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="exchange">Exchange API</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Profile Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input placeholder="johndoe" />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input placeholder="UTC+0" />
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground">Save Changes</Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Referral Payout Wallet</h3>
            <div className="space-y-2">
              <Label>USDT Wallet Address (TRC-20)</Label>
              <Input placeholder="TXyz123..." className="font-mono" />
              <p className="text-xs text-muted-foreground">Used for referral commission payouts</p>
            </div>
            <Button variant="outline">Update Wallet</Button>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Change Password</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" />
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground">Update Password</Button>
          </Card>

          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium mb-1">Enable 2FA</div>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Switch />
            </div>
          </Card>

          <Card className="p-6 space-y-4 border-[#EF4444]/20 bg-[#EF4444]/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[#EF4444]" />
              <h3 className="text-lg font-semibold">Kill Switch</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Immediately close all positions, cancel all orders, and pause all copy trading
            </p>
            <Button variant="destructive" className="bg-[#EF4444] text-white">
              Activate Kill Switch
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="exchange" className="space-y-6">
          <Alert className="border-primary/20 bg-primary/5">
            <Key className="size-4 text-primary" />
            <AlertDescription className="text-sm">
              Your API keys are encrypted and stored securely. KLINEO never has withdrawal permissions.
            </AlertDescription>
          </Alert>

          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Exchange API Connection</h3>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-[#10B981]" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Exchange</Label>
                <Input value="Binance" readOnly />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value="••••••••••••••••••••" readOnly className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <Input type="password" value="••••••••••••••••••••" readOnly className="font-mono" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">Update API Keys</Button>
              <Button variant="outline" className="text-[#EF4444] border-[#EF4444]/50 hover:bg-[#EF4444]/10">
                Disconnect
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">API Permissions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                <span className="text-sm">Read Account Data</span>
                <Shield className="size-4 text-[#10B981]" />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                <span className="text-sm">Enable Trading</span>
                <Shield className="size-4 text-[#10B981]" />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                <span className="text-sm">Enable Withdrawals</span>
                <Shield className="size-4 text-[#EF4444]" />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Email Notifications</h3>
            <div className="space-y-4">
              {[
                { label: "Trade Notifications", description: "Get notified when trades are executed" },
                { label: "Risk Alerts", description: "Alerts when risk limits are reached" },
                { label: "Copy Status Changes", description: "Notifications when copy trading is paused/resumed" },
                { label: "Subscription Updates", description: "Billing and subscription notifications" },
                { label: "Referral Earnings", description: "Updates on referral commissions" },
              ].map((notification, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <div className="font-medium mb-1">{notification.label}</div>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
