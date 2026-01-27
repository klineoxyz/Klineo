/**
 * Demo mode: when strategy backtest runs in demo or user enables demo,
 * Trade History / Orders / Positions show demo data from the backtest
 * instead of empty API results.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface DemoTrade {
  id: string;
  orderId?: string;
  positionId?: string;
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  fee: number;
  executedAt: string;
  createdAt: string;
}

export interface DemoOrder {
  id: string;
  positionId?: string;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  amount: number;
  price: number | null;
  status: "pending" | "filled" | "cancelled" | "failed";
  exchangeOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemoPosition {
  id: string;
  copySetupId?: string;
  trader?: { id: string; name: string; slug: string } | null;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  currentPrice: number | null;
  unrealizedPnl: number | null;
  exchangeOrderId?: string;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Copy-setup shape for Copy Trading "Active Copy Positions" — same as API copySetups */
export interface DemoCopySetup {
  id: string;
  traderId: string;
  trader: { id: string; name: string; slug: string; avatarUrl?: string; status: string } | null;
  allocationPct: number;
  maxPositionPct: number | null;
  status: "active" | "paused" | "stopped";
  createdAt: string;
  updatedAt: string;
  _isDemo?: boolean;
}

/** Shape from Strategy Backtest "backtestTrades" (or equivalent) */
export interface BacktestTradeRow {
  id: number;
  entryTime: string;
  exitTime: string;
  direction: string;
  entryPrice: string;
  exitPrice: string;
  pnl: string;
  pnlPercent: string;
  leverage?: string;
  stopLoss?: string;
  takeProfit?: string;
}

const DEMO_STORAGE_KEY = "klineo_demo_mode";
const DEMO_DATA_KEY = "klineo_demo_data";

function loadPersistedDemo(): {
  isDemo: boolean;
  trades: DemoTrade[];
  orders: DemoOrder[];
  positions: DemoPosition[];
  copySetups: DemoCopySetup[];
} {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    const dataRaw = localStorage.getItem(DEMO_DATA_KEY);
    const isDemo = raw === "true";
    let trades: DemoTrade[] = [];
    let orders: DemoOrder[] = [];
    let positions: DemoPosition[] = [];
    let copySetups: DemoCopySetup[] = [];
    if (dataRaw) {
      const parsed = JSON.parse(dataRaw);
      trades = parsed.trades || [];
      orders = parsed.orders || [];
      positions = parsed.positions || [];
      copySetups = parsed.copySetups || [];
    }
    return { isDemo, trades, orders, positions, copySetups };
  } catch {
    return { isDemo: false, trades: [], orders: [], positions: [], copySetups: [] };
  }
}

function savePersistedDemo(
  isDemo: boolean,
  trades: DemoTrade[],
  orders: DemoOrder[],
  positions: DemoPosition[],
  copySetups: DemoCopySetup[]
) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, String(isDemo));
    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify({ trades, orders, positions, copySetups }));
  } catch (_) {}
}

interface DemoContextValue {
  isDemoMode: boolean;
  setDemoMode: (on: boolean) => void;
  demoTrades: DemoTrade[];
  demoOrders: DemoOrder[];
  demoPositions: DemoPosition[];
  demoCopySetups: DemoCopySetup[];
  addDemoFromBacktest: (rows: BacktestTradeRow[], symbol?: string) => void;
  clearDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

function toIso(t: string): string {
  const d = new Date(t);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setDemoModeState] = useState(false);
  const [demoTrades, setDemoTrades] = useState<DemoTrade[]>([]);
  const [demoOrders, setDemoOrders] = useState<DemoOrder[]>([]);
  const [demoPositions, setDemoPositions] = useState<DemoPosition[]>([]);
  const [demoCopySetups, setDemoCopySetups] = useState<DemoCopySetup[]>([]);

