import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface NotificationsSummary {
  notifications: unknown[];
  unreadCount: number;
}

/**
 * Returns the current user's unread notification count from the API.
 * Used by TopBar to show the bell badge only when there are unread notifications.
 * Refetches when refreshKey (e.g. activeView) changes so the badge updates after leaving the notifications page.
 * Returns 0 when API is unavailable or on error.
 */
export function useUnreadNotificationsCount(refreshKey?: string): number {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<NotificationsSummary>("/api/notifications?limit=1")
      .then((data) => {
        if (!cancelled && data?.unreadCount != null) {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {
        if (!cancelled) setUnreadCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return unreadCount;
}
