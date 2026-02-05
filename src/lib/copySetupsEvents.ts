/**
 * Notify TopBar and other consumers when copy setups change (e.g. from Copy Trading page).
 * Call this after loadCopySetups or any update so TopBar refreshes its count.
 */
export const COPY_SETUPS_UPDATED = "klineo:copy-setups-updated";

export function notifyCopySetupsUpdated() {
  window.dispatchEvent(new CustomEvent(COPY_SETUPS_UPDATED));
}
