import { useState, useEffect, ReactNode } from "react";

interface LoadingWrapperProps {
  isLoading: boolean;
  loadingComponent: ReactNode;
  children: ReactNode;
  minLoadingTime?: number; // Minimum time to show loading in ms
}

export function LoadingWrapper({
  isLoading,
  loadingComponent,
  children,
  minLoadingTime = 500,
}: LoadingWrapperProps) {
  const [showLoading, setShowLoading] = useState(isLoading);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setStartTime(Date.now());
      setShowLoading(true);
    } else if (startTime) {
      const elapsed = Date.now() - startTime;
      const remaining = minLoadingTime - elapsed;

      if (remaining > 0) {
        const timeout = setTimeout(() => {
          setShowLoading(false);
          setStartTime(null);
        }, remaining);
        return () => clearTimeout(timeout);
      } else {
        setShowLoading(false);
        setStartTime(null);
      }
    }
  }, [isLoading, startTime, minLoadingTime]);

  return <>{showLoading ? loadingComponent : children}</>;
}

// Hook for simulating loading states (useful for development/demo)
export function useSimulatedLoading(duration: number = 2000) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  return isLoading;
}

// Hook for actual data loading with retry logic
export function useDataLoading<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchFn();
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [...dependencies, retryCount]);

  const retry = () => setRetryCount((prev) => prev + 1);

  return { data, isLoading, error, retry };
}
