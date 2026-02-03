import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { AlertTriangle, Key, Shield, Wifi, Trash2, CheckCircle2, XCircle, Loader2, Plus, KeyRound, RefreshCw, Upload } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useDemo } from "@/app/contexts/DemoContext";
import { api, exchangeConnections, getApiErrorMessage, sanitizeExchangeError, type ExchangeConnection } from "@/lib/api";
import { supabase } from "@/lib/supabase";
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
import { ConnectExchangeWizard } from "@/app/components/screens/ConnectExchangeWizard";
import { ROUTES } from "@/app/config/routes";
import { FuturesEnableModal } from "@/app/components/screens/FuturesEnableModal";
import { Users, DollarSign, Ticket, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

interface SettingsProps {
  onNavigate?: (view: string) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const [connectWizardOpen, setConnectWizardOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarImageError, setAvatarImageError] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
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
  const [futuresTestId, setFuturesTestId] = useState<string | null>(null);
  const [futuresEnableId, setFuturesEnableId] = useState<string | null>(null);
  const [permissionChecklistOpen, setPermissionChecklistOpen] = useState(false);
  const [entitlement, setEntitlement] = useState<{
    joiningFeePaid: boolean;
    status: string;
    activePackageId: string | null;
    profitAllowanceUsd: number;
    profitUsedUsd: number;
    remainingUsd: number;
  } | null>(null);
  const [entitlementRefreshLoading, setEntitlementRefreshLoading] = useState(false);
  // Update credentials (re-save API key/secret to fix decrypt errors)
  const [updateCredsConn, setUpdateCredsConn] = useState<ExchangeConnection | null>(null);
  const [updateCredsForm, setUpdateCredsForm] = useState({ apiKey: "", apiSecret: "", environment: "production" as "production" | "testnet" });
  const [updateCredsLoading, setUpdateCredsLoading] = useState(false);
  const [manageFuturesConn, setManageFuturesConn] = useState<ExchangeConnection | null>(null);

  // My discounts (assigned by admin)
  type MyDiscount = {
    id: string;
    scope: string;
    onboardingDiscountPercent: number | null;
    onboardingDiscountFixedUsd: number | null;
    tradingDiscountPercent: number | null;
    tradingPackageIds: string[];
    tradingMaxPackages: number | null;
    tradingUsedCount: number;
    status: string;
    createdAt: string | null;
  };
  const [myDiscountsLoading, setMyDiscountsLoading] = useState(false);
  const [myDiscounts, setMyDiscounts] = useState<MyDiscount[]>([]);

  // My Referrals (profile)
  type MyReferralsTimeframe = "7d" | "30d" | "90d" | "all";
  const [myReferralsTimeframe, setMyReferralsTimeframe] = useState<MyReferralsTimeframe>("all");
  const [myReferralsLoading, setMyReferralsLoading] = useState(false);
  const [myReferralsData, setMyReferralsData] = useState<{
    totalReferrals: number;
    timeframe: string;
    referrals: Array<{
      referredId: string;
      referredDisplay: string;
      joinedAt: string;
      totalSpendUsd: number;
      yourEarningsFromThemUsd: number;
    }>;
    summary: { totalVolumeUsd: number; totalEarningsUsd: number };
  } | null>(null);

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
      avatarUrl?: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>("/api/me/profile")
      .then((data) => {
        setFullName(data.fullName ?? "");
        setUsername(data.username ?? "");
        setTimezone(data.timezone ?? "UTC");
        setAvatarUrl(data.avatarUrl ?? "");
        setAvatarImageError(false);
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
        avatarUrl: avatarUrl?.trim() || null,
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

  const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const MAX_AVATAR_SIZE_MB = 2;

  const handleAvatarFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !user?.id) return;
      if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        toast.error("Invalid image type", { description: "Use JPEG, PNG, GIF, or WebP." });
        return;
      }
      if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
        toast.error("Image too large", { description: `Max size is ${MAX_AVATAR_SIZE_MB} MB.` });
        return;
      }
      setAvatarUploading(true);
      setAvatarImageError(false);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = ["jpeg", "jpg", "png", "gif", "webp"].includes(ext) ? ext : "jpg";
        const path = `${user.id}/avatar.${safeExt}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        const newUrl = urlData.publicUrl;
        setAvatarUrl(newUrl);
        await api.put("/api/me/profile", {
          fullName: fullName || null,
          username: username || null,
          timezone: timezone || "UTC",
          avatarUrl: newUrl,
          referralWallet: referralWallet || null,
          paymentWalletBsc: paymentWalletBsc || null,
        });
        toast.success("Profile image updated");
      } catch (err: any) {
        toast.error("Upload failed", { description: err?.message ?? "Please try again." });
      } finally {
        setAvatarUploading(false);
      }
    },
    [user?.id, fullName, username, timezone, referralWallet, paymentWalletBsc]
  );

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
  const refreshConnections = () => {
    if (!user?.id) return;
    exchangeConnections.list()
      .then((data) => setExchangeConnectionsList(data.connections))
      .catch((err: any) => toast.error('Failed to load connections', { description: err?.message }));
  };

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

  const fetchEntitlement = useCallback(() => {
    if (!user?.id || isDemoMode) return Promise.resolve();
    return api
      .get<{
        joiningFeePaid: boolean;
        status: string;
        activePackageId: string | null;
        profitAllowanceUsd: number;
        profitUsedUsd: number;
        remainingUsd: number;
      }>("/api/me/entitlement")
      .then((d) =>
        setEntitlement({
          joiningFeePaid: d.joiningFeePaid ?? false,
          status: d.status ?? "inactive",
          activePackageId: d.activePackageId ?? null,
          profitAllowanceUsd: d.profitAllowanceUsd ?? 0,
          profitUsedUsd: d.profitUsedUsd ?? 0,
          remainingUsd: d.remainingUsd ?? 0,
        })
      )
      .catch((err) => {
        toast.error("Failed to refresh packages", { description: err?.message ?? "Please try again." });
      });
  }, [user?.id, isDemoMode]);

  useEffect(() => {
    fetchEntitlement();
  }, [fetchEntitlement]);

  // My Referrals: fetch when user or timeframe changes
  useEffect(() => {
    if (!user?.id) {
      setMyReferralsData(null);
      return;
    }
    setMyReferralsLoading(true);
    api
      .get<{
        totalReferrals: number;
        timeframe: string;
        referrals: Array<{
          referredId: string;
          referredDisplay: string;
          joinedAt: string;
          totalSpendUsd: number;
          yourEarningsFromThemUsd: number;
        }>;
        summary: { totalVolumeUsd: number; totalEarningsUsd: number };
      }>(`/api/referrals/my-referrals?timeframe=${myReferralsTimeframe}`)
      .then((data) => setMyReferralsData(data))
      .catch(() => setMyReferralsData(null))
      .finally(() => setMyReferralsLoading(false));
  }, [user?.id, myReferralsTimeframe]);

  const fetchMyDiscounts = useCallback(() => {
    if (!user?.id) {
      setMyDiscounts([]);
      return;
    }
    setMyDiscountsLoading(true);
    api
      .get<{ discounts: MyDiscount[] }>("/api/me/discounts")
      .then((data) => setMyDiscounts(data.discounts ?? []))
      .catch(() => setMyDiscounts([]))
      .finally(() => setMyDiscountsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    fetchMyDiscounts();
  }, [fetchMyDiscounts]);

  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");
  const handleSettingsTabChange = useCallback((value: string) => {
    setActiveSettingsTab(value);
    if (value === "profile") fetchMyDiscounts();
    if (value === "packages") fetchEntitlement();
  }, [fetchMyDiscounts, fetchEntitlement]);

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
      toast.error('Connection test failed', { description: sanitizeExchangeError(err?.message || 'Test failed') });
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
      toast.error('Failed to save connection', { description: sanitizeExchangeError(err?.message) });
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
        const detail = (result as { error?: string }).error || result.message;
        toast.error('Connection test failed', { description: detail });
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
      toast.error('Test failed', { description: sanitizeExchangeError(description) });
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
      toast.error("Failed to update credentials", { description: sanitizeExchangeError(err?.message) });
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
      toast.error('Failed to delete connection', { description: sanitizeExchangeError(err?.message) });
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

  const handleFuturesTest = async (id: string) => {
    setFuturesTestId(id);
    try {
      const res = await exchangeConnections.futuresTest(id);
      if (res.ok) toast.success(`Futures API OK (${res.latencyMs}ms)`);
      else toast.error(res.error ?? 'Futures test failed');
      const data = await exchangeConnections.list();
      setExchangeConnectionsList(data.connections);
    } catch (err: any) {
      toast.error('Futures test failed', { description: sanitizeExchangeError(err?.message) });
    } finally {
      setFuturesTestId(null);
    }
  };

  const handleFuturesEnable = async (id: string) => {
    setFuturesEnableId(id);
    try {
      await exchangeConnections.futuresEnable(id, { default_leverage: 3, margin_mode: 'isolated', position_mode: 'one_way' });
      toast.success('Futures enabled');
      const data = await exchangeConnections.list();
      setExchangeConnectionsList(data.connections);
    } catch (err: any) {
      const msg = getApiErrorMessage(err);
      const isRestricted = /451|restricted|eligibility|region|unavailable.*location/i.test(msg);
      toast.error(isRestricted ? 'Futures not available in your region' : 'Futures enable failed', {
        description: sanitizeExchangeError(msg),
      });
    } finally {
      setFuturesEnableId(null);
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

      <Tabs value={activeSettingsTab} onValueChange={handleSettingsTabChange} className="space-y-4 sm:space-y-6">
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
          <TabsTrigger value="packages">Packages</TabsTrigger>
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
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-start gap-2 shrink-0">
                <Label>Profile image</Label>
                <div className="flex items-center gap-4">
                  <div className="size-20 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                    {avatarUrl?.trim() && !avatarImageError ? (
                      <img
                        src={avatarUrl.trim()}
                        alt="Profile"
                        className="size-full object-cover"
                        onError={() => setAvatarImageError(true)}
                      />
                    ) : (
                      <span className="text-2xl text-muted-foreground font-medium">{fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}</span>
                    )}
                  </div>
                  <div className="space-y-2 min-w-0 flex-1 sm:max-w-[280px]">
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={profileLoading || avatarUploading}
                      onClick={() => avatarFileInputRef.current?.click()}
                    >
                      {avatarUploading ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="size-4 mr-2" />
                      )}
                      {avatarUploading ? "Uploading…" : "Upload image"}
                    </Button>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP. Max {MAX_AVATAR_SIZE_MB} MB.</p>
                  </div>
                </div>
              </div>
            </div>
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

          {/* Your discounts: assigned by admin (onboarding / trading packages) */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Ticket className="size-5 text-primary" />
                  Your Assigned Discounts
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Discounts assigned to you by the team. They apply automatically when you pay for onboarding or trading packages.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMyDiscounts()}
                disabled={myDiscountsLoading}
              >
                {myDiscountsLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
                Refresh
              </Button>
            </div>
            {myDiscountsLoading ? (
              <div className="flex items-center gap-2 py-6">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading discounts...</span>
              </div>
            ) : myDiscounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No discounts assigned. If you were promised one, ask support.</p>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Packages / Max</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myDiscounts.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="capitalize font-medium">{d.scope?.replace("_", " ")}</TableCell>
                        <TableCell>
                          {d.scope === "onboarding"
                            ? (d.onboardingDiscountPercent != null ? `${d.onboardingDiscountPercent}%` : "") + (d.onboardingDiscountFixedUsd != null ? ` or $${d.onboardingDiscountFixedUsd}` : "")
                            : d.tradingDiscountPercent != null ? `${d.tradingDiscountPercent}%` : "—"}
                        </TableCell>
                        <TableCell>
                          {d.scope === "trading_packages"
                            ? (d.tradingPackageIds?.length ? d.tradingPackageIds.join(", ") : "All") + " / max " + (d.tradingMaxPackages ?? "—") + " (used " + (d.tradingUsedCount ?? 0) + ")"
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.status === "active" ? "default" : "secondary"} className={d.status === "active" ? "bg-[#10B981]/10 text-[#10B981]" : ""}>
                            {d.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* My Referrals: count, time frame, per-referral spend & earnings */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="size-5 text-primary" />
                My Referrals
              </h3>
              <Select
                value={myReferralsTimeframe}
                onValueChange={(v: MyReferralsTimeframe) => setMyReferralsTimeframe(v)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Time frame" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Users you invited to the platform, how much they spent in the selected period, and your earnings from each.
            </p>
            {myReferralsLoading ? (
              <div className="flex items-center gap-2 py-6">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading referrals...</span>
              </div>
            ) : myReferralsData ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Users referred</div>
                    <div className="text-xl font-semibold text-primary">{myReferralsData.totalReferrals}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Period</div>
                    <div className="text-sm font-medium">{myReferralsData.timeframe}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Volume (period)</div>
                    <div className="text-xl font-semibold">${myReferralsData.summary.totalVolumeUsd.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <DollarSign className="size-3.5" /> Your earnings (period)
                    </div>
                    <div className="text-xl font-semibold text-primary">${myReferralsData.summary.totalEarningsUsd.toFixed(2)}</div>
                  </div>
                </div>
                {myReferralsData.referrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {myReferralsData.totalReferrals === 0
                      ? "You haven't referred anyone yet. Share your referral link from Community Rewards to invite users."
                      : `No purchases from your referrals in ${myReferralsData.timeframe.toLowerCase()}.`}
                  </p>
                ) : (
                  <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referred user</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Spend (period)</TableHead>
                          <TableHead className="text-right">Your earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myReferralsData.referrals.map((r) => (
                          <TableRow key={r.referredId}>
                            <TableCell className="font-mono text-sm">{r.referredDisplay}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono">${r.totalSpendUsd.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-primary">${r.yourEarningsFromThemUsd.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Unable to load referral data. Check your connection and try again.</p>
            )}
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
              One API per exchange (Binance or Bybit) for Spot and Futures. <strong>Required:</strong> Trading, Read balances, Read orders. <strong>Withdraw must NOT be enabled.</strong>
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
                      <CheckSquare className="size-4 text-primary" /> Binance
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Enable Reading</li>
                      <li>Enable Spot & Margin (and Futures if you use futures)</li>
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
                      <CheckSquare className="size-4 text-primary" /> Bybit
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Read-Write (Trading, Read balances, Read orders)</li>
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
              <h3 className="text-lg font-semibold">Exchange connections (Binance & Bybit)</h3>
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
            {!isDemoMode && (
              <div className="flex gap-2">
                <Button onClick={() => setConnectWizardOpen(true)} className="gap-2 bg-primary text-primary-foreground">
                  <Key className="size-4" />
                  Connect Exchange
                </Button>
                {!showAddForm && (
                  <Button variant="outline" onClick={() => setShowAddForm(true)} className="gap-2">
                    <Plus className="size-4" />
                    Add Connection
                  </Button>
                )}
              </div>
            )}
          </div>

          <ConnectExchangeWizard
            open={connectWizardOpen}
            onOpenChange={setConnectWizardOpen}
            onComplete={() => refreshConnections()}
            onNavigate={onNavigate}
          />

          <FuturesEnableModal
            open={!!manageFuturesConn}
            onOpenChange={(open) => !open && setManageFuturesConn(null)}
            connection={manageFuturesConn}
            onSuccess={() => refreshConnections()}
          />

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
                      <SelectItem value="binance">Binance</SelectItem>
                      <SelectItem value="bybit">Bybit</SelectItem>
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
                      <a href="https://testnet.binance.vision/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Binance Testnet</a>
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
                        {conn.disabled_at && (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                            Disabled (too many errors)
                          </Badge>
                        )}
                        {(conn.exchange === "binance" || conn.exchange === "bybit") && (
                          <>
                            <Badge variant="outline" className={conn.last_test_status === "ok" ? "bg-green-500/10 text-green-600 border-green-500/30" : "text-muted-foreground"}>
                              Spot {conn.last_test_status === "ok" ? "active" : conn.last_test_status === "fail" ? "failed" : "not tested"}
                            </Badge>
                            <Badge variant="outline" className={conn.futures_enabled ? "bg-green-500/10 text-green-600 border-green-500/30" : "text-muted-foreground"}>
                              {conn.futures_enabled
                                ? "Futures ON"
                                : conn.last_error_message && /restricted|eligibility|region|unavailable.*location/i.test(conn.last_error_message)
                                  ? "Futures OFF (not available in your region)"
                                  : "Futures OFF"}
                            </Badge>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Exchange: {conn.exchange}</div>
                        {conn.last_tested_at && (
                          <div>Last tested: {new Date(conn.last_tested_at).toLocaleString()}</div>
                        )}
                        {conn.last_error_message && (
                          <>
                            <div className="text-[#EF4444]">Error: {conn.last_error_message}</div>
                            {/restricted|eligibility|451|region|unavailable.*location/i.test(conn.last_error_message) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Binance may block both Spot and Futures API access from the server&apos;s or your region. Your API key can be valid; the test runs from our server, which might be in a restricted location.
                              </p>
                            )}
                          </>
                        )}
                        {conn.disabled_at && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Connection was auto-disabled after 5 consecutive failures. Use <strong>Re-enable</strong>, then click <strong>Test Spot</strong> to verify your API (or Update credentials first if keys changed).
                          </p>
                        )}
                        {(conn.last_test_status === "fail" || !conn.last_test_status) && !conn.disabled_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Use <strong>Test Spot</strong> to verify your API key. If it fails with a decrypt error, use <strong>Update credentials</strong> to re-enter your API key and secret.
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
                        title="Test Spot API (account/balance). Run this to verify your API key works for Spot."
                      >
                        {testingId === conn.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Test Spot"
                        )}
                      </Button>
                      {(conn.exchange === "binance" || conn.exchange === "bybit") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFuturesTest(conn.id)}
                            disabled={futuresTestId === conn.id}
                          >
                            {futuresTestId === conn.id ? <Loader2 className="size-4 animate-spin" /> : null}
                            Test Futures
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManageFuturesConn(conn)}
                          >
                            Manage Futures
                          </Button>
                          {!conn.futures_enabled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFuturesEnable(conn.id)}
                              disabled={futuresEnableId === conn.id || !!(conn.last_error_message && /restricted|eligibility|451|unavailable.*location/i.test(conn.last_error_message)) || !!(conn.futures_last_error && /restricted|eligibility|451|unavailable.*location/i.test(conn.futures_last_error))}
                              title={conn.last_error_message && /restricted|451/i.test(conn.last_error_message) ? "Futures is not available in your region (Binance restriction)." : undefined}
                            >
                              {futuresEnableId === conn.id ? <Loader2 className="size-4 animate-spin" /> : null}
                              Enable Futures
                            </Button>
                          )}
                        </>
                      )}
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
                <span className="text-sm">Trading (Spot & Futures)</span>
                <Shield className="size-4 text-[#10B981]" />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                <span className="text-sm">Enable Withdrawals</span>
                <Shield className="size-4 text-[#EF4444]" />
                <span className="text-xs text-[#EF4444] ml-2">Never enable</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              When creating your exchange API key (Binance or Bybit), only enable the permissions shown with green checkmarks.
              KLINEO will never request withdrawal permissions.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="size-5 text-primary" />
                  Your packages & credits
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your active package, status, and remaining profit allowance (credits). Buy more from Packages to top up.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={entitlementRefreshLoading}
                onClick={() => {
                  if (isDemoMode) {
                    toast.info("Packages", { description: "Refresh is not available in demo mode." });
                    return;
                  }
                  setEntitlementRefreshLoading(true);
                  fetchEntitlement().finally(() => setEntitlementRefreshLoading(false));
                }}
              >
                {entitlementRefreshLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="size-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
            {entitlement ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Active package</div>
                    <div className="font-semibold mt-1">
                      {entitlement.activePackageId ? (
                        <span className="text-primary">{entitlement.activePackageId}</span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
                    <div className="font-semibold mt-1 capitalize">{entitlement.status}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Profit allowance</div>
                    <div className="text-xl font-semibold mt-1">${entitlement.profitAllowanceUsd.toFixed(2)}</div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Used</div>
                    <div className="text-xl font-semibold mt-1">${entitlement.profitUsedUsd.toFixed(2)}</div>
                  </div>
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Credits left</div>
                    <div className="text-xl font-semibold mt-1 text-primary">${entitlement.remainingUsd.toFixed(2)}</div>
                  </div>
                </div>
                <Link to={ROUTES.packages} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <Package className="size-4" />
                  View packages & buy more
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-6">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading…</span>
              </div>
            )}
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
