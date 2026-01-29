/**
 * Common interface for Futures exchange adapters (Binance USD-M, Bybit USDT perpetual).
 * All orders go through backend; no secrets in frontend.
 */

export type MarginMode = 'isolated' | 'cross';
export type PositionMode = 'one_way' | 'hedge';

export interface FuturesAccountSummary {
  availableBalanceUsdt: string;
  totalWalletBalanceUsdt?: string;
}

export interface FuturesPlaceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: string;
  type: 'MARKET' | 'LIMIT';
  reduceOnly?: boolean;
  stopLoss?: string;   // price
  takeProfit?: string; // price
  positionSide?: 'BOTH' | 'LONG' | 'SHORT';
}

export interface FuturesOrderResult {
  orderId: string;
  status: string;
  code?: number;
  message?: string;
}

export interface FuturesOpenPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  positionAmt: string;
  entryPrice: string;
  markPrice?: string;
  unrealizedProfit?: string;
  leverage?: string;
}

export interface FuturesOpenOrder {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  status: string;
  origQty: string;
  price?: string;
  stopPrice?: string;
}

export interface IFuturesAdapter {
  setLeverage(symbol: string, leverage: number): Promise<void>;
  setMarginMode(symbol: string, mode: MarginMode): Promise<void>;
  setPositionMode(mode: PositionMode): Promise<void>;
  getAccountSummary(): Promise<FuturesAccountSummary>;
  placeOrder(params: FuturesPlaceOrderParams): Promise<FuturesOrderResult>;
  getOpenPosition(symbol: string): Promise<FuturesOpenPosition | null>;
  getOpenOrders(symbol: string): Promise<FuturesOpenOrder[]>;
  cancelAll(symbol: string): Promise<void>;
}
