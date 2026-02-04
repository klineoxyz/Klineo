/**
 * Admin Financial Ratios: KPIs, timeseries, marketing spend.
 * Production-safe: no secrets, no PII in aggregates. Mask user_id as user_****abcd.
 */
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validate } from '../middleware/validation.js';

const REFERRAL_POOL_PCT = parseFloat(process.env.REFERRAL_POOL_PCT || '70');
const PLATFORM_PCT = parseFloat(process.env.PLATFORM_PCT || '20');
const MARKETING_PCT = parseFloat(process.env.MARKETING_PCT || '10');
const PCT_SUM = REFERRAL_POOL_PCT + PLATFORM_PCT + MARKETING_PCT;
if (Math.abs(PCT_SUM - 100) > 0.01) {
  console.warn(`[Financial Ratios] REFERRAL_POOL_PCT+PLATFORM_PCT+MARKETING_PCT = ${PCT_SUM}, expected 100`);
}

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

type WindowKey = '24h' | '7d' | '30d' | '90d' | 'mtd' | 'prev_month';
function parseWindow(q: unknown): { from: Date; to: Date; label: string } {
  const to = new Date();
  let from = new Date(to);
  let label = 'Last 7 days';
  const s = String(q || '7d').toLowerCase();
  if (s === '24h') {
    from.setHours(from.getHours() - 24);
    label = 'Last 24 hours';
  } else if (s === '30d') {
    from.setDate(from.getDate() - 30);
    label = 'Last 30 days';
  } else if (s === '90d') {
    from.setDate(from.getDate() - 90);
    label = 'Last 90 days';
  } else if (s === 'mtd') {
    from = new Date(to.getFullYear(), to.getMonth(), 1);
    label = 'Month to date';
  } else if (s === 'prev_month') {
    from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
    to.setTime(new Date(to.getFullYear(), to.getMonth(), 0, 23, 59, 59, 999).getTime());
    from.setTime(from.getTime());
    label = 'Previous month';
  } else {
    from.setDate(from.getDate() - 7);
  }
  return { from, to, label };
}

function maskUserId(id: string): string {
  if (!id || id.length < 8) return 'user_****';
  return 'user_****' + id.slice(-4);
}

// In-memory cache: 30s TTL
let cache: { key: string; data: unknown; expires: number } | null = null;
const CACHE_TTL_MS = 30_000;
function getCached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  if (cache && cache.key === key && cache.expires > now) return Promise.resolve(cache.data as T);
  return fn().then((data) => {
    cache = { key, data, expires: now + CACHE_TTL_MS };
    return data;
  });
}

export const financialRatiosRouter: Router = Router();

/**
 * GET /api/admin/financial-ratios?window=7d|30d|90d|mtd|prev_month
 * Returns KPIs + ratios for the window. Gracefully skips missing tables.
 */
