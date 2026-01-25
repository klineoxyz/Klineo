import { useState } from "react";
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
import { toast } from "@/app/lib/toast";
import { copyToClipboard } from "@/app/lib/clipboard";
import { Search, Shield, ChevronLeft, ChevronRight, Download, Filter, Settings2, Percent, Calendar, Save, Copy, Link2, Trash2, RefreshCw, Ticket } from "lucide-react";

const users = [
  { id: "USER-001", email: "user1@example.com", plan: "Pro", status: "Active", joined: "Jan 15, 2026", copiedTraders: 4, totalPnL: 4523.45 },
  { id: "USER-002", email: "user2@example.com", plan: "Starter", status: "Active", joined: "Jan 10, 2026", copiedTraders: 2, totalPnL: 1234.20 },
  { id: "USER-003", email: "user3@example.com", plan: "Unlimited", status: "Suspended", joined: "Dec 28, 2025", copiedTraders: 8, totalPnL: -234.50 },
  { id: "USER-004", email: "trader_pro@example.com", plan: "Pro", status: "Active", joined: "Dec 22, 2025", copiedTraders: 3, totalPnL: 8934.23 },
  { id: "USER-005", email: "crypto_master@example.com", plan: "Unlimited", status: "Active", joined: "Dec 18, 2025", copiedTraders: 12, totalPnL: 15234.89 },
  { id: "USER-006", email: "newbie123@example.com", plan: "Starter", status: "Active", joined: "Jan 20, 2026", copiedTraders: 1, totalPnL: 345.00 },
  { id: "USER-007", email: "alpha_trader@example.com", plan: "Pro", status: "Active", joined: "Dec 5, 2025", copiedTraders: 5, totalPnL: 6782.34 },
  { id: "USER-008", email: "moonshot_investor@example.com", plan: "Unlimited", status: "Active", joined: "Nov 28, 2025", copiedTraders: 15, totalPnL: 23456.78 },
  { id: "USER-009", email: "daytrader_99@example.com", plan: "Starter", status: "Active", joined: "Jan 18, 2026", copiedTraders: 2, totalPnL: 892.45 },
  { id: "USER-010", email: "btc_whale@example.com", plan: "Unlimited", status: "Active", joined: "Oct 15, 2025", copiedTraders: 20, totalPnL: 45678.92 },
  { id: "USER-011", email: "swing_trader@example.com", plan: "Pro", status: "Active", joined: "Jan 5, 2026", copiedTraders: 4, totalPnL: 3456.78 },
  { id: "USER-012", email: "hodler_forever@example.com", plan: "Starter", status: "Active", joined: "Dec 30, 2025", copiedTraders: 1, totalPnL: 567.23 },
  { id: "USER-013", email: "scalper_elite@example.com", plan: "Pro", status: "Suspended", joined: "Nov 20, 2025", copiedTraders: 3, totalPnL: -1234.56 },
  { id: "USER-014", email: "risk_taker@example.com", plan: "Unlimited", status: "Active", joined: "Sep 12, 2025", copiedTraders: 18, totalPnL: 34567.89 },
  { id: "USER-015", email: "conservative_trader@example.com", plan: "Starter", status: "Active", joined: "Jan 22, 2026", copiedTraders: 2, totalPnL: 234.56 },
];

const traders = [
  { name: "ProTrader_XYZ", status: "Approved", followers: 342, roi: 24.3, joined: "Aug 12, 2025", trades: 1245, winRate: 68.5 },
  { name: "AlphaStrategist", status: "Approved", followers: 587, roi: 18.7, joined: "Jul 3, 2025", trades: 2134, winRate: 62.3 },
  { name: "CryptoWhale_Pro", status: "Approved", followers: 892, roi: 32.1, joined: "Jun 15, 2025", trades: 876, winRate: 71.2 },
  { name: "SwingMaster_99", status: "Approved", followers: 445, roi: 15.4, joined: "Sep 8, 2025", trades: 534, winRate: 59.8 },
  { name: "DayTrader_Elite", status: "Approved", followers: 673, roi: 27.8, joined: "Aug 22, 2025", trades: 3421, winRate: 64.7 },
  { name: "NewTrader_ABC", status: "Pending", followers: 0, roi: 0, joined: "Jan 22, 2026", trades: 0, winRate: 0 },
  { name: "Scalper_King", status: "Pending", followers: 0, roi: 0, joined: "Jan 21, 2026", trades: 0, winRate: 0 },
  { name: "Bitcoin_Maximalist", status: "Approved", followers: 1234, roi: 41.2, joined: "May 10, 2025", trades: 432, winRate: 74.3 },
  { name: "AltCoin_Hunter", status: "Approved", followers: 567, roi: 19.6, joined: "Jul 28, 2025", trades: 987, winRate: 61.4 },
  { name: "Risk_Reward_Pro", status: "Pending", followers: 0, roi: 0, joined: "Jan 23, 2026", trades: 0, winRate: 0 },
  { name: "Momentum_Trader", status: "Approved", followers: 789, roi: 22.9, joined: "Aug 3, 2025", trades: 1567, winRate: 66.8 },
  { name: "BreakOut_Specialist", status: "Approved", followers: 412, roi: 16.7, joined: "Sep 18, 2025", trades: 743, winRate: 58.9 },
];

