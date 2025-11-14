/**
 * Safe Data Fetching Hooks with Error Recovery
 * Enhanced with cancellation, retry, and error handling
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
  retryCount?: number;
  retryDelay?: number;
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
  cancel: () => void;
}

/**
 * Safe data fetching hook with automatic cleanup
 */
export function useDataSafe<T>(
  fetcher: (signal: AbortSignal) => Promise<APIResponse<T>>,
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
    cacheDuration = 300000,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<APIError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Cancel ongoing requests
  const cancel = useCallback(() => {
    cleanup();
    setIsFetching(false);
    apiLogger.debug('Fetch cancelled', cacheKey);
  }, [cleanup, cacheKey]);

  const fetchData = useCallback(
    async (attemptNumber: number = 0) => {
      if (!enabled || !isMountedRef.current) return;

      const currentFetch = ++fetchRef.current;

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsFetching(true);

      // Check cache
      if (cacheKey && attemptNumber === 0) {
        const cached = cacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheDuration) {
          apiLogger.debug(`Using cached data for: ${cacheKey}`);
          if (isMountedRef.current) {
            setData(cached.data);
            setIsLoading(false);
            setIsFetching(false);
          }
          return;
        }
      }

      try {
        const measurementName = `fetch:${cacheKey || 'unknown'}`;
        performanceMonitor.start(measurementName);

        const response = await fetcher(signal);

        // Check if still the latest fetch and component is mounted
        if (currentFetch !== fetchRef.current || !isMountedRef.current) {
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

          if (isMountedRef.current && onSuccess) {
            try {
              onSuccess(response.data);
            } catch (callbackError) {
              apiLogger.error('Error in onSuccess callback', undefined, callbackError as Error);
            }
          }

          apiLogger.info(`Data fetched successfully: ${cacheKey}`);
        } else {
          throw response.error || new Error('Unknown error');
        }
      } catch (err: any) {
        // Don't handle aborted requests as errors
        if (err.name === 'AbortError' || signal.aborted) {
          apiLogger.debug('Fetch aborted');
          return;
        }

        const error: APIError = {
          code: err.code || 'FETCH_ERROR',
          message: err.message || 'Unknown error',
          details: err,
        };

        // Retry logic
        if (attemptNumber < retryCount && isMountedRef.current) {
          const delay = retryDelay * Math.pow(2, attemptNumber);
          apiLogger.warn(
            `Fetch failed, retrying in ${delay}ms (attempt ${attemptNumber + 1}/${retryCount})`,
            { error: error.message }
          );

          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(attemptNumber + 1);
            }
          }, delay);
          return;
        }

        // All retries failed
        if (isMountedRef.current) {
          setError(error);
          if (onError) {
            try {
              onError(error);
            } catch (callbackError) {
              apiLogger.error('Error in onError callback', undefined, callbackError as Error);
            }
          }
          apiLogger.error(`Data fetch failed after ${retryCount} retries: ${cacheKey}`, undefined, err);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [
      fetcher,
      enabled,
      cacheKey,
      cacheDuration,
      onSuccess,
      onError,
      retryCount,
      retryDelay,
    ]
  );

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    return cleanup;
  }, [fetchData, enabled, cleanup]);

  // Auto-refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchData();
        }
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [refetchInterval, fetchData, enabled]);

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const mutate = useCallback(
    (newData: T | ((prev: T | null) => T)) => {
      if (!isMountedRef.current) return;

      setData((prev) => (typeof newData === 'function' ? (newData as Function)(prev) : newData));

      if (cacheKey) {
        const finalData = typeof newData === 'function' ? (newData as Function)(data) : newData;
        if (finalData) {
          cacheRef.current.set(cacheKey, {
            data: finalData,
            timestamp: Date.now(),
          });
        }
      }
    },
    [cacheKey, data]
  );

  const refetch = useCallback(async () => {
    if (isMountedRef.current) {
      await fetchData();
    }
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    refetch,
    mutate,
    cancel,
  };
}

/**
 * Safe mutation hook with automatic cleanup
 */
export function useMutationSafe<T, V>(
  mutator: (variables: V, signal: AbortSignal) => Promise<APIResponse<T>>,
  options: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: APIError, variables: V) => void;
    onSettled?: (data: T | null, error: APIError | null, variables: V) => void;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<APIError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const mutate = useCallback(
    async (variables: V) => {
      if (!isMountedRef.current) return;

      setIsLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const response = await mutator(variables, signal);

        if (!isMountedRef.current || signal.aborted) {
          return response;
        }

        if (response.success) {
          setData(response.data);
          if (options.onSuccess) {
            try {
              options.onSuccess(response.data, variables);
            } catch (callbackError) {
              apiLogger.error('Error in mutation onSuccess', undefined, callbackError as Error);
            }
          }
        } else {
          const err = response.error || { code: 'UNKNOWN', message: 'Unknown error' };
          setError(err);
          if (options.onError) {
            try {
              options.onError(err, variables);
            } catch (callbackError) {
              apiLogger.error('Error in mutation onError', undefined, callbackError as Error);
            }
          }
        }

        if (options.onSettled) {
          try {
            options.onSettled(
              response.success ? response.data : null,
              response.error || null,
              variables
            );
          } catch (callbackError) {
            apiLogger.error('Error in mutation onSettled', undefined, callbackError as Error);
          }
        }

        return response;
      } catch (err: any) {
        if (err.name === 'AbortError' || signal.aborted) {
          apiLogger.debug('Mutation aborted');
          return { success: false, data: null as any, error: err, timestamp: Date.now() };
        }

        const error: APIError = {
          code: 'MUTATION_ERROR',
          message: err.message || 'Unknown error',
        };

        if (isMountedRef.current) {
          setError(error);
          if (options.onError) {
            try {
              options.onError(error, variables);
            } catch (callbackError) {
              apiLogger.error('Error in mutation onError', undefined, callbackError as Error);
            }
          }
          if (options.onSettled) {
            try {
              options.onSettled(null, error, variables);
            } catch (callbackError) {
              apiLogger.error('Error in mutation onSettled', undefined, callbackError as Error);
            }
          }
        }

        throw error;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [mutator, options]
  );

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setData(null);
      setError(null);
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    mutate,
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    reset,
    cancel,
  };
}