financialRatiosRouter.get('/', async (req: Request, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const windowParam = (req.query.window as string) || '7d';
  const { from, to, label } = parseWindow(windowParam);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const cacheKey = `ratios:${windowParam}:${Math.floor(from.getTime() / 60000)}`;
  const result = await getCached(cacheKey, async () => {
    const notes: string[] = [];
    const kpis: Record<string, number | string> = {};
    const ratios: Record<string, number | string> = {};

    // --- Revenue (eligible_purchases) ---
    try {
      const { data: purchases, error } = await client
        .from('eligible_purchases')
        .select('amount, status, user_id, created_at')
        .gte('created_at', fromIso)
        .lte('created_at', toIso);

      if (error) throw error;
      const rows = purchases || [];
      const gross = rows.filter((r: { status: string }) => r.status === 'completed').reduce((s: number, r: { amount: unknown }) => s + Number(r.amount ?? 0), 0);
      const refunds = rows.filter((r: { status: string }) => r.status === 'refunded').reduce((s: number, r: { amount: unknown }) => s + Number(r.amount ?? 0), 0);
      const payingUserIds = [...new Set(rows.filter((r: { status: string }) => r.status === 'completed').map((r: { user_id: string }) => r.user_id))];
      const payingUsers = payingUserIds.length;
      const net = gross - refunds;

      kpis.gross_revenue_usd = Math.round(gross * 100) / 100;
      kpis.net_revenue_usd = Math.round(net * 100) / 100;
      kpis.refunds_usd = Math.round(refunds * 100) / 100;
      kpis.paying_users = payingUsers;
      ratios.marketing_allocation_pct = MARKETING_PCT;
      ratios.platform_allocation_pct = PLATFORM_PCT;
      ratios.referral_pool_pct = REFERRAL_POOL_PCT;
      ratios.marketing_allocation_usd = Math.round((gross * MARKETING_PCT / 100) * 100) / 100;
      ratios.platform_allocation_usd = Math.round((gross * PLATFORM_PCT / 100) * 100) / 100;
      ratios.referral_pool_usd = Math.round((gross * REFERRAL_POOL_PCT / 100) * 100) / 100;
      ratios.take_rate = gross > 0 ? Math.round((PLATFORM_PCT / 100) * 10000) / 10000 : 0;
    } catch (e) {
      notes.push('Revenue metrics skipped: eligible_purchases unavailable');
    }

    // --- Users: new, active (tick proxy) ---
    try {
      const { count: newUsersCount } = await client.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', fromIso).lte('created_at', toIso);
      kpis.new_users = newUsersCount ?? 0;
    } catch {
      notes.push('New users skipped');
    }

    try {
      const { data: tickRows } = await client.from('strategy_tick_runs').select('user_id').gte('scheduled_at', fromIso).lte('scheduled_at', toIso);
      const activeUserIds = new Set((tickRows || []).map((r: { user_id: string }) => r.user_id));
      kpis.active_users = activeUserIds.size;
    } catch {
      if (!('active_users' in kpis)) kpis.active_users = 0;
      notes.push('Active users from strategy_tick_runs skipped');
    }

    // --- DAU / MAU / WAU (always computed: last 24h, 7d, 30d) ---
    try {
      const now = new Date();
      const dayAgo = new Date(now); dayAgo.setHours(dayAgo.getHours() - 24);
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
      const dayIso = dayAgo.toISOString();
      const weekIso = weekAgo.toISOString();
      const monthIso = monthAgo.toISOString();

      const [dauRes, wauRes, mauRes] = await Promise.all([
        client.from('strategy_tick_runs').select('user_id').gte('scheduled_at', dayIso).lte('scheduled_at', toIso),
        client.from('strategy_tick_runs').select('user_id').gte('scheduled_at', weekIso).lte('scheduled_at', toIso),
        client.from('strategy_tick_runs').select('user_id').gte('scheduled_at', monthIso).lte('scheduled_at', toIso),
      ]);
      const dauSet = new Set((dauRes.data || []).map((r: { user_id: string }) => r.user_id));
      const wauSet = new Set((wauRes.data || []).map((r: { user_id: string }) => r.user_id));
      const mauSet = new Set((mauRes.data || []).map((r: { user_id: string }) => r.user_id));
      kpis.dau = dauSet.size;
      kpis.wau = wauSet.size;
      kpis.mau = mauSet.size;
    } catch {
      kpis.dau = 0;
      kpis.wau = 0;
      kpis.mau = 0;
      notes.push('DAU/WAU/MAU skipped');
    }

    // --- New users 7d / 30d (for growth context) ---
    try {
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
      const { count: new7 } = await client.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString());
      const { count: new30 } = await client.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo.toISOString());
      kpis.new_users_7d = new7 ?? 0;
      kpis.new_users_30d = new30 ?? 0;
    } catch {
      kpis.new_users_7d = 0;
      kpis.new_users_30d = 0;
    }

    const payingUsersCount = kpis.paying_users as number ?? 0;
    const newUsersCount = kpis.new_users as number ?? 0;
    const activeUsersCount = kpis.active_users as number ?? 0;
    const grossRev = kpis.gross_revenue_usd as number ?? 0;
    if (newUsersCount > 0) ratios.conversion_rate = Math.round((payingUsersCount / newUsersCount) * 10000) / 10000;
    else ratios.conversion_rate = 0;
    if (activeUsersCount > 0) ratios.conversion_active = Math.round((payingUsersCount / activeUsersCount) * 10000) / 10000;
    else ratios.conversion_active = 0;
    const totalUsersInPeriod = Math.max(activeUsersCount, newUsersCount, 1);
    kpis.arpu = totalUsersInPeriod > 0 ? Math.round((grossRev / totalUsersInPeriod) * 100) / 100 : 0;
    kpis.arppu = payingUsersCount > 0 ? Math.round((grossRev / payingUsersCount) * 100) / 100 : 0;

    // --- Ops: connections, strategy runs, ticks ---
    try {
      const { data: conns } = await client.from('user_exchange_connections').select('id, last_test_status, futures_enabled, kill_switch');
      const connList = conns || [];
      const totalConn = connList.length;
      const okConn = connList.filter((c: { last_test_status?: string }) => c.last_test_status === 'ok').length;
      const futuresEnabled = connList.filter((c: { futures_enabled?: boolean }) => c.futures_enabled === true).length;
      const killSwitchOn = connList.filter((c: { kill_switch?: boolean }) => c.kill_switch === true).length;
      ratios.connections_health_rate = totalConn > 0 ? Math.round((okConn / totalConn) * 10000) / 10000 : 0;
      ratios.futures_enabled_rate = totalConn > 0 ? Math.round((futuresEnabled / totalConn) * 10000) / 10000 : 0;
      ratios.kill_switch_rate = totalConn > 0 ? Math.round((killSwitchOn / totalConn) * 10000) / 10000 : 0;
      kpis.total_connections = totalConn;
      kpis.connections_ok = okConn;
    } catch {
      notes.push('Connection metrics skipped');
    }

    try {
      const { data: runs } = await client.from('strategy_runs').select('id, status');
      const runList = runs || [];
      const totalRuns = runList.length;
      const activeRuns = runList.filter((r: { status: string }) => r.status === 'active').length;
      const pausedRuns = runList.filter((r: { status: string }) => r.status === 'paused').length;
      ratios.strategy_activation_rate = totalRuns > 0 ? Math.round((activeRuns / totalRuns) * 10000) / 10000 : 0;
      ratios.auto_pause_rate = totalRuns > 0 ? Math.round((pausedRuns / totalRuns) * 10000) / 10000 : 0;
      kpis.total_strategy_runs = totalRuns;
      kpis.active_strategies = activeRuns;
      kpis.paused_strategies = pausedRuns;
    } catch {
      notes.push('Strategy runs metrics skipped');
    }

    try {
      const { data: ticks } = await client.from('strategy_tick_runs').select('status').gte('scheduled_at', fromIso).lte('scheduled_at', toIso);
      const tickList = ticks || [];
      const totalTicks = tickList.length;
      const okTicks = tickList.filter((t: { status: string }) => t.status === 'ok').length;
      const errTicks = tickList.filter((t: { status: string }) => t.status === 'error').length;
      ratios.tick_success_rate = totalTicks > 0 ? Math.round((okTicks / totalTicks) * 10000) / 10000 : 0;
      ratios.tick_error_rate = totalTicks > 0 ? Math.round((errTicks / totalTicks) * 10000) / 10000 : 0;
    } catch {
      notes.push('Tick metrics skipped');
    }

    // --- User analytics: referred users, package mix ---
    try {
      const { count: referredTotal } = await client.from('user_profiles').select('*', { count: 'exact', head: true }).not('referred_by_user_id', 'is', null);
      const { count: referredInWindow } = await client.from('user_profiles').select('*', { count: 'exact', head: true }).not('referred_by_user_id', 'is', null).gte('created_at', fromIso).lte('created_at', toIso);
      kpis.referred_users_total = referredTotal ?? 0;
      kpis.referred_users_in_window = referredInWindow ?? 0;
    } catch {
      kpis.referred_users_total = 0;
      kpis.referred_users_in_window = 0;
    }
    try {
      const { data: pkgProfiles } = await client.from('user_profiles').select('active_package_code').not('active_package_code', 'is', null);
      const pkgList = pkgProfiles || [];
      const starter = pkgList.filter((p: { active_package_code?: string }) => /entry_100|ENTRY_100/i.test(p.active_package_code || '')).length;
      const pro = pkgList.filter((p: { active_package_code?: string }) => /pro_200|LEVEL_200/i.test(p.active_package_code || '')).length;
      const unlimited = pkgList.filter((p: { active_package_code?: string }) => /elite_500|LEVEL_500/i.test(p.active_package_code || '')).length;
      kpis.package_starter = starter;
      kpis.package_pro = pro;
      kpis.package_unlimited = unlimited;
      kpis.package_total = starter + pro + unlimited;
    } catch {
      kpis.package_starter = 0;
      kpis.package_pro = 0;
      kpis.package_unlimited = 0;
      kpis.package_total = 0;
    }

    // CAC from admin_marketing_spend (if entry for this period)
    try {
      const fromDate = fromIso.slice(0, 10);
      const toDate = toIso.slice(0, 10);
      const { data: spendRow } = await client.from('admin_marketing_spend').select('spend_usdt').eq('period_start', fromDate).eq('period_end', toDate).maybeSingle();
      if (spendRow && (spendRow as { spend_usdt: number }).spend_usdt != null) {
        const spend = Number((spendRow as { spend_usdt: number }).spend_usdt);
        const newPaying = payingUsersCount;
        if (newPaying > 0 && spend >= 0) {
          ratios.cac_usdt = Math.round((spend / newPaying) * 100) / 100;
          const arppu = kpis.arppu as number;
          ratios.ltv_proxy_usdt = arppu;
          if (ratios.cac_usdt > 0) ratios.ltv_cac_ratio = Math.round((arppu / (ratios.cac_usdt as number)) * 100) / 100;
        }
      }
    } catch {
      /* optional */
    }

    return { window: windowParam, from: fromIso, to: toIso, label, kpis, ratios, notes };
  });

  res.json(result);
});

