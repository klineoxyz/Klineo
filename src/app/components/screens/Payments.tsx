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
import { Copy, ExternalLink, Wallet, AlertCircle, Loader2, Send } from "lucide-react";

const SAFE_LINK = "https://app.safe.global/home?safe=bnb:0x0E60e94252F58aBb56604A8260492d96cf879007";
const BSCSCAN_TX = (tx: string) => `https://bscscan.com/tx/${tx}`;

type IntentStatus = "draft" | "pending_review" | "flagged" | "approved" | "rejected";

interface PaymentIntent {
  id: string;
  kind: string;
  package_code: string | null;
  amount_usdt: number;
  status: IntentStatus;
  tx_hash: string | null;
  declared_from_wallet: string | null;
  mismatch_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentsProps {
  onNavigate: (view: string) => void;
}

export function Payments({ onNavigate }: PaymentsProps) {
  const [manualEnabled, setManualEnabled] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<{ paymentWalletBsc?: string } | null>(null);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [intentsLoading, setIntentsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [kind, setKind] = useState<"joining_fee" | "package">("joining_fee");
  const [packageCode, setPackageCode] = useState("ENTRY_100");
  const [currentIntent, setCurrentIntent] = useState<{
    id: string;
    amount_usdt: number;
    treasury_address: string;
    safe_link: string;
    status: string;
  } | null>(null);
  const [txHash, setTxHash] = useState("");
  const [fromWallet, setFromWallet] = useState("");

  useEffect(() => {
    const check = async () => {
      try {
        const [profileRes, intentsRes] = await Promise.all([
          api.get<{ paymentWalletBsc?: string }>("/api/me/profile").catch(() => null),
          api.get<{ intents: PaymentIntent[] }>("/api/payments/intents").catch((e) => {
            if (e?.message?.includes("404") || (e as Error)?.message === "Not found") return null;
            throw e;
          }),
        ]);
        setProfile(profileRes || null);
        if (intentsRes && "intents" in intentsRes) {
          setManualEnabled(true);
          setIntents(intentsRes.intents || []);
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
      const data = await api.get<{ intents: PaymentIntent[] }>("/api/payments/intents");
      setIntents(data.intents || []);
    } catch {
      toast.error("Failed to load payment intents");
    } finally {
      setIntentsLoading(false);
    }
  };

  const hasPaymentWallet = profile?.paymentWalletBsc?.trim().length > 0;

  const handleCreateIntent = async () => {
    if (!hasPaymentWallet) {
      toast.error("Save your payment wallet (BSC) in Settings first");
      return;
    }
    setCreating(true);
    try {
      const body = kind === "package" ? { kind, package_code: packageCode } : { kind };
      const data = await api.post<{
        intent: { id: string; amount_usdt: number; status: string };
        treasury_address: string;
        amount_usdt: number;
        safe_link: string;
      }>("/api/payments/intents", body);
      setCurrentIntent({
        id: data.intent.id,
        amount_usdt: data.amount_usdt,
        treasury_address: data.treasury_address,
        safe_link: data.safe_link,
        status: data.intent.status,
      });
      setTxHash("");
      setFromWallet("");
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
    if (!currentIntent || !txHash.trim()) {
      toast.error("Enter transaction hash");
      return;
    }
    setSubmitting(currentIntent.id);
    try {
      await api.post(`/api/payments/intents/${currentIntent.id}/submit`, {
        tx_hash: txHash.trim(),
        from_wallet: fromWallet.trim() || undefined,
      });
      toast.success("Submitted for review");
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
        <Card className="p-6">
          <p className="text-muted-foreground">Manual payments are not enabled. Payment history will appear here when available.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Payments</h1>
        <p className="text-sm text-muted-foreground">Manual USDT (BEP20) payments to Safe. Admin verifies via Safe and BscScan.</p>
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
                <Select value={kind} onValueChange={(v) => setKind(v as "joining_fee" | "package")}>
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
                  <Select value={packageCode} onValueChange={setPackageCode}>
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
            <Button onClick={handleCreateIntent} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : "Create intent"}
            </Button>
          </Card>

          {currentIntent && currentIntent.status === "draft" && (
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Deposit instructions</h3>
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
                <Button onClick={handleSubmitTx} disabled={!txHash.trim() || submitting !== null}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Submit for review
                </Button>
              </div>
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
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your payment intents</h3>
          <Button variant="outline" size="sm" onClick={loadIntents} disabled={intentsLoading}>
            {intentsLoading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kind</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tx hash</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {intents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center py-8">No payment intents yet</TableCell>
              </TableRow>
            ) : (
              intents.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.kind === "joining_fee" ? "Joining fee" : i.package_code || "Package"}</TableCell>
                  <TableCell className="font-mono">{i.amount_usdt} USDT</TableCell>
                  <TableCell>{statusBadge(i.status)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {i.tx_hash ? (
                      <a href={BSCSCAN_TX(i.tx_hash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {i.tx_hash.slice(0, 10)}...
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(i.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
