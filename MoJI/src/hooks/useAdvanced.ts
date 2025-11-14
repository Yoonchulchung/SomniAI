/**
 * Advanced Custom Hooks
 * Utility hooks for common patterns
 */

import { useState, useEffect, useRef, useCallback, DependencyList } from 'react';
import { AppState, AppStateStatus, Dimensions, ScaledSize } from 'react-native';

/**
 * useDebounce - Debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle - Throttle a value
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * usePrevious - Get previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useInterval - setInterval with hook
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current?.();
    const id = setInterval(tick, delay);

    return () => clearInterval(id);
  }, [delay]);
}

/**
 * useTimeout - setTimeout with hook
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => savedCallback.current?.(), delay);

    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * useToggle - Toggle boolean state
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  return [value, toggle, setValue];
}

/**
 * useCounter - Counter with increment/decrement
 */
export function useCounter(
  initialValue: number = 0,
  min?: number,
  max?: number
): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
} {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((c) => {
      const newValue = c + 1;
      if (max !== undefined && newValue > max) return c;
      return newValue;
    });
  }, [max]);

  const decrement = useCallback(() => {
    setCount((c) => {
      const newValue = c - 1;
      if (min !== undefined && newValue < min) return c;
      return newValue;
    });
  }, [min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const set = useCallback(
    (value: number) => {
      if (min !== undefined && value < min) return;
      if (max !== undefined && value > max) return;
      setCount(value);
    },
    [min, max]
  );

  return { count, increment, decrement, reset, set };
}

/**
 * useArray - Array manipulation helper
 */
export function useArray<T>(
  initialValue: T[] = []
): {
  array: T[];
  push: (item: T) => void;
  remove: (index: number) => void;
  clear: () => void;
  set: (array: T[]) => void;
  filter: (callback: (item: T) => boolean) => void;
} {
  const [array, setArray] = useState<T[]>(initialValue);

  const push = useCallback((item: T) => {
    setArray((arr) => [...arr, item]);
  }, []);

  const remove = useCallback((index: number) => {
    setArray((arr) => arr.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  const set = useCallback((newArray: T[]) => {
    setArray(newArray);
  }, []);

  const filter = useCallback((callback: (item: T) => boolean) => {
    setArray((arr) => arr.filter(callback));
  }, []);

  return { array, push, remove, clear, set, filter };
}

/**
 * useAppState - Track app state (foreground/background)
 */
export function useAppState(
  onChange?: (state: AppStateStatus) => void
): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
      onChange?.(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [onChange]);

  return appState;
}

/**
 * useDimensions - Track window dimensions
 */
export function useDimensions(): {
  window: ScaledSize;
  screen: ScaledSize;
} {
  const [dimensions, setDimensions] = useState({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      setDimensions({ window, screen });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return dimensions;
}

/**
 * useAsync - Handle async operations
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
): {
  execute: () => Promise<void>;
  value: T | null;
  error: Error | null;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setValue(null);
    setError(null);

    try {
      const result = await asyncFunction();
      setValue(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, value, error, loading };
}

/**
 * useLocalStorage - Persist state with MMKV
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  storage: any // MMKV instance
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = storage.getString(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from storage:`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value);
        storage.set(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving ${key} to storage:`, error);
      }
    },
    [key, storage]
  );

  return [storedValue, setValue];
}

/**
 * useIsMounted - Check if component is mounted
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

/**
 * useUpdateEffect - useEffect but skip first render
 */
export function useUpdateEffect(
  effect: () => void | (() => void),
  deps: DependencyList
): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    return effect();
  }, deps);
}

/**
 * useMemoCompare - useMemo with custom comparison
 */
export function useMemoCompare<T>(
  next: T,
  compare: (previous: T | undefined, next: T) => boolean
): T {
  const previousRef = useRef<T>();
  const previous = previousRef.current;

  const isEqual = compare(previous, next);

  useEffect(() => {
    if (!isEqual) {
      previousRef.current = next;
    }
  });

  return isEqual ? (previous as T) : next;
}

/**
 * useWhyDidYouUpdate - Debug why component re-rendered
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }

    previousProps.current = props;
  });
}
