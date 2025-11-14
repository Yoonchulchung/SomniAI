/**
 * Type Guards and Validation Utilities
 * Runtime type checking and validation
 */

import type {
  APIError,
  DashboardData,
  AnalyticsData,
  AppConfig,
  ActivityItem,
  Toast,
} from '../types';

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is an object
 */
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray<T = any>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Check if value is a valid URL
 */
export function isValidURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid HTTP URL
 */
export function isValidHTTPURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Type guard for APIError
 */
export function isAPIError(value: unknown): value is APIError {
  return (
    isObject(value) &&
    'code' in value &&
    'message' in value &&
    isString(value.code) &&
    isString(value.message)
  );
}

/**
 * Type guard for DashboardData
 */
export function isDashboardData(value: unknown): value is DashboardData {
  return (
    isObject(value) &&
    'status' in value &&
    'quickStats' in value &&
    'recentActivity' in value &&
    'systemHealth' in value &&
    isObject(value.status) &&
    isObject(value.quickStats) &&
    isArray(value.recentActivity) &&
    isObject(value.systemHealth)
  );
}

/**
 * Type guard for ActivityItem
 */
export function isActivityItem(value: unknown): value is ActivityItem {
  return (
    isObject(value) &&
    'id' in value &&
    'timestamp' in value &&
    'type' in value &&
    'message' in value &&
    'status' in value &&
    isNumber(value.id) &&
    isString(value.timestamp) &&
    isString(value.type) &&
    isString(value.message) &&
    isString(value.status)
  );
}

/**
 * Type guard for Toast
 */
export function isToast(value: unknown): value is Toast {
  return (
    isObject(value) &&
    'id' in value &&
    'message' in value &&
    'type' in value &&
    'duration' in value &&
    isString(value.id) &&
    isString(value.message) &&
    isString(value.type) &&
    isNumber(value.duration)
  );
}

/**
 * Validate and sanitize number
 */
export function validateNumber(
  value: unknown,
  options: {
    min?: number;
    max?: number;
    default?: number;
  } = {}
): number {
  const { min, max, default: defaultValue = 0 } = options;

  if (!isNumber(value)) {
    return defaultValue;
  }

  let result = value;

  if (isDefined(min) && result < min) {
    result = min;
  }

  if (isDefined(max) && result > max) {
    result = max;
  }

  return result;
}

/**
 * Validate and sanitize string
 */
export function validateString(
  value: unknown,
  options: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    default?: string;
  } = {}
): string {
  const { minLength, maxLength, pattern, default: defaultValue = '' } = options;

  if (!isString(value)) {
    return defaultValue;
  }

  let result = value.trim();

  if (isDefined(minLength) && result.length < minLength) {
    return defaultValue;
  }

  if (isDefined(maxLength) && result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  if (pattern && !pattern.test(result)) {
    return defaultValue;
  }

  return result;
}

/**
 * Validate and sanitize array
 */
export function validateArray<T>(
  value: unknown,
  validator: (item: unknown) => item is T,
  options: {
    maxLength?: number;
    default?: T[];
  } = {}
): T[] {
  const { maxLength, default: defaultValue = [] } = options;

  if (!isArray(value)) {
    return defaultValue;
  }

  let result = value.filter(validator);

  if (isDefined(maxLength) && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  return result;
}

/**
 * Safely parse JSON
 */
export function safeJSONParse<T>(
  value: string,
  defaultValue: T
): T {
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely stringify JSON
 */
export function safeJSONStringify(
  value: unknown,
  defaultValue: string = '{}'
): string {
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Assert value is defined (throws if not)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is not defined'
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message);
  }
}

/**
 * Assert condition is true (throws if not)
 */
export function assert(
  condition: boolean,
  message: string = 'Assertion failed'
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Exhaustive check for switch statements
 */
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled value: ${value}`);
}

/**
 * Safe property access
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  if (!isDefined(obj) || !isObject(obj)) {
    return defaultValue;
  }

  const value = obj[key];
  return isDefined(value) ? value : defaultValue;
}

/**
 * Safe nested property access
 */
export function safeGetNested<T>(
  obj: any,
  path: string,
  defaultValue: T
): T {
  try {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (!isDefined(result) || !isObject(result)) {
        return defaultValue;
      }
      result = result[key];
    }

    return isDefined(result) ? result : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Check if value is in range
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Safe division (returns 0 if divisor is 0)
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

/**
 * Safe percentage calculation
 */
export function safePercentage(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return clamp((value / total) * 100, 0, 100);
}

/**
 * Check if value is empty (null, undefined, '', [], {})
 */
export function isEmpty(value: unknown): boolean {
  if (!isDefined(value)) {
    return true;
  }

  if (isString(value)) {
    return value.trim() === '';
  }

  if (isArray(value)) {
    return value.length === 0;
  }

  if (isObject(value)) {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Deep clone with error handling
 */
export function safeClone<T>(value: T): T | null {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 2 } = options;

  let lastError: Error | undefined;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(backoff, i)));
      }
    }
  }

  throw lastError;
}