/**
 * GET /api/admin/financial-ratios/timeseries?metric=revenue|paying_users|active_strategies|tick_success&days=90
 */
financialRatiosRouter.get('/timeseries', async (req: Request, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const metric = (req.query.metric as string) || 'revenue';
  const days = Math.min(180, Math.max(1, parseInt(req.query.days as string) || 90));
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const cacheKey = `ts:${metric}:${days}:${Math.floor(from.getTime() / 60000)}`;
  const result = await getCached(cacheKey, async () => {
    const points: Array<{ date: string; value: number }> = [];
    if (metric === 'revenue') {
      const { data, error } = await client.from('admin_kpi_revenue_daily').select('date, gross, refunds').gte('date', fromIso.slice(0, 10)).lte('date', toIso.slice(0, 10)).order('date', { ascending: true });
      if (!error && data) for (const row of data as { date: string; gross: number; refunds: number }[]) points.push({ date: row.date, value: Number(row.gross ?? 0) - Number(row.refunds ?? 0) });
    } else if (metric === 'paying_users') {
      const { data, error } = await client.from('admin_kpi_users_daily').select('date, paying_users').gte('date', fromIso.slice(0, 10)).lte('date', toIso.slice(0, 10)).order('date', { ascending: true });
      if (!error && data) for (const row of data as { date: string; paying_users: number }[]) points.push({ date: row.date, value: Number(row.paying_users ?? 0) });
    } else if (metric === 'active_users') {
      const { data, error } = await client.from('admin_kpi_users_daily').select('date, active_users').gte('date', fromIso.slice(0, 10)).lte('date', toIso.slice(0, 10)).order('date', { ascending: true });
      if (!error && data) for (const row of data as { date: string; active_users: number }[]) points.push({ date: row.date, value: Number(row.active_users ?? 0) });
    } else if (metric === 'active_strategies') {
      const { data: runs } = await client.from('strategy_runs').select('created_at, status');
      const byDay = new Map<string, number>();
      for (const r of runs || []) {
        const d = (r as { created_at: string }).created_at?.slice(0, 10);
        if (d) byDay.set(d, (byDay.get(d) ?? 0) + 1);
      }
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().slice(0, 10);
        points.push({ date: ds, value: byDay.get(ds) ?? 0 });
      }
      points.sort((a, b) => a.date.localeCompare(b.date));
    } else if (metric === 'tick_success') {
      const { data, error } = await client.from('admin_kpi_ops_daily').select('date, tick_ok, tick_total').gte('date', fromIso.slice(0, 10)).lte('date', toIso.slice(0, 10)).order('date', { ascending: true });
      if (!error && data) for (const row of data as { date: string; tick_ok: number; tick_total: number }[]) points.push({ date: row.date, value: (row.tick_total ?? 0) > 0 ? Math.round((Number(row.tick_ok ?? 0) / row.tick_total) * 10000) / 10000 : 0 });
    }
    return { metric, days, from: fromIso, to: toIso, timeseries: points };
  });

  res.json(result);
});