const subscriptionPayments = [
  { userId: "USER-001", email: "user1@example.com", plan: "Pro", amount: 79.00, status: "Paid", date: "Jan 15, 2026", nextRenewal: "Feb 15, 2026", txHash: "0x7f8a2..." },
  { userId: "USER-002", email: "user2@example.com", plan: "Starter", amount: 29.00, status: "Paid", date: "Jan 10, 2026", nextRenewal: "Feb 10, 2026", txHash: "0x3b9f1..." },
  { userId: "USER-004", email: "trader_pro@example.com", plan: "Pro", amount: 426.00, status: "Paid", date: "Dec 22, 2025", nextRenewal: "Jun 22, 2026", txHash: "0x9c4d8..." },
  { userId: "USER-005", email: "crypto_master@example.com", plan: "Unlimited", amount: 1074.00, status: "Paid", date: "Dec 18, 2025", nextRenewal: "Jun 18, 2026", txHash: "0x2e7a3..." },
  { userId: "USER-006", email: "newbie123@example.com", plan: "Starter", amount: 29.00, status: "Paid", date: "Jan 20, 2026", nextRenewal: "Feb 20, 2026", txHash: "0x5f1c9..." },
  { userId: "USER-007", email: "alpha_trader@example.com", plan: "Pro", amount: 79.00, status: "Failed", date: "Jan 5, 2026", nextRenewal: "—", txHash: "—" },
  { userId: "USER-008", email: "moonshot_investor@example.com", plan: "Unlimited", amount: 199.00, status: "Paid", date: "Nov 28, 2025", nextRenewal: "Dec 28, 2025", txHash: "0x8a2f4..." },
  { userId: "USER-009", email: "daytrader_99@example.com", plan: "Starter", amount: 156.00, status: "Paid", date: "Jan 18, 2026", nextRenewal: "Jul 18, 2026", txHash: "0x1d6b8..." },
  { userId: "USER-010", email: "btc_whale@example.com", plan: "Unlimited", amount: 1074.00, status: "Paid", date: "Oct 15, 2025", nextRenewal: "Apr 15, 2026", txHash: "0x4c9e2..." },
  { userId: "USER-011", email: "swing_trader@example.com", plan: "Pro", amount: 79.00, status: "Paid", date: "Jan 5, 2026", nextRenewal: "Feb 5, 2026", txHash: "0x6f8d1..." },
];

const feeTransactions = [
  { userId: "USER-010", trade: "BTC/USDT", profit: 2345.67, fee: 234.57, date: "Jan 23, 2026 14:23", trader: "Bitcoin_Maximalist" },
  { userId: "USER-005", trade: "ETH/USDT", profit: 1523.45, fee: 152.35, date: "Jan 23, 2026 12:15", trader: "CryptoWhale_Pro" },
  { userId: "USER-008", trade: "BTC/USDT", profit: 3421.89, fee: 342.19, date: "Jan 23, 2026 10:42", trader: "Bitcoin_Maximalist" },
  { userId: "USER-001", trade: "ETH/USDT", profit: 892.34, fee: 89.23, date: "Jan 23, 2026 09:18", trader: "AlphaStrategist" },
  { userId: "USER-014", trade: "SOL/USDT", profit: 1678.90, fee: 167.89, date: "Jan 22, 2026 18:32", trader: "AltCoin_Hunter" },
  { userId: "USER-007", trade: "BTC/USDT", profit: 987.65, fee: 98.77, date: "Jan 22, 2026 16:54", trader: "DayTrader_Elite" },
  { userId: "USER-004", trade: "AVAX/USDT", profit: 567.23, fee: 56.72, date: "Jan 22, 2026 14:21", trader: "Momentum_Trader" },
  { userId: "USER-011", trade: "ETH/USDT", profit: 1234.56, fee: 123.46, date: "Jan 22, 2026 11:08", trader: "ProTrader_XYZ" },
  { userId: "USER-002", trade: "BNB/USDT", profit: 432.10, fee: 43.21, date: "Jan 22, 2026 09:45", trader: "SwingMaster_99" },
  { userId: "USER-005", trade: "BTC/USDT", profit: 2789.45, fee: 278.95, date: "Jan 21, 2026 17:23", trader: "Bitcoin_Maximalist" },
];

