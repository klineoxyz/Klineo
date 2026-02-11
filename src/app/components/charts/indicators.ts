/**
 * Technical indicator calculations for use with lightweight-charts.
 * RSI(14), MACD(12,26,9).
 */

export interface OhlcvRow {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function ema(values: number[], period: number): (number | null)[] {
  const mult = 2 / (period + 1);
  const out: (number | null)[] = [];
  if (values.length === 0) return out;
  out.push(values[0]);
  for (let i = 1; i < values.length; i++) {
    const prev = out[i - 1] ?? values[i];
    out.push((values[i] - prev) * mult + prev);
  }
  return out;
}

/** RSI(14) — Wilder smoothing. Returns 0–100 for bars after the first `period`. */
export function computeRSI(data: OhlcvRow[], period = 14): { time: string; value: number }[] {
  const closes = data.map((d) => d.close);
  const result: { time: string; value: number }[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      continue;
    }
    if (i === period) {
      avgGain = (avgGain + gain) / period;
      avgLoss = (avgLoss + loss) / period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    result.push({ time: data[i].time, value: Math.round(rsi * 100) / 100 });
  }
  return result;
}

/** MACD(12,26,9) — returns macd line, signal line, histogram. */
export function computeMACD(
  data: OhlcvRow[],
  fast = 12,
  slow = 26,
  signal = 9
): {
  macd: { time: string; value: number }[];
  signal: { time: string; value: number }[];
  histogram: { time: string; value: number; color: string }[];
} {
  const closes = data.map((d) => d.close);
  const fastEMA = ema(closes, fast);
  const slowEMA = ema(closes, slow);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f != null && s != null) macdLine.push(f - s);
    else macdLine.push(NaN);
  }
  const validMacd = macdLine.filter((v) => !Number.isNaN(v));
  const signalEMA = ema(macdLine.map((v) => (Number.isNaN(v) ? 0 : v)), signal);
  const macd: { time: string; value: number }[] = [];
  const signalSeries: { time: string; value: number }[] = [];
  const histogram: { time: string; value: number; color: string }[] = [];
  const green = "#10B981";
  const red = "#EF4444";
  for (let i = slow - 1; i < data.length; i++) {
    const m = macdLine[i];
    const sig = signalEMA[i];
    if (m == null || Number.isNaN(m) || sig == null) continue;
    const h = m - sig;
    macd.push({ time: data[i].time, value: Math.round(m * 1e6) / 1e6 });
    signalSeries.push({ time: data[i].time, value: Math.round(sig * 1e6) / 1e6 });
    histogram.push({ time: data[i].time, value: Math.round(h * 1e6) / 1e6, color: h >= 0 ? green : red });
  }
  return { macd, signal: signalSeries, histogram };
}

/**
 * ADX(14) — Average Directional Index. Returns single line 0–100 (trend strength).
 * Uses Wilder smoothing. Needs at least period*2 bars for meaningful values.
 */
export function computeADX(data: OhlcvRow[], period = 14): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  if (data.length < period * 2) return result;
  const high = data.map((d) => d.high);
  const low = data.map((d) => d.low);
  const close = data.map((d) => d.close);
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const h = high[i]!;
    const l = low[i]!;
    const c = close[i]!;
    const prevH = i > 0 ? high[i - 1]! : h;
    const prevL = i > 0 ? low[i - 1]! : l;
    const prevC = i > 0 ? close[i - 1]! : c;
    tr.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
    const upMove = h - prevH;
    const downMove = prevL - l;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const smooth = (arr: number[], period: number): number[] => {
    const out: number[] = [];
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      if (i < period) {
        sum += arr[i]!;
        out.push(i === period - 1 ? sum : NaN);
      } else {
        sum = sum - sum / period + arr[i]!;
        out.push(sum);
      }
    }
    return out;
  };
  const atr = smooth(tr, period);
  const smoothPlus = smooth(plusDM, period);
  const smoothMinus = smooth(minusDM, period);
  for (let i = period; i < data.length; i++) {
    const a = atr[i];
    if (a == null || a === 0) continue;
    const p = smoothPlus[i] ?? 0;
    const m = smoothMinus[i] ?? 0;
    const plusDI = 100 * (p / a);
    const minusDI = 100 * (m / a);
    const diSum = plusDI + minusDI;
    const dx = diSum === 0 ? 0 : 100 * Math.abs(plusDI - minusDI) / diSum;
    result.push({ time: data[i].time, value: Math.round(dx * 100) / 100 });
  }
  const adxOut: { time: string; value: number }[] = [];
  let adxSum = 0;
  for (let i = 0; i < result.length; i++) {
    if (i < period) {
      adxSum += result[i].value;
      if (i === period - 1) adxOut.push({ time: result[i].time, value: Math.round((adxSum / period) * 100) / 100 });
    } else {
      const prev = adxOut[adxOut.length - 1]?.value ?? adxSum / period;
      adxSum = (prev * (period - 1) + result[i].value) / period;
      adxOut.push({ time: result[i].time, value: Math.round(adxSum * 100) / 100 });
    }
  }
  return adxOut;
}