/**
 * GET /api/admin/financial-ratios/by-exchange?window=7d
 * Per-exchange metrics: connections, strategy runs, ticks, orders placed, trades count and volume.
 */
financialRatiosRouter.get('/by-exchange', async (req: Request, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const windowParam = (req.query.window as string) || '30d';
  const { from, to } = parseWindow(windowParam);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const cacheKey = `by-exchange:${windowParam}:${Math.floor(from.getTime() / 60000)}`;
  const result = await getCached(cacheKey, async () => {
    // Discover exchanges from DB; fallback to known list for future CEX additions
    let exchangeList: string[] = ['binance', 'bybit'];
    try {
      const { data: connExchanges } = await client.from('user_exchange_connections').select('exchange');
      const seen = new Set<string>();
      for (const r of connExchanges || []) {
        const ex = (r as { exchange?: string }).exchange;
        if (ex && /^[a-z]+$/.test(ex)) seen.add(ex);
      }
      if (seen.size > 0) exchangeList = [...seen].sort();
    } catch { /* keep default */ }

    const byExchange: Array<{
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
    }> = [];

    for (const exchange of exchangeList) {
      const row = {
        exchange,
        connections: 0,
        connections_ok: 0,
        strategy_runs_total: 0,
        strategy_runs_active: 0,
        ticks_in_window: 0,
        ticks_ok: 0,
        ticks_error: 0,
        orders_placed_in_window: 0,
        trades_count_in_window: 0,
        volume_usd_in_window: 0,
      };

      try {
        const { data: conns } = await client.from('user_exchange_connections').select('id, last_test_status').eq('exchange', exchange);
        const connList = conns || [];
        row.connections = connList.length;
        row.connections_ok = connList.filter((c: { last_test_status?: string }) => c.last_test_status === 'ok').length;
      } catch {
        /* skip */
      }

      try {
        const { data: runs } = await client.from('strategy_runs').select('id, status').eq('exchange', exchange);
        const runList = runs || [];
        row.strategy_runs_total = runList.length;
        row.strategy_runs_active = runList.filter((r: { status: string }) => r.status === 'active').length;
      } catch {
        /* skip */
      }

      try {
        const { data: runIds } = await client.from('strategy_runs').select('id').eq('exchange', exchange);
        const ids = (runIds || []).map((r: { id: string }) => r.id);
        if (ids.length > 0) {
          const { data: ticks } = await client.from('strategy_tick_runs').select('status').in('strategy_run_id', ids).gte('scheduled_at', fromIso).lte('scheduled_at', toIso);
          const tickList = ticks || [];
          row.ticks_in_window = tickList.length;
          row.ticks_ok = tickList.filter((t: { status: string }) => t.status === 'ok').length;
          row.ticks_error = tickList.filter((t: { status: string }) => t.status === 'error').length;
        }
      } catch {
        /* skip */
      }

      try {
        const { data: runIds } = await client.from('strategy_runs').select('id').eq('exchange', exchange);
        const ids = (runIds || []).map((r: { id: string }) => r.id);
        if (ids.length > 0) {
          const { data: events } = await client.from('strategy_events').select('id').in('strategy_run_id', ids).eq('event_type', 'order_submit').gte('created_at', fromIso).lte('created_at', toIso);
          row.orders_placed_in_window = (events || []).length;
        }
      } catch {
        /* skip */
      }

      try {
        const { data: trades } = await client.from('trades').select('amount, price').eq('exchange', exchange).gte('executed_at', fromIso).lte('executed_at', toIso);
        const tradeList = (trades || []) as { amount: number; price: number }[];
        row.trades_count_in_window = tradeList.length;
        row.volume_usd_in_window = Math.round(tradeList.reduce((s, t) => s + Number(t.amount ?? 0) * Number(t.price ?? 0), 0) * 100) / 100;
      } catch {
        /* skip */
      }

      byExchange.push(row);
    }

    // Add Mix (aggregate) row first — for platform totals; per-exchange rows for CEX reporting
    const mixRow = {
      exchange: 'mix',
      connections: byExchange.reduce((s, r) => s + r.connections, 0),
      connections_ok: byExchange.reduce((s, r) => s + r.connections_ok, 0),
      strategy_runs_total: byExchange.reduce((s, r) => s + r.strategy_runs_total, 0),
      strategy_runs_active: byExchange.reduce((s, r) => s + r.strategy_runs_active, 0),
      ticks_in_window: byExchange.reduce((s, r) => s + r.ticks_in_window, 0),
      ticks_ok: byExchange.reduce((s, r) => s + r.ticks_ok, 0),
      ticks_error: byExchange.reduce((s, r) => s + r.ticks_error, 0),
      orders_placed_in_window: byExchange.reduce((s, r) => s + r.orders_placed_in_window, 0),
      trades_count_in_window: byExchange.reduce((s, r) => s + r.trades_count_in_window, 0),
      volume_usd_in_window: Math.round(byExchange.reduce((s, r) => s + r.volume_usd_in_window, 0) * 100) / 100,
    };
    byExchange.unshift(mixRow);

    return { window: windowParam, from: fromIso, to: toIso, byExchange };
  });

  res.json(result);
});

