/**
 * Runner config: env validation and safe boot logging.
 * Never log or return RUNNER_CRON_SECRET.
 *
 * Production / live: set ENABLE_STRATEGY_RUNNER=true so that:
 * - DCA bots receive ticks (processRunningDcaBots runs on an interval).
 * - Strategy Runner processes due strategies.
 * If this is false, DCA bots will show "Running" but Last tick / DCA Progress stay empty.
 */

import { RISK_CONFIG } from './strategyRisk.js';

export const RUNNER_CONFIG = {
  ENABLE_STRATEGY_RUNNER: process.env.ENABLE_STRATEGY_RUNNER === 'true',
  RUNNER_TICK_INTERVAL_SEC: Math.max(5, Math.min(300, Number(process.env.RUNNER_TICK_INTERVAL_SEC) || 30)),
  RUNNER_CRON_SECRET: process.env.RUNNER_CRON_SECRET,
  /** True if RUNNER_CRON_SECRET is set (non-empty). Never expose the value. */
  get cronSecretConfigured(): boolean {
    const s = process.env.RUNNER_CRON_SECRET;
    return typeof s === 'string' && s.trim().length > 0;
  },
};

export function logRunnerConfig(): void {
  const enabled = RUNNER_CONFIG.ENABLE_STRATEGY_RUNNER;
  const tickSec = RUNNER_CONFIG.RUNNER_TICK_INTERVAL_SEC;
  const cronSecretConfigured = RUNNER_CONFIG.cronSecretConfigured;
  const r = RISK_CONFIG;
  console.log(
    '[Runner config] enabled=%s tickIntervalSec=%d cronSecretConfigured=%s risk: dailyMaxLossUsdt=%d maxTradesPerDay=%d maxConsecutiveLosses=%d cooldownAfterTradeSec=%d pauseDurationMin=%d',
    enabled,
    tickSec,
    cronSecretConfigured,
    r.DAILY_MAX_LOSS_USDT,
    r.MAX_TRADES_PER_DAY,
    r.MAX_CONSECUTIVE_LOSSES,
    r.COOLDOWN_AFTER_TRADE_SEC,
    r.PAUSE_DURATION_MIN
  );
  if (process.env.NODE_ENV === 'production' && enabled && !cronSecretConfigured) {
    console.warn('[Runner config] NODE_ENV=production and runner enabled but RUNNER_CRON_SECRET not set — cron-with-secret mode disabled; use admin JWT for external cron.');
  }
}
