/**
 * Central auth events for API client (e.g. 401 → logout).
 * AuthProvider sets the callback on mount.
 */

let onLogoutCallback: (() => void) | null = null;

export function setOnLogout(fn: () => void) {
  onLogoutCallback = fn;
}

export function triggerLogout() {
  onLogoutCallback?.();
}
