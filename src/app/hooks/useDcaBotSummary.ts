/**
 * Fetches DCA bots list and returns summary for dashboard widget.
 * Only fetches when enabled (e.g. when not in demo mode and user session exists).
 */
import { useState, useEffect, useCallback } from "react";
import { dcaBots, type DcaBot } from "@/lib/api";

export interface DcaBotSummary {
  activeBotsCount: number;
  pausedBotsCount: number;
  totalBots: number;
  totalAllocatedUSDT: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function estimateAllocationUsdt(bot: DcaBot): number {
  const base = bot.config?.baseOrderSizeUsdt ?? 0;
  const max = bot.config?.maxSafetyOrders ?? 0;
  const mult = bot.config?.safetyOrderMultiplier ?? 1.2;
  let exp = base;
  let m = 1;
  for (let i = 0; i < max; i++) {
    m *= mult;
    exp += base * m;
  }
  return exp;
}

export function useDcaBotSummary(enabled: boolean): DcaBotSummary {
  const [bots, setBots] = useState<DcaBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setBots([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { bots: list } = await dcaBots.list();
      setBots(list ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load DCA bots";
      setError(msg);
      setBots([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const activeBotsCount = bots.filter((b) => b.status === "running").length;
  const pausedBotsCount = bots.filter((b) => b.status === "paused").length;
  const totalBots = bots.length;
  const totalAllocatedUSDT =
    bots.length > 0 ? bots.reduce((sum, b) => sum + estimateAllocationUsdt(b), 0) : null;

  return {
    activeBotsCount,
    pausedBotsCount,
    totalBots,
    totalAllocatedUSDT,
    loading,
    error,
    refetch: load,
  };
}
