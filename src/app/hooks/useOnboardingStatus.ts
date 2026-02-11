import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/contexts/AuthContext";

export interface OnboardingStatus {
  tutorialCompleted: boolean;
  completedAt: string | null;
  lastSkippedAt: string | null;
  tourAutoRunAt: string | null;
  lastSeenVersion: string | null;
}

const DEFAULT_STATUS: OnboardingStatus = {
  tutorialCompleted: false,
  completedAt: null,
  lastSkippedAt: null,
  tourAutoRunAt: null,
  lastSeenVersion: null,
};

export function useOnboardingStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user?.id) {
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_onboarding_status")
        .select("tutorial_completed, completed_at, last_skipped_at, tour_auto_run_at, last_seen_version")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[onboarding] fetch error:", error.message);
        setStatus(DEFAULT_STATUS);
        return;
      }
      setStatus(
        data
          ? {
              tutorialCompleted: !!data.tutorial_completed,
              completedAt: data.completed_at ?? null,
              lastSkippedAt: data.last_skipped_at ?? null,
              tourAutoRunAt: data.tour_auto_run_at ?? null,
              lastSeenVersion: data.last_seen_version ?? null,
            }
          : DEFAULT_STATUS
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const markCompleted = useCallback(async () => {
    if (!user?.id) return;
    try {
      await supabase.from("user_onboarding_status").upsert(
        {
          user_id: user.id,
          tutorial_completed: true,
          completed_at: new Date().toISOString(),
          last_skipped_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setStatus((prev) =>
        prev ? { ...prev, tutorialCompleted: true, completedAt: new Date().toISOString(), lastSkippedAt: null } : prev
      );
    } catch (e) {
      console.warn("[onboarding] markCompleted error:", e);
    }
  }, [user?.id]);

  const markAutoRun = useCallback(async () => {
    if (!user?.id) return;
    try {
      await supabase.from("user_onboarding_status").upsert(
        {
          user_id: user.id,
          tour_auto_run_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setStatus((prev) => (prev ? { ...prev, tourAutoRunAt: new Date().toISOString() } : prev));
    } catch (e) {
      console.warn("[onboarding] markAutoRun error:", e);
    }
  }, [user?.id]);

  const markSkipped = useCallback(async () => {
    if (!user?.id) return;
    try {
      await supabase.from("user_onboarding_status").upsert(
        {
          user_id: user.id,
          tutorial_completed: false,
          last_skipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setStatus((prev) =>
        prev ? { ...prev, lastSkippedAt: new Date().toISOString() } : prev
      );
    } catch (e) {
      console.warn("[onboarding] markSkipped error:", e);
    }
  }, [user?.id]);

  return { status, loading, fetchStatus, markCompleted, markSkipped, markAutoRun };
}
