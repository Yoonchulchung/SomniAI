/**
 * Data Fetching Hooks
 * Enterprise-grade data management with caching and optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { APIResponse, APIError } from '../types';
import { apiLogger } from '../utils/logger';
import { performanceMonitor } from '../utils/performance';

interface UseDataOptions<T> {
  initialData?: T | null;
  enabled?: boolean;
  refetchInterval?: number;
  refetchOnFocus?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: APIError) => void;
  cacheKey?: string;
  cacheDuration?: number;
}

interface UseDataReturn<T> {
  data: T | null;
  error: APIError | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
  mutate: (data: T | ((prev: T | null) => T)) => void;
}

/**
 * Generic data fetching hook with caching and auto-refetch
 */
export function useData<T>(
  fetcher: () => Promise<APIResponse<T>>,
  options: UseDataOptions<T> = {}
): UseDataReturn<T> {
  const {
    initialData = null,
    enabled = true,
    refetchInterval,
    refetchOnFocus = false,
    onSuccess,
    onError,
    cacheKey,
    cacheDuration = 300000, // 5 minutes default
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<APIError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const fetchRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const currentFetch = ++fetchRef.current;
    setIsFetching(true);

    // Check cache
    if (cacheKey) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        apiLogger.debug(`Using cached data for: ${cacheKey}`);
        setData(cached.data);
        setIsLoading(false);
        setIsFetching(false);
        return;
      }
    }

    try {
      const measurementName = `fetch:${cacheKey || 'unknown'}`;
      performanceMonitor.start(measurementName);

      const response = await fetcher();

      // Check if this is still the latest fetch
      if (currentFetch !== fetchRef.current) {
        apiLogger.debug('Ignoring stale fetch result');
        return;
      }

      performanceMonitor.end(measurementName);

      if (response.success) {
        setData(response.data);
        setError(null);

        // Update cache
        if (cacheKey) {
          cacheRef.current.set(cacheKey, {
            data: response.data,
            timestamp: Date.now(),
          });
        }

        onSuccess?.(response.data);
        apiLogger.info(`Data fetched successfully: ${cacheKey}`);
      } else {
        setError(response.error || null);
        onError?.(response.error!);
        apiLogger.error(`Data fetch failed: ${cacheKey}`, undefined, response.error);
      }
    } catch (err) {
      const error: APIError = {
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err,
      };
      setError(error);
      onError?.(error);
      apiLogger.error(`Data fetch exception: ${cacheKey}`, undefined, err as Error);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [fetcher, enabled, cacheKey, cacheDuration, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  // Auto-refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, fetchData, enabled]);

  // Refetch on focus
  useEffect(() => {
    if (refetchOnFocus && enabled) {
      const handleAppStateChange = (state: string) => {
        if (state === 'active') {
          fetchData();
        }
      };

      // Note: In a real app, you'd use AppState from react-native
      // const subscription = AppState.addEventListener('change', handleAppStateChange);
      // return () => subscription.remove();
    }
  }, [refetchOnFocus, fetchData, enabled]);

  const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
    setData((prev) => (typeof newData === 'function' ? (newData as Function)(prev) : newData));
    if (cacheKey) {
      const finalData = typeof newData === 'function' ? (newData as Function)(data) : newData;
      cacheRef.current.set(cacheKey, {
        data: finalData,
        timestamp: Date.now(),
      });
    }
  }, [cacheKey, data]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    refetch: fetchData,
    mutate,
  };
}

/**
 * Hook for paginated data fetching
 */
export function usePaginatedData<T>(
  fetcher: (page: number) => Promise<APIResponse<T[]>>,
  options: Omit<UseDataOptions<T[]>, 'cacheKey'> & { pageSize?: number } = {}
) {
  const { pageSize = 20, ...restOptions } = options;
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const fetcherWithPage = useCallback(() => fetcher(page), [fetcher, page]);

  const { data, isLoading, isFetching, error, refetch } = useData(fetcherWithPage, {
    ...restOptions,
    cacheKey: `paginated-${page}`,
    onSuccess: (newData) => {
      setAllData((prev) => [...prev, ...newData]);
      setHasMore(newData.length === pageSize);
      restOptions.onSuccess?.(newData);
    },
  });

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage((p) => p + 1);
    }
  }, [isFetching, hasMore]);

  const reset = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
  }, []);

  return {
    data: allData,
    isLoading,
    isFetching,
    error,
    hasMore,
    loadMore,
    reset,
    refetch,
  };
}

/**
 * Hook for infinite scroll data fetching
 */
export function useInfiniteData<T>(
  fetcher: (cursor: string | null) => Promise<APIResponse<{ items: T[]; nextCursor: string | null }>>,
  options: Omit<UseDataOptions<T[]>, 'cacheKey'> = {}
) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const fetcherWithCursor = useCallback(() => fetcher(cursor), [fetcher, cursor]);

  const { data, isLoading, isFetching, error, refetch } = useData(fetcherWithCursor, {
    ...options,
    cacheKey: `infinite-${cursor}`,
    onSuccess: (response) => {
      setAllData((prev) => [...prev, ...response.items]);
      setCursor(response.nextCursor);
      setHasMore(response.nextCursor !== null);
      options.onSuccess?.(response.items);
    },
  });

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore && cursor) {
      refetch();
    }
  }, [isFetching, hasMore, cursor, refetch]);

  const reset = useCallback(() => {
    setCursor(null);
    setAllData([]);
    setHasMore(true);
  }, []);

  return {
    data: allData,
    isLoading,
    isFetching,
    error,
    hasMore,
    loadMore,
    reset,
    refetch,
  };
}

/**
 * Hook for optimistic updates
 */
export function useMutation<T, V>(
  mutator: (variables: V) => Promise<APIResponse<T>>,
  options: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: APIError, variables: V) => void;
    onSettled?: (data: T | null, error: APIError | null, variables: V) => void;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<APIError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (variables: V) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await mutator(variables);

        if (response.success) {
          setData(response.data);
          options.onSuccess?.(response.data, variables);
        } else {
          setError(response.error || null);
          options.onError?.(response.error!, variables);
        }

        options.onSettled?.(
          response.success ? response.data : null,
          response.error || null,
          variables
        );

        return response;
      } catch (err) {
        const error: APIError = {
          code: 'MUTATION_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        };
        setError(error);
        options.onError?.(error, variables);
        options.onSettled?.(null, error, variables);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [mutator, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    mutate,
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    reset,
  };
}
