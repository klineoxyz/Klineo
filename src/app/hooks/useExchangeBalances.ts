import { useState, useEffect, useCallback } from "react";
import { exchangeConnections, type ExchangeBalanceResponse, type AssetBalance } from "@/lib/api";

export interface UseExchangeBalancesResult {
  /** Whether user has a connected exchange (Binance) with balance data */
  connected: boolean;
  /** All asset balances: { USDT: { free, locked }, BTC: { free, locked }, ... } */
  balances: Record<string, AssetBalance>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches account balances from connected exchange (Binance) via backend.
 * Used by TradingTerminalNew to show Available USDT (buy) and base asset (sell).
 * Returns empty balances when not connected or API unavailable.
 */
export function useExchangeBalances(): UseExchangeBalancesResult {
  const [data, setData] = useState<ExchangeBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
    if (!baseUrl.trim()) {
      setData({ connected: false, exchange: null, connectionId: null, balances: {}, requestId: "" });
      setLoading(false);
      setError(null);
      return;
    }
    setError(null);
    try {
      const res = await exchangeConnections.getBalance();
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load balance";
      setError(msg);
      setData({ connected: false, exchange: null, connectionId: null, balances: {}, requestId: "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBalance();
  }, [fetchBalance]);

  // Refetch when user returns to the tab (e.g. after connecting in Settings) so Terminal shows real balance
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchBalance();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchBalance]);

  // Refetch balance periodically when connected (e.g. after trades)
  useEffect(() => {
    if (!data?.connected) return;
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [data?.connected, fetchBalance]);

  return {
    connected: data?.connected ?? false,
    balances: data?.balances ?? {},
    loading,
    error,
    refetch: fetchBalance,
  };
}
