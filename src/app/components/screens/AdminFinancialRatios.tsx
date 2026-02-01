import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "@/app/lib/toast";
import { Download, DollarSign, Users, Activity, Loader2, BarChart3, RefreshCw, TrendingUp, UserPlus, Zap, Link2 } from "lucide-react";

const WINDOWS = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "mtd", label: "MTD" },
  { value: "prev_month", label: "Previous month" },
] as const;

type WindowKey = (typeof WINDOWS)[number]["value"];

interface RatiosResponse {
  window: string;
  from: string;
  to: string;
  label: string;
  kpis: Record<string, number | string>;
  ratios: Record<string, number | string>;
  notes: string[];
}

interface TimeseriesResponse {
  metric: string;
  days: number;
  from: string;
  to: string;
  timeseries: Array<{ date: string; value: number }>;
}

interface TopPayerRow {
  user_id_masked: string;
  total_usd: number;
  last_payment_at: string;
}

interface RefundFailRow {
  user_id_masked: string;
  amount_usd: number;
  status: string;
  created_at: string;
}

interface MarketingSpendRow {
  id: string;
  period_start: string;
  period_end: string;
  spend_usdt: number;
  notes: string | null;
  created_at: string;
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

export function AdminFinancialRatios() {
  const [windowKey, setWindowKey] = useState<WindowKey>("7d");
  const [ratios, setRatios] = useState<RatiosResponse | null>(null);
  const [timeseriesRevenue, setTimeseriesRevenue] = useState<TimeseriesResponse | null>(null);
  const [timeseriesPayingUsers, setTimeseriesPayingUsers] = useState<TimeseriesResponse | null>(null);
  const [timeseriesTickSuccess, setTimeseriesTickSuccess] = useState<TimeseriesResponse | null>(null);
  const [timeseriesActiveUsers, setTimeseriesActiveUsers] = useState<TimeseriesResponse | null>(null);
  const [topPayers, setTopPayers] = useState<TopPayerRow[]>([]);
  const [refundsFails, setRefundsFails] = useState<RefundFailRow[]>([]);
  const [marketingSpend, setMarketingSpend] = useState<MarketingSpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tsLoading, setTsLoading] = useState(false);
  const [marketingForm, setMarketingForm] = useState({ period_start: "", period_end: "", spend_usdt: "", notes: "" });
  const [marketingSubmitting, setMarketingSubmitting] = useState(false);

