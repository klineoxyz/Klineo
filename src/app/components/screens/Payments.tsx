import { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { copyToClipboard } from "@/app/lib/clipboard";
import { Copy, ExternalLink, Wallet, AlertCircle, Loader2, Send, Tag, X, Trash2 } from "lucide-react";

const SAFE_LINK = "https://app.safe.global/home?safe=bnb:0x0E60e94252F58aBb56604A8260492d96cf879007";
const TREASURY_ADDRESS = "0x0E60e94252F58aBb56604A8260492d96cf879007";
const BSCSCAN_TX = (tx: string) => `https://bscscan.com/tx/${tx}`;

type IntentStatus = "draft" | "pending_review" | "flagged" | "approved" | "rejected";

interface PaymentIntent {
  id: string;
  kind: string;
  package_code: string | null;
  amount_usdt: number;
  coupon_code: string | null;
  discount_percent: number | null;
  status: IntentStatus;
  tx_hash: string | null;
  declared_from_wallet: string | null;
  mismatch_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentsProps {
  onNavigate: (view: string) => void;
  /** When navigating from Subscription after creating an intent, contains { newIntent, couponCode?, couponKind?, couponPackageCode? } so we show deposit instructions and prefill/apply coupon. */
  viewData?: {
    newIntent?: { id: string; amount_usdt: number; treasury_address: string; safe_link: string; status: string };
    couponCode?: string;
    couponKind?: "joining_fee" | "package";
    couponPackageCode?: string;
  };
}

export function Payments({ onNavigate, viewData }: PaymentsProps) {
  const [manualEnabled, setManualEnabled] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<{ paymentWalletBsc?: string } | null>(null);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [intentsLoading, setIntentsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [cancellingIntentId, setCancellingIntentId] = useState<string | null>(null);
  const [kind, setKind] = useState<"joining_fee" | "package">("joining_fee");
  const [packageCode, setPackageCode] = useState("ENTRY_100");
  const [currentIntent, setCurrentIntent] = useState<{
    id: string;
    amount_usdt: number;
    treasury_address: string;
    safe_link: string;
    status: string;
    coupon_code?: string;
    discount_percent?: number;
  } | null>(null);
  const [txHash, setTxHash] = useState("");
  const [fromWallet, setFromWallet] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discountPercent: number;
    originalAmountUsdt: number;
    amountUsdt: number;
  } | null>(null);

  useEffect(() => {
    if (viewData?.newIntent) setCurrentIntent(viewData.newIntent);
  }, [viewData?.newIntent]);

  useEffect(() => {
    const code = viewData?.couponCode?.trim()?.toUpperCase();
    if (!code) return;
    setCouponCode(code);
    setCouponValidating(true);
    const vKind = viewData?.couponKind ?? kind;
    const vPackageCode = viewData?.couponPackageCode ?? packageCode;
    const params = new URLSearchParams({ code, kind: vKind, package_code: vPackageCode });
    api
      .get<{ valid: boolean; discountPercent?: number; originalAmountUsdt?: number; amountUsdt?: number; error?: string }>(`/api/payments/validate-coupon?${params.toString()}`)
      .then((data) => {
        if (data.valid && data.discountPercent != null && data.originalAmountUsdt != null && data.amountUsdt != null) {
          setCouponApplied({
            code,
            discountPercent: data.discountPercent,
            originalAmountUsdt: data.originalAmountUsdt,
            amountUsdt: data.amountUsdt,
          });
          toast.success(`${data.discountPercent}% off applied — Pay $${data.amountUsdt} instead of $${data.originalAmountUsdt}`);
        } else if (data.error) toast.error(data.error);
      })
      .catch(() => toast.error("Could not validate coupon"))
      .finally(() => setCouponValidating(false));
  }, [viewData?.couponCode, viewData?.couponKind, viewData?.couponPackageCode]);

  useEffect(() => {
    const check = async () => {
      try {
        const [profileRes, intentsRes] = await Promise.all([
          api.get<{ paymentWalletBsc?: string }>("/api/me/profile").catch(() => null),
          api.get<{ intents: PaymentIntent[]; featureDisabled?: boolean }>("/api/payments/intents").catch((e) => {
            if (e?.message?.includes("404") || e?.message?.includes("503") || (e as Error)?.message === "Not found") return null;
            throw e;
          }),
        ]);
        setProfile(profileRes || null);
        if (intentsRes && (intentsRes as { featureDisabled?: boolean }).featureDisabled === true) {
          setManualEnabled(false);
          setIntents([]);
        } else if (intentsRes && "intents" in intentsRes) {
          setManualEnabled(true);
          setIntents((intentsRes as { intents: PaymentIntent[] }).intents || []);
        } else {
          setManualEnabled(false);
        }
      } catch {
        setManualEnabled(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  const loadIntents = async () => {
    setIntentsLoading(true);
    try {
      const data = await api.get<{ intents: PaymentIntent[]; featureDisabled?: boolean }>("/api/payments/intents");
      if (data.featureDisabled) {
        setManualEnabled(false);
        setIntents([]);
      } else {
        setIntents(data.intents || []);
      }
    } catch {
      toast.error("Failed to load payment intents");
    } finally {
      setIntentsLoading(false);
    }
  };

  const hasPaymentWallet = profile?.paymentWalletBsc?.trim().length > 0;

  const baseAmountUsdt = kind === "joining_fee" ? 100 : (kind === "package" ? { ENTRY_100: 100, LEVEL_200: 200, LEVEL_500: 500 }[packageCode] ?? 100 : 100);
  const displayAmountUsdt = couponApplied?.amountUsdt ?? baseAmountUsdt;

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a coupon code");
      return;
    }
    setCouponValidating(true);
    setCouponApplied(null);
    try {
      const params = new URLSearchParams({ code, kind });
      if (kind === "package") params.set("package_code", packageCode);
      const data = await api.get<{
        valid: boolean;
        error?: string;
        discountPercent?: number;
        originalAmountUsdt?: number;
        amountUsdt?: number;
      }>(`/api/payments/validate-coupon?${params.toString()}`);
      if (data.valid && data.discountPercent != null && data.originalAmountUsdt != null && data.amountUsdt != null) {
        setCouponApplied({
          code,
          discountPercent: data.discountPercent,
          originalAmountUsdt: data.originalAmountUsdt,
          amountUsdt: data.amountUsdt,
        });
        toast.success(`${data.discountPercent}% off applied — Pay $${data.amountUsdt} instead of $${data.originalAmountUsdt}`);
      } else {
        toast.error(data.error ?? "Invalid or expired coupon");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not validate coupon";
      toast.error(msg);
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
  };

  const handleCancelIntent = async (intentId: string) => {
    setCancellingIntentId(intentId);
    try {
      await api.delete(`/api/payments/intents/${intentId}`);
      toast.success("Intent cancelled");
      if (currentIntent?.id === intentId) setCurrentIntent(null);
      await loadIntents();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to cancel";
      toast.error(msg);
    } finally {
      setCancellingIntentId(null);
    }
  };

  const handleUseDraftIntent = (i: PaymentIntent) => {
    if (i.status !== "draft") return;
    setCurrentIntent({
      id: i.id,
      amount_usdt: i.amount_usdt,
      treasury_address: TREASURY_ADDRESS,
      safe_link: SAFE_LINK,
      status: i.status,
      coupon_code: i.coupon_code ?? undefined,
      discount_percent: i.discount_percent ?? undefined,
    });
    setTxHash("");
    setFromWallet("");
    toast.info(Number(i.amount_usdt) === 0 ? "Request approval above (no tx hash needed)" : "Fill in your tx hash above and submit");
  };

  const handleCreateIntent = async () => {
    if (!hasPaymentWallet) {
      toast.error("Save your payment wallet (BSC) in Settings first");
      return;
    }
    setCreating(true);
    try {
      const body: { kind: "joining_fee" | "package"; package_code?: string; coupon_code?: string } =
        kind === "package" ? { kind, package_code: packageCode } : { kind };
      if (couponApplied?.code) body.coupon_code = couponApplied.code;
      const data = await api.post<{
        intent: { id: string; amount_usdt: number; status: string };
        treasury_address: string;
        amount_usdt: number;
        safe_link: string;
        coupon_applied?: { code: string; discount_percent: number };
      }>("/api/payments/intents", body);
      const couponAppliedResp = (data as any).coupon_applied;
      setCurrentIntent({
        id: data.intent.id,
        amount_usdt: data.amount_usdt,
        treasury_address: data.treasury_address,
        safe_link: data.safe_link,
        status: data.intent.status,
        coupon_code: couponAppliedResp?.code,
        discount_percent: couponAppliedResp?.discount_percent,
      });
      setTxHash("");
      setFromWallet("");
      setCouponApplied(null);
      setCouponCode("");
      await loadIntents();
      toast.success("Payment intent created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create intent";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitTx = async () => {
    if (!currentIntent) return;
    const isZeroAmount = Number(currentIntent.amount_usdt) === 0;
    if (!isZeroAmount && !txHash.trim()) {
      toast.error("Enter transaction hash");
      return;
    }
    setSubmitting(currentIntent.id);
    try {
      await api.post(`/api/payments/intents/${currentIntent.id}/submit`, {
        tx_hash: txHash.trim() || undefined,
        from_wallet: fromWallet.trim() || undefined,
      });
      toast.success(isZeroAmount ? "Request submitted for admin approval" : "Submitted for review");
      setCurrentIntent((c) => (c ? { ...c, status: "pending_review" } : null));
      await loadIntents();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit";
      toast.error(msg);
    } finally {
      setSubmitting(null);
    }
  };

  const statusBadge = (status: IntentStatus) => {
    const map: Record<IntentStatus, { label: string; variant: "outline" | "default" | "secondary"; className?: string }> = {
      draft: { label: "Draft", variant: "secondary" },
      pending_review: { label: "Pending review", variant: "outline", className: "border-amber-500/50 text-amber-600" },
      flagged: { label: "Flagged", variant: "outline", className: "border-orange-500/50 text-orange-600" },
      approved: { label: "Approved", variant: "outline", className: "border-[#10B981]/50 text-[#10B981] bg-[#10B981]/10" },
      rejected: { label: "Rejected", variant: "outline", className: "border-destructive/50 text-destructive" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant} className={s.className}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (manualEnabled === false) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <Card className="p-6 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Manual payments are not enabled</p>
              <p className="text-sm text-muted-foreground mt-1">
                Payment intents and deposit instructions are turned off on the server. When enabled, you can pay the joining fee and packages here via USDT (BEP20) to the Treasury Safe.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Payments</h1>
        <p className="text-sm text-muted-foreground">Manual USDT (BEP20) payments to Safe. Admin verifies via Safe and BscScan. You only see your own payment intents.</p>
      </div>

      {!hasPaymentWallet && (
        <Card className="p-6 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Payment wallet required</p>
              <p className="text-sm text-muted-foreground mt-1">Save your BSC (BEP20) USDT wallet in Settings before creating a payment. This is the wallet you will send from.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => onNavigate("settings")}>
                Open Settings
              </Button>
            </div>
          </div>
        </Card>
      )}

      {hasPaymentWallet && (
        <>
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Create payment intent</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kind</Label>
                <Select
                  value={kind}
                  onValueChange={(v) => {
                    setKind(v as "joining_fee" | "package");
                    setCouponApplied(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="joining_fee">Joining fee</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {kind === "package" && (
                <div className="space-y-2">
                  <Label>Package</Label>
                  <Select
                    value={packageCode}
                    onValueChange={(v) => {
                      setPackageCode(v);
                      setCouponApplied(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENTRY_100">ENTRY $100</SelectItem>
                      <SelectItem value="LEVEL_200">LEVEL $200</SelectItem>
                      <SelectItem value="LEVEL_500">LEVEL $500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="size-4" />
                Coupon code
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. LAUNCH50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="font-mono max-w-[180px]"
                  disabled={!!couponApplied}
                />
                {couponApplied ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleRemoveCoupon} className="shrink-0">
                    <X className="size-4 mr-1" />
                    Remove
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" size="sm" onClick={handleApplyCoupon} disabled={couponValidating || !couponCode.trim()}>
                    {couponValidating ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                  </Button>
                )}
              </div>
              {couponApplied && (
                <div className="space-y-1">
                  <p className="text-sm text-[#10B981] font-medium">
                    {couponApplied.discountPercent}% off — Pay ${couponApplied.amountUsdt} instead of ${couponApplied.originalAmountUsdt}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">Coupon code: {couponApplied.code}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-sm text-muted-foreground">Amount to pay:</span>
              <span className="font-mono font-semibold">{displayAmountUsdt} USDT</span>
            </div>
            <Button onClick={handleCreateIntent} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : "Create intent"}
            </Button>
          </Card>

          {currentIntent && currentIntent.status === "draft" && (
            <Card className="p-6 space-y-4">
              {Number(currentIntent.amount_usdt) === 0 ? (
                <>
                  <h3 className="text-lg font-semibold">100% discount — no payment required</h3>
                  <p className="text-sm text-muted-foreground">
                    Your coupon covers the full amount. Request admin approval to complete; no transaction hash or wallet is required.
                  </p>
                  {(currentIntent.coupon_code ?? currentIntent.discount_percent != null) && (
                    <p className="text-sm font-medium">
                      {currentIntent.discount_percent != null && `${currentIntent.discount_percent}% off`}
                      {currentIntent.coupon_code && (
                        <span className="font-mono text-muted-foreground ml-1">· Code: {currentIntent.coupon_code}</span>
                      )}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleSubmitTx} disabled={submitting !== null}>
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Request approval
                    </Button>
                    <Button variant="outline" onClick={() => handleCancelIntent(currentIntent.id)} disabled={cancellingIntentId === currentIntent.id}>
                      {cancellingIntentId === currentIntent.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      Delete
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold">Deposit instructions</h3>
                  {(currentIntent.coupon_code ?? currentIntent.discount_percent != null) && (
                    <p className="text-sm font-medium">
                      {currentIntent.discount_percent != null && `${currentIntent.discount_percent}% off`}
                      {currentIntent.coupon_code && (
                        <span className="font-mono text-muted-foreground ml-1">· Coupon code: {currentIntent.coupon_code}</span>
                      )}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-mono font-semibold">{currentIntent.amount_usdt} USDT</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        copyToClipboard(String(currentIntent.amount_usdt));
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Treasury Safe:</span>
                    <span className="font-mono text-sm break-all">{currentIntent.treasury_address}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        copyToClipboard(currentIntent.treasury_address);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                    <a href={currentIntent.safe_link} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 text-sm">
                      Open Safe <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <div className="pt-4 border-t space-y-3">
                    <Label>Transaction hash (after you send USDT)</Label>
                    <Input
                      placeholder="0x..."
                      className="font-mono"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                    />
                    <Label className="text-muted-foreground">From wallet (optional)</Label>
                    <Input
                      placeholder="0x... (BEP20)"
                      className="font-mono"
                      value={fromWallet}
                      onChange={(e) => setFromWallet(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSubmitTx} disabled={!txHash.trim() || submitting !== null}>
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Submit for review
                      </Button>
                      <Button variant="outline" onClick={() => handleCancelIntent(currentIntent.id)} disabled={cancellingIntentId === currentIntent.id}>
                        {cancellingIntentId === currentIntent.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        Delete
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          )}

          {currentIntent && currentIntent.status !== "draft" && (
            <Card className="p-6">
              <p className="text-muted-foreground">Intent status: {statusBadge(currentIntent.status as IntentStatus)}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setCurrentIntent(null)}>Create new intent</Button>
            </Card>
          )}
        </>
      )}

      <Card>
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Your payment intents</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Only your own intents are listed. <strong>Draft</strong> = created but not yet submitted (send USDT and submit tx hash, or for 100% discount use Request approval). Submit for review → Admin approves or rejects with a reason.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadIntents} disabled={intentsLoading} className="shrink-0">
            {intentsLoading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kind</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Discount %</TableHead>
              <TableHead>Coupon code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tx hash</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {intents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground text-center py-8">No payment intents yet. Only your own intents are shown.</TableCell>
              </TableRow>
            ) : (
              intents.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.kind === "joining_fee" ? "Joining fee" : i.package_code || "Package"}</TableCell>
                  <TableCell className="font-mono">{Number(i.amount_usdt) === 0 ? "0 (100% off)" : `${i.amount_usdt} USDT`}</TableCell>
                  <TableCell className="text-sm">{i.discount_percent != null ? `${i.discount_percent}%` : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{i.coupon_code || "—"}</TableCell>
                  <TableCell>{statusBadge(i.status)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {i.tx_hash ? (
                      <a href={BSCSCAN_TX(i.tx_hash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {i.tx_hash.slice(0, 10)}...
                      </a>
                    ) : Number(i.amount_usdt) === 0 ? (
                      <span className="text-muted-foreground">Not required</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(i.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {i.status === "draft" ? (
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUseDraftIntent(i)}
                          disabled={cancellingIntentId === i.id}
                        >
                          {Number(i.amount_usdt) === 0 ? "Request approval" : "Submit tx"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleCancelIntent(i.id)}
                          disabled={cancellingIntentId === i.id}
                        >
                          {cancellingIntentId === i.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="size-4 mr-1" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