const referralPayouts = [
  { userId: "USER-004", referrer: "USER-001", tier: "Tier 1", commission: 45.67, status: "Pending", date: "Jan 23, 2026", referralFees: 456.70 },
  { userId: "USER-006", referrer: "USER-004", tier: "Tier 2", commission: 12.34, status: "Pending", date: "Jan 23, 2026", referralFees: 246.80 },
  { userId: "USER-011", referrer: "USER-005", tier: "Tier 1", commission: 67.89, status: "Paid", date: "Jan 22, 2026", referralFees: 678.90 },
  { userId: "USER-009", referrer: "USER-001", tier: "Tier 1", commission: 23.45, status: "Paid", date: "Jan 22, 2026", referralFees: 234.50 },
  { userId: "USER-012", referrer: "USER-007", tier: "Tier 1", commission: 34.56, status: "Pending", date: "Jan 21, 2026", referralFees: 345.60 },
  { userId: "USER-015", referrer: "USER-009", tier: "Tier 2", commission: 8.92, status: "Pending", date: "Jan 21, 2026", referralFees: 178.40 },
  { userId: "USER-007", referrer: "USER-010", tier: "Tier 1", commission: 89.34, status: "Paid", date: "Jan 20, 2026", referralFees: 893.40 },
  { userId: "USER-013", referrer: "USER-005", tier: "Tier 1", commission: 56.78, status: "Failed", date: "Jan 20, 2026", referralFees: 567.80 },
];

const auditLogs = [
  { timestamp: "Jan 23, 2026 14:30", admin: "admin@klineo.xyz", action: "Suspended user USER-003", reason: "ToS violation - Market manipulation" },
  { timestamp: "Jan 23, 2026 11:22", admin: "admin@klineo.xyz", action: "Approved trader Risk_Reward_Pro", reason: "Verification complete" },
  { timestamp: "Jan 22, 2026 16:45", admin: "support@klineo.xyz", action: "Rejected trader NewTrader_ABC", reason: "Insufficient trading history" },
  { timestamp: "Jan 22, 2026 10:15", admin: "admin@klineo.xyz", action: "Manual payout to USER-011", reason: "Referral commission $67.89" },
  { timestamp: "Jan 21, 2026 18:33", admin: "admin@klineo.xyz", action: "Reactivated user USER-013", reason: "Appeal approved" },
  { timestamp: "Jan 21, 2026 14:20", admin: "support@klineo.xyz", action: "Updated subscription USER-007", reason: "Failed payment retry successful" },
  { timestamp: "Jan 20, 2026 09:54", admin: "admin@klineo.xyz", action: "Approved trader Scalper_King", reason: "Verification complete" },
  { timestamp: "Jan 19, 2026 16:12", admin: "admin@klineo.xyz", action: "Suspended user USER-013", reason: "Suspicious trading activity" },
  { timestamp: "Jan 18, 2026 11:45", admin: "support@klineo.xyz", action: "Refund processed USER-006", reason: "Duplicate payment $29.00" },
  { timestamp: "Jan 17, 2026 14:22", admin: "admin@klineo.xyz", action: "Manual fee adjustment USER-010", reason: "Correction applied -$23.45" },
];