  const loadRatios = async () => {
    setLoading(true);
    try {
      const data = await api.get<RatiosResponse>(`/api/admin/financial-ratios?window=${windowKey}`);
      setRatios(data);
    } catch (e: unknown) {
      toast.error("Failed to load financial ratios");
      setRatios(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeseries = async () => {
    setTsLoading(true);
    try {
      const [rev, pay, tick, active] = await Promise.all([
        api.get<TimeseriesResponse>("/api/admin/financial-ratios/timeseries?metric=revenue&days=90"),
        api.get<TimeseriesResponse>("/api/admin/financial-ratios/timeseries?metric=paying_users&days=90"),
        api.get<TimeseriesResponse>("/api/admin/financial-ratios/timeseries?metric=tick_success&days=90"),
        api.get<TimeseriesResponse>("/api/admin/financial-ratios/timeseries?metric=active_users&days=90"),
      ]);
      setTimeseriesRevenue(rev);
      setTimeseriesPayingUsers(pay);
      setTimeseriesTickSuccess(tick);
      setTimeseriesActiveUsers(active);
    } catch {
      setTimeseriesRevenue(null);
      setTimeseriesPayingUsers(null);
      setTimeseriesTickSuccess(null);
      setTimeseriesActiveUsers(null);
    } finally {
      setTsLoading(false);
    }
  };

  const loadTopPayers = async () => {
    try {
      const data = await api.get<{ topPayers: TopPayerRow[] }>(`/api/admin/financial-ratios/top-payers?window=${windowKey}&limit=20`);
      setTopPayers(data.topPayers || []);
    } catch {
      setTopPayers([]);
    }
  };

  const loadRefundsFails = async () => {
    try {
      const data = await api.get<{ refundsFails: RefundFailRow[] }>(`/api/admin/financial-ratios/refunds-fails?window=${windowKey}&limit=50`);
      setRefundsFails(data.refundsFails || []);
    } catch {
      setRefundsFails([]);
    }
  };

  const loadMarketingSpend = async () => {
    try {
      const data = await api.get<{ marketingSpend: MarketingSpendRow[] }>("/api/admin/marketing-spend");
      setMarketingSpend(data.marketingSpend || []);
    } catch {
      setMarketingSpend([]);
    }
  };

  useEffect(() => {
    loadRatios();
    loadTopPayers();
    loadRefundsFails();
  }, [windowKey]);

  useEffect(() => {
    loadTimeseries();
    loadMarketingSpend();
  }, []);

  const handleExportJSON = () => {
    if (!ratios) return;
    downloadJSON(
      { ratios, topPayers, refundsFails, exportedAt: new Date().toISOString() },
      `financial-ratios-${windowKey}-${new Date().toISOString().slice(0, 10)}.json`
    );
    toast.success("Exported JSON");
  };

  const handleExportCSV = () => {
    const rows = topPayers.map((r) => ({ user_id_masked: r.user_id_masked, total_usd: r.total_usd, last_payment_at: r.last_payment_at }));
    downloadCSV(
      rows,
      [
        { key: "user_id_masked", header: "User (masked)" },
        { key: "total_usd", header: "Total USD" },
        { key: "last_payment_at", header: "Last payment at" },
      ],
      `top-payers-${windowKey}.csv`
    );
    toast.success("Exported CSV");
  };

  const handleSubmitMarketingSpend = async () => {
    if (!marketingForm.period_start || !marketingForm.period_end || marketingForm.spend_usdt === "") {
      toast.error("Period start, end and spend required");
      return;
    }
    setMarketingSubmitting(true);
    try {
      await api.post("/api/admin/marketing-spend", {
        period_start: marketingForm.period_start,
        period_end: marketingForm.period_end,
        spend_usdt: parseFloat(marketingForm.spend_usdt),
        notes: marketingForm.notes || undefined,
      });
      toast.success("Marketing spend saved");
      setMarketingForm({ period_start: "", period_end: "", spend_usdt: "", notes: "" });
      loadMarketingSpend();
      loadRatios();
    } catch (e: unknown) {
      toast.error("Failed to save marketing spend");
    } finally {
      setMarketingSubmitting(false);
    }
  };

  const kpis = ratios?.kpis ?? {};
  const ratiosMap = ratios?.ratios ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            Financial Ratios
          </h2>
          <p className="text-sm text-muted-foreground">Platform KPIs, revenue, growth, and ops (no PII)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={windowKey} onValueChange={(v: WindowKey) => setWindowKey(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Window" />
            </SelectTrigger>
            <SelectContent>
              {WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { loadRatios(); loadTopPayers(); loadRefundsFails(); }}>
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={!ratios}>
            <Download className="size-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={topPayers.length === 0}>
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {ratios?.notes?.length ? (
        <Card className="p-3 border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-muted-foreground">Skipped: {ratios.notes.join("; ")}</p>
        </Card>
      ) : null}

      {loading ? (
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading ratios...</span>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="size-3.5" /> Gross revenue
              </div>
              <div className="text-xl font-semibold text-primary">${Number(kpis.gross_revenue_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Net revenue</div>
              <div className="text-xl font-semibold">${Number(kpis.net_revenue_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Users className="size-3.5" /> Paying users
              </div>
              <div className="text-xl font-semibold">{Number(kpis.paying_users ?? 0)}</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Conversion rate</div>
              <div className="text-xl font-semibold">{Number(ratiosMap.conversion_rate ?? 0) * 100}%</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">ARPU</div>
              <div className="text-xl font-semibold">${Number(kpis.arpu ?? 0).toFixed(2)}</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Activity className="size-3.5" /> Tick success rate
              </div>
              <div className="text-xl font-semibold">{Number(ratiosMap.tick_success_rate ?? 0) * 100}%</div>
            </Card>
          </div>

          {/* Activity & traders: DAU, WAU, MAU, new users, connections, strategies */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Activity & traders
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Daily / weekly / monthly active users (strategy tick activity). New signups and platform connections.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">DAU</div>
                <div className="text-xl font-semibold text-primary">{Number(kpis.dau ?? 0)}</div>
                <div className="text-[10px] text-muted-foreground">Daily active (24h)</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">WAU</div>
                <div className="text-xl font-semibold">{Number(kpis.wau ?? 0)}</div>
                <div className="text-[10px] text-muted-foreground">Weekly active (7d)</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">MAU</div>
                <div className="text-xl font-semibold">{Number(kpis.mau ?? 0)}</div>
                <div className="text-[10px] text-muted-foreground">Monthly active (30d)</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <UserPlus className="size-3.5" /> New users (7d)
                </div>
                <div className="text-xl font-semibold">{Number(kpis.new_users_7d ?? 0)}</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">New users (30d)</div>
                <div className="text-xl font-semibold">{Number(kpis.new_users_30d ?? 0)}</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Link2 className="size-3.5" /> Connections
                </div>
                <div className="text-xl font-semibold">{Number(kpis.total_connections ?? 0)}</div>
                <div className="text-[10px] text-muted-foreground">{Number(kpis.connections_ok ?? 0)} OK</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Zap className="size-3.5" /> Active strategies
                </div>
                <div className="text-xl font-semibold">{Number(kpis.active_strategies ?? 0)}</div>
                <div className="text-[10px] text-muted-foreground">{Number(kpis.total_strategy_runs ?? 0)} total</div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Revenue trend (90 days)</h3>
              {tsLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : timeseriesRevenue?.timeseries?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timeseriesRevenue.timeseries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} labelFormatter={(l) => l} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No revenue data</div>
              )}
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Paying users trend (90 days)</h3>
              {tsLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : timeseriesPayingUsers?.timeseries?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timeseriesPayingUsers.timeseries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Paying users" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
              )}
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Daily active users (90 days)</h3>
              {tsLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : timeseriesActiveUsers?.timeseries?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timeseriesActiveUsers.timeseries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [v, "Active users"]} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="DAU" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No activity data</div>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Tick success rate (90 days)</h3>
            {tsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : timeseriesTickSuccess?.timeseries?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeseriesTickSuccess.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, "Success rate"]} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Success rate" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No tick data</div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Top payers (masked)</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Total USD</TableHead>
                    <TableHead>Last payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">No payers in period</TableCell>
                    </TableRow>
                  ) : (
                    topPayers.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.user_id_masked}</TableCell>
                        <TableCell className="text-right font-mono">${r.total_usd.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.last_payment_at ? new Date(r.last_payment_at).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Refunds / fails</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundsFails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-4">None in period</TableCell>
                    </TableRow>
                  ) : (
                    refundsFails.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.user_id_masked}</TableCell>
                        <TableCell className="text-right font-mono">${r.amount_usd.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={r.status === "refunded" ? "text-amber-600" : "text-destructive"}>{r.status}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Marketing spend (CAC)</h3>
            <p className="text-xs text-muted-foreground mb-4">Add spend per period to compute CAC. Match period to the ratios window for LTV:CAC.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="space-y-1">
                <Label className="text-xs">Period start (YYYY-MM-DD)</Label>
                <Input
                  placeholder="2026-01-01"
                  value={marketingForm.period_start}
                  onChange={(e) => setMarketingForm((f) => ({ ...f, period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Period end (YYYY-MM-DD)</Label>
                <Input
                  placeholder="2026-01-31"
                  value={marketingForm.period_end}
                  onChange={(e) => setMarketingForm((f) => ({ ...f, period_end: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Spend USDT</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={marketingForm.spend_usdt}
                  onChange={(e) => setMarketingForm((f) => ({ ...f, spend_usdt: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  placeholder="Optional"
                  value={marketingForm.notes}
                  onChange={(e) => setMarketingForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <Button size="sm" onClick={handleSubmitMarketingSpend} disabled={marketingSubmitting}>
              {marketingSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save marketing spend
            </Button>
            {marketingSpend.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Spend USDT</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketingSpend.slice(0, 10).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.period_start} → {r.period_end}</TableCell>
                        <TableCell className="text-right font-mono">${r.spend_usdt.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </Card>
        </>
      )}
    </div>
  );
}

