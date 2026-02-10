/**
 * Fetches Live-mode data for TopBar: active copy count, exchange connection status,
 * entitlement (plan). Used only when !isDemoMode.
 *
 * Connection status:
 * - "connected" = GET /api/exchange-connections/balance returned 200 with connected: true
 * - "disconnected" = balance returned 200 with connected: false (no exchange linked or no keys)
 * - "error" = balance request failed (network, 401/403/5xx, or backend unreachable)
 */
import { useState, useEffect, useCallback } from "react";
import { api, exchangeConnections } from "@/lib/api";
import { COPY_SETUPS_UPDATED } from "@/lib/copySetupsEvents";
import type { EntitlementResponse } from "@/lib/api";

interface CopySetup {
  id: string;
  status: "active" | "paused" | "stopped";
}

interface TopBarLiveData {
  activeCopies: number;
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  exchangeLatency: number | null;
  entitlement: EntitlementResponse | null;
  copySetups: CopySetup[];
  refresh: () => void;
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

export function useTopBarLiveData(isDemoMode: boolean): TopBarLiveData {
  const [activeCopies, setActiveCopies] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected" | "error">("disconnected");
  const [exchangeLatency, setExchangeLatency] = useState<number | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementResponse | null>(null);
  const [copySetups, setCopySetups] = useState<CopySetup[]>([]);

  const load = useCallback(async () => {
    if (!baseURL?.trim()) return;
    try {
      const [copyRes, balanceRes, entRes] = await Promise.allSettled([
        api.get<{ copySetups: CopySetup[] }>("/api/copy-setups"),
        exchangeConnections.getBalance(),
        api.get<EntitlementResponse>("/api/me/entitlement"),
      ]);

      if (copyRes.status === "fulfilled") {
        const setups = copyRes.value.copySetups ?? [];
        setCopySetups(setups);
        setActiveCopies(setups.filter((s) => s.status === "active").length);
      }

      if (balanceRes.status === "fulfilled") {
        setConnectionStatus(balanceRes.value.connected ? "connected" : "disconnected");
        setExchangeLatency(null); // Balance API doesn't return latency; would need a ping endpoint
      } else {
        setConnectionStatus("error");
        setExchangeLatency(null);
      }

      if (entRes.status === "fulfilled") {
        setEntitlement(entRes.value);
      } else {
        setEntitlement(null);
      }
    } catch {
      setConnectionStatus("error");
      setExchangeLatency(null);
    }
  }, []);

  useEffect(() => {
    if (isDemoMode) return;
    load();
    const interval = setInterval(load, 30000);
    const onUpdated = () => load();
    window.addEventListener(COPY_SETUPS_UPDATED, onUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener(COPY_SETUPS_UPDATED, onUpdated);
    };
  }, [isDemoMode, load]);

  return { activeCopies, connectionStatus, exchangeLatency, entitlement, copySetups, refresh: load };
}
