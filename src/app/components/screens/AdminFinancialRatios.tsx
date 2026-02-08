import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "@/app/lib/toast";
import { Download, DollarSign, Users, Activity, Loader2, BarChart3, RefreshCw, TrendingUp, UserPlus, Zap, Link2, Building2 } from "lucide-react";

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

interface ByExchangeRow {
  exchange: string;
  connections: number;
  connections_ok: number;
  strategy_runs_total: number;
  strategy_runs_active: number;
  ticks_in_window: number;
  ticks_ok: number;
  ticks_error: number;
  orders_placed_in_window: number;
  trades_count_in_window: number;
  volume_usd_in_window: number;
}

const PLATFORMS = [
  { value: "all", label: "All (CEX + DEX)" },
  { value: "cex", label: "CEX only" },
  { value: "dex", label: "DEX only" },
] as const;

type PlatformKey = (typeof PLATFORMS)[number]["value"];

/** Known CEX/DEX so the Exchange dropdown always shows filter options even with no connections yet. */
const KNOWN_CEX = ["binance", "bybit"];
const KNOWN_DEX: string[] = [];

/** Exchange filter: "all" = all connected exchanges; otherwise single exchange (e.g. binance, bybit). */
type ExchangeFilterKey = "all" | string;

interface TimeseriesByExchangeResponse {
  metric: string;
  days: number;
  platform: string;
  exchangeList: string[];
  timeseries: Array<Record<string, number | string>>;
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

const CHART_COLORS = ["hsl(var(--primary))", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#3B82F6"];

export function AdminFinancialRatios() {
  const [windowKey, setWindowKey] = useState<WindowKey>("7d");
  const [platformKey, setPlatformKey] = useState<PlatformKey>("all");
  const [exchangeKey, setExchangeKey] = useState<ExchangeFilterKey>("all");
  const [ratios, setRatios] = useState<RatiosResponse | null>(null);
  const [timeseriesRevenue, setTimeseriesRevenue] = useState<TimeseriesResponse | null>(null);
  const [timeseriesPayingUsers, setTimeseriesPayingUsers] = useState<TimeseriesResponse | null>(null);
  const [timeseriesTickSuccess, setTimeseriesTickSuccess] = useState<TimeseriesResponse | null>(null);
  const [timeseriesActiveUsers, setTimeseriesActiveUsers] = useState<TimeseriesResponse | null>(null);
  const [topPayers, setTopPayers] = useState<TopPayerRow[]>([]);
  const [refundsFails, setRefundsFails] = useState<RefundFailRow[]>([]);
  const [marketingSpend, setMarketingSpend] = useState<MarketingSpendRow[]>([]);
  const [byExchange, setByExchange] = useState<ByExchangeRow[]>([]);
  /** Full list of exchanges for dropdown: from API (connected) merged with known CEX/DEX so filters are always visible */
  const [availableExchanges, setAvailableExchanges] = useState<string[]>([]);
  const exchangeOptions = Array.from(new Set([...KNOWN_CEX, ...KNOWN_DEX, ...availableExchanges])).sort();
  const cexOptions = exchangeOptions.filter((ex) => KNOWN_CEX.includes(ex));
  const dexOptions = exchangeOptions.filter((ex) => KNOWN_DEX.includes(ex));
  const otherOptions = exchangeOptions.filter((ex) => !KNOWN_CEX.includes(ex) && !KNOWN_DEX.includes(ex));
  const [tsByExchange, setTsByExchange] = useState<TimeseriesByExchangeResponse | null>(null);
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

  const loadByExchange = async () => {
    try {
      const params = new URLSearchParams({ window: windowKey, platform: platformKey });
      if (exchangeKey !== "all") params.set("exchange", exchangeKey);
      const data = await api.get<{ byExchange: ByExchangeRow[] }>(`/api/admin/financial-ratios/by-exchange?${params}`);
      const list = data.byExchange || [];
      setByExchange(list);
      if (exchangeKey === "all") {
        setAvailableExchanges(list.filter((r) => r.exchange !== "mix").map((r) => r.exchange));
      }
    } catch {
      setByExchange([]);
    }
  };

  const loadTimeseriesByExchange = async () => {
    try {
      const params = new URLSearchParams({ metric: "volume", days: "90", platform: platformKey });
      if (exchangeKey !== "all") params.set("exchange", exchangeKey);
      const data = await api.get<TimeseriesByExchangeResponse>(`/api/admin/financial-ratios/timeseries-by-exchange?${params}`);
      setTsByExchange(data);
    } catch {
      setTsByExchange(null);
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
    loadByExchange();
  }, [windowKey]);

  useEffect(() => {
    loadByExchange();
    loadTimeseriesByExchange();
  }, [platformKey, exchangeKey]);

  useEffect(() => {
    loadTimeseries();
    loadMarketingSpend();
    loadTimeseriesByExchange();
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

  const handleExportByExchangeCSV = () => {
    const cols = [
      { key: "exchange", header: "Exchange" },
      { key: "connections", header: "Connections" },
      { key: "connections_ok", header: "OK" },
      { key: "strategy_runs_total", header: "Strategy runs" },
      { key: "strategy_runs_active", header: "Active" },
      { key: "ticks_in_window", header: "Ticks" },
      { key: "orders_placed_in_window", header: "Orders" },
      { key: "trades_count_in_window", header: "Trades" },
      { key: "volume_usd_in_window", header: "Volume USD" },
    ];
    const rows = byExchange.map((r) => ({ ...r, exchange: r.exchange === "mix" ? "Mix (all)" : r.exchange }));
    downloadCSV(rows, cols, `platform-by-exchange-${windowKey}.csv`);
    toast.success("Exported by-exchange CSV");
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
          <p className="text-sm text-muted-foreground">Platform KPIs, revenue, growth, and ops (no PII).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadRatios(); loadTopPayers(); loadRefundsFails(); loadByExchange(); loadTimeseriesByExchange(); }}>
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={!ratios}>
            <Download className="size-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={topPayers.length === 0}>
            <Download className="size-4 mr-2" />
            Top payers CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportByExchangeCSV} disabled={byExchange.length === 0}>
            <Download className="size-4 mr-2" />
            By exchange CSV
          </Button>
        </div>
      </div>

      {/* Filter bar: Window, Platform (All CEX+DEX / CEX only / DEX only), Exchange (All or per CEX/DEX) */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time window</Label>
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
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform</Label>
            <Select value={platformKey} onValueChange={(v: PlatformKey) => setPlatformKey(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">All CEX+DEX, CEX only, or DEX only</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Exchange</Label>
            <Select value={exchangeKey} onValueChange={(v: ExchangeFilterKey) => setExchangeKey(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All exchanges</SelectItem>
                {cexOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground">Centralized (CEX)</SelectLabel>
                    {cexOptions.map((ex) => (
                      <SelectItem key={ex} value={ex}>
                        {ex.charAt(0).toUpperCase() + ex.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {dexOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground">Decentralized (DEX)</SelectLabel>
                    {dexOptions.map((ex) => (
                      <SelectItem key={ex} value={ex}>
                        {ex.charAt(0).toUpperCase() + ex.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {otherOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground">Other</SelectLabel>
                    {otherOptions.map((ex) => (
                      <SelectItem key={ex} value={ex}>
                        {ex.charAt(0).toUpperCase() + ex.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">All or a single CEX/DEX</p>
          </div>
        </div>
      </Card>

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

          {/* User analytics: referred, package mix */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="size-4 text-primary" />
              User analytics
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Referral attribution and package distribution.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Referred users (total)</div>
                <div className="text-xl font-semibold text-primary">{Number(kpis.referred_users_total ?? 0)}</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Referred (window)</div>
                <div className="text-xl font-semibold">{Number(kpis.referred_users_in_window ?? 0)}</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Starter ($100)</div>
                <div className="text-xl font-semibold">{Number(kpis.package_starter ?? 0)}</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Pro ($200)</div>
                <div className="text-xl font-semibold">{Number(kpis.package_pro ?? 0)}</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Unlimited ($500)</div>
                <div className="text-xl font-semibold">{Number(kpis.package_unlimited ?? 0)}</div>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Package total</div>
                <div className="text-xl font-semibold">{Number(kpis.package_total ?? 0)}</div>
              </Card>
            </div>
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

          {/* Trends & charts: rich charts for revenue, users, activity, tick success */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Trends & charts (90 days)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Revenue, paying users, daily active users, and tick success rate over time.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Revenue trend</h4>
                {tsLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timeseriesRevenue?.timeseries?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={timeseriesRevenue.timeseries}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} labelFormatter={(l) => l} contentStyle={{ borderRadius: 8 }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueGrad)" name="Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No revenue data</div>
                )}
              </Card>
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Paying users trend</h4>
                {tsLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timeseriesPayingUsers?.timeseries?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={timeseriesPayingUsers.timeseries}>
                      <defs>
                        <linearGradient id="payingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [v, "Paying users"]} contentStyle={{ borderRadius: 8 }} />
                      <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#payingGrad)" name="Paying users" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                )}
              </Card>
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Daily active users</h4>
                {tsLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timeseriesActiveUsers?.timeseries?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={timeseriesActiveUsers.timeseries}>
                      <defs>
                        <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [v, "Active users"]} contentStyle={{ borderRadius: 8 }} />
                      <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fill="url(#dauGrad)" name="DAU" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No activity data</div>
                )}
              </Card>
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Tick success rate</h4>
                {tsLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timeseriesTickSuccess?.timeseries?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={timeseriesTickSuccess.timeseries}>
                      <defs>
                        <linearGradient id="tickGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, "Success rate"]} contentStyle={{ borderRadius: 8 }} />
                      <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} fill="url(#tickGrad)" name="Success rate" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No tick data</div>
                )}
              </Card>
            </div>
          </div>

          {/* Platform & by exchange: table and volume chart use Window + Platform + Exchange from header */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Platform & by exchange
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Mix = platform aggregate. Window: {ratios?.label ?? windowKey}. Use the filters above to show All, CEX only, DEX only, or a single exchange.</p>
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exchange</TableHead>
                    <TableHead className="text-right">Connections</TableHead>
                    <TableHead className="text-right">OK</TableHead>
                    <TableHead className="text-right">Strategy runs</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Ticks (window)</TableHead>
                    <TableHead className="text-right">Orders placed</TableHead>
                    <TableHead className="text-right">Trades</TableHead>
                    <TableHead className="text-right">Volume USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byExchange.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground text-sm py-4">No exchange data</TableCell>
                    </TableRow>
                  ) : (
                    byExchange.map((r) => (
                      <TableRow key={r.exchange} className={r.exchange === "mix" ? "bg-primary/5 font-medium" : ""}>
                        <TableCell className="font-medium">{r.exchange === "mix" ? "Mix (all)" : (r.exchange.charAt(0).toUpperCase() + r.exchange.slice(1))}</TableCell>
                        <TableCell className="text-right font-mono">{r.connections}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{r.connections_ok}</TableCell>
                        <TableCell className="text-right font-mono">{r.strategy_runs_total}</TableCell>
                        <TableCell className="text-right font-mono">{r.strategy_runs_active}</TableCell>
                        <TableCell className="text-right font-mono">{r.ticks_in_window}</TableCell>
                        <TableCell className="text-right font-mono">{r.orders_placed_in_window}</TableCell>
                        <TableCell className="text-right font-mono">{r.trades_count_in_window}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">${r.volume_usd_in_window.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Volume by exchange (stacked bar chart) */}
            {tsByExchange?.timeseries?.length ? (
              <Card className="p-4 mt-4">
                <h3 className="text-sm font-semibold mb-3">Trading volume by exchange (90 days) — {platformKey === "all" ? "All" : platformKey.toUpperCase()}</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={tsByExchange.timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      {tsByExchange.exchangeList.map((ex, i) => (
                        <linearGradient key={ex} id={`vol-${ex}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.5} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)} />
                    <Tooltip
                      formatter={(v: number, name: string) => [`$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, name]}
                      labelFormatter={(l) => l}
                      contentStyle={{ borderRadius: 8 }}
                    />
                    <Legend />
                    {tsByExchange.exchangeList.map((ex, i) => (
                      <Bar key={ex} dataKey={ex} stackId="vol" fill={`url(#vol-${ex})`} name={ex.charAt(0).toUpperCase() + ex.slice(1)} radius={[0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ) : null}
          </div>

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