// Active coupon codes
const activeCoupons = [
  { 
    id: 1, 
    code: "LAUNCH50", 
    discount: 50, 
    maxRedemptions: 100, 
    currentRedemptions: 73, 
    durationMonths: 3, 
    expiresAt: "Mar 31, 2026", 
    status: "Active",
    createdBy: "admin@klineo.xyz", 
    createdAt: "Jan 1, 2026",
    description: "Launch promotion - 50% off first 3 months" 
  },
  { 
    id: 2, 
    code: "VIP25", 
    discount: 25, 
    maxRedemptions: 50, 
    currentRedemptions: 12, 
    durationMonths: 6, 
    expiresAt: "Dec 31, 2026", 
    status: "Active",
    createdBy: "admin@klineo.xyz", 
    createdAt: "Jan 10, 2026",
    description: "VIP client referrals" 
  },
  { 
    id: 3, 
    code: "EARLY2026", 
    discount: 30, 
    maxRedemptions: 200, 
    currentRedemptions: 200, 
    durationMonths: 1, 
    expiresAt: "Jan 31, 2026", 
    status: "Expired",
    createdBy: "admin@klineo.xyz", 
    createdAt: "Dec 20, 2025",
    description: "Early bird discount - January only" 
  },
  { 
    id: 4, 
    code: "WHALE10", 
    discount: 10, 
    maxRedemptions: 20, 
    currentRedemptions: 8, 
    durationMonths: 12, 
    expiresAt: "Jun 30, 2026", 
    status: "Active",
    createdBy: "admin@klineo.xyz", 
    createdAt: "Jan 15, 2026",
    description: "High-volume trader permanent discount" 
  },
  { 
    id: 5, 
    code: "PARTNER15", 
    discount: 15, 
    maxRedemptions: 500, 
    currentRedemptions: 234, 
    durationMonths: 6, 
    expiresAt: "—", 
    status: "Active",
    createdBy: "admin@klineo.xyz", 
    createdAt: "Dec 1, 2025",
    description: "Partner affiliate program" 
  },
];

