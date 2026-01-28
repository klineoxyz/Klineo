import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "@/app/lib/toast";
import { copyToClipboard } from "@/app/lib/clipboard";

const referralData = {
  code: "KLINEO-XYZ123",
  link: "https://klineo.xyz/ref/XYZ123",
  tier1Earnings: 1275.50,
  tier2Earnings: 342.80,
  pendingEarnings: 85.00,
  paidEarnings: 1533.30,
};

const earningsHistory = [
  { user: "user_abc***", level: 1, purchaseAmount: 100, sharePct: 26.25, amount: 26.25, status: "Paid" },
  { user: "user_def***", level: 1, purchaseAmount: 80, sharePct: 26.25, amount: 21.00, status: "Paid" },
  { user: "user_ghi***", level: 2, purchaseAmount: 60, sharePct: 17.5, amount: 10.50, status: "Paid" },
  { user: "user_jkl***", level: 1, purchaseAmount: 120, sharePct: 26.25, amount: 31.50, status: "Pending" },
  { user: "user_mno***", level: 2, purchaseAmount: 50, sharePct: 17.5, amount: 8.75, status: "Pending" },
];

interface ReferralsProps {
  onNavigate: (view: string) => void;
}

export function Referrals({ onNavigate }: ReferralsProps) {
  const [copied, setCopied] = useState<string | null>(null);

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

      {/* Referral Info */}
      <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4">Your Referral Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2 min-w-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Referral Link</label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <Input value={referralData.link} readOnly className="font-mono text-sm min-w-0" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(referralData.link, "link")}
                >
                  {copied === "link" ? <Check className="size-4 text-[#10B981]" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2 min-w-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Referral Code</label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <Input value={referralData.code} readOnly className="font-mono text-sm min-w-0" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(referralData.code, "code")}
                >
                  {copied === "code" ? <Check className="size-4 text-[#10B981]" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-secondary/30 rounded space-y-4">
          <h4 className="font-semibold text-sm">Community Rewards (70% pool)</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• <span className="text-primary font-medium">70%</span> of every onboarding fee and package purchase goes to the community rewards pool</li>
            <li>• Rewards are from purchases only—not from trading PnL or balances</li>
            <li>• Minimum payout: $50.00 USDT</li>
          </ul>
          {/* Reward split diagram: 70% pool split across 7 levels */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pool split (of 70%)</div>
            <div className="flex h-10 rounded-md overflow-hidden border border-border/50 bg-muted/30" role="img" aria-label="Community rewards pool: Level 1 30%, Level 2 20%, Level 3 10%, Level 4 8%, Level 5 6%, Level 6 4%, Level 7 2%">
              <div className="flex items-center justify-center text-[10px] font-medium text-primary-foreground bg-primary/90 hover:bg-primary min-w-0 flex-1" style={{ flex: "30" }} title="Level 1: 30%">30%</div>
              <div className="flex items-center justify-center text-[10px] font-medium text-primary-foreground bg-primary/80 hover:bg-primary/90 min-w-0 flex-1" style={{ flex: "20" }} title="Level 2: 20%">20%</div>
              <div className="flex items-center justify-center text-[10px] font-medium text-primary-foreground bg-primary/70 hover:bg-primary/80 min-w-0 flex-1" style={{ flex: "10" }} title="Level 3: 10%">10%</div>
              <div className="flex items-center justify-center text-[10px] font-medium text-primary-foreground bg-primary/60 hover:bg-primary/70 min-w-0 flex-1" style={{ flex: "8" }} title="Level 4: 8%">8%</div>
              <div className="flex items-center justify-center text-[10px] font-medium text-primary-foreground bg-primary/50 hover:bg-primary/60 min-w-0 flex-1" style={{ flex: "6" }} title="Level 5: 6%">6%</div>
              <div className="flex items-center justify-center text-[10px] font-medium text-primary-foreground bg-primary/40 hover:bg-primary/50 min-w-0 flex-1" style={{ flex: "4" }} title="Level 6: 4%">4%</div>
              <div className="flex items-center justify-center text-[10px] font-medium text-primary-foreground bg-primary/30 hover:bg-primary/40 min-w-0 flex-1 rounded-r-md" style={{ flex: "2" }} title="Level 7: 2%">2%</div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>L1 30%</span>
              <span>L2 20%</span>
              <span>L3 10%</span>
              <span>L4 8%</span>
              <span>L5 6%</span>
              <span>L6 4%</span>
              <span>L7 2%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Earnings Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">L1–L7 Earnings</div>
          <div className="text-xl sm:text-2xl font-semibold text-primary truncate">${(referralData.tier1Earnings + referralData.tier2Earnings).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">From community rewards (purchases)</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Pool share</div>
          <div className="text-2xl font-semibold text-primary">70%</div>
          <div className="text-xs text-muted-foreground">Onboarding + packages</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Pending Earnings</div>
          <div className="text-xl sm:text-2xl font-semibold truncate">${referralData.pendingEarnings.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Awaiting settlement</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Paid Earnings</div>
          <div className="text-xl sm:text-2xl font-semibold text-[#10B981] truncate">${referralData.paidEarnings.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Total paid out</div>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <div className="p-4 sm:p-6 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold">Earnings History</h3>
        </div>
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Source User</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Purchase Amount</TableHead>
              <TableHead>Share %</TableHead>
              <TableHead>Your Share</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earningsHistory.map((earning, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm">{earning.user}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={earning.level === 1 ? "border-primary/50 text-primary" : ""}>
                    L{earning.level}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">${earning.purchaseAmount.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{earning.sharePct}%</TableCell>
                <TableCell className="font-mono font-semibold text-primary">${earning.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={earning.status === "Paid" ? "default" : "secondary"}
                    className={earning.status === "Paid" ? "border-[#10B981]/50 text-[#10B981] bg-[#10B981]/10" : ""}
                  >
                    {earning.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Payout Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Request Payout</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Payout Wallet Address</label>
              <Input placeholder="Enter USDT (TRC-20) wallet address" className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-1">Configure in Settings → Referral Payout Wallet</p>
            </div>
            <div className="p-4 bg-secondary/30 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Available Balance:</span>
                <span className="font-mono font-semibold">${referralData.pendingEarnings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minimum Payout:</span>
                <span className="font-mono">$50.00</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Button 
              className="w-full bg-primary text-primary-foreground" 
              disabled={referralData.pendingEarnings < 50}
            >
              Request Payout
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Payouts processed within 24-48 hours</p>
              <p>• Minimum payout amount: $50.00 USDT</p>
              <p>• Ensure wallet address is correct before requesting</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Payout History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payout History</h3>
        <div className="space-y-3">
          {[
            { date: "Jan 15, 2026", amount: "$250.00", status: "Completed", txHash: "0xabc...def" },
            { date: "Dec 10, 2025", amount: "$180.50", status: "Completed", txHash: "0x123...456" },
            { date: "Nov 05, 2025", amount: "$320.80", status: "Completed", txHash: "0x789...abc" },
          ].map((payout, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded border border-border">
              <div>
                <div className="font-mono font-semibold mb-1">{payout.amount}</div>
                <div className="text-xs text-muted-foreground">{payout.date}</div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="border-[#10B981]/50 text-[#10B981]">
                  {payout.status}
                </Badge>
                <Button variant="ghost" size="sm" className="gap-1">
                  <span className="font-mono text-xs">{payout.txHash}</span>
                  <ExternalLink className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}