/**
 * GET /api/admin/financial-ratios/top-payers?window=7d&limit=20
 * Top payers by revenue (masked user_id, no PII).
 */
financialRatiosRouter.get('/top-payers', async (req: Request, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const windowParam = (req.query.window as string) || '30d';
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const { from, to } = parseWindow(windowParam);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  try {
    const { data, error } = await client
      .from('eligible_purchases')
      .select('user_id, amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    if (error) throw error;
    const rows = (data || []) as { user_id: string; amount: number; created_at: string }[];
    const byUser = new Map<string, { total: number; lastAt: string }>();
    for (const r of rows) {
      const u = r.user_id;
      const amt = Number(r.amount ?? 0);
      const prev = byUser.get(u) || { total: 0, lastAt: r.created_at || '' };
      prev.total += amt;
      if ((r.created_at || '') > prev.lastAt) prev.lastAt = r.created_at || '';
      byUser.set(u, prev);
    }
    const list = [...byUser.entries()]
      .map(([userId, v]) => ({ user_id_masked: maskUserId(userId), total_usd: Math.round(v.total * 100) / 100, last_payment_at: v.lastAt }))
      .sort((a, b) => b.total_usd - a.total_usd)
      .slice(0, limit);
    res.json({ window: windowParam, from: fromIso, to: toIso, topPayers: list });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch top payers' });
  }
});

/**
 * GET /api/admin/financial-ratios/refunds-fails?window=7d&limit=50
 * Refunded/failed payments (masked user_id).
 */
financialRatiosRouter.get('/refunds-fails', async (req: Request, res: Response) => {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });

  const windowParam = (req.query.window as string) || '30d';
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const { from, to } = parseWindow(windowParam);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  try {
    const { data, error } = await client
      .from('eligible_purchases')
      .select('user_id, amount, status, created_at')
      .in('status', ['refunded', 'failed'])
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    const list = (data || []).map((r: { user_id: string; amount: unknown; status: string; created_at: string }) => ({
      user_id_masked: maskUserId(r.user_id),
      amount_usd: Math.round(Number(r.amount ?? 0) * 100) / 100,
      status: r.status,
      created_at: r.created_at,
    }));
    res.json({ window: windowParam, from: fromIso, to: toIso, refundsFails: list });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch refunds/fails' });
  }
});

