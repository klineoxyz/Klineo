import { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { AlertTriangle, Key, Shield, Wifi, Trash2, CheckCircle2, XCircle, Loader2, Plus, KeyRound } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useDemo } from "@/app/contexts/DemoContext";
import { api, exchangeConnections, type ExchangeConnection } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckSquare } from "lucide-react";

export function Settings() {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [referralWallet, setReferralWallet] = useState("");
  const [paymentWalletBsc, setPaymentWalletBsc] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [connectionTestLoading, setConnectionTestLoading] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<{ connected: boolean; url?: string; latency?: number } | null>(null);
  
  // Exchange Connections state
  const [exchangeConnectionsList, setExchangeConnectionsList] = useState<ExchangeConnection[]>([]);
  const [exchangeConnectionsLoading, setExchangeConnectionsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    exchange: 'binance' as 'binance' | 'bybit',
    environment: 'production' as 'production' | 'testnet',
    label: '',
    apiKey: '',
    apiSecret: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [testBeforeSaveLoading, setTestBeforeSaveLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [reEnableId, setReEnableId] = useState<string | null>(null);
  const [permissionChecklistOpen, setPermissionChecklistOpen] = useState(false);
  const [entitlement, setEntitlement] = useState<{ remainingUsd: number; status: string } | null>(null);
  // Update credentials (re-save API key/secret to fix decrypt errors)
  const [updateCredsConn, setUpdateCredsConn] = useState<ExchangeConnection | null>(null);
  const [updateCredsForm, setUpdateCredsForm] = useState({ apiKey: "", apiSecret: "", environment: "production" as "production" | "testnet" });
  const [updateCredsLoading, setUpdateCredsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    api.get<{
      id: string;
      email: string;
      role: string;
      fullName?: string;
      username?: string;
      timezone: string;
      referralWallet?: string;
      paymentWalletBsc?: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>("/api/me/profile")
      .then((data) => {
        setFullName(data.fullName ?? "");
        setUsername(data.username ?? "");
        setTimezone(data.timezone ?? "UTC");
        setReferralWallet(data.referralWallet ?? "");
        setPaymentWalletBsc(data.paymentWalletBsc ?? "");
        setProfileLoading(false);
      })
      .catch((err: any) => {
        setProfileError(err?.message || "Failed to load profile");
        setProfileLoading(false);
      });
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaveLoading(true);
    setProfileError("");
    try {
      await api.put("/api/me/profile", {
        fullName: fullName || null,
        username: username || null,
        timezone: timezone || "UTC",
        referralWallet: referralWallet || null,
        paymentWalletBsc: paymentWalletBsc || null,
      });
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error("Failed to save profile", { description: err?.message || "Please try again" });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConnectionTest = async () => {
    setConnectionTestLoading(true);
    setConnectionTestResult(null);
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
      const startTime = Date.now();
      
      // Test health endpoint first
      const healthRes = await fetch(`${baseURL.replace(/\/$/, '')}/health`);
      const healthData = await healthRes.json();
      
      // Test auth endpoint
      const me = await api.get<{ id: string; email: string; role: string }>("/api/auth/me");
      const latency = Date.now() - startTime;
      
      // Extract domain from baseURL (mask full URL)
      const urlObj = baseURL ? new URL(baseURL) : null;
      const maskedUrl = urlObj ? `${urlObj.protocol}//${urlObj.hostname}` : 'Not configured';
      
      setBackendStatus({
        connected: true,
        url: maskedUrl,
        latency,
      });
      setConnectionTestResult(JSON.stringify({ health: healthData, user: me }, null, 2));
      toast.success("Connection OK", { description: `Backend: ${maskedUrl} (${latency}ms)` });
    } catch (e: any) {
      setBackendStatus({
        connected: false,
        url: import.meta.env.VITE_API_BASE_URL ? new URL(import.meta.env.VITE_API_BASE_URL).hostname : 'Not configured',
      });
      setConnectionTestResult(`Error: ${e?.message ?? "Unknown"}`);
      toast.error("Connection test failed", { description: e?.message });
    } finally {
      setConnectionTestLoading(false);
    }
  };

  // Check backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
      if (!baseURL) {
        setBackendStatus({ connected: false });
        return;
      }
      try {
        const startTime = Date.now();
        const res = await fetch(`${baseURL.replace(/\/$/, '')}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        const latency = Date.now() - startTime;
        if (res.ok) {
          const urlObj = new URL(baseURL);
          setBackendStatus({
            connected: true,
            url: `${urlObj.protocol}//${urlObj.hostname}`,
            latency,
          });
        } else {
          setBackendStatus({ connected: false, url: new URL(baseURL).hostname });
        }
      } catch {
        setBackendStatus({ connected: false, url: baseURL ? new URL(baseURL).hostname : undefined });
      }
    };
    checkBackend();
  }, []);

  // Load exchange connections
  useEffect(() => {
    if (!user?.id) {
      setExchangeConnectionsLoading(false);
      return;
    }
    setExchangeConnectionsLoading(true);
    exchangeConnections.list()
      .then((data) => {
        setExchangeConnectionsList(data.connections);
        setExchangeConnectionsLoading(false);
      })
      .catch((err: any) => {
        toast.error('Failed to load connections', { description: err?.message });
        setExchangeConnectionsLoading(false);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isDemoMode) return;
    api.get<{ status: string; remainingUsd?: number }>("/api/me/entitlement")
      .then((d) => setEntitlement({ remainingUsd: d.remainingUsd ?? 0, status: d.status ?? "inactive" }))
      .catch(() => setEntitlement(null));
  }, [user?.id, isDemoMode]);

  const handleTestBeforeSave = async () => {
    if (!formData.apiKey?.trim() || !formData.apiSecret?.trim()) {
      toast.error('Enter API Key and API Secret to test');
      return;
    }
    setTestBeforeSaveLoading(true);
    try {
      const result = await exchangeConnections.testBeforeSave({
        exchange: formData.exchange,
        environment: formData.environment,
        apiKey: formData.apiKey.trim(),
        apiSecret: formData.apiSecret.trim(),
      });
      if (result.success && result.ok) {
        toast.success('Connection test passed', { description: `Latency: ${result.latencyMs ?? 0}ms` });
      } else {
        toast.error('Connection test failed', { description: result.error || result.message || 'Invalid credentials' });
      }
    } catch (err: any) {
      const msg = err?.message || 'Test failed';
      toast.error('Connection test failed', { description: msg.replace(/api[_-]?key|secret/gi, '[REDACTED]') });
    } finally {
      setTestBeforeSaveLoading(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!formData.apiKey?.trim() || !formData.apiSecret?.trim()) {
      toast.error('API Key and API Secret are required');
      return;
    }
    setFormLoading(true);
    try {
      await exchangeConnections.create(formData);
      toast.success('Connection saved');
      setShowAddForm(false);
      setFormData({ exchange: 'binance', environment: 'production', label: '', apiKey: '', apiSecret: '' });
      const data = await exchangeConnections.list();
      setExchangeConnectionsList(data.connections);
    } catch (err: any) {
      toast.error('Failed to save connection', { description: err?.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const result = await exchangeConnections.test(id);
      if (result.ok) {
        toast.success('Connection test passed', { description: `Latency: ${result.latencyMs}ms` });
      } else {
        toast.error('Connection test failed', { description: result.message });
      }
      // Reload connections to get updated status
      const data = await exchangeConnections.list();
      setExchangeConnectionsList(data.connections);
    } catch (err: any) {
      let description = err?.message;
      try {
        const body = typeof err?.message === 'string' ? JSON.parse(err.message) : null;
        if (body?.message) description = body.message;
        else if (body?.error && !description?.includes(body.error)) description = [body.error, body.message].filter(Boolean).join(' — ');
      } catch {
        /* use raw message */
      }
      toast.error('Test failed', { description });
    } finally {
      setTestingId(null);
    }
  };

  const handleUpdateCredentialsOpen = (conn: ExchangeConnection) => {
    setUpdateCredsConn(conn);
    setUpdateCredsForm({
      apiKey: "",
      apiSecret: "",
      environment: (conn.environment === "testnet" ? "testnet" : "production") as "production" | "testnet",
    });
  };

  const handleUpdateCredentialsSubmit = async () => {
    if (!updateCredsConn || !updateCredsForm.apiKey.trim() || !updateCredsForm.apiSecret.trim()) {
      toast.error("Please enter API key and secret");
      return;
    }
    setUpdateCredsLoading(true);
    try {
      await exchangeConnections.updateCredentials(updateCredsConn.id, {
        apiKey: updateCredsForm.apiKey.trim(),
        apiSecret: updateCredsForm.apiSecret.trim(),
        environment: updateCredsForm.environment,
      });
      toast.success("Credentials updated. Run Test to verify.");
      setUpdateCredsConn(null);
      const data = await exchangeConnections.list();
      setExchangeConnectionsList(data.connections);
    } catch (err: any) {
      toast.error("Failed to update credentials", { description: err?.message });
    } finally {
      setUpdateCredsLoading(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      await exchangeConnections.delete(id);
      toast.success('Connection deleted');
      const data = await exchangeConnections.list();
      setExchangeConnectionsList(data.connections);
    } catch (err: any) {
      toast.error('Failed to delete connection', { description: err?.message });
    }
  };

  const handleReEnableConnection = async (id: string) => {
    setReEnableId(id);
    try {
      await exchangeConnections.reEnable(id);
      toast.success('Connection re-enabled. Run Test to verify.');
      const data = await exchangeConnections.list();
      setExchangeConnectionsList(data.connections);
    } catch (err: any) {
      toast.error('Failed to re-enable', { description: err?.message });
    } finally {
      setReEnableId(null);
    }
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 4) return '****';
    return `${key.slice(0, 2)}***${key.slice(-2)}`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 p-1 w-full sm:w-fit">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="exchange">
            Exchange API
            {exchangeConnectionsList.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {exchangeConnectionsList.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {profileError && (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
              <AlertTriangle className="size-4" />
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          )}

          {/* Backend Connection Status */}
          <Card className="p-4 border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Wifi className={`size-5 shrink-0 ${backendStatus?.connected ? 'text-[#10B981]' : 'text-[#EF4444]'}`} />
                <div className="min-w-0">
                  <div className="font-semibold">Backend Connection</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {backendStatus?.connected 
                      ? `Connected to ${backendStatus.url}${backendStatus.latency ? ` (${backendStatus.latency}ms)` : ''}`
                      : backendStatus?.url 
                        ? `Disconnected from ${backendStatus.url}`
                        : 'Not configured — VITE_API_BASE_URL missing'
                    }
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleConnectionTest}
                disabled={connectionTestLoading}
                className="w-full sm:w-auto shrink-0"
              >
                {connectionTestLoading ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-semibold">Profile Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
              <Label>USDT Wallet Address (BSC)</Label>
              <Input
                placeholder="0x... (BEP20)"
                className="font-mono"
                value={referralWallet}
                onChange={(e) => setReferralWallet(e.target.value)}
                disabled={profileLoading}
              />
              <p className="text-xs text-muted-foreground">BSC (Binance Smart Chain) USDT address for referral payouts</p>
            </div>
            <Button
              variant="outline"
              onClick={handleSaveProfile}
              disabled={profileLoading || saveLoading}
            >
              Update Wallet
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Payment Wallet (BSC)</h3>
            <div className="space-y-2">
              <Label>USDT Wallet Address (BEP20)</Label>
              <Input
                placeholder="0x... (BEP20)"
                className="font-mono"
                value={paymentWalletBsc}
                onChange={(e) => setPaymentWalletBsc(e.target.value)}
                disabled={profileLoading}
              />
              <p className="text-xs text-muted-foreground">BSC wallet used when you send manual USDT payments to Safe (joining fee or packages)</p>
            </div>
            <Button
              variant="outline"
              onClick={handleSaveProfile}
              disabled={profileLoading || saveLoading}
            >
              Update Wallet
            </Button>
          </Card>

          {/* Backend Connection Status */}
          <Card className="p-4 border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Wifi className={`size-5 shrink-0 ${backendStatus?.connected ? 'text-[#10B981]' : 'text-[#EF4444]'}`} />
                <div className="min-w-0">
                  <div className="font-semibold">Backend Connection</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {backendStatus?.connected 
                      ? `Connected to ${backendStatus.url}${backendStatus.latency ? ` (${backendStatus.latency}ms)` : ''}`
                      : backendStatus?.url 
                        ? `Disconnected from ${backendStatus.url}`
                        : 'Not configured — VITE_API_BASE_URL missing'
                    }
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleConnectionTest}
                disabled={connectionTestLoading}
                className="w-full sm:w-auto shrink-0"
              >
                {connectionTestLoading ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4 border-primary/20 bg-primary/5">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wifi className="size-5 text-primary" />
              Connection Test Details
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
          {isDemoMode && (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-sm">
                You're in <strong>Demo mode</strong>. Switch to <strong>Live</strong> (toggle top left) to connect real Binance and Bybit APIs. In Demo you can explore the app with sample data only.
              </AlertDescription>
            </Alert>
          )}
          <Alert className="border-primary/20 bg-primary/5">
            <Key className="size-4 text-primary" />
            <AlertDescription className="text-sm">
              Your API keys are encrypted and stored securely. KLINEO never has withdrawal permissions.
              <br />
              <strong>Required permissions:</strong> Spot trading, Read balances, Read orders. <strong>Withdraw permission must NOT be required.</strong>
            </AlertDescription>
          </Alert>

          <Collapsible open={permissionChecklistOpen} onOpenChange={setPermissionChecklistOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                {permissionChecklistOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                API key permissions checklist (copy-paste)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 p-4 space-y-4">
                <p className="text-xs text-muted-foreground">When creating API keys on the exchange, enable only what is below. Do <strong>not</strong> enable Withdrawals.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <CheckSquare className="size-4 text-primary" /> Binance (Spot)
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Enable Reading</li>
                      <li>Enable Spot & Margin Trading</li>
                      <li>Do NOT enable Withdrawals</li>
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" rel="noopener noreferrer">Mainnet API</a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://testnet.binance.vision/" target="_blank" rel="noopener noreferrer">Testnet</a>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <CheckSquare className="size-4 text-primary" /> Bybit (Spot)
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Read-Write (Spot trading, Read balances, Read orders)</li>
                      <li>Do NOT enable Withdrawals</li>
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://www.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer">Mainnet API</a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://testnet.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer">Testnet</a>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-semibold">Exchange Connections (Binance & Bybit)</h3>
              {!isDemoMode && entitlement && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Profit allowance applies to all connected exchanges.
                  {entitlement.status === "active" ? (
                    <span className="text-primary font-medium"> ${entitlement.remainingUsd.toFixed(2)} remaining</span>
                  ) : (
                    <span> No active package — buy a package to trade.</span>
                  )}
                </p>
              )}
            </div>
            {!showAddForm && !isDemoMode && (
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus className="size-4" />
                Add Connection
              </Button>
            )}
          </div>

          {showAddForm && !isDemoMode && (
            <Card className="p-6 space-y-4">
              <h4 className="font-semibold">Add connection</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Exchange</Label>
                  <Select
                    value={formData.exchange}
                    onValueChange={(value: 'binance' | 'bybit') => setFormData({ ...formData, exchange: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="binance">Binance (Spot)</SelectItem>
                      <SelectItem value="bybit">Bybit (Spot)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(value: 'production' | 'testnet') => setFormData({ ...formData, environment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="testnet">Testnet</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Use Testnet for testing with fake funds. Get testnet keys from{" "}
                    {formData.exchange === 'binance' ? (
                      <a href="https://testnet.binance.vision/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Binance Spot Testnet</a>
                    ) : (
                      <a href="https://testnet.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer" className="text-primary underline">Bybit Testnet</a>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Label (optional)</Label>
                  <Input
                    placeholder={formData.exchange === 'binance' ? 'My Binance Account' : 'My Bybit Account'}
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter your API key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    type="password"
                    placeholder="Enter your API secret"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleTestBeforeSave} disabled={testBeforeSaveLoading || !formData.apiKey?.trim() || !formData.apiSecret?.trim()}>
                  {testBeforeSaveLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Test Connection
                </Button>
                <Button onClick={handleSaveConnection} disabled={formLoading}>
                  {formLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Save Connection
                </Button>
                <Button variant="ghost" onClick={() => {
                  setShowAddForm(false);
                  setFormData({ exchange: 'binance', environment: 'production', label: '', apiKey: '', apiSecret: '' });
                }}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {exchangeConnectionsLoading ? (
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading connections...</span>
              </div>
            </Card>
          ) : exchangeConnectionsList.length === 0 ? (
            <Card className="p-6 text-center border-primary/20 bg-primary/5">
              <Key className="size-12 mx-auto mb-4 text-primary" />
              <h4 className="font-semibold mb-2">Connect Binance or Bybit</h4>
              <p className="text-muted-foreground mb-4">
                In <strong>Live</strong> mode, connect your Binance or Bybit API keys to enable copy trading and portfolio tracking. Switch to Live using the toggle in the top left.
              </p>
              {!isDemoMode && (
                <Button onClick={() => setShowAddForm(true)} className="gap-2">
                  <Plus className="size-4" />
                  Add Your First Connection
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                Your API keys are encrypted and stored securely. KLINEO never has withdrawal permissions.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {exchangeConnectionsList.map((conn) => (
                <Card key={conn.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{conn.label || `${conn.exchange === 'bybit' ? 'Bybit' : 'Binance'} Connection`}</h4>
                        <Badge variant={conn.environment === 'production' ? 'default' : 'secondary'}>
                          {conn.environment}
                        </Badge>
                        {conn.last_test_status === 'ok' && (
                          <Badge className="bg-[#10B981] text-white">
                            <CheckCircle2 className="size-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                        {conn.last_test_status === 'fail' && (
                          <Badge variant="destructive">
                            <XCircle className="size-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                        {!conn.last_test_status && (
                          <Badge variant="outline">Never tested</Badge>
                        )}
                        {conn.disabled_at && (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                            Disabled (too many errors)
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Exchange: {conn.exchange}</div>
                        {conn.last_tested_at && (
                          <div>Last tested: {new Date(conn.last_tested_at).toLocaleString()}</div>
                        )}
                        {conn.last_error_message && (
                          <div className="text-[#EF4444]">Error: {conn.last_error_message}</div>
                        )}
                        {conn.disabled_at && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Connection was auto-disabled after 5 consecutive failures. Use <strong>Re-enable</strong> then run Test (or Update credentials and Test).
                          </p>
                        )}
                        {(conn.last_test_status === "fail" || !conn.last_test_status) && !conn.disabled_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            If Test fails with a decrypt error, use <strong>Update credentials</strong> to re-enter your API key and secret.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {conn.disabled_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReEnableConnection(conn.id)}
                          disabled={reEnableId === conn.id}
                          className="border-amber-500/50 text-amber-700 dark:text-amber-400 gap-1"
                        >
                          {reEnableId === conn.id ? <Loader2 className="size-4 animate-spin" /> : null}
                          {reEnableId === conn.id ? "Re-enabling…" : "Re-enable"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(conn.id)}
                        disabled={testingId === conn.id}
                      >
                        {testingId === conn.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Test"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateCredentialsOpen(conn)}
                        className="gap-1"
                      >
                        <KeyRound className="size-3.5" />
                        Update credentials
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConnection(conn.id)}
                        className="text-[#EF4444] border-[#EF4444]/50 hover:bg-[#EF4444]/10"
                        title="Revoke connection and remove stored credentials"
                      >
                        <Trash2 className="size-4 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Update credentials dialog — re-enter API key/secret to fix decrypt errors */}
          <Dialog open={!!updateCredsConn} onOpenChange={(open) => !open && setUpdateCredsConn(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Update credentials</DialogTitle>
                <DialogDescription>
                  Re-enter your API key and secret. This fixes &quot;decrypt&quot; errors when Test fails. Keys are encrypted and saved securely.
                </DialogDescription>
              </DialogHeader>
              {updateCredsConn && (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <Select
                      value={updateCredsForm.environment}
                      onValueChange={(v: "production" | "testnet") => setUpdateCredsForm((f) => ({ ...f, environment: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="testnet">Testnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter your API key"
                      value={updateCredsForm.apiKey}
                      autoComplete="off"
                      onChange={(e) => setUpdateCredsForm((f) => ({ ...f, apiKey: e.target.value }))}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Secret</Label>
                    <Input
                      type="password"
                      placeholder="Enter your API secret"
                      value={updateCredsForm.apiSecret}
                      autoComplete="off"
                      onChange={(e) => setUpdateCredsForm((f) => ({ ...f, apiSecret: e.target.value }))}
                      className="font-mono"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setUpdateCredsConn(null)} disabled={updateCredsLoading}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCredentialsSubmit} disabled={updateCredsLoading}>
                  {updateCredsLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Save credentials
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">API Permissions Guide</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                <span className="text-sm">Read Account Data</span>
                <Shield className="size-4 text-[#10B981]" />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                <span className="text-sm">Enable Spot & Margin Trading</span>
                <Shield className="size-4 text-[#10B981]" />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                <span className="text-sm">Enable Withdrawals</span>
                <Shield className="size-4 text-[#EF4444]" />
                <span className="text-xs text-[#EF4444] ml-2">Never enable</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              When creating your Binance API key, only enable the permissions shown with green checkmarks.
              KLINEO will never request withdrawal permissions.
            </p>
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
