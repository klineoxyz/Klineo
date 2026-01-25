import { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { AlertTriangle, Key, Shield, Wifi } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";

export function Settings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [referralWallet, setReferralWallet] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [connectionTestLoading, setConnectionTestLoading] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    supabase
      .from("user_profiles")
      .select("full_name, username, timezone, referral_wallet, email")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setProfileError(error.message);
          setProfileLoading(false);
          return;
        }
        setFullName(data?.full_name ?? "");
        setUsername(data?.username ?? "");
        setTimezone(data?.timezone ?? "UTC");
        setReferralWallet(data?.referral_wallet ?? "");
        setProfileLoading(false);
      });
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaveLoading(true);
    setProfileError("");
    const { error } = await supabase
      .from("user_profiles")
      .update({
        full_name: fullName || null,
        username: username || null,
        timezone: timezone || "UTC",
        referral_wallet: referralWallet || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save profile", { description: error.message });
      setSaveLoading(false);
      return;
    }
    toast.success("Profile saved");
    setSaveLoading(false);
  };

  const handleConnectionTest = async () => {
    setConnectionTestLoading(true);
    setConnectionTestResult(null);
    try {
      const me = await api.get<{ id: string; email: string; role: string }>("/api/auth/me");
      setConnectionTestResult(JSON.stringify(me, null, 2));
      toast.success("Connection OK", { description: `Role: ${me.role}` });
    } catch (e: any) {
      setConnectionTestResult(`Error: ${e?.message ?? "Unknown"}`);
      toast.error("Connection test failed", { description: e?.message });
    } finally {
      setConnectionTestLoading(false);
    }
  };

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
          {profileError && (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
              <AlertTriangle className="size-4" />
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          )}

          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Profile Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={profileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="john@example.com" value={user?.email ?? ""} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={profileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  placeholder="UTC"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={profileLoading}
                />
              </div>
            </div>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={handleSaveProfile}
              disabled={profileLoading || saveLoading}
            >
              {saveLoading ? "Saving..." : "Save Changes"}
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Referral Payout Wallet</h3>
            <div className="space-y-2">
              <Label>USDT Wallet Address (TRC-20)</Label>
              <Input
                placeholder="TXyz123..."
                className="font-mono"
                value={referralWallet}
                onChange={(e) => setReferralWallet(e.target.value)}
                disabled={profileLoading}
              />
              <p className="text-xs text-muted-foreground">Used for referral commission payouts</p>
            </div>
            <Button
              variant="outline"
              onClick={handleSaveProfile}
              disabled={profileLoading || saveLoading}
            >
              Update Wallet
            </Button>
          </Card>

          <Card className="p-6 space-y-4 border-primary/20 bg-primary/5">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wifi className="size-5 text-primary" />
              Connection Test
            </h3>
            <p className="text-sm text-muted-foreground">
              Call backend <code className="font-mono text-xs">GET /api/auth/me</code> and show the result.
            </p>
            <Button
              variant="outline"
              onClick={handleConnectionTest}
              disabled={connectionTestLoading}
            >
              {connectionTestLoading ? "Testing..." : "Run Connection Test"}
            </Button>
            {connectionTestResult && (
              <pre className="text-xs font-mono bg-background/50 rounded p-3 overflow-auto max-h-32">
                {connectionTestResult}
              </pre>
            )}
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
