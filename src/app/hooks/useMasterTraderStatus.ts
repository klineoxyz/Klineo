/**
 * Fetches current user's Master Trader application status.
 * Use to hide "Become a Master Trader" when approved and show MT badge on profile.
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface MasterTraderApplication {
  id: string;
  status: "pending" | "approved" | "rejected";
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MasterTraderStatus {
  isApproved: boolean;
  isLoading: boolean;
  application: MasterTraderApplication | null;
  refresh: () => void;
}

export function useMasterTraderStatus(): MasterTraderStatus {
  const [application, setApplication] = useState<MasterTraderApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ application: MasterTraderApplication | null }>("/api/master-trader-applications/me");
      setApplication(res.application ?? null);
    } catch {
      setApplication(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    isApproved: application?.status === "approved",
    isLoading,
    application,
    refresh: load,
  };
}
