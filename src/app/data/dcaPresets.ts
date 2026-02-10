/**
 * DCA Bot presets — local seed data for Preset Library.
 * Used to prefill Create Bot modal when user clicks "Use Preset".
 */
export type DcaPresetRisk = 'low' | 'medium' | 'high';
export type BestMarketType = 'Ranging' | 'Choppy' | 'Volatile';

export interface DcaPreset {
  id: string;
  name: string;
  risk: DcaPresetRisk;
  bestMarketType: BestMarketType;
  suggestedPairs: string[];
  gridStepPct: number;
  maxSafetyOrders: number;
  safetyOrderMultiplier: number;
  tpPct: number;
  timeframe: string;
  baseOrderSizeUsdt?: number;
  maxTotalPositionCapPct?: number;
  dailyLossLimitPct?: number;
  maxDrawdownStopPct?: number;
  cooldownMinutes?: number;
  trendFilter?: boolean;
  volatilityFilter?: boolean;
}

export const DCA_PRESETS: DcaPreset[] = [
  // Low Risk
  {
    id: 'range-sniper',
    name: 'Range Sniper (Conservative)',
    risk: 'low',
    bestMarketType: 'Ranging',
    suggestedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
    gridStepPct: 1.5,
    maxSafetyOrders: 5,
    safetyOrderMultiplier: 1.2,
    tpPct: 2,
    timeframe: '4h',
    baseOrderSizeUsdt: 20,
    maxTotalPositionCapPct: 15,
    dailyLossLimitPct: 3,
    maxDrawdownStopPct: 8,
    cooldownMinutes: 60,
    trendFilter: true,
    volatilityFilter: true,
  },
  {
    id: 'bluechip-mean-revert',
    name: 'Bluechip Mean Revert',
    risk: 'low',
    bestMarketType: 'Ranging',
    suggestedPairs: ['BTC/USDT', 'ETH/USDT'],
    gridStepPct: 2,
    maxSafetyOrders: 4,
    safetyOrderMultiplier: 1.15,
    tpPct: 1.5,
    timeframe: '1h',
    baseOrderSizeUsdt: 25,
    maxTotalPositionCapPct: 12,
    dailyLossLimitPct: 2,
    maxDrawdownStopPct: 6,
    cooldownMinutes: 120,
    trendFilter: true,
    volatilityFilter: false,
  },
  // Medium Risk
  {
    id: 'volatility-harvester',
    name: 'Volatility Harvester',
    risk: 'medium',
    bestMarketType: 'Choppy',
    suggestedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    gridStepPct: 1,
    maxSafetyOrders: 8,
    safetyOrderMultiplier: 1.3,
    tpPct: 2.5,
    timeframe: '1h',
    baseOrderSizeUsdt: 15,
    maxTotalPositionCapPct: 25,
    dailyLossLimitPct: 5,
    maxDrawdownStopPct: 12,
    cooldownMinutes: 30,
    trendFilter: true,
    volatilityFilter: true,
  },
  {
    id: 'adaptive-grid-dca',
    name: 'Adaptive Grid DCA',
    risk: 'medium',
    bestMarketType: 'Volatile',
    suggestedPairs: ['BTC/USDT', 'ETH/USDT', 'AVAX/USDT'],
    gridStepPct: 1.2,
    maxSafetyOrders: 6,
    safetyOrderMultiplier: 1.25,
    tpPct: 2.2,
    timeframe: '1h',
    baseOrderSizeUsdt: 20,
    maxTotalPositionCapPct: 20,
    dailyLossLimitPct: 4,
    maxDrawdownStopPct: 10,
    cooldownMinutes: 45,
    trendFilter: true,
    volatilityFilter: true,
  },
  // High Risk
  {
    id: 'aggressive-dip-buyer',
    name: 'Aggressive Dip Buyer',
    risk: 'high',
    bestMarketType: 'Volatile',
    suggestedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOGE/USDT'],
    gridStepPct: 0.8,
    maxSafetyOrders: 10,
    safetyOrderMultiplier: 1.5,
    tpPct: 3,
    timeframe: '15m',
    baseOrderSizeUsdt: 10,
    maxTotalPositionCapPct: 35,
    dailyLossLimitPct: 8,
    maxDrawdownStopPct: 18,
    cooldownMinutes: 15,
    trendFilter: false,
    volatilityFilter: true,
  },
  {
    id: 'turbo-scalper-grid',
    name: 'Turbo Scalper Grid',
    risk: 'high',
    bestMarketType: 'Choppy',
    suggestedPairs: ['BTC/USDT', 'ETH/USDT'],
    gridStepPct: 0.5,
    maxSafetyOrders: 12,
    safetyOrderMultiplier: 1.4,
    tpPct: 1.2,
    timeframe: '5m',
    baseOrderSizeUsdt: 10,
    maxTotalPositionCapPct: 30,
    dailyLossLimitPct: 10,
    maxDrawdownStopPct: 20,
    cooldownMinutes: 10,
    trendFilter: true,
    volatilityFilter: true,
  },
];

export function getPresetsByRisk(risk: DcaPresetRisk | 'all'): DcaPreset[] {
  if (risk === 'all') return DCA_PRESETS;
  return DCA_PRESETS.filter((p) => p.risk === risk);
}

export function filterPresetsBySearch(presets: DcaPreset[], query: string): DcaPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return presets;
  return presets.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.suggestedPairs.some((pair) => pair.toLowerCase().includes(q))
  );
}
