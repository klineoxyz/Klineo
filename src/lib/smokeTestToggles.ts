/**
 * Admin-only smoke test toggles for live exchange and runner cron tests.
 * Stored in localStorage; when ON, smoke tests send x-klineo-smoke-tests: true and run the 4 gated tests.
 * Backend requires admin + header for those requests.
 */

const STORAGE_KEY_EXCHANGE = 'klineo_smoke_exchange_tests';
const STORAGE_KEY_RUNNER_CRON = 'klineo_smoke_runner_cron_test';

export function getSmokeExchangeTestsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const env = import.meta.env.VITE_ENABLE_EXCHANGE_SMOKE_TESTS === 'true';
  const local = window.localStorage.getItem(STORAGE_KEY_EXCHANGE) === 'true';
  return env || local;
}

export function getSmokeRunnerCronTestEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const env = import.meta.env.VITE_ENABLE_RUNNER_CRON_TEST === 'true';
  const local = window.localStorage.getItem(STORAGE_KEY_RUNNER_CRON) === 'true';
  return env || local;
}

export function setSmokeExchangeTestsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY_EXCHANGE, enabled ? 'true' : 'false');
}

export function setSmokeRunnerCronTestEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY_RUNNER_CRON, enabled ? 'true' : 'false');
}

/** Whether any live smoke test toggle is on (used for warning banner and for sending x-klineo-smoke-tests header). */
export function isLiveSmokeTestsEnabled(): boolean {
  return getSmokeExchangeTestsEnabled() || getSmokeRunnerCronTestEnabled();
}

/** Toggle state for report: which flags were enabled when tests ran. */
export function getSmokeTogglesState(): { exchange: boolean; runnerCron: boolean } {
  return {
    exchange: getSmokeExchangeTestsEnabled(),
    runnerCron: getSmokeRunnerCronTestEnabled(),
  };
}
