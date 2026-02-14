import { useState, useEffect, useRef, useCallback } from 'react';

interface UseApiDataOptions {
  enabled?: boolean;
}

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  refetch: (signal?: AbortSignal) => Promise<void>;
}

export function useApiData<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number,
  options?: UseApiDataOptions,
): UseApiDataResult<T> {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFetchedRef = useRef(false);
  // FIX HIGH-1: Race condition guard — discard results from stale fetches
  const fetchIdRef = useRef(0);

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    const thisId = ++fetchIdRef.current;
    try {
      const result = await fetchFnRef.current();
      if (signal?.aborted || thisId !== fetchIdRef.current) return;
      setData(result);
      setError(null);
      setLastUpdate(new Date());
      hasFetchedRef.current = true;
    } catch (err) {
      if (signal?.aborted || thisId !== fetchIdRef.current) return;
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      // Keep previous data on failure (stale-serve pattern)
    } finally {
      if (!signal?.aborted && thisId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const controller = new AbortController();

    if (!hasFetchedRef.current) {
      setLoading(true);
    }

    // Initial fetch
    refetch(controller.signal);

    // Setup polling interval
    const startPolling = () => {
      // FIX CRITICAL-1: Always clear previous interval before creating new one
      clearPolling();
      intervalRef.current = setInterval(() => {
        refetch(controller.signal);
      }, intervalMs);
    };
    startPolling();

    // Visibility change: pause when hidden, refetch when visible
    const handleVisibility = () => {
      if (document.hidden) {
        clearPolling();
      } else {
        refetch(controller.signal);
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      controller.abort();
      clearPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  // FIX MEDIUM-1: Use primitive `enabled` value, not `options?.enabled` object reference
  }, [refetch, intervalMs, enabled, clearPolling]);

  return { data, loading, error, lastUpdate, refetch };
}
