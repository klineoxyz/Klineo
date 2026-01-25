/**
 * KLINEO Real-Time Data Simulation System
 * 
 * Simulates WebSocket-like real-time updates for:
 * - Price tickers
 * - PnL updates
 * - Position monitoring
 * - Connection status
 * 
 * In production, this would connect to actual WebSocket APIs.
 */

import { useState, useEffect, useCallback, useRef } from "react";

// Types
export interface PriceTicker {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  lastUpdate: number;
}

export interface PositionUpdate {
  id: string;
  symbol: string;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  currentPrice: number;
  lastUpdate: number;
}

export interface PortfolioUpdate {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  lastUpdate: number;
}

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

// Simulated data generators
const generatePriceUpdate = (symbol: string, basePrice: number): number => {
  // Simulate realistic price movements (±0.5% per tick)
  const change = (Math.random() - 0.5) * 0.01;
  return basePrice * (1 + change);
};

const generateVolume = (baseVolume: number): number => {
  const change = (Math.random() - 0.5) * 0.1;
  return baseVolume * (1 + change);
};

// Hook for real-time price ticker
export function usePriceTicker(
  symbol: string,
  basePrice: number = 42000,
  updateInterval: number = 1000
) {
  const [ticker, setTicker] = useState<PriceTicker>({
    symbol,
    price: basePrice,
    change24h: 0,
    volume24h: 1000000,
    lastUpdate: Date.now(),
  });

  const [isStale, setIsStale] = useState(false);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const newPrice = generatePriceUpdate(symbol, ticker.price);
      const priceChange = ((newPrice - basePrice) / basePrice) * 100;

      setTicker({
        symbol,
        price: newPrice,
        change24h: priceChange,
        volume24h: generateVolume(1000000),
        lastUpdate: Date.now(),
      });

      lastUpdateRef.current = Date.now();
      setIsStale(false);
    }, updateInterval);

    // Check for stale data every 5 seconds
    const staleCheck = setInterval(() => {
      const timeSinceUpdate = Date.now() - lastUpdateRef.current;
      if (timeSinceUpdate > 10000) {
        setIsStale(true);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(staleCheck);
    };
  }, [symbol, updateInterval]);

  return { ticker, isStale };
}

// Hook for real-time position updates
export function usePositionUpdates(
  positions: Array<{ id: string; symbol: string; entryPrice: number; quantity: number }>,
  updateInterval: number = 2000
) {
  const [updates, setUpdates] = useState<Record<string, PositionUpdate>>({});

  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      const newUpdates: Record<string, PositionUpdate> = {};

      positions.forEach((position) => {
        const currentPrice = generatePriceUpdate(
          position.symbol,
          position.entryPrice
        );
        const priceDiff = currentPrice - position.entryPrice;
        const unrealizedPnL = priceDiff * position.quantity;
        const unrealizedPnLPercent = (priceDiff / position.entryPrice) * 100;

        newUpdates[position.id] = {
          id: position.id,
          symbol: position.symbol,
          unrealizedPnL,
          unrealizedPnLPercent,
          currentPrice,
          lastUpdate: Date.now(),
        };
      });

      setUpdates(newUpdates);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [positions, updateInterval]);

  return updates;
}