/**
 * GET /api/admin/marketing-spend
 * List marketing spend entries (admin_marketing_spend).
 */
export async function getMarketingSpend(req: Request, res: Response) {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const { data, error } = await client
      .from('admin_marketing_spend')
      .select('id, period_start, period_end, spend_usdt, notes, created_at')
      .order('period_start', { ascending: false })
      .limit(100);
    if (error) throw error;
    const list = (data || []).map((r: { id: string; period_start: string; period_end: string; spend_usdt: number; notes: string | null; created_at: string }) => ({
      id: r.id,
      period_start: r.period_start,
      period_end: r.period_end,
      spend_usdt: Math.round(Number(r.spend_usdt ?? 0) * 100) / 100,
      notes: r.notes ?? null,
      created_at: r.created_at,
    }));
    res.json({ marketingSpend: list });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch marketing spend' });
  }
}

/**
 * POST /api/admin/marketing-spend
 * Create or update marketing spend. Body: { period_start, period_end, spend_usdt, notes? }
 */
export async function postMarketingSpend(req: Request, res: Response) {
  const client = getSupabase();
  if (!client) return res.status(503).json({ error: 'Database unavailable' });
  const { period_start, period_end, spend_usdt, notes } = req.body as { period_start?: string; period_end?: string; spend_usdt?: number; notes?: string };
  if (!period_start || !period_end || spend_usdt == null || Number(spend_usdt) < 0) {
    return res.status(400).json({ error: 'period_start, period_end (YYYY-MM-DD) and spend_usdt (>= 0) required' });
  }
  const spend = Math.round(Number(spend_usdt) * 100) / 100;
  try {
    const { data, error } = await client
      .from('admin_marketing_spend')
      .upsert(
        { period_start, period_end, spend_usdt: spend, notes: notes || null, updated_at: new Date().toISOString() },
        { onConflict: 'period_start,period_end' }
      )
      .select('id, period_start, period_end, spend_usdt, notes, created_at')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to save marketing spend' });
  }
}
