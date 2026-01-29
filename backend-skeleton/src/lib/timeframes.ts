/**
 * Timeframe to milliseconds and alignment for strategy runner.
 * 1m/5m/15m/1h; run at candle boundaries with grace window.
 */

export const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
};

export const ALLOWED_TIMEFRAMES = ['1m', '5m', '15m', '1h'] as const;
export type Timeframe = (typeof ALLOWED_TIMEFRAMES)[number];

const GRACE_MS = 5_000; // +/- 5s around boundary

/**
 * Get interval ms for a timeframe.
 */
export function getTimeframeMs(timeframe: string): number {
  return TIMEFRAME_MS[timeframe] ?? TIMEFRAME_MS['5m'];
}

/**
 * Should we run this strategy now? Aligns to candle boundary (epoch ms / interval).
 * Run if current time is within grace window of the next boundary after last_run_at.
 */
export function shouldRunNow(timeframe: string, now: Date, lastRunAt: Date | null): boolean {
  const intervalMs = getTimeframeMs(timeframe);
  const nowMs = now.getTime();
  const epochMs = Math.floor(nowMs / intervalMs) * intervalMs;
  const nextBoundary = epochMs + intervalMs;
  const windowStart = nextBoundary - GRACE_MS;
  const windowEnd = nextBoundary + GRACE_MS;
  if (nowMs < windowStart || nowMs > windowEnd) return false;
  if (lastRunAt == null) return true;
  const lastMs = lastRunAt.getTime();
  return nowMs - lastMs >= intervalMs - GRACE_MS;
}