// Hook for portfolio total updates
export function usePortfolioUpdates(
  initialValue: number = 10000,
  updateInterval: number = 3000
) {
  const [portfolio, setPortfolio] = useState<PortfolioUpdate>({
    totalValue: initialValue,
    totalPnL: 0,
    totalPnLPercent: 0,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const valueChange = (Math.random() - 0.48) * 100; // Slight upward bias
      const newValue = portfolio.totalValue + valueChange;
      const pnl = newValue - initialValue;
      const pnlPercent = (pnl / initialValue) * 100;

      setPortfolio({
        totalValue: newValue,
        totalPnL: pnl,
        totalPnLPercent: pnlPercent,
        lastUpdate: Date.now(),
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, []);

  return portfolio;
}

// Hook for connection status simulation
export function useConnectionStatus(
  simulateIssues: boolean = false
): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("connected");

  useEffect(() => {
    if (!simulateIssues) {
      setStatus("connected");
      return;
    }

    // Simulate occasional connection issues
    const interval = setInterval(() => {
      const random = Math.random();
      
      if (random < 0.05) {
        // 5% chance of disconnection
        setStatus("disconnected");
        
        // Reconnect after 3 seconds
        setTimeout(() => {
          setStatus("connecting");
          setTimeout(() => {
            setStatus("connected");
          }, 1500);
        }, 3000);
      } else if (random < 0.1) {
        // Additional 5% chance of error
        setStatus("error");
        
        // Recover after 2 seconds
        setTimeout(() => {
          setStatus("connecting");
          setTimeout(() => {
            setStatus("connected");
          }, 1000);
        }, 2000);
      }
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, [simulateIssues]);

  return status;
}

// Hook for WebSocket-like connection
export function useWebSocketSimulation(
  onMessage?: (data: any) => void,
  reconnectOnError: boolean = true
) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastMessageTime, setLastMessageTime] = useState<number>(Date.now());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    setStatus("connecting");
    
    // Simulate connection establishment
    setTimeout(() => {
      if (reconnectAttempts.current < maxReconnectAttempts) {
        setStatus("connected");
        reconnectAttempts.current = 0;
      } else {
        setStatus("error");
      }
    }, 1000);
  }, []);

  const disconnect = useCallback(() => {
    setStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttempts.current++;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    // Simulate periodic messages
    const messageInterval = setInterval(() => {
      if (status === "connected" && onMessage) {
        onMessage({
          type: "update",
          timestamp: Date.now(),
          data: { /* simulation data */ },
        });
        setLastMessageTime(Date.now());
      }
    }, 1000);

    return () => clearInterval(messageInterval);
  }, [status, onMessage]);

  return {
    status,
    lastMessageTime,
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Component: Real-time Price Display
 */
interface RealTimePriceProps {
  symbol: string;
  basePrice: number;
  showChange?: boolean;
  className?: string;
}

export function RealTimePrice({
  symbol,
  basePrice,
  showChange = true,
  className = "",
}: RealTimePriceProps) {
  const { ticker, isStale } = usePriceTicker(symbol, basePrice);
  const [priceAnimation, setPriceAnimation] = useState<"up" | "down" | null>(null);
  const prevPrice = useRef(ticker.price);

  useEffect(() => {
    if (ticker.price > prevPrice.current) {
      setPriceAnimation("up");
    } else if (ticker.price < prevPrice.current) {
      setPriceAnimation("down");
    }

    prevPrice.current = ticker.price;

    const timeout = setTimeout(() => setPriceAnimation(null), 500);
    return () => clearTimeout(timeout);
  }, [ticker.price]);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`font-mono font-semibold transition-colors duration-300 ${
          priceAnimation === "up"
            ? "text-[#10B981]"
            : priceAnimation === "down"
            ? "text-[#EF4444]"
            : "text-foreground"
        }`}
      >
        ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      
      {showChange && (
        <span
          className={`text-xs font-medium ${
            ticker.change24h >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
          }`}
        >
          {ticker.change24h >= 0 ? "+" : ""}
          {ticker.change24h.toFixed(2)}%
        </span>
      )}

      {isStale && (
        <span className="text-xs text-[#FFB000]" title="Data may be stale">
          ⚠
        </span>
      )}
    </div>
  );
}

/**
 * Component: Real-time PnL Display
 */
interface RealTimePnLProps {
  value: number;
  percent: number;
  showCurrency?: boolean;
  className?: string;
}

export function RealTimePnL({
  value,
  percent,
  showCurrency = true,
  className = "",
}: RealTimePnLProps) {
  const [animation, setAnimation] = useState<"up" | "down" | null>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value > prevValue.current) {
      setAnimation("up");
    } else if (value < prevValue.current) {
      setAnimation("down");
    }

    prevValue.current = value;

    const timeout = setTimeout(() => setAnimation(null), 500);
    return () => clearTimeout(timeout);
  }, [value]);

  const isPositive = value >= 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 transition-all duration-300 ${
        animation === "up" ? "scale-105" : animation === "down" ? "scale-95" : "scale-100"
      } ${className}`}
    >
      <span
        className={`font-mono font-semibold ${
          isPositive ? "text-[#10B981]" : "text-[#EF4444]"
        }`}
      >
        {isPositive ? "+" : ""}
        {showCurrency && "$"}
        {Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span
        className={`text-xs ${
          isPositive ? "text-[#10B981]/70" : "text-[#EF4444]/70"
        }`}
      >
        ({isPositive ? "+" : ""}
        {percent.toFixed(2)}%)
      </span>
    </div>
  );
}

/**
 * Component: Syncing Indicator
 */
export function SyncingIndicator({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="inline-flex items-center gap-2 text-xs text-accent">
      <div className="size-2 rounded-full bg-accent animate-pulse" />
      <span>Syncing...</span>
    </div>
  );
}

/**
 * Component: Stale Data Warning
 */
export function StaleDataWarning({ lastUpdate }: { lastUpdate: number }) {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const checkStale = () => {
      const timeSinceUpdate = Date.now() - lastUpdate;
      setIsStale(timeSinceUpdate > 10000); // 10 seconds
    };

    checkStale();
    const interval = setInterval(checkStale, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  if (!isStale) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#FFB000]/10 border border-[#FFB000]/20 rounded-md">
      <span className="text-[#FFB000] text-xs">⚠️</span>
      <span className="text-xs text-muted-foreground">
        Data may be stale. Last update: {Math.floor((Date.now() - lastUpdate) / 1000)}s ago
      </span>
    </div>
  );
}
