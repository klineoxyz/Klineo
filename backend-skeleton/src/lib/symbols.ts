/**
 * Symbol format mapping and rounding helpers for spot trading.
 * Internal format from UI: "BTC/USDT" or "BTCUSDT"
 * Exchange format: Binance "BTCUSDT", Bybit "BTCUSDT"
 */

/** Normalize pair to exchange symbol (no slash, uppercase). */
export function toExchangeSymbol(pair: string): string {
  return (pair || '').toUpperCase().replace(/\//g, '').trim();
}

/** Normalize to display format "BASE/QUOTE" if we detect USDT. */
export function toDisplaySymbol(symbol: string): string {
  const s = (symbol || '').toUpperCase().replace(/\//g, '').trim();
  if (s.endsWith('USDT')) {
    return s.slice(0, -4) + '/USDT';
  }
  return s;
}

/**
 * Round quantity down to exchange step size.
 * Precision derived from stepSize (e.g. 0.001 -> 3 decimals).
 */
export function roundToStep(qty: number, stepSize: number): string {
  if (stepSize <= 0) return qty.toFixed(8);
  const precision = stepSize >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(stepSize)));
  const stepped = Math.floor(qty / stepSize) * stepSize;
  return stepped.toFixed(precision);
}

/** Clamp qty to [minQty, maxQty] and round to step. */
export function clampAndRoundQty(qty: number, minQty: number, maxQty: number, stepSize: number): string {
  const clamped = Math.max(minQty, Math.min(maxQty, qty));
  return roundToStep(clamped, stepSize);
}
