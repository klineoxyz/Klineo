import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/app/lib/toast";
import { copyToClipboard } from "@/app/lib/clipboard";
import { api } from "@/lib/api";

type ReferralMeData = {
  referralCode: string | null;
  referralLink: string | null;
  earningsSummary: {
    totalEarnedUsd: number;
    paidUsd: number;
    pendingUsd: number;
    availableUsd: number;
    requestableUsd: number;
    minPayoutUsd: number;
  };
  payoutWallet: string | null;
  payoutRequests: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    paidAt: string | null;
    rejectionReason: string | null;
    payoutTxId: string | null;
  }>;
};

interface ReferralsProps {
  onNavigate: (view: string) => void;
}

type MyReferralRow = { referredDisplay: string; joinedAt: string; totalSpendUsd: number; yourEarningsFromThemUsd: number };

export function Referrals({ onNavigate }: ReferralsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [referralMe, setReferralMe] = useState<ReferralMeData | null>(null);
  const [referralMeLoading, setReferralMeLoading] = useState(true);
  const [requestPayoutLoading, setRequestPayoutLoading] = useState(false);
  const [myReferrals, setMyReferrals] = useState<MyReferralRow[]>([]);

  const fetchReferralMe = () => {
    setReferralMeLoading(true);
    api
      .get<ReferralMeData>("/api/referrals/me")
      .then(setReferralMe)
      .catch(() => setReferralMe(null))
      .finally(() => setReferralMeLoading(false));
  };

  useEffect(() => {
    fetchReferralMe();
  }, []);

  useEffect(() => {
    const onVisible = () => fetchReferralMe();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    api
      .get<{ referrals: MyReferralRow[] }>("/api/referrals/my-referrals")
      .then((data) => setMyReferrals(data.referrals ?? []))
      .catch(() => setMyReferrals([]));
  }, []);

  const handleRequestPayout = async () => {
    const summary = referralMe?.earningsSummary;
    const wallet = referralMe?.payoutWallet;
    if (!summary || summary.requestableUsd < summary.minPayoutUsd || !wallet) return;
    const amount = Math.round(summary.requestableUsd * 100) / 100;
    setRequestPayoutLoading(true);
    try {
      await api.post("/api/referrals/payout-request", { amount });
      toast.success("Payout request submitted. You’ll be notified when it’s processed.");
      refetchPayoutSummary();
      refetchMyPayoutRequests();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed";
      toast.error(msg);
    } finally {
      setRequestPayoutLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    copyToClipboard(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">Community Rewards</h1>
        <p className="text-sm text-muted-foreground">Earn from the 70% community rewards pool when people in your network pay onboarding fees or buy packages</p>
      </div>

      {/* Referral Info — Your Referral Details + Community Rewards visible on UI */}
      <Card className="p-4 sm:p-6 flex flex-col gap-6 overflow-visible">
        <section className="space-y-4">
          <h3 className="text-base sm:text-lg font-semibold">Your Referral Details</h3>
          {referralMeLoading ? (
            <div className="flex gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2 min-w-0">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Referral Link</Label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <Input value={referralMe?.referralLink ?? ""} readOnly className="font-mono text-sm min-w-0" placeholder="—" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => referralMe?.referralLink && handleCopy(referralMe.referralLink, "link")}
                    disabled={!referralMe?.referralLink}
                  >
                    {copied === "link" ? <Check className="size-4 text-[#10B981]" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Referral Code</Label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <Input value={referralMe?.referralCode ?? ""} readOnly className="font-mono text-sm min-w-0" placeholder="—" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => referralMe?.referralCode && handleCopy(referralMe.referralCode!, "code")}
                    disabled={!referralMe?.referralCode}
                  >
                    {copied === "code" ? <Check className="size-4 text-[#10B981]" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        <Separator />

        <section className="p-4 bg-secondary/30 rounded-lg space-y-4">
          <h4 className="font-semibold text-sm">Community Rewards (70% pool)</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• <span className="text-primary font-medium">70%</span> of every onboarding fee and package purchase goes to the community rewards pool</li>
            <li>• Rewards are from purchases only—not from trading PnL or balances</li>
            <li>• Minimum payout: $50.00 USDT</li>
          </ul>
          {/* Pure SVG hierarchical network diagram (1 → 2 → 4 → 8) */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Network structure (up to 7 levels)</div>
            <div className="w-full rounded-lg overflow-hidden bg-muted/20 border border-border/50" style={{ aspectRatio: "2/1.6", maxHeight: 220, minHeight: 160 }}>
              <svg className="w-full h-full text-primary" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
                <defs>
                  <linearGradient id="ref-line" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.25" />
                  </linearGradient>
                  <linearGradient id="ref-node-top" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.75" />
                  </linearGradient>
                  <linearGradient id="ref-node-bottom" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
                  </linearGradient>
                  <filter id="ref-node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2" />
                  </filter>
                </defs>
                {/* Edges (rounded appearance via stroke) */}
                <g stroke="url(#ref-line)" strokeWidth="1.25" fill="none" strokeLinecap="round">
                  <line x1="50" y1="12" x2="28" y2="28" />
                  <line x1="50" y1="12" x2="72" y2="28" />
                  <line x1="28" y1="28" x2="14" y2="46" />
                  <line x1="28" y1="28" x2="42" y2="46" />
                  <line x1="72" y1="28" x2="58" y2="46" />
                  <line x1="72" y1="28" x2="86" y2="46" />
                  <line x1="14" y1="46" x2="7" y2="64" />
                  <line x1="14" y1="46" x2="21" y2="64" />
                  <line x1="42" y1="46" x2="35" y2="64" />
                  <line x1="42" y1="46" x2="49" y2="64" />
                  <line x1="58" y1="46" x2="51" y2="64" />
                  <line x1="58" y1="46" x2="65" y2="64" />
                  <line x1="86" y1="46" x2="79" y2="64" />
                  <line x1="86" y1="46" x2="93" y2="64" />
                </g>
                {/* L1 node */}
                <circle cx="50" cy="12" r="5.5" fill="url(#ref-node-top)" filter="url(#ref-node-shadow)" />
                <text x="50" y="12.8" textAnchor="middle" fontSize="3.2" fontWeight="600" fill="hsl(var(--primary-foreground))">L1</text>
                {/* L2 nodes */}
                <circle cx="28" cy="28" r="4.5" fill="url(#ref-node-top)" filter="url(#ref-node-shadow)" />
                <text x="28" y="29" textAnchor="middle" fontSize="2.8" fontWeight="600" fill="hsl(var(--primary-foreground))">L2</text>
                <circle cx="72" cy="28" r="4.5" fill="url(#ref-node-top)" filter="url(#ref-node-shadow)" />
                <text x="72" y="29" textAnchor="middle" fontSize="2.8" fontWeight="600" fill="hsl(var(--primary-foreground))">L2</text>
                {/* L3 nodes */}
                {[14, 42, 58, 86].map((cx, i) => (
                  <g key={`l3-${i}`}>
                    <circle cx={cx} cy="46" r="4" fill="url(#ref-node-bottom)" filter="url(#ref-node-shadow)" />
                    <text x={cx} y="46.9" textAnchor="middle" fontSize="2.6" fontWeight="600" fill="hsl(var(--primary-foreground))">L3</text>
                  </g>
                ))}
                {/* L4 nodes */}
                {[7, 21, 35, 49, 51, 65, 79, 93].map((cx, i) => (
                  <g key={`l4-${i}`}>
                    <circle cx={cx} cy="64" r="3.2" fill="url(#ref-node-bottom)" filter="url(#ref-node-shadow)" />
                    <text x={cx} y="64.7" textAnchor="middle" fontSize="2.2" fontWeight="600" fill="hsl(var(--primary-foreground))">L4</text>
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">L1 → L2 → … → L7 · Rewards flow down your network</p>
          </div>
          {/* Reward split diagram: each segment (bar) with label directly underneath */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pool split (of 70%)</div>
            <div className="space-y-1" role="img" aria-label="Community rewards pool: Level 1 30%, Level 2 20%, Level 3 10%, Level 4 8%, Level 5 6%, Level 6 4%, Level 7 2%">
              {/* Proportional bar: segments only, no per-segment labels */}
              <div className="flex min-w-0 rounded-md border border-border/50 overflow-hidden">
                {[
                  { flex: 30, barClass: "bg-primary/90 hover:bg-primary" },
                  { flex: 20, barClass: "bg-primary/80 hover:bg-primary/90" },
                  { flex: 10, barClass: "bg-primary/70 hover:bg-primary/80" },
                  { flex: 8, barClass: "bg-primary/60 hover:bg-primary/70" },
                  { flex: 6, barClass: "bg-primary/50 hover:bg-primary/60" },
                  { flex: 4, barClass: "bg-primary/40 hover:bg-primary/50" },
                  { flex: 2, barClass: "bg-primary/30 hover:bg-primary/40 rounded-r-md" },
                ].map((item, i) => (
                  <div key={i} className="flex-1 min-w-0 h-10 flex items-center justify-center" style={{ flex: item.flex }} title={`L${i + 1} ${item.flex}%`}>
                    <div className={`w-full h-full flex items-center justify-center text-[10px] font-medium text-primary-foreground ${item.barClass}`}>
                      {item.flex}%
                    </div>
                  </div>
                ))}
              </div>
              {/* Labels in one row with equal space so L7 2% is never squished */}
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {["L1 30%", "L2 20%", "L3 10%", "L4 8%", "L5 6%", "L6 4%", "L7 2%"].map((label, i) => (
                  <div key={i} className="py-1 text-[10px] sm:text-xs text-muted-foreground font-medium truncate px-0.5" title={label}>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Card>

      {/* Earnings Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">L1–L7 Earnings</div>
          <div className="text-xl sm:text-2xl font-semibold text-primary truncate">
            ${(referralMe?.earningsSummary?.totalEarnedUsd ?? 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">From community rewards (purchases)</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Pool share</div>
          <div className="text-2xl font-semibold text-primary">70%</div>
          <div className="text-xs text-muted-foreground">Onboarding + packages</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Pending Earnings</div>
          <div className="text-xl sm:text-2xl font-semibold truncate">
            ${(referralMe?.earningsSummary?.pendingUsd ?? 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Awaiting settlement</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Paid Earnings</div>
          <div className="text-xl sm:text-2xl font-semibold text-[#10B981] truncate">
            ${(referralMe?.earningsSummary?.paidUsd ?? 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Total paid out</div>
        </Card>
      </div>

      {/* Earnings Table — from my-referrals (people you referred and earnings from them) */}
      <Card>
        <div className="p-4 sm:p-6 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold">Earnings from Referrals</h3>
        </div>
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Source User</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Their Spend</TableHead>
              <TableHead>Your Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myReferrals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No referral earnings yet. Share your link to grow your network.
                </TableCell>
              </TableRow>
            ) : (
              myReferrals.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">{r.referredDisplay}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.joinedAt ? new Date(r.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</TableCell>
                  <TableCell className="font-mono">${r.totalSpendUsd.toFixed(2)}</TableCell>
                  <TableCell className="font-mono font-semibold text-primary">${r.yourEarningsFromThemUsd.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Payout Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Request Payout</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Payout Wallet Address</label>
              {referralMeLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading…
                </div>
              ) : referralMe?.payoutWallet ? (
                <>
                  <Input
                    readOnly
                    value={referralMe.payoutWallet}
                    className="font-mono text-sm bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set in Settings → Profile → Referral Payout Wallet. Update there to change.
                  </p>
                </>
              ) : (
                <>
                  <Input readOnly placeholder="Not set" className="font-mono text-sm bg-muted/50" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure in Settings → Profile → Referral Payout Wallet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => onNavigate("settings")}
                  >
                    Go to Settings
                  </Button>
                </>
              )}
            </div>
            <div className="p-4 bg-secondary/30 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Available Balance:</span>
                <span className="font-mono font-semibold">
                  ${(referralMe?.earningsSummary?.requestableUsd ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minimum Payout:</span>
                <span className="font-mono">${(referralMe?.earningsSummary?.minPayoutUsd ?? 50).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Button
              type="button"
              className="w-full bg-primary text-primary-foreground"
              disabled={
                referralMeLoading ||
                requestPayoutLoading ||
                !(referralMe?.payoutWallet?.trim?.() ?? referralMe?.payoutWallet) ||
                (referralMe?.earningsSummary?.requestableUsd ?? 0) < (referralMe?.earningsSummary?.minPayoutUsd ?? 50)
              }
              onClick={() => handleRequestPayout()}
            >
              {requestPayoutLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Request Payout"
              )}
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Payouts processed within 24-48 hours</p>
              <p>• Minimum payout amount: ${(referralMe?.earningsSummary?.minPayoutUsd ?? 50).toFixed(2)} USDT</p>
              <p>• Ensure wallet address is correct in Settings before requesting</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Payout History (your payout requests: PENDING → APPROVED → PAID or REJECTED) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payout History</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your payout requests. When admin processes and marks one as paid, it will show here with the transaction hash.
        </p>
        {referralMeLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : (referralMe?.payoutRequests?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground py-6">No payout requests yet.</p>
        ) : (
          <div className="space-y-3">
            {(referralMe?.payoutRequests ?? []).map((pr) => (
              <div key={pr.id} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-secondary/30 rounded border border-border">
                <div>
                  <div className="font-mono font-semibold mb-1">${pr.amount.toFixed(2)} {pr.currency}</div>
                  <div className="text-xs text-muted-foreground">
                    Requested {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    {pr.paidAt && ` · Paid ${new Date(pr.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                  </div>
                  {pr.status === "REJECTED" && pr.rejectionReason && (
                    <p className="text-xs text-destructive mt-1">Reason: {pr.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={pr.status === "PAID" ? "default" : pr.status === "REJECTED" ? "destructive" : "secondary"}
                    className={pr.status === "PAID" ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30" : ""}
                  >
                    {pr.status === "PAID" ? "Paid" : pr.status === "REJECTED" ? "Rejected" : pr.status === "APPROVED" ? "Approved" : "Pending"}
                  </Badge>
                  {pr.status === "PAID" && pr.payoutTxId && (
                    <a
                      href={`https://bscscan.com/tx/${pr.payoutTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-mono"
                    >
                      {pr.payoutTxId.slice(0, 10)}…{pr.payoutTxId.slice(-8)}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}