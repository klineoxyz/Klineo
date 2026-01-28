import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { ConfirmationDialog } from "@/app/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { toast } from "@/app/lib/toast";
import { copyToClipboard } from "@/app/lib/clipboard";
import { Search, Shield, ChevronLeft, ChevronRight, Download, Filter, Settings2, Percent, Calendar, Save, Copy, Link2, Trash2, RefreshCw, Ticket, Banknote, CheckCircle } from "lucide-react";

// Mock data removed - now loaded from API

export function Admin() {
  // Data state
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTraders: 0,
    monthlyRevenue: 0,
    platformFees: 0,
    referralPayouts: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [usersSearch, setUsersSearch] = useState("");
  const [traders, setTraders] = useState<any[]>([]);
  const [subscriptionPayments, setSubscriptionPayments] = useState<any[]>([]);
  const [subscriptionStats, setSubscriptionStats] = useState({ starter: 0, pro: 0, unlimited: 0 });
  const [feeTransactions, setFeeTransactions] = useState<any[]>([]);
  const [feeSummary, setFeeSummary] = useState({ totalFees: 0, referralPayouts: 0, netRevenue: 0 });
  const [referralPayouts, setReferralPayouts] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState({ totalEarnings: 0, activeReferrers: 0 });
  const [coupons, setCoupons] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [tradersLoading, setTradersLoading] = useState(false);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  // Platform settings state — aligned with packages: Entry 20%, Pro 15%, Elite 10% (lower fee for higher tier)
  const [starterFee, setStarterFee] = useState("20");
  const [proFee, setProFee] = useState("15");
  const [unlimitedFee, setUnlimitedFee] = useState("10");
  const [showFeeConfirm, setShowFeeConfirm] = useState(false);

  // Coupon creation state
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [couponExpiry, setCouponExpiry] = useState("");
  const [couponDescription, setCouponDescription] = useState("");

  // Mark referral payout as paid
  const [markPaidPayout, setMarkPaidPayout] = useState<{ id: string; referrer: string; amount: number } | null>(null);
  const [markPaidTransactionId, setMarkPaidTransactionId] = useState("");
  const [markPaidLoading, setMarkPaidLoading] = useState(false);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.get('/api/admin/stats');
      setStats(data as any);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (page = 1, search = "") => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      if (search) params.set('search', search);
      const data = await api.get(`/api/admin/users?${params.toString()}`);
      setUsers((data as any).users || []);
      setUsersPagination({
        page: (data as any).page || 1,
        limit: (data as any).limit || 50,
        total: (data as any).total || 0,
        totalPages: (data as any).totalPages || 0,
      });
    } catch (err: any) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTraders = async () => {
    setTradersLoading(true);
    try {
      const data = await api.get('/api/admin/traders');
      setTraders((data as any).traders || []);
    } catch (err: any) {
      console.error('Failed to load traders:', err);
      toast.error('Failed to load traders');
    } finally {
      setTradersLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const data = await api.get('/api/admin/subscriptions');
      setSubscriptionPayments((data as any).subscriptionPayments || []);
      setSubscriptionStats((data as any).stats || { starter: 0, pro: 0, unlimited: 0 });
    } catch (err: any) {
      console.error('Failed to load subscriptions:', err);
      toast.error('Failed to load subscriptions');
    }
  };

  const loadFees = async () => {
    try {
      const data = await api.get('/api/admin/fees');
      setFeeTransactions((data as any).transactions || []);
      setFeeSummary((data as any).summary || { totalFees: 0, referralPayouts: 0, netRevenue: 0 });
    } catch (err: any) {
      console.error('Failed to load revenue:', err);
      toast.error('Failed to load revenue & payments');
    }
  };

  const loadReferrals = async () => {
    try {
      const data = await api.get('/api/admin/referrals');
      setReferralPayouts((data as any).payouts || []);
      setReferralStats((data as any).summary || { totalEarnings: 0, activeReferrers: 0 });
    } catch (err: any) {
      console.error('Failed to load referrals:', err);
      toast.error('Failed to load referrals');
    }
  };

  const loadCoupons = async () => {
    setCouponsLoading(true);
    try {
      const data = await api.get('/api/admin/coupons');
      setCoupons((data as any).coupons || []);
    } catch (err: any) {
      console.error('Failed to load coupons:', err);
      toast.error('Failed to load coupons');
    } finally {
      setCouponsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLogsLoading(true);
    try {
      const data = await api.get('/api/admin/audit-logs');
      setAuditLogs((data as any).logs || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load audit logs');
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string, reason: string) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { status: 'suspended', reason });
      toast.success('User suspended');
      loadUsers(usersPagination.page, usersSearch);
    } catch (err: any) {
      toast.error('Failed to suspend user', { description: err.message });
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { status: 'active' });
      toast.success('User activated');
      loadUsers(usersPagination.page, usersSearch);
    } catch (err: any) {
      toast.error('Failed to activate user', { description: err.message });
    }
  };

  const handleChangeRole = async (userId: string, role: 'user' | 'admin', reason?: string) => {
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role, reason });
      toast.success(`User role changed to ${role}`);
      loadUsers(usersPagination.page, usersSearch);
    } catch (err: any) {
      toast.error('Failed to change role', { description: err.message });
    }
  };

  const handleSaveFeeSettings = () => {
    setShowFeeConfirm(false);
    toast.success("Platform fees updated", {
      description: `Entry/Pro: ${starterFee}%, Elite: ${unlimitedFee}%`,
    });
  };

  const generateCouponCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCouponCode(code);
    toast.info("Coupon code generated", { description: code });
  };

  const handleCreateCoupon = async () => {
    if (!couponCode || !discountPercent || !durationMonths) {
      toast.error("Missing required fields", {
        description: "Please fill in code, discount, and duration",
      });
      return;
    }

    try {
      await api.post('/api/admin/coupons', {
        code: couponCode,
        discount: parseFloat(discountPercent),
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        durationMonths: parseInt(durationMonths),
        expiresAt: couponExpiry || null,
        description: couponDescription || '',
      });
      toast.success("Coupon created successfully", {
        description: `${couponCode} - ${discountPercent}% off for ${durationMonths} months`,
      });
      // Reset form
      setCouponCode("");
      setDiscountPercent("");
      setMaxRedemptions("");
      setDurationMonths("");
      setCouponExpiry("");
      setCouponDescription("");
      loadCoupons();
    } catch (err: any) {
      toast.error("Failed to create coupon", {
        description: err.message || "Please try again",
      });
    }
  };

  const handleApproveTrader = async (traderId: string) => {
    try {
      await api.put(`/api/admin/traders/${traderId}`, { status: 'approved' });
      toast.success("Trader approved");
      loadTraders();
    } catch (err: any) {
      toast.error("Failed to approve trader", { description: err.message });
    }
  };

  const handleRejectTrader = async (traderId: string) => {
    try {
      await api.put(`/api/admin/traders/${traderId}`, { status: 'rejected' });
      toast.success("Trader rejected");
      loadTraders();
    } catch (err: any) {
      toast.error("Failed to reject trader", { description: err.message });
    }
  };

  const copyCouponURL = (code: string) => {
    const url = `https://klineo.xyz/subscribe?coupon=${code}`;
    copyToClipboard(url);
    toast.success("Coupon URL copied", {
      description: `Users can claim ${code} at this URL`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold mb-1">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Platform operations and management</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Users</div>
          <div className="text-2xl font-semibold">{loading ? "—" : stats.totalUsers.toLocaleString()}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Traders</div>
          <div className="text-2xl font-semibold">{loading ? "—" : stats.activeTraders.toLocaleString()}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Revenue</div>
          <div className="text-2xl font-semibold">{loading ? "—" : `$${stats.monthlyRevenue.toLocaleString()}`}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Package & Onboarding Revenue</div>
          <div className="text-2xl font-semibold">{loading ? "—" : `$${stats.platformFees.toLocaleString()}`}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Referral Payouts</div>
          <div className="text-2xl font-semibold">{loading ? "—" : `$${stats.referralPayouts.toLocaleString()}`}</div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="traders">Traders</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="fees">Revenue & Payments</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="platform-settings">Platform Settings</TabsTrigger>
          <TabsTrigger value="discounts">Discount Coupons</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4" onFocus={() => loadUsers(1, usersSearch)}>
          <Card className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users by email, ID..." 
                  className="pl-9" 
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    loadUsers(1, e.target.value);
                  }}
                />
              </div>
              <Button variant="outline" onClick={() => loadUsers(usersPagination.page, usersSearch)}>
                <RefreshCw className="size-4 mr-2" />
                Refresh
              </Button>
            </div>
          </Card>

          <Card>
            {usersLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found. <Button variant="link" onClick={loadUsers} className="p-0 h-auto">Refresh</Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{user.id?.substring(0, 8)}...</TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role || 'user'}
                        onValueChange={(value: 'user' | 'admin') => handleChangeRole(user.id, value)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant="outline">{user.plan || "None"}</Badge></TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === "Active" ? "default" : "destructive"}
                        className={user.status === "Active" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50" : ""}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.joined}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm">View</Button>
                        {user.userStatus === 'active' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[#EF4444]"
                            onClick={() => handleSuspendUser(user.id, 'Admin action')}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[#10B981]"
                            onClick={() => handleActivateUser(user.id)}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            {usersPagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((usersPagination.page - 1) * usersPagination.limit) + 1} to {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)} of {usersPagination.total} users
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => loadUsers(usersPagination.page - 1, usersSearch)}
                    disabled={usersPagination.page === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, usersPagination.totalPages) }, (_, i) => {
                      const page = usersPagination.page <= 3 ? i + 1 : usersPagination.page - 2 + i;
                      if (page > usersPagination.totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={page === usersPagination.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => loadUsers(page, usersSearch)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => loadUsers(usersPagination.page + 1, usersSearch)}
                    disabled={usersPagination.page >= usersPagination.totalPages}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="traders" className="space-y-4" onFocus={loadTraders}>
          <Card className="p-4 flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search traders..." className="pl-9" />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-primary/50 text-primary">
                {traders.filter((t) => t.status === "Pending").length} Pending Approval
              </Badge>
              <Button variant="outline" onClick={loadTraders}>
                <RefreshCw className="size-4 mr-2" />
                Refresh
              </Button>
            </div>
          </Card>

          <Card>
            {tradersLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading traders...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trader Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {traders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No traders found. <Button variant="link" onClick={loadTraders} className="p-0 h-auto">Refresh</Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    traders.map((trader, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold">{trader.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={trader.status === "Approved" ? "default" : "secondary"}
                        className={trader.status === "Approved" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50" : ""}
                      >
                        {trader.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{trader.followers}</TableCell>
                    <TableCell className="font-mono text-[#10B981]">{trader.roi > 0 ? `+${trader.roi}%` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{trader.joined}</TableCell>
                    <TableCell className="text-right">
                      {trader.status === "Pending" ? (
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50"
                            onClick={() => handleApproveTrader(trader.id)}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[#EF4444]"
                            onClick={() => handleRejectTrader(trader.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm">View</Button>
                      )}
                    </TableCell>
                  </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4" onFocus={loadSubscriptions}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Starter</div>
              <div className="text-2xl font-semibold">{subscriptionStats.starter}</div>
              <div className="text-xs text-muted-foreground">Active subscriptions</div>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Pro</div>
              <div className="text-2xl font-semibold">{subscriptionStats.pro}</div>
              <div className="text-xs text-muted-foreground">Active subscriptions</div>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Unlimited</div>
              <div className="text-2xl font-semibold">{subscriptionStats.unlimited}</div>
              <div className="text-xs text-muted-foreground">Active subscriptions</div>
            </Card>
          </div>

          <Card className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadSubscriptions}>
                <RefreshCw className="size-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="size-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Next Renewal</TableHead>
                  <TableHead>Tx Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No subscription payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptionPayments.map((payment, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{payment.userId}</TableCell>
                      <TableCell className="text-sm">{payment.email}</TableCell>
                      <TableCell><Badge variant="outline">{payment.plan}</Badge></TableCell>
                      <TableCell className="font-mono">${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={payment.status === "Paid" ? "default" : "destructive"}
                          className={payment.status === "Paid" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50" : ""}
                        >
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payment.date}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payment.nextRenewal}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">{payment.txHash}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4" onFocus={loadFees}>
          <p className="text-sm text-muted-foreground">
            Revenue is from package sales and one-time onboarding fees only. We do not charge per-trade fees.
          </p>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Summary (This Month)</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Packages & Onboarding Revenue</div>
                <div className="text-2xl font-semibold text-primary">${feeSummary.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Referral Commission Paid</div>
                <div className="text-2xl font-semibold">${feeSummary.referralPayouts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Net Platform Revenue</div>
                <div className="text-2xl font-semibold text-[#10B981]">${feeSummary.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadFees}>
                <RefreshCw className="size-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="size-4 mr-2" />
                Export Report
              </Button>
            </div>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No payments yet. Revenue comes from package sales and onboarding fees.
                    </TableCell>
                  </TableRow>
                ) : (
                  feeTransactions.map((tx, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{tx.userId?.substring(0, 8)}...</TableCell>
                      <TableCell className="text-sm">{tx.type ?? tx.trade ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.description ?? tx.profit != null ? `Profit ${tx.profit}` : '—'}</TableCell>
                      <TableCell className="font-mono text-primary">${Number(tx.amount ?? tx.fee ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{tx.date}</TableCell>
                      <TableCell className="text-sm">{tx.reference ?? tx.trader ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4" onFocus={loadReferrals}>
          <p className="text-sm text-muted-foreground">
            Community rewards from the 70% referral pool. Allocated automatically when users pay onboarding fees or buy packages (7-level upline: L1 30%, L2 20%, L3 10%, L4 8%, L5 6%, L6 4%, L7 2%). No per-trade fees.
          </p>
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Total Community Rewards</div>
                <div className="text-2xl font-semibold">${referralStats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Active Referrers</div>
                <div className="text-2xl font-semibold">{referralStats.activeReferrers}</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Community Rewards History</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadReferrals}>
                <RefreshCw className="size-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="size-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Purchase type</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No community rewards yet. Rewards are created when users pay onboarding fees or buy packages.
                    </TableCell>
                  </TableRow>
                ) : (
                  referralPayouts.map((payout, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{payout.referrer ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">L{payout.level ?? '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payout.purchaseType ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payout.buyerEmail ?? '—'}</TableCell>
                      <TableCell className="font-mono text-primary">${Number(payout.amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payout.date ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="platform-settings" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings2 className="size-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Platform Fee Configuration</h3>
                <p className="text-sm text-muted-foreground">Adjust performance-based fee percentages for each package (credit-based profit allowance)</p>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Current Fee Structure — aligned with packages: Entry $100, Pro $200, Elite $500 */}
              <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                <h4 className="text-sm font-semibold mb-4 text-primary uppercase tracking-wide">Current Fee Structure</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Entry $100</div>
                    <div className="text-3xl font-bold text-foreground">{starterFee}%</div>
                    <div className="text-xs text-muted-foreground mt-1">On profitable trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Pro $200</div>
                    <div className="text-3xl font-bold text-foreground">{proFee}%</div>
                    <div className="text-xs text-muted-foreground mt-1">On profitable trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Elite $500</div>
                    <div className="text-3xl font-bold text-primary">{unlimitedFee}%</div>
                    <div className="text-xs text-muted-foreground mt-1">On profitable trades</div>
                  </div>
                </div>
              </div>

              {/* Edit Fees */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">Modify Fee Percentages</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="starter-fee">Entry $100 Fee (%)</Label>
                    <Input
                      id="starter-fee"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={starterFee}
                      onChange={(e) => setStarterFee(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Default: 20% (Entry tier)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pro-fee">Pro $200 Fee (%)</Label>
                    <Input
                      id="pro-fee"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={proFee}
                      onChange={(e) => setProFee(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Default: 15% (Pro tier)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unlimited-fee">Elite $500 Fee (%)</Label>
                    <Input
                      id="unlimited-fee"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={unlimitedFee}
                      onChange={(e) => setUnlimitedFee(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Default: 10% (Elite tier)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button 
                    onClick={() => setShowFeeConfirm(true)}
                    className="bg-primary text-background hover:bg-primary/90"
                  >
                    <Save className="size-4 mr-2" />
                    Save Fee Settings
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setStarterFee("20");
                      setProFee("15");
                      setUnlimitedFee("10");
                      toast.info("Reset to default values (Entry 20%, Pro 15%, Elite 10%)");
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-4 bg-[#FFB000]/10 border border-[#FFB000]/50 rounded-lg">
                <div className="flex gap-3">
                  <Percent className="size-5 text-[#FFB000] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-[#FFB000] mb-1">Important Notice</p>
                    <p className="text-muted-foreground">
                      Fee changes apply immediately to all new trades. Existing open positions retain the fee rate that was active when they were opened.
                      All fee changes are logged in the audit trail.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="discounts" className="space-y-6" onFocus={loadCoupons}>
          {/* Create New Coupon */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Ticket className="size-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Create Discount Coupon</h3>
                <p className="text-sm text-muted-foreground">Generate shareable coupon codes for subscription discounts</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-code">Coupon Code *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon-code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g., LAUNCH50"
                      className="font-mono uppercase"
                      maxLength={20}
                    />
                    <Button 
                      variant="outline" 
                      onClick={generateCouponCode}
                      className="shrink-0"
                    >
                      <RefreshCw className="size-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter custom code or auto-generate
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount-percent">Discount Percentage *</Label>
                  <Input
                    id="discount-percent"
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="e.g., 50"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage off subscription (5-100%)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-redemptions">Max Redemptions *</Label>
                  <Input
                    id="max-redemptions"
                    type="number"
                    min="1"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    placeholder="e.g., 100"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many users can claim this coupon
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration-months">Discount Duration (Months) *</Label>
                  <Input
                    id="duration-months"
                    type="number"
                    min="1"
                    max="12"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    placeholder="e.g., 3"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many months the discount applies (1-12)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon-expiry">Coupon Expiry Date (Optional)</Label>
                  <Input
                    id="coupon-expiry"
                    type="date"
                    value={couponExpiry}
                    onChange={(e) => setCouponExpiry(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    When this coupon code stops working (leave empty for no expiry)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon-description">Description *</Label>
                  <Textarea
                    id="coupon-description"
                    value={couponDescription}
                    onChange={(e) => setCouponDescription(e.target.value)}
                    placeholder="e.g., Launch promotion - 50% off first 3 months"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal notes about this coupon campaign
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 mt-4 border-t border-border">
              <Button 
                onClick={handleCreateCoupon}
                className="bg-[#10B981] text-white hover:bg-[#10B981]/90"
              >
                <Ticket className="size-4 mr-2" />
                Create Coupon
              </Button>
              <div className="text-xs text-muted-foreground">
                A shareable URL will be generated automatically
              </div>
            </div>
          </Card>

          {/* Active Coupons */}
          <Card>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Active Coupons</h3>
                <p className="text-sm text-muted-foreground mt-1">{coupons.filter(c => c.status === "Active").length} active coupon codes</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadCoupons}>
                  <RefreshCw className="size-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="size-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            {couponsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading coupons...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No coupons found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {coupon.code}
                    </TableCell>
                    <TableCell className="font-mono text-[#10B981] font-semibold">
                      {coupon.discount}%
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        <span className={coupon.currentRedemptions >= coupon.maxRedemptions ? "text-[#EF4444]" : "text-foreground"}>
                          {coupon.currentRedemptions}
                        </span>
                        <span className="text-muted-foreground">/{coupon.maxRedemptions}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Math.round((coupon.currentRedemptions / coupon.maxRedemptions) * 100)}% used
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon.durationMonths} {coupon.durationMonths === 1 ? "month" : "months"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {coupon.expiresAt === "—" ? (
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          No Expiry
                        </Badge>
                      ) : (
                        coupon.expiresAt
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={coupon.status === "Active" ? "default" : "secondary"}
                        className={coupon.status === "Active" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50" : ""}
                      >
                        {coupon.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {coupon.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyCouponURL(coupon.code)}
                          title="Copy coupon URL"
                        >
                          <Link2 className="size-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-[#EF4444] hover:text-[#EF4444]"
                          onClick={() => {
                            toast.success("Coupon disabled", {
                              description: `${coupon.code} can no longer be redeemed`,
                            });
                          }}
                          title="Disable coupon"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Coupon URL Preview */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Link2 className="size-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Shareable Coupon URLs</h3>
                <p className="text-xs text-muted-foreground">Share these links to auto-apply coupons at checkout</p>
              </div>
            </div>
            <div className="space-y-2">
              {coupons.filter(c => c.status === "Active").slice(0, 3).map((coupon) => (
                <div 
                  key={coupon.id} 
                  className="flex items-center gap-3 p-3 bg-secondary/30 rounded border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-muted-foreground truncate">
                      https://klineo.xyz/subscribe?coupon={coupon.code}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyCouponURL(coupon.code)}
                  >
                    <Copy className="size-4 mr-2" />
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4" onFocus={loadAuditLogs}>
          <Card>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold">Audit Logs</h3>
              <Button variant="outline" size="sm" onClick={loadAuditLogs}>
                <RefreshCw className="size-4 mr-2" />
                Refresh
              </Button>
            </div>
            {auditLogsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No audit logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                        <TableCell className="text-sm">{log.admin}</TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{log.reason}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Fee Changes */}
      <ConfirmationDialog
        open={showFeeConfirm}
        onOpenChange={setShowFeeConfirm}
        title="Update Platform Fee Settings"
        description={`You are about to change platform fees to: Entry $100 ${starterFee}%, Pro $200 ${proFee}%, Elite $500 ${unlimitedFee}%. This will affect all new trades going forward and will be logged in the audit trail.`}
        confirmLabel="Update Fee Settings"
        dangerLevel="warning"
        onConfirm={handleSaveFeeSettings}
      />
    </div>
  );
}