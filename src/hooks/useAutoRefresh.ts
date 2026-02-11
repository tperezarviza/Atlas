import { useState, useEffect, useRef, useCallback } from 'react';

export function useAutoRefresh<T>(
  fetchFn: () => T | Promise<T>,
  intervalMs: number
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const result = await fetchFnRef.current();
      if (!signal?.aborted) {
        setData(result);
        setLastUpdate(new Date());
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, []);

  useEffect(() => {
    if (intervalMs <= 0) return;
    const controller = new AbortController();
    refresh(controller.signal);
    const interval = setInterval(() => refresh(controller.signal), intervalMs);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [refresh, intervalMs]);

  return { data, error, lastUpdate, refresh };
}