  useEffect(() => {
    const { isDemo, trades, orders, positions, copySetups } = loadPersistedDemo();
    setDemoModeState(isDemo);
    setDemoTrades(trades);
    setDemoOrders(orders);
    setDemoPositions(positions);
    setDemoCopySetups(copySetups);
  }, []);

  const setDemoMode = useCallback((on: boolean) => {
    setDemoModeState(on);
    if (!on) {
      setDemoTrades([]);
      setDemoOrders([]);
      setDemoPositions([]);
      setDemoCopySetups([]);
      savePersistedDemo(false, [], [], [], []);
    } else {
      savePersistedDemo(true, demoTrades, demoOrders, demoPositions, demoCopySetups);
    }
  }, [demoTrades, demoOrders, demoPositions, demoCopySetups]);

  const addDemoFromBacktest = useCallback((rows: BacktestTradeRow[], symbol = "BTC/USDT") => {
    const base = `demo-${Date.now()}-`;
    const trades: DemoTrade[] = [];
    const orders: DemoOrder[] = [];
    const positions: DemoPosition[] = [];

    rows.forEach((r, i) => {
      const id = `${base}${i}`;
      const entryPrice = parseFloat(r.entryPrice) || 0;
      const exitPrice = parseFloat(r.exitPrice) || 0;
      const pnl = parseFloat(r.pnl) || 0;
      const side = (r.direction || "").toLowerCase() === "short" ? "sell" : "buy";
      const amount = 0.01;
      const entryIso = toIso(r.entryTime);
      const exitIso = toIso(r.exitTime);

      trades.push({
        id,
        orderId: id,
        positionId: id,
        symbol,
        side: side as "buy" | "sell",
        amount,
        price: exitPrice,
        fee: 0,
        executedAt: exitIso,
        createdAt: entryIso,
      });

      orders.push({
        id,
        positionId: id,
        symbol,
        side: side as "buy" | "sell",
        orderType: "market",
        amount,
        price: entryPrice,
        status: "filled",
        createdAt: entryIso,
        updatedAt: exitIso,
      });

      positions.push({
        id,
        symbol,
        trader: { id: "demo", name: "Demo Strategy", slug: "demo-strategy" },
        side: (r.direction || "").toLowerCase() === "short" ? "short" : "long",
        size: amount,
        entryPrice,
        currentPrice: exitPrice,
        unrealizedPnl: pnl,
        openedAt: entryIso,
        closedAt: exitIso,
        createdAt: entryIso,
        updatedAt: exitIso,
      });
    });

    const now = new Date().toISOString();
    const demoSetup: DemoCopySetup = {
      id: "demo-strategy",
      traderId: "demo",
      trader: { id: "demo", name: "Demo Strategy", slug: "demo-strategy", status: "approved" },
      allocationPct: 100,
      maxPositionPct: 25,
      status: "active",
      createdAt: now,
      updatedAt: now,
      _isDemo: true,
    };

    setDemoTrades((prev) => [...prev, ...trades]);
    setDemoOrders((prev) => [...prev, ...orders]);
    setDemoPositions((prev) => [...prev, ...positions]);
    setDemoCopySetups([demoSetup]);
    setDemoModeState(true);
  }, []);

  const clearDemo = useCallback(() => {
    setDemoModeState(false);
    setDemoTrades([]);
    setDemoOrders([]);
    setDemoPositions([]);
    setDemoCopySetups([]);
    savePersistedDemo(false, [], [], [], []);
  }, []);

  const persist = useCallback(() => {
    savePersistedDemo(isDemoMode, demoTrades, demoOrders, demoPositions, demoCopySetups);
  }, [isDemoMode, demoTrades, demoOrders, demoPositions, demoCopySetups]);

  useEffect(() => {
    persist();
  }, [isDemoMode, demoTrades, demoOrders, demoPositions, demoCopySetups, persist]);

  const value: DemoContextValue = {
    isDemoMode,
    setDemoMode,
    demoTrades,
    demoOrders,
    demoPositions,
    demoCopySetups,
    addDemoFromBacktest,
    clearDemo,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