export function Admin() {
  // Platform settings state
  const [starterFee, setStarterFee] = useState("20");
  const [proFee, setProFee] = useState("20");
  const [unlimitedFee, setUnlimitedFee] = useState("10");
  const [showFeeConfirm, setShowFeeConfirm] = useState(false);

  // Coupon creation state
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [couponExpiry, setCouponExpiry] = useState("");
  const [couponDescription, setCouponDescription] = useState("");

  const handleSaveFeeSettings = () => {
    setShowFeeConfirm(false);
    toast.success("Platform fees updated", {
      description: `Starter/Pro: ${starterFee}%, Unlimited: ${unlimitedFee}%`,
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

  const handleCreateCoupon = () => {
    if (!couponCode || !discountPercent || !maxRedemptions || !durationMonths) {
      toast.error("Missing required fields", {
        description: "Please fill in code, discount, max uses, and duration",
      });
      return;
    }

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
          <div className="text-2xl font-semibold">1,247</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Traders</div>
          <div className="text-2xl font-semibold">156</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Revenue</div>
          <div className="text-2xl font-semibold">$45,823</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Platform Fees</div>
          <div className="text-2xl font-semibold">$12,456</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Referral Payouts</div>
          <div className="text-2xl font-semibold">$2,134</div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="traders">Traders</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="fees">Fees & Payments</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="platform-settings">Platform Settings</TabsTrigger>
          <TabsTrigger value="discounts">Discount Coupons</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search users by email, ID..." className="pl-9" />
            </div>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell><Badge variant="outline">{user.plan}</Badge></TableCell>
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
                        <Button variant="outline" size="sm" className="text-[#EF4444]">Suspend</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="traders" className="space-y-4">
          <Card className="p-4 flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search traders..." className="pl-9" />
            </div>
            <Badge variant="outline" className="border-primary/50 text-primary">
              3 Pending Approval
            </Badge>
          </Card>

          <Card>
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
                {traders.map((trader, i) => (
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
                          <Button variant="outline" size="sm" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50">
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" className="text-[#EF4444]">Reject</Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm">View</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Starter</div>
              <div className="text-2xl font-semibold">456</div>
              <div className="text-xs text-muted-foreground">Active subscriptions</div>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Pro</div>
              <div className="text-2xl font-semibold">634</div>
              <div className="text-xs text-muted-foreground">Active subscriptions</div>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Unlimited</div>
              <div className="text-2xl font-semibold">157</div>
              <div className="text-xs text-muted-foreground">Active subscriptions</div>
            </Card>
          </div>

          <Card className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <Button variant="outline" size="sm">
              <Download className="size-4 mr-2" />
              Export CSV
            </Button>
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
                {subscriptionPayments.map((payment, i) => (
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
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Platform Fee Summary (This Month)</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Total Fees Collected</div>
                <div className="text-2xl font-semibold text-primary">$12,456.80</div>
              </div>
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Referral Commission Paid</div>
                <div className="text-2xl font-semibold">$2,134.20</div>
              </div>
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Net Platform Revenue</div>
                <div className="text-2xl font-semibold text-[#10B981]">$10,322.60</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Fee Transaction History</h3>
            <Button variant="outline" size="sm">
              <Download className="size-4 mr-2" />
              Export Report
            </Button>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Fee (20%)</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Copied Trader</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeTransactions.map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{tx.userId}</TableCell>
                    <TableCell className="font-mono text-sm">{tx.trade}</TableCell>
                    <TableCell className="font-mono text-[#10B981]">+${tx.profit.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-primary">${tx.fee.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{tx.date}</TableCell>
                    <TableCell className="text-sm">{tx.trader}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Referral Payout Queue</h3>
              <div className="text-sm text-muted-foreground">
                4 pending payout requests totaling $101.49
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Total Commissions Paid</div>
                <div className="text-2xl font-semibold">$2,134.20</div>
              </div>
              <div className="p-4 bg-secondary/30 rounded">
                <div className="text-sm text-muted-foreground mb-1">Active Referrers</div>
                <div className="text-2xl font-semibold">47</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Commission History</h3>
            <Button variant="outline" size="sm">
              <Download className="size-4 mr-2" />
              Export CSV
            </Button>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred User</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Referral Fees</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralPayouts.map((payout, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{payout.userId}</TableCell>
                    <TableCell className="font-mono text-xs">{payout.referrer}</TableCell>
                    <TableCell>
                      <Badge variant={payout.tier === "Tier 1" ? "default" : "secondary"}>
                        {payout.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">${payout.referralFees.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-primary">${payout.commission.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={payout.status === "Paid" ? "default" : payout.status === "Pending" ? "secondary" : "destructive"}
                        className={payout.status === "Paid" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50" : ""}
                      >
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{payout.date}</TableCell>
                    <TableCell className="text-right">
                      {payout.status === "Pending" && (
                        <Button variant="outline" size="sm" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50">
                          Process
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
                <p className="text-sm text-muted-foreground">Adjust performance-based fee percentages for each subscription tier</p>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Current Fee Structure */}
              <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                <h4 className="text-sm font-semibold mb-4 text-primary uppercase tracking-wide">Current Fee Structure</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Starter Plan</div>
                    <div className="text-3xl font-bold text-foreground">{starterFee}%</div>
                    <div className="text-xs text-muted-foreground mt-1">On profitable trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Pro Plan</div>
                    <div className="text-3xl font-bold text-foreground">{proFee}%</div>
                    <div className="text-xs text-muted-foreground mt-1">On profitable trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Unlimited Plan</div>
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
                    <Label htmlFor="starter-fee">Starter Plan Fee (%)</Label>
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
                    <p className="text-xs text-muted-foreground">Default: 20%</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pro-fee">Pro Plan Fee (%)</Label>
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
                    <p className="text-xs text-muted-foreground">Default: 20%</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unlimited-fee">Unlimited Plan Fee (%)</Label>
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
                    <p className="text-xs text-muted-foreground">Default: 10%</p>
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
                      setProFee("20");
                      setUnlimitedFee("10");
                      toast.info("Reset to default values");
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

        <TabsContent value="discounts" className="space-y-6">
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
                <p className="text-sm text-muted-foreground mt-1">{activeCoupons.filter(c => c.status === "Active").length} active coupon codes</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="size-4 mr-2" />
                Export CSV
              </Button>
            </div>
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
                {activeCoupons.map((coupon) => (
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
                ))}
              </TableBody>
            </Table>
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
              {activeCoupons.filter(c => c.status === "Active").slice(0, 3).map((coupon) => (
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

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Audit Logs</h3>
            </div>
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
                {auditLogs.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                    <TableCell className="text-sm">{log.admin}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{log.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Fee Changes */}
      <ConfirmationDialog
        open={showFeeConfirm}
        onOpenChange={setShowFeeConfirm}
        title="Update Platform Fee Settings"
        description={`You are about to change platform fees to: Starter ${starterFee}%, Pro ${proFee}%, Unlimited ${unlimitedFee}%. This will affect all new trades going forward and will be logged in the audit trail.`}
        confirmLabel="Update Fee Settings"
        dangerLevel="warning"
        onConfirm={handleSaveFeeSettings}
      />
    </div>
  );
}