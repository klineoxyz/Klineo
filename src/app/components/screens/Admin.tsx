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
import { AdminFinancialRatios } from "@/app/components/screens/AdminFinancialRatios";

/** Download array of objects as CSV (client-side). */
function downloadCSV(rows: Record<string, unknown>[], columns: { key: string; header: string }[], filename: string) {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => c.header).join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(",")).join("\n");
  const csv = "\uFEFF" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Platform Admin Panel — for users with role=admin only.
 * Contains all admin-only sections: Users, Traders, Subscriptions, Revenue & Payments,
 * Referrals, Platform Settings, Payments (intents), Discount Coupons, Financial Ratios,
 * Runner, Audit Logs. User-facing "my overview" and profile stats are in Settings.
 */
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
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [payoutRequestsLoading, setPayoutRequestsLoading] = useState(false);
  const [payoutRequestMarkPaid, setPayoutRequestMarkPaid] = useState<{ id: string; userEmail: string; amount: number } | null>(null);
  const [payoutRequestMarkPaidTxId, setPayoutRequestMarkPaidTxId] = useState("");
  const [payoutRequestMarkPaidLoading, setPayoutRequestMarkPaidLoading] = useState(false);
  const [payoutRequestReject, setPayoutRequestReject] = useState<{ id: string; userEmail: string; amount: number } | null>(null);
  const [payoutRequestRejectReason, setPayoutRequestRejectReason] = useState("");
  const [payoutRequestRejectLoading, setPayoutRequestRejectLoading] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponSearchCode, setCouponSearchCode] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [paymentIntents, setPaymentIntents] = useState<any[]>([]);
  const [paymentIntentsLoading, setPaymentIntentsLoading] = useState(false);
  const [paymentIntentsStatus, setPaymentIntentsStatus] = useState<string>("all");
  const [paymentIntentsFeatureDisabled, setPaymentIntentsFeatureDisabled] = useState(false);
  const [adminTab, setAdminTab] = useState<string>("users");
  const [paymentIntentActionNote, setPaymentIntentActionNote] = useState("");
  const [paymentIntentActionLoading, setPaymentIntentActionLoading] = useState(false);

  // Runner (admin)
  const [runnerStatus, setRunnerStatus] = useState<{ activeStrategies: number; lastRunAt: string | null; lastRunStatus: string | null; blockedUsersCount: number; lastBlockedReasons?: string[] } | null>(null);
  const [runnerStatusLoading, setRunnerStatusLoading] = useState(false);
  const [runnerCronLoading, setRunnerCronLoading] = useState(false);
  const [tickRuns, setTickRuns] = useState<Array<{ id: string; strategy_run_id: string; started_at: string; status: string; reason: string | null; latency_ms: number | null }>>([]);

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
  const [couponScope, setCouponScope] = useState<"OB" | "100" | "200" | "500">("OB");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [couponExpiry, setCouponExpiry] = useState("");
  const [couponDescription, setCouponDescription] = useState("");

  // User-specific discounts
  const [userDiscounts, setUserDiscounts] = useState<any[]>([]);
  const [userDiscountsLoading, setUserDiscountsLoading] = useState(false);
  const [userDiscountUserId, setUserDiscountUserId] = useState("");
  const [userDiscountScope, setUserDiscountScope] = useState<"onboarding" | "trading_packages">("onboarding");
  const [userDiscountOnboardingPercent, setUserDiscountOnboardingPercent] = useState("");
  const [userDiscountOnboardingFixed, setUserDiscountOnboardingFixed] = useState("");
  const [userDiscountTradingPercent, setUserDiscountTradingPercent] = useState("");
  const [userDiscountTradingPackages, setUserDiscountTradingPackages] = useState<string[]>([]);
  const [userDiscountTradingMax, setUserDiscountTradingMax] = useState("");
  const [userDiscountEditId, setUserDiscountEditId] = useState<string | null>(null);
  const [masterTraderDiscountUserId, setMasterTraderDiscountUserId] = useState("");
  const [masterTraderDiscountDuration, setMasterTraderDiscountDuration] = useState<"6mo" | "1yr" | "lifetime">("1yr");
  const [masterTraderDiscountLoading, setMasterTraderDiscountLoading] = useState(false);

  // Mark referral payout as paid
  const [markPaidPayout, setMarkPaidPayout] = useState<{ id: string; referrer: string; amount: number } | null>(null);
  const [markPaidTransactionId, setMarkPaidTransactionId] = useState("");
  const [markPaidLoading, setMarkPaidLoading] = useState(false);

  // Master Trader applications
  const [masterTraderApplications, setMasterTraderApplications] = useState<any[]>([]);
  const [masterTraderApplicationsLoading, setMasterTraderApplicationsLoading] = useState(false);
  const [masterTraderReviewApp, setMasterTraderReviewApp] = useState<{ id: string; userEmail: string; formData?: Record<string, unknown>; proofUrl?: string | null } | null>(null);
  const [masterTraderReviewStatus, setMasterTraderReviewStatus] = useState<"approved" | "rejected">("approved");
  const [masterTraderReviewMessage, setMasterTraderReviewMessage] = useState("");
  const [masterTraderReviewLoading, setMasterTraderReviewLoading] = useState(false);

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

  const loadMasterTraderApplications = async (status?: string) => {
    setMasterTraderApplicationsLoading(true);
    try {
      const params = status ? `?status=${status}` : "";
      const data = await api.get(`/api/admin/master-trader-applications${params}`);
      setMasterTraderApplications((data as any).applications || []);
    } catch (err: any) {
      console.error('Failed to load Master Trader applications:', err);
      toast.error('Failed to load applications');
    } finally {
      setMasterTraderApplicationsLoading(false);
    }
  };

  const handleMasterTraderReview = async () => {
    if (!masterTraderReviewApp) return;
    setMasterTraderReviewLoading(true);
    try {
      await api.patch(`/api/admin/master-trader-applications/${masterTraderReviewApp.id}`, {
        status: masterTraderReviewStatus,
        message: masterTraderReviewMessage || undefined,
      });
      toast.success(masterTraderReviewStatus === "approved" ? "Application approved" : "Application rejected");
      setMasterTraderReviewApp(null);
      setMasterTraderReviewMessage("");
      loadMasterTraderApplications();
    } catch (err: any) {
      toast.error("Failed to update", { description: err?.message });
    } finally {
      setMasterTraderReviewLoading(false);
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

  const loadPayoutRequests = async () => {
    setPayoutRequestsLoading(true);
    try {
      const data = await api.get('/api/admin/payout-requests');
      setPayoutRequests((data as any).payoutRequests || []);
    } catch (err: any) {
      console.error('Failed to load payout requests:', err);
      toast.error('Failed to load payout requests');
    } finally {
      setPayoutRequestsLoading(false);
    }
  };

  const handlePayoutRequestApprove = async (id: string) => {
    try {
      await api.put(`/api/referrals/payout-requests/${id}/approve`);
      toast.success('Payout request approved');
      loadPayoutRequests();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve');
    }
  };

  const handlePayoutRequestReject = async () => {
    if (!payoutRequestReject) return;
    setPayoutRequestRejectLoading(true);
    try {
      await api.put(`/api/referrals/payout-requests/${payoutRequestReject.id}/reject`, { reason: payoutRequestRejectReason || undefined });
      toast.success('Payout request rejected');
      setPayoutRequestReject(null);
      setPayoutRequestRejectReason('');
      loadPayoutRequests();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject');
    } finally {
      setPayoutRequestRejectLoading(false);
    }
  };

  const handlePayoutRequestMarkPaid = async () => {
    if (!payoutRequestMarkPaid) return;
    setPayoutRequestMarkPaidLoading(true);
    try {
      await api.put(`/api/referrals/payout-requests/${payoutRequestMarkPaid.id}/mark-paid`, { payoutTxId: payoutRequestMarkPaidTxId.trim() || undefined });
      toast.success('Payout marked as paid');
      setPayoutRequestMarkPaid(null);
      setPayoutRequestMarkPaidTxId('');
      loadPayoutRequests();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark paid');
    } finally {
      setPayoutRequestMarkPaidLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!markPaidPayout) return;
    setMarkPaidLoading(true);
    try {
      await api.patch(`/api/admin/referrals/${markPaidPayout.id}/mark-paid`, {
        transactionId: markPaidTransactionId.trim() || undefined,
      });
      toast.success('Payout marked as paid');
      setMarkPaidPayout(null);
      setMarkPaidTransactionId("");
      loadReferrals();
    } catch (err: any) {
      console.error('Mark paid error:', err);
      toast.error(err?.message || 'Failed to mark payout as paid');
    } finally {
      setMarkPaidLoading(false);
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

  const loadRunnerStatus = async () => {
    setRunnerStatusLoading(true);
    try {
      const res = await api.get<{ activeStrategies?: number; lastRunAt?: string | null; lastRunStatus?: string | null; blockedUsersCount?: number; lastBlockedReasons?: string[] }>('/api/runner/status');
      setRunnerStatus({
        activeStrategies: res?.activeStrategies ?? 0,
        lastRunAt: res?.lastRunAt ?? null,
        lastRunStatus: res?.lastRunStatus ?? null,
        blockedUsersCount: res?.blockedUsersCount ?? 0,
        lastBlockedReasons: res?.lastBlockedReasons,
      });
    } catch {
      setRunnerStatus(null);
    } finally {
      setRunnerStatusLoading(false);
    }
  };

  const loadTickRuns = async () => {
    try {
      const res = await api.get<{ tickRuns?: Array<{ id: string; strategy_run_id: string; started_at: string; status: string; reason: string | null; latency_ms: number | null }> }>('/api/runner/tick-runs?limit=20');
      setTickRuns(res?.tickRuns ?? []);
    } catch {
      setTickRuns([]);
    }
  };

  const loadUserDiscounts = async () => {
    setUserDiscountsLoading(true);
    try {
      const data = await api.get('/api/admin/user-discounts');
      setUserDiscounts((data as any).userDiscounts || []);
    } catch (err: any) {
      console.error('Failed to load user discounts:', err);
      toast.error('Failed to load user discounts');
    } finally {
      setUserDiscountsLoading(false);
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

  const loadPaymentIntents = async () => {
    setPaymentIntentsLoading(true);
    setPaymentIntentsFeatureDisabled(false);
    try {
      const params = new URLSearchParams();
      if (paymentIntentsStatus && paymentIntentsStatus !== "all") params.set("status", paymentIntentsStatus);
      const data = await api.get(`/api/admin/payments/intents?${params.toString()}`) as { intents?: any[]; featureDisabled?: boolean };
      setPaymentIntents(data?.intents ?? []);
      if (data?.featureDisabled === true) setPaymentIntentsFeatureDisabled(true);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const isDisabled =
        msg.includes("503") ||
        msg.includes("404") ||
        msg.includes("ENABLE_MANUAL_PAYMENTS") ||
        msg.includes("Payment intents feature is disabled") ||
        msg.includes("Not found") ||
        msg.toLowerCase().includes("not found");
      if (isDisabled) {
        setPaymentIntents([]);
        setPaymentIntentsFeatureDisabled(true);
      } else {
        toast.error("Failed to load payment intents");
      }
    } finally {
      setPaymentIntentsLoading(false);
    }
  };

  const handleApproveIntent = async (id: string) => {
    setPaymentIntentActionLoading(true);
    try {
      await api.post(`/api/admin/payments/intents/${id}/approve`, { note: paymentIntentActionNote || undefined });
      toast.success('Intent approved');
      setPaymentIntentActionNote('');
      loadPaymentIntents();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve');
    } finally {
      setPaymentIntentActionLoading(false);
    }
  };

  const handleRejectIntent = async (id: string) => {
    setPaymentIntentActionLoading(true);
    try {
      await api.post(`/api/admin/payments/intents/${id}/reject`, { note: paymentIntentActionNote || undefined });
      toast.success('Intent rejected');
      setPaymentIntentActionNote('');
      loadPaymentIntents();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject');
    } finally {
      setPaymentIntentActionLoading(false);
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

  const loadPlatformSettings = async () => {
    try {
      const data = await api.get<{ feeEntryPct?: string; feeProPct?: string; feeElitePct?: string }>('/api/admin/settings');
      if (data?.feeEntryPct != null) setStarterFee(String(data.feeEntryPct));
      if (data?.feeProPct != null) setProFee(String(data.feeProPct));
      if (data?.feeElitePct != null) setUnlimitedFee(String(data.feeElitePct));
    } catch {
      // 503 or no table: keep current state
    }
  };

  const handleSaveFeeSettings = async () => {
    setShowFeeConfirm(false);
    try {
      await api.put('/api/admin/settings', {
        feeEntryPct: parseFloat(starterFee) || 20,
        feeProPct: parseFloat(proFee) || 15,
        feeElitePct: parseFloat(unlimitedFee) || 10,
      });
      toast.success("Platform fees updated", {
        description: `Entry: ${starterFee}%, Pro: ${proFee}%, Elite: ${unlimitedFee}%`,
      });
    } catch (err: any) {
      toast.error("Failed to save fee settings", { description: err?.message });
    }
  };

  const generateCouponCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    for (let i = 0; i < 8; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = couponScope + suffix;
    setCouponCode(code);
    toast.info("Preview", { description: code });
  };

  const handleCreateCoupon = async () => {
    if (!discountPercent || !durationMonths) {
      toast.error("Missing required fields", {
        description: "Please fill in discount and duration (code is optional and will be auto-generated if empty)",
      });
      return;
    }

    try {
      const res = await api.post<{ coupon: { code: string } }>('/api/admin/coupons', {
        code: couponCode.trim() || undefined,
        discount: parseFloat(discountPercent),
        couponScope,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : undefined,
        durationMonths: parseInt(durationMonths, 10),
        expiresAt: couponExpiry || undefined,
        description: couponDescription || '',
      });
      const createdCode = (res as any)?.coupon?.code ?? couponCode;
      toast.success("Coupon created successfully", {
        description: createdCode ? `${createdCode} — ${discountPercent}% off (${couponScope}) for ${durationMonths} months` : `${discountPercent}% off for ${durationMonths} months`,
      });
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

  const handleCouponStatus = async (couponId: string, status: "active" | "disabled") => {
    try {
      await api.patch(`/api/admin/coupons/${couponId}`, { status });
      toast.success(status === "disabled" ? "Coupon disabled" : "Coupon re-enabled");
      loadCoupons();
    } catch (err: any) {
      toast.error("Failed to update coupon");
    }
  };

  const PACKAGE_OPTIONS = [
    { id: "entry_100", label: "Entry $100" },
    { id: "pro_200", label: "Pro $200" },
    { id: "elite_500", label: "Elite $500" },
  ];

  const handleCreateMasterTraderDiscount = async () => {
    if (!masterTraderDiscountUserId) {
      toast.error("Select a user");
      return;
    }
    setMasterTraderDiscountLoading(true);
    try {
      await api.post("/api/admin/user-discounts", {
        userId: masterTraderDiscountUserId,
        scope: "onboarding",
        onboardingDiscountPercent: 100,
      });
      await api.post("/api/admin/user-discounts", {
        userId: masterTraderDiscountUserId,
        scope: "trading_packages",
        tradingDiscountPercent: 100,
        tradingMaxPackages: masterTraderDiscountDuration === "lifetime" ? undefined : masterTraderDiscountDuration === "6mo" ? 2 : 4,
      });
      const durationLabel = masterTraderDiscountDuration === "6mo" ? "6 months" : masterTraderDiscountDuration === "1yr" ? "1 year" : "lifetime";
      toast.success("Master Trader discount created", {
        description: `100% onboarding + 100% packages (${durationLabel}). Share claim links from the list below.`,
      });
      setMasterTraderDiscountUserId("");
      loadUserDiscounts();
    } catch (err: any) {
      toast.error("Failed to create Master Trader discount", { description: err?.message });
    } finally {
      setMasterTraderDiscountLoading(false);
    }
  };

  const handleCreateUserDiscount = async () => {
    if (!userDiscountUserId) {
      toast.error("Select a user");
      return;
    }
    if (userDiscountScope === "onboarding" && !userDiscountOnboardingPercent && !userDiscountOnboardingFixed) {
      toast.error("Enter onboarding discount (% or fixed $)");
      return;
    }
    if (userDiscountScope === "trading_packages" && (!userDiscountTradingPercent || !userDiscountTradingMax)) {
      toast.error("Enter trading discount % and max packages");
      return;
    }
    try {
      const res = await api.post<{ userDiscount: { code: string; scope: string } }>("/api/admin/user-discounts", {
        userId: userDiscountUserId,
        scope: userDiscountScope,
        onboardingDiscountPercent: userDiscountScope === "onboarding" && userDiscountOnboardingPercent ? parseFloat(userDiscountOnboardingPercent) : undefined,
        onboardingDiscountFixedUsd: userDiscountScope === "onboarding" && userDiscountOnboardingFixed ? parseFloat(userDiscountOnboardingFixed) : undefined,
        tradingDiscountPercent: userDiscountScope === "trading_packages" && userDiscountTradingPercent ? parseFloat(userDiscountTradingPercent) : undefined,
        tradingPackageIds: userDiscountScope === "trading_packages" && userDiscountTradingPackages.length > 0 ? userDiscountTradingPackages : undefined,
        tradingMaxPackages: userDiscountScope === "trading_packages" && userDiscountTradingMax ? parseInt(userDiscountTradingMax, 10) : undefined,
      });
      const ud = (res as any)?.userDiscount;
      const code = ud?.code;
      const baseUrl = window.location.origin.replace(/\/$/, "");
      const claimUrl = code
        ? (ud?.scope === "onboarding" ? `${baseUrl}/payments?coupon=${code}` : `${baseUrl}/packages?coupon=${code}`)
        : null;
      toast.success("User discount created", {
        description: code
          ? `Code: ${code}. ${claimUrl ? `Claim link: ${claimUrl}` : ""} User will receive a notification with the code and link.`
          : "User will receive a notification.",
      });
      setUserDiscountUserId("");
      setUserDiscountScope("onboarding");
      setUserDiscountOnboardingPercent("");
      setUserDiscountOnboardingFixed("");
      setUserDiscountTradingPercent("");
      setUserDiscountTradingPackages([]);
      setUserDiscountTradingMax("");
      loadUserDiscounts();
    } catch (err: any) {
      toast.error("Failed to create user discount", { description: err.message });
    }
  };

  const handleUserDiscountStatus = async (id: string, status: "active" | "paused" | "revoked") => {
    try {
      await api.patch(`/api/admin/user-discounts/${id}`, { status });
      toast.success(status === "revoked" ? "Discount revoked" : status === "paused" ? "Discount paused" : "Discount re-enabled");
      loadUserDiscounts();
    } catch (err: any) {
      toast.error("Failed to update user discount");
    }
  };

  const handleRevokeUserDiscount = async (id: string) => {
    try {
      await api.delete(`/api/admin/user-discounts/${id}`);
      toast.success("User discount revoked");
      loadUserDiscounts();
    } catch (err: any) {
      toast.error("Failed to revoke user discount");
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

  const copyCouponURL = (code: string, appliesTo?: string) => {
    const base = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "https://www.klineo.xyz";
    const path = appliesTo === "onboarding" ? "/payments" : "/packages";
    const url = `${base}${path}?coupon=${code}`;
    copyToClipboard(url);
    toast.success("Coupon URL copied", { description: `${code} → ${path}` });
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

      {/* Main Tabs — controlled so Payments panel shows when selected */}
      <Tabs
        value={adminTab}
        onValueChange={(v) => {
          setAdminTab(v);
          if (v === "payments") loadPaymentIntents();
          if (v === "master-trader-requests") loadMasterTraderApplications();
          if (v === "discounts") {
            loadCoupons();
            loadUserDiscounts();
            loadUsers(1, "");
          }
        }}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="traders">Traders</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="fees">Revenue & Payments</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="platform-settings">Platform Settings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="master-trader-requests">Master Trader Requests</TabsTrigger>
          <TabsTrigger value="discounts">Discount Coupons</TabsTrigger>
          <TabsTrigger value="financial-ratios">Financial Ratios</TabsTrigger>
          <TabsTrigger value="runner">Runner</TabsTrigger>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(
                    subscriptionPayments,
                    [
                      { key: "userId", header: "User ID" },
                      { key: "email", header: "Email" },
                      { key: "plan", header: "Plan" },
                      { key: "amount", header: "Amount" },
                      { key: "status", header: "Status" },
                      { key: "date", header: "Payment Date" },
                      { key: "nextRenewal", header: "Next Renewal" },
                      { key: "txHash", header: "Tx Hash" },
                    ],
                    "subscriptions.csv"
                  )
                }
              >
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
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(
                    feeTransactions,
                    [
                      { key: "userId", header: "User ID" },
                      { key: "trade", header: "Type" },
                      { key: "profit", header: "Description" },
                      { key: "fee", header: "Amount" },
                      { key: "date", header: "Timestamp" },
                      { key: "trader", header: "Reference" },
                    ],
                    "revenue-report.csv"
                  )
                }
              >
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

        <TabsContent value="referrals" className="space-y-4" onFocus={() => { loadReferrals(); loadPayoutRequests(); }}>
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

          {/* Payout Requests (user-requested): process here — Approve → Mark paid with tx hash */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Payout Requests (user-requested)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              When a user requests a payout on Community Rewards, it appears here. Approve the request, then send USDT to their wallet and mark as paid with the transaction hash.
            </p>
            {payoutRequestsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading payout requests…</div>
            ) : payoutRequests.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No payout requests yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Payout wallet</TableHead>
                    <TableHead>Tx hash</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutRequests.map((pr: any) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">{pr.userEmail ?? '—'}</TableCell>
                      <TableCell className="font-mono text-primary">${Number(pr.amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={pr.status === 'PAID' ? 'default' : pr.status === 'REJECTED' ? 'destructive' : 'secondary'}
                          className={pr.status === 'PAID' ? 'bg-[#10B981]/10 text-[#10B981]' : pr.status === 'REJECTED' ? '' : ''}
                        >
                          {pr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[160px] truncate" title={pr.payoutWalletAddress ?? undefined}>
                        {pr.payoutWalletAddress ? `${pr.payoutWalletAddress.slice(0, 6)}…${pr.payoutWalletAddress.slice(-4)}` : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate" title={pr.payoutTxId ?? undefined}>
                        {pr.payoutTxId ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {pr.status === 'PENDING' && (
                            <>
                              <Button variant="outline" size="sm" className="text-[#10B981] border-[#10B981]/50" onClick={() => handlePayoutRequestApprove(pr.id)}>
                                Approve
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setPayoutRequestReject({ id: pr.id, userEmail: pr.userEmail, amount: pr.amount }); setPayoutRequestRejectReason(''); }}>
                                Reject
                              </Button>
                            </>
                          )}
                          {pr.status === 'APPROVED' && (
                            <Button variant="outline" size="sm" className="text-primary border-primary/50" onClick={() => { setPayoutRequestMarkPaid({ id: pr.id, userEmail: pr.userEmail, amount: pr.amount }); setPayoutRequestMarkPaidTxId(''); }}>
                              <Banknote className="size-3.5 mr-1" /> Mark paid
                            </Button>
                          )}
                          {(pr.status === 'PAID' || pr.status === 'REJECTED') && '—'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Community Rewards History</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadReferrals}>
                <RefreshCw className="size-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(
                    referralPayouts,
                    [
                      { key: "referrer", header: "Referrer" },
                      { key: "buyerEmail", header: "Referred" },
                      { key: "level", header: "Level" },
                      { key: "purchaseType", header: "Purchase type" },
                      { key: "amount", header: "Amount earned" },
                      { key: "date", header: "Date" },
                      { key: "payoutStatus", header: "Status" },
                      { key: "transactionId", header: "Transaction" },
                    ],
                    "referrals.csv"
                  )
                }
              >
                <Download className="size-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </Card>

          <Card>
            <p className="text-xs text-muted-foreground px-4 pt-4 pb-1">
              For each reward you can set paid status and, when paid, add the transaction ID (e.g. tx hash) of the sent amount.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer (earner)</TableHead>
                  <TableHead>Referred (buyer)</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Purchase type</TableHead>
                  <TableHead>Amount earned</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      <span className="block">No community rewards yet.</span>
                      <span className="block text-xs mt-1">Rewards are created when users pay onboarding fees or buy packages. When they appear here, use &quot;Mark paid&quot; and enter the transaction ID of the sent amount.</span>
                    </TableCell>
                  </TableRow>
                ) : (
                  referralPayouts.map((payout, i) => (
                    <TableRow key={payout.id ?? i}>
                      <TableCell className="text-sm font-medium">{payout.referrer ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payout.buyerEmail ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">L{payout.level ?? '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payout.purchaseType ?? '—'}</TableCell>
                      <TableCell className="font-mono text-primary">${Number(payout.amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payout.date ?? '—'}</TableCell>
                      <TableCell>
                        {(payout as any).payoutStatus === 'paid' ? (
                          <Badge className="bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30">
                            <CheckCircle className="size-3 mr-1 inline" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground max-w-[140px] truncate" title={(payout as any).transactionId ?? undefined}>
                        {(payout as any).transactionId ?? '—'}
                      </TableCell>
                      <TableCell>
                        {(payout as any).payoutStatus === 'pending' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary/50"
                            onClick={() => {
                              setMarkPaidPayout({ id: (payout as any).id, referrer: payout.referrer ?? '', amount: payout.amount ?? 0 });
                              setMarkPaidTransactionId("");
                            }}
                          >
                            <Banknote className="size-3.5 mr-1" /> Mark paid
                          </Button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Mark payout as paid — enter transaction ID (e.g. tx hash) */}
          <Dialog open={!!markPaidPayout} onOpenChange={(open) => !open && setMarkPaidPayout(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Mark payout as paid</DialogTitle>
              </DialogHeader>
              {markPaidPayout && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Referrer <span className="font-medium text-foreground">{markPaidPayout.referrer}</span> — amount <span className="font-mono text-primary">${markPaidPayout.amount.toFixed(2)}</span>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="mark-paid-tx">Transaction ID (optional)</Label>
                    <Input
                      id="mark-paid-tx"
                      placeholder="e.g. tx hash or payment reference"
                      value={markPaidTransactionId}
                      onChange={(e) => setMarkPaidTransactionId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setMarkPaidPayout(null)} disabled={markPaidLoading}>
                  Cancel
                </Button>
                <Button onClick={handleMarkPaid} disabled={markPaidLoading}>
                  {markPaidLoading ? 'Saving…' : 'Mark paid'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Payout request: Mark paid (with tx hash) */}
          <Dialog open={!!payoutRequestMarkPaid} onOpenChange={(open) => !open && setPayoutRequestMarkPaid(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Mark payout as paid</DialogTitle>
              </DialogHeader>
              {payoutRequestMarkPaid && (
                <>
                  <p className="text-sm text-muted-foreground">
                    User <span className="font-medium text-foreground">{payoutRequestMarkPaid.userEmail}</span> — amount <span className="font-mono text-primary">${payoutRequestMarkPaid.amount.toFixed(2)}</span>. After sending USDT to their payout wallet, enter the transaction hash below.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="payout-request-tx">Transaction hash (optional)</Label>
                    <Input
                      id="payout-request-tx"
                      placeholder="e.g. BSC tx hash"
                      value={payoutRequestMarkPaidTxId}
                      onChange={(e) => setPayoutRequestMarkPaidTxId(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayoutRequestMarkPaid(null)} disabled={payoutRequestMarkPaidLoading}>
                  Cancel
                </Button>
                <Button onClick={handlePayoutRequestMarkPaid} disabled={payoutRequestMarkPaidLoading}>
                  {payoutRequestMarkPaidLoading ? 'Saving…' : 'Mark paid'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Payout request: Reject */}
          <Dialog open={!!payoutRequestReject} onOpenChange={(open) => !open && setPayoutRequestReject(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reject payout request</DialogTitle>
              </DialogHeader>
              {payoutRequestReject && (
                <>
                  <p className="text-sm text-muted-foreground">
                    User <span className="font-medium text-foreground">{payoutRequestReject.userEmail}</span> — amount <span className="font-mono text-primary">${payoutRequestReject.amount.toFixed(2)}</span>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="payout-reject-reason">Reason (optional)</Label>
                    <Input
                      id="payout-reject-reason"
                      placeholder="e.g. Invalid wallet"
                      value={payoutRequestRejectReason}
                      onChange={(e) => setPayoutRequestRejectReason(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayoutRequestReject(null)} disabled={payoutRequestRejectLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handlePayoutRequestReject} disabled={payoutRequestRejectLoading}>
                  {payoutRequestRejectLoading ? 'Rejecting…' : 'Reject'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="platform-settings" className="space-y-6" onFocus={loadPlatformSettings}>
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

        <TabsContent value="master-trader-requests" className="space-y-6" onFocus={() => loadMasterTraderApplications()}>
          <Card>
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold">Master Trader Applications</h3>
              <p className="text-sm text-muted-foreground">Review and approve or reject applications. Qualified Master Traders get 6 months – 1 year free (configurable via discounts later).</p>
            </div>
            {masterTraderApplicationsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading applications...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Exchange / Experience</TableHead>
                    <TableHead>Package Benefit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterTraderApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No Master Trader applications yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    masterTraderApplications.map((app: any) => {
                      const fd = app.formData || {};
                      return (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.userEmail}</TableCell>
                          <TableCell>{fd.fullName || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {fd.primaryExchange || "—"} / {fd.yearsExperience != null ? `${fd.yearsExperience} yrs` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            6 mo – 1 yr free
                          </TableCell>
                          <TableCell>
                            <Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {app.status === "pending" && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[#10B981] border-[#10B981]/50"
                                  onClick={() => {
                                    setMasterTraderReviewApp({ id: app.id, userEmail: app.userEmail, formData: app.formData, proofUrl: app.proofUrl });
                                    setMasterTraderReviewStatus("approved");
                                    setMasterTraderReviewMessage("");
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[#EF4444] border-[#EF4444]/50"
                                  onClick={() => {
                                    setMasterTraderReviewApp({ id: app.id, userEmail: app.userEmail, formData: app.formData, proofUrl: app.proofUrl });
                                    setMasterTraderReviewStatus("rejected");
                                    setMasterTraderReviewMessage("");
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </Card>

          <Dialog open={!!masterTraderReviewApp} onOpenChange={(open) => !open && setMasterTraderReviewApp(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{masterTraderReviewStatus === "approved" ? "Approve" : "Reject"} Application</DialogTitle>
              </DialogHeader>
              {masterTraderReviewApp && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">User: {masterTraderReviewApp.userEmail}</p>

                  {masterTraderReviewApp.formData && Object.keys(masterTraderReviewApp.formData).length > 0 && (
                    <div className="rounded border border-border p-4 space-y-2 bg-muted/30">
                      <h4 className="text-sm font-semibold">Application details</h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {masterTraderReviewApp.formData.fullName != null && <><dt className="text-muted-foreground">Name</dt><dd>{(masterTraderReviewApp.formData.fullName as string)}</dd></>}
                        {masterTraderReviewApp.formData.country != null && <><dt className="text-muted-foreground">Country</dt><dd>{(masterTraderReviewApp.formData.country as string)}</dd></>}
                        {masterTraderReviewApp.formData.telegram != null && <><dt className="text-muted-foreground">Telegram</dt><dd>{(masterTraderReviewApp.formData.telegram as string)}</dd></>}
                        {masterTraderReviewApp.formData.primaryExchange != null && <><dt className="text-muted-foreground">Exchange</dt><dd>{(masterTraderReviewApp.formData.primaryExchange as string)}</dd></>}
                        {masterTraderReviewApp.formData.yearsExperience != null && <><dt className="text-muted-foreground">Experience</dt><dd>{(masterTraderReviewApp.formData.yearsExperience as number)} yrs</dd></>}
                        {masterTraderReviewApp.formData.tradingStyle != null && <><dt className="text-muted-foreground">Trading style</dt><dd>{(masterTraderReviewApp.formData.tradingStyle as string)}</dd></>}
                        {masterTraderReviewApp.formData.preferredMarkets != null && <><dt className="text-muted-foreground">Markets</dt><dd>{(masterTraderReviewApp.formData.preferredMarkets as string)}</dd></>}
                        {masterTraderReviewApp.formData.avgMonthlyReturn != null && <><dt className="text-muted-foreground">Avg monthly return</dt><dd>{(masterTraderReviewApp.formData.avgMonthlyReturn as string)}%</dd></>}
                        {masterTraderReviewApp.formData.profileUrl != null && <><dt className="text-muted-foreground">Profile URL</dt><dd className="truncate"><a href={(masterTraderReviewApp.formData.profileUrl as string)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a></dd></>}
                      </dl>
                      {masterTraderReviewApp.formData.strategyDescription != null && (
                        <div className="pt-2 border-t border-border">
                          <dt className="text-muted-foreground text-xs mb-1">Strategy</dt>
                          <dd className="text-xs whitespace-pre-wrap">{(masterTraderReviewApp.formData.strategyDescription as string)}</dd>
                        </div>
                      )}
                      {masterTraderReviewApp.formData.whyMasterTrader != null && (
                        <div>
                          <dt className="text-muted-foreground text-xs mb-1">Why Master Trader</dt>
                          <dd className="text-xs whitespace-pre-wrap">{(masterTraderReviewApp.formData.whyMasterTrader as string)}</dd>
                        </div>
                      )}
                    </div>
                  )}

                  {masterTraderReviewApp.proofUrl && (
                    <div className="rounded border border-border p-4 space-y-2 bg-muted/30">
                      <h4 className="text-sm font-semibold">Proof of performance (screenshot)</h4>
                      <a href={masterTraderReviewApp.proofUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline mb-2">Open in new tab</a>
                      <img src={masterTraderReviewApp.proofUrl} alt="Trading history proof" className="max-w-full max-h-64 object-contain rounded border border-border bg-background" />
                    </div>
                  )}

                  {masterTraderReviewStatus === "rejected" && (
                    <div className="space-y-2">
                      <Label>Rejection reason (optional)</Label>
                      <Input
                        placeholder="e.g., Insufficient trading history"
                        value={masterTraderReviewMessage}
                        onChange={(e) => setMasterTraderReviewMessage(e.target.value)}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Approved Master Traders get 6 months – 1 year free. Package duration can be set via Discounts later.
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setMasterTraderReviewApp(null)}>Cancel</Button>
                <Button
                  onClick={handleMasterTraderReview}
                  disabled={masterTraderReviewLoading}
                  className={masterTraderReviewStatus === "approved" ? "bg-[#10B981] hover:bg-[#10B981]/90" : "bg-[#EF4444] hover:bg-[#EF4444]/90"}
                >
                  {masterTraderReviewLoading ? "Processing..." : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="discounts" className="space-y-6" onFocus={() => { loadCoupons(); loadUserDiscounts(); loadUsers(1, ""); }}>
          {/* Create New Coupon — OB (onboarding) or 100/200/500 (packages) */}
          <Card className="p-6 border-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <Ticket className="size-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Create Global Coupon</h3>
                <p className="text-sm text-muted-foreground">One coupon = one scope. OB for joining fee; 100/200/500 for packages. Share link: /payments (OB) or /packages (100/200/500).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-code">Coupon code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon-code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Leave empty to auto-generate"
                      className="font-mono uppercase"
                      maxLength={32}
                    />
                    <Button variant="outline" onClick={generateCouponCode} className="shrink-0">
                      <RefreshCw className="size-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Optional. System generates a unique code if left empty.</p>
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
                  <p className="text-xs text-muted-foreground">Percentage off (5–100%)</p>
                </div>

                <div className="space-y-2">
                  <Label>Discount Type *</Label>
                  <Select value={couponScope} onValueChange={(v: "OB" | "100" | "200" | "500") => setCouponScope(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OB">Onboarding — joining fee only</SelectItem>
                      <SelectItem value="100">Package $100</SelectItem>
                      <SelectItem value="200">Package $200</SelectItem>
                      <SelectItem value="500">Package $500</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">One coupon applies to one type only.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-redemptions">Max Redemptions</Label>
                  <Input
                    id="max-redemptions"
                    type="number"
                    min="1"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    placeholder="Unlimited if empty"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">How many users can redeem this coupon (empty = unlimited)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration-months">Validity (Months) *</Label>
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
                  <p className="text-xs text-muted-foreground">How long the purchased benefit lasts (1–12 months)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon-expiry">Coupon Expiry Date</Label>
                  <Input
                    id="coupon-expiry"
                    type="date"
                    value={couponExpiry}
                    onChange={(e) => setCouponExpiry(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <p className="text-xs text-muted-foreground">When this code stops working (empty = no expiry)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon-description">Description</Label>
                  <Textarea
                    id="coupon-description"
                    value={couponDescription}
                    onChange={(e) => setCouponDescription(e.target.value)}
                    placeholder="e.g., Launch promo – 50% off onboarding & Entry package"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Internal notes</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 mt-4 border-t border-border">
              <Button onClick={handleCreateCoupon} className="bg-[#10B981] text-white hover:bg-[#10B981]/90">
                <Ticket className="size-4 mr-2" />
                Create Coupon
              </Button>
              <p className="text-xs text-muted-foreground">
                Shareable link: /packages?coupon=CODE or /payments?coupon=CODE — coupon auto-populates at checkout. 100% off = no TX hash required.
              </p>
            </div>
          </Card>

          {/* Discount Coupons list */}
          <Card>
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Global Coupons (OB / 100 / 200 / 500)</h3>
                <p className="text-sm text-muted-foreground mt-1">{coupons.filter(c => c.status === "Active").length} active · {userDiscounts.filter(d => d.status === "active").length} user-specific active</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Filter by coupon code"
                  value={couponSearchCode}
                  onChange={(e) => setCouponSearchCode(e.target.value)}
                  className="max-w-[200px] font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={loadCoupons}>
                  <RefreshCw className="size-4 mr-2" />
                  Refresh
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
                    <TableHead>Scope</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Claimed by</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No coupons found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons
                      .filter((c) => !couponSearchCode.trim() || (c.code || "").toLowerCase().includes(couponSearchCode.trim().toLowerCase()))
                      .map((coupon) => {
                        const scopeLabel = (() => {
                          if ((coupon.code || "").toUpperCase().startsWith("OB")) return "OB (joining fee)";
                          if ((coupon.code || "").startsWith("100")) return "100 ($100 pkg)";
                          if ((coupon.code || "").startsWith("200")) return "200 ($200 pkg)";
                          if ((coupon.code || "").startsWith("500")) return "500 ($500 pkg)";
                          return coupon.appliesTo === "onboarding" ? "Onboarding" : (coupon.packageIds?.join(", ") || "Packages");
                        })();
                        return (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-semibold text-primary">{coupon.code}</TableCell>
                        <TableCell className="text-sm font-medium">{scopeLabel}</TableCell>
                        <TableCell className="font-mono text-[#10B981] font-semibold">{coupon.discount}%</TableCell>
                        <TableCell>
                          {coupon.maxRedemptions != null ? (
                            <>
                              <span className={coupon.currentRedemptions >= coupon.maxRedemptions ? "text-[#EF4444]" : "text-foreground"}>
                                {coupon.currentRedemptions}
                              </span>
                              <span className="text-muted-foreground">/{coupon.maxRedemptions}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">{coupon.currentRedemptions} (unlimited)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {coupon.expiresAt === "—" ? (
                            <Badge variant="outline" className="border-primary/50 text-primary">No Expiry</Badge>
                          ) : (
                            coupon.expiresAt
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.status === "Active" ? "default" : "secondary"} className={coupon.status === "Active" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50" : ""}>
                            {coupon.status === "Active" && (coupon.currentRedemptions ?? 0) > 0 ? "Claimed and active" : coupon.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {(coupon as { claimedBy?: string[] }).claimedBy?.length ? (coupon as { claimedBy?: string[] }).claimedBy.join(", ") : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{coupon.description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => copyCouponURL(coupon.code, coupon.appliesTo)} title="Copy coupon URL">
                              <Link2 className="size-4" />
                            </Button>
                            {coupon.statusRaw === "active" ? (
                              <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-600" onClick={() => handleCouponStatus(coupon.id, "disabled")} title="Disable coupon">
                                <Trash2 className="size-4" />
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="text-[#10B981] hover:text-[#10B981]" onClick={() => handleCouponStatus(coupon.id, "active")} title="Re-enable coupon">
                                <RefreshCw className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ); })
                  )}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Shareable Coupon Links */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Link2 className="size-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Shareable Coupon Links</h3>
                <p className="text-xs text-muted-foreground">OB → /payments; 100/200/500 → /packages. Coupon auto-populates at checkout.</p>
              </div>
            </div>
            <div className="space-y-2">
              {coupons.filter(c => c.status === "Active").slice(0, 5).map((coupon) => {
                const base = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "https://www.klineo.xyz";
                const path = coupon.appliesTo === "onboarding" ? "/payments" : "/packages";
                const url = `${base}${path}?coupon=${coupon.code}`;
                return (
                <div key={coupon.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded border border-border">
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {(coupon.code || "").toUpperCase().startsWith("OB") ? "OB (joining fee)" : (coupon.code || "").match(/^(100|200|500)/) ? `${(coupon.code || "").slice(0, 3)} (package)` : coupon.appliesTo || "—"}
                    </span>
                    <span className="font-mono text-xs truncate">{url}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyCouponURL(coupon.code, coupon.appliesTo)}>
                    <Copy className="size-4 mr-2" />
                    Copy
                  </Button>
                </div>
              ); })}
            </div>
          </Card>

          {/* User-specific discounts */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings2 className="size-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">User-Specific Discounts</h3>
                <p className="text-sm text-muted-foreground">Assign onboarding or trading package discounts to specific users. A <strong>system-generated coupon code</strong> is created for each assignment; share the code or claim link with the user. Change, pause, or revoke anytime.</p>
              </div>
            </div>

            {/* Master Trader preset — 100% onboarding + 100% packages for 6mo or 1yr */}
            <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <h4 className="text-sm font-semibold mb-2">Master Trader Benefits</h4>
              <p className="text-xs text-muted-foreground mb-4">Create full platform free for approved Master Traders: 100% off onboarding + 100% off packages for 6 months, 1 year, or lifetime.</p>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1 min-w-[200px]">
                  <Label className="text-xs">User (Master Trader)</Label>
                  <Select value={masterTraderDiscountUserId} onValueChange={setMasterTraderDiscountUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.email ?? u.id}</SelectItem>
                      ))}
                      {users.length === 0 && <SelectItem value="_" disabled>Load Users tab first</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-[120px]">
                  <Label className="text-xs">Duration</Label>
                  <Select value={masterTraderDiscountDuration} onValueChange={(v: "6mo" | "1yr" | "lifetime") => setMasterTraderDiscountDuration(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6mo">6 months</SelectItem>
                      <SelectItem value="1yr">1 year</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateMasterTraderDiscount} disabled={masterTraderDiscountLoading} className="bg-primary text-primary-foreground shrink-0">
                  {masterTraderDiscountLoading ? "Creating..." : "Create Master Trader Discount"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>User *</Label>
                  <Select value={userDiscountUserId} onValueChange={setUserDiscountUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user by email" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.email ?? u.id}
                        </SelectItem>
                      ))}
                      {users.length === 0 && <SelectItem value="_" disabled>Load Users tab first</SelectItem>}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Select from Users list (load Users tab if empty)</p>
                </div>
                <div className="space-y-2">
                  <Label>Discount Type *</Label>
                  <Select value={userDiscountScope} onValueChange={(v: "onboarding" | "trading_packages") => setUserDiscountScope(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding (joining fee)</SelectItem>
                      <SelectItem value="trading_packages">Trading packages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {userDiscountScope === "onboarding" && (
                  <>
                    <div className="space-y-2">
                      <Label>Onboarding discount %</Label>
                      <Input type="number" min="0" max="100" step="5" value={userDiscountOnboardingPercent} onChange={(e) => setUserDiscountOnboardingPercent(e.target.value)} placeholder="e.g. 50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Onboarding discount fixed $ (optional)</Label>
                      <Input type="number" min="0" step="1" value={userDiscountOnboardingFixed} onChange={(e) => setUserDiscountOnboardingFixed(e.target.value)} placeholder="e.g. 25" />
                    </div>
                  </>
                )}
                {userDiscountScope === "trading_packages" && (
                  <>
                    <div className="space-y-2">
                      <Label>Trading discount % *</Label>
                      <Input type="number" min="0" max="100" step="5" value={userDiscountTradingPercent} onChange={(e) => setUserDiscountTradingPercent(e.target.value)} placeholder="e.g. 30" />
                    </div>
                    <div className="space-y-2">
                      <Label>Max packages at discount *</Label>
                      <Input type="number" min="1" value={userDiscountTradingMax} onChange={(e) => setUserDiscountTradingMax(e.target.value)} placeholder="e.g. 2" />
                    </div>
                    <div className="space-y-2">
                      <Label>Which packages (optional)</Label>
                      <div className="flex flex-wrap gap-3">
                        {PACKAGE_OPTIONS.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={userDiscountTradingPackages.includes(p.id)} onChange={() => setUserDiscountTradingPackages((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))} className="rounded border-input" />
                            <span className="text-sm">{p.label}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Leave empty for all packages</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 pb-6 border-b border-border">
              <Button onClick={handleCreateUserDiscount} className="bg-[#10B981] text-white hover:bg-[#10B981]/90">
                <Ticket className="size-4 mr-2" />
                Assign User Discount
              </Button>
            </div>

            <div className="pt-4">
              <h4 className="text-sm font-semibold mb-3">All Assigned & Claimed Discounts</h4>
              <p className="text-xs text-muted-foreground mb-4">User-specific (assigned) and global coupons (claimed).</p>
              {userDiscountsLoading ? (
                <div className="py-6 text-center text-muted-foreground">Loading...</div>
              ) : (() => {
                const claimedGlobal = (coupons || []).filter((c) => (c.currentRedemptions ?? 0) > 0).map((c) => ({
                  id: `g-${c.id}`,
                  type: "global" as const,
                  code: c.code,
                  userOrClaimed: (c as { claimedBy?: string[] }).claimedBy?.join(", ") || "—",
                  scope: c.appliesTo === "onboarding" ? "Onboarding" : "Packages",
                  discount: `${c.discount}%`,
                  packagesMax: "—",
                  usedCount: c.currentRedemptions ?? 0,
                  status: c.status,
                  raw: c,
                }));
                const userRows = (userDiscounts || []).map((d) => ({
                  id: d.id,
                  type: "user" as const,
                  code: d.code,
                  userOrClaimed: d.userEmail ?? "—",
                  scope: d.scope === "onboarding" ? "Onboarding" : "Trading packages",
                  discount: d.scope === "onboarding"
                    ? `${d.onboardingDiscountPercent ?? 0}%${d.onboardingDiscountFixedUsd ? ` or $${d.onboardingDiscountFixedUsd}` : ""}`
                    : `${d.tradingDiscountPercent ?? 0}%`,
                  packagesMax: d.scope === "trading_packages" ? `${d.tradingPackageIds?.length ? d.tradingPackageIds.join(", ") : "All"} / max ${d.tradingMaxPackages ?? "—"}` : "—",
                  usedCount: d.tradingUsedCount ?? 0,
                  status: d.status === "active" ? "Active" : d.status === "paused" ? "Paused" : d.status === "revoked" ? "Revoked" : d.status || "—",
                  raw: d,
                }));
                const combined = [...userRows, ...claimedGlobal];
                if (combined.length === 0) {
                  return <p className="text-sm text-muted-foreground py-4">No assigned or claimed discounts yet. Assign above or create global coupons.</p>;
                }
                return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>User / Claimed by</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Packages / Max</TableHead>
                      <TableHead>Claimed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combined.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Badge variant="outline" className={row.type === "user" ? "border-primary/50" : ""}>
                            {row.type === "user" ? "User" : "Global"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium font-mono text-sm">{row.userOrClaimed}</TableCell>
                        <TableCell className="font-mono text-sm">{row.code ?? "—"}</TableCell>
                        <TableCell className="text-sm">{row.scope}</TableCell>
                        <TableCell className="text-sm">{row.discount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.packagesMax}</TableCell>
                        <TableCell>
                          {row.usedCount > 0 ? (
                            <Badge variant="default" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50">Claimed ({row.usedCount})</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === "Active" || row.status === "active" ? "default" : "secondary"} className={(row.status === "Active" || row.status === "active") ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/50" : ""}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap gap-2 justify-end">
                            {row.code && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(row.code!).then(() => toast.success("Code copied")).catch(() => toast.error("Copy failed")); }} title="Copy code">
                                  <Copy className="size-4 mr-1" />
                                  Copy
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const base = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "https://www.klineo.xyz";
                                    const link = (row.raw as { appliesTo?: string }).appliesTo === "onboarding" || (row.raw as { scope?: string }).scope === "onboarding"
                                      ? `${base}/payments?coupon=${row.code}`
                                      : `${base}/packages?coupon=${row.code}`;
                                    navigator.clipboard.writeText(link).then(() => toast.success("Link copied")).catch(() => toast.error("Copy failed"));
                                  }}
                                  title="Copy claim link"
                                >
                                  <Link2 className="size-4 mr-1" />
                                  Link
                                </Button>
                              </>
                            )}
                            {row.type === "user" && (
                              <>
                                {(row.raw as { status?: string }).status === "active" && (
                                  <Button variant="outline" size="sm" onClick={() => handleUserDiscountStatus(row.id, "paused")} title="Pause">Pause</Button>
                                )}
                                {(row.raw as { status?: string }).status === "paused" && (
                                  <Button variant="outline" size="sm" className="text-[#10B981]" onClick={() => handleUserDiscountStatus(row.id, "active")} title="Re-enable">Re-enable</Button>
                                )}
                                <Button variant="outline" size="sm" className="text-[#EF4444] hover:text-[#EF4444]" onClick={() => handleRevokeUserDiscount(row.id)} title="Revoke">Revoke</Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                );
              })()}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {paymentIntentsFeatureDisabled && (
            <Card className="p-4 border-amber-500/50 bg-amber-500/5">
              <p className="text-sm text-foreground">
                <strong>Payment intents are disabled.</strong> The backend returned 404/503 — set{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ENABLE_MANUAL_PAYMENTS=true</code> on the
                backend (e.g. Railway) and apply the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">payment_intents</code> migration to enable.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={loadPaymentIntents} disabled={paymentIntentsLoading}>
                Try again
              </Button>
            </Card>
          )}
          <Card>
            <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Payment Intents (Manual Safe)</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Submitted payments from all users. Check Klineo Safe wallet for TX hash; if payment received → <strong>Confirm</strong>; if not → <strong>Deny</strong>. Coupon code (when used) is shown. For 100% discount, TX hash is not required.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={paymentIntentsStatus === "" ? "all" : paymentIntentsStatus}
                  onValueChange={(v) => setPaymentIntentsStatus(v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Pending review</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={loadPaymentIntents} disabled={paymentIntentsLoading}>
                  <RefreshCw className="size-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            {paymentIntentsLoading ? (
              <div className="p-8 text-center text-foreground">Loading payment intents…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Discount %</TableHead>
                    <TableHead>Coupon code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tx hash</TableHead>
                    <TableHead>From wallet</TableHead>
                    <TableHead>Mismatch</TableHead>
                    <TableHead>Rejection / note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentIntents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                        {paymentIntentsFeatureDisabled ? (
                          <span>Payment intents are disabled. Set <code className="text-xs bg-muted px-1 rounded">ENABLE_MANUAL_PAYMENTS=true</code> on the backend to enable.</span>
                        ) : (
                          'No payment intents found.'
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentIntents.map((pi: any) => (
                      <TableRow key={pi.id}>
                        <TableCell className="text-sm text-muted-foreground">{pi.created_at ? new Date(pi.created_at).toLocaleString() : ''}</TableCell>
                        <TableCell className="font-mono text-xs">{pi.user_id?.slice(0, 8)}...</TableCell>
                        <TableCell>{pi.kind === 'joining_fee' ? 'Joining fee' : pi.package_code || 'Package'}</TableCell>
                        <TableCell className="font-mono">{Number(pi.amount_usdt ?? 0) === 0 ? '0 (100% off)' : `${pi.amount_usdt} USDT`}</TableCell>
                        <TableCell className="text-sm">{pi.discount_percent != null ? `${pi.discount_percent}%` : '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{pi.coupon_code || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{pi.status}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {pi.tx_hash ? (
                            <a href={`https://bscscan.com/tx/${pi.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {pi.tx_hash.slice(0, 10)}...
                            </a>
                          ) : Number(pi.amount_usdt ?? 0) === 0 ? (
                            <span className="text-muted-foreground">Not required</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate" title={pi.declared_from_wallet || ''}>{pi.declared_from_wallet || '—'}</TableCell>
                        <TableCell className="text-xs text-orange-600">{pi.mismatch_reason || '—'}</TableCell>
                        <TableCell className="text-xs max-w-[160px]" title={pi.review_note || ''}>
                          {pi.status === 'rejected' && pi.review_note ? (
                            <span className="text-destructive">{pi.review_note}</span>
                          ) : pi.review_note ? (
                            <span className="text-muted-foreground">{pi.review_note}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                            {(pi.status === 'pending_review' || pi.status === 'flagged') ? (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="default" onClick={() => handleApproveIntent(pi.id)} disabled={paymentIntentActionLoading}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRejectIntent(pi.id)} disabled={paymentIntentActionLoading}>
                                Deny
                              </Button>
                            </div>
                          ) : pi.status === 'draft' ? (
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectIntent(pi.id)} disabled={paymentIntentActionLoading}>
                              Deny
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            <div className="p-4 border-t border-border flex flex-wrap items-center gap-4 text-sm">
              <span className="text-muted-foreground">Safe:</span>
              <a href="https://app.safe.global/home?safe=bnb:0x0E60e94252F58aBb56604A8260492d96cf879007" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Open Safe <Link2 className="size-3" />
              </a>
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground text-xs">Note (for Confirm/Deny):</Label>
                <Input placeholder="Optional note" className="max-w-xs h-8" value={paymentIntentActionNote} onChange={(e) => setPaymentIntentActionNote(e.target.value)} />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="financial-ratios" className="space-y-4">
          <AdminFinancialRatios />
        </TabsContent>

        <TabsContent value="runner" className="space-y-4" onFocus={() => { loadRunnerStatus(); loadTickRuns(); }}>
          <Card>
            <div className="p-6 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-semibold">Strategy Runner</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { loadRunnerStatus(); loadTickRuns(); }} disabled={runnerStatusLoading}>
                  <RefreshCw className="size-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  disabled={runnerCronLoading}
                  onClick={async () => {
                    setRunnerCronLoading(true);
                    try {
                      const res = await api.post<{ ok?: boolean; requestId?: string; summary?: { processed: number; ran: number; skipped: number; blocked: number; errored: number }; notes?: string[] }>('/api/runner/cron');
                      const s = res?.summary;
                      const id = res?.requestId ?? '';
                      if (res?.ok && s) {
                        toast.success(`Cron: ran=${s.ran} skipped=${s.skipped} blocked=${s.blocked} errored=${s.errored}`, { description: id ? `Request: ${id}` : undefined });
                      } else if (res?.notes?.length) {
                        toast.error(res.notes[0] ?? 'Cron failed', { description: id ? `Request: ${id}` : undefined });
                      } else {
                        toast.success('Cron run completed', { description: id ? `Request: ${id}` : undefined });
                      }
                      loadRunnerStatus();
                      loadTickRuns();
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : 'Request failed');
                    } finally {
                      setRunnerCronLoading(false);
                    }
                  }}
                >
                  {runnerCronLoading ? 'Running…' : 'Run Cron Now'}
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {runnerStatus !== null && (
                <div className="rounded border border-border p-3 text-sm space-y-1">
                  <div className="font-semibold">Runner status</div>
                  <div>Active strategies: {runnerStatus.activeStrategies} · Last run: {runnerStatus.lastRunAt ? new Date(runnerStatus.lastRunAt).toLocaleString() : '—'} ({runnerStatus.lastRunStatus ?? '—'})</div>
                  {runnerStatus.blockedUsersCount > 0 && (
                    <div className="text-amber-600">Blocked users: {runnerStatus.blockedUsersCount} {runnerStatus.lastBlockedReasons?.length ? `(${runnerStatus.lastBlockedReasons.slice(0, 3).join(', ')})` : ''}</div>
                  )}
                </div>
              )}
              <div>
                <div className="font-semibold mb-2">Recent tick runs (last 20)</div>
                {tickRuns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tick runs yet. Run cron or wait for scheduler.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Strategy run</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Latency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickRuns.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{new Date(r.started_at).toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[120px]">{r.strategy_run_id}</TableCell>
                          <TableCell>{r.status}</TableCell>
                          <TableCell className="truncate max-w-[120px]">{r.reason ?? '—'}</TableCell>
                          <TableCell>{r.latency_ms != null ? `${r.latency_ms}ms` : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
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