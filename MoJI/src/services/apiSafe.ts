/**
 * Safe API Service Layer with Cancellation Support
 * Enhanced error handling and request cancellation
 */

import { apiLogger } from '../utils/logger';
import type {
  APIResponse,
  APIError,
  DashboardData,
  AnalyticsData,
  AppConfig,
} from '../types';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  signal?: AbortSignal;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SafeAPIClient {
  private baseURL: string;
  private defaultTimeout = 10000;
  private defaultRetries = 3;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Update base URL
   */
  setBaseURL(url: string): void {
    if (!url || typeof url !== 'string') {
      apiLogger.error('Invalid base URL provided');
      return;
    }
    this.baseURL = url;
    this.clearCache();
  }

  /**
   * Generic request method with cancellation support
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      cache = false,
      cacheTTL = 60000,
      signal: externalSignal,
    } = config;

    // Validate inputs
    if (!endpoint || typeof endpoint !== 'string') {
      return {
        success: false,
        data: null as any,
        error: { code: 'INVALID_ENDPOINT', message: 'Invalid endpoint provided' },
        timestamp: Date.now(),
      };
    }

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${method}:${url}:${JSON.stringify(body)}`;

    // Check cache for GET requests
    if (cache && method === 'GET') {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        apiLogger.debug(`Cache hit: ${endpoint}`);
        return {
          success: true,
          data: cached,
          timestamp: Date.now(),
        };
      }
    }

    // Check pending requests (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      apiLogger.debug(`Request deduplication: ${endpoint}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create combined abort controller
    const internalController = new AbortController();
    let combinedSignal = internalController.signal;

    // Combine with external signal if provided
    if (externalSignal) {
      const abortHandler = () => internalController.abort();
      externalSignal.addEventListener('abort', abortHandler, { once: true });

      if (externalSignal.aborted) {
        return {
          success: false,
          data: null as any,
          error: { code: 'ABORTED', message: 'Request aborted' },
          timestamp: Date.now(),
        };
      }
    }

    // Create request promise
    const requestPromise = this.executeWithRetry<T>(
      url,
      method,
      headers,
      body,
      timeout,
      retries,
      combinedSignal
    );

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;

      // Cache successful GET requests
      if (cache && method === 'GET' && response.success) {
        this.setCache(cacheKey, response.data, cacheTTL);
      }

      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          data: null as any,
          error: { code: 'ABORTED', message: 'Request cancelled' },
          timestamp: Date.now(),
        };
      }
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: unknown,
    timeout: number,
    retries: number,
    signal: AbortSignal
  ): Promise<APIResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      // Check if aborted before retry
      if (signal.aborted) {
        throw new Error('AbortError');
      }

      try {
        apiLogger.debug(`Request attempt ${attempt + 1}/${retries + 1}: ${method} ${url}`);

        const response = await this.executeRequest<T>(
          url,
          method,
          headers,
          body,
          timeout,
          signal
        );

        apiLogger.info(`Request successful: ${method} ${url}`, {
          status: response.success ? 'success' : 'error',
        });

        return response;
      } catch (error: any) {
        // Don't retry on abort
        if (error.name === 'AbortError' || signal.aborted) {
          throw error;
        }

        lastError = error;
        apiLogger.warn(`Request attempt ${attempt + 1} failed: ${method} ${url}`, {
          error: lastError.message,
        });

        if (attempt < retries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
          apiLogger.debug(`Retrying after ${backoffDelay}ms`);

          // Wait with cancellation support
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, backoffDelay);

            const abortHandler = () => {
              clearTimeout(timer);
              reject(new Error('AbortError'));
            };

            signal.addEventListener('abort', abortHandler, { once: true });

            // Cleanup
            setTimeout(() => {
              signal.removeEventListener('abort', abortHandler);
            }, backoffDelay);
          });
        }
      }
    }

    const error: APIError = {
      code: 'REQUEST_FAILED',
      message: lastError?.message || 'Request failed after retries',
      details: { url, method, retries },
    };

    apiLogger.error(`Request failed after ${retries + 1} attempts: ${method} ${url}`, lastError);

    return {
      success: false,
      data: null as any,
      error,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute single HTTP request with cancellation
   */
  private async executeRequest<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: unknown,
    timeout: number,
    signal: AbortSignal
  ): Promise<APIResponse<T>> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    // Combined signal
    const combinedSignal = this.combineSignals([signal, timeoutController.signal]);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw error;
      }

      throw new Error(error.message || 'Request failed');
    }
  }

  /**
   * Combine multiple AbortSignals
   */
  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    signals.forEach((signal) => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    });

    return controller.signal;
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key);
      if (!entry) return null;

      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      apiLogger.error('Cache read error', undefined, error as Error);
      return null;
    }
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      // Limit cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
    } catch (error) {
      apiLogger.error('Cache write error', undefined, error as Error);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    try {
      this.cache.clear();
      apiLogger.debug('Cache cleared');
    } catch (error) {
      apiLogger.error('Cache clear error', undefined, error as Error);
    }
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

/**
 * Safe API Service for MoJI Application
 */
class SafeAPIService {
  private client: SafeAPIClient;

  constructor(baseURL: string) {
    this.client = new SafeAPIClient(baseURL);
  }

  setServerURL(url: string): void {
    this.client.setBaseURL(url);
  }

  async getDashboard(signal?: AbortSignal): Promise<APIResponse<DashboardData>> {
    return this.client.get<DashboardData>('/api/dashboard', {
      cache: true,
      cacheTTL: 5000,
      signal,
    });
  }

  async getAnalytics(
    period: 'today' | 'thisWeek' | 'thisMonth',
    signal?: AbortSignal
  ): Promise<APIResponse<AnalyticsData>> {
    return this.client.get<AnalyticsData>(`/api/analytics?period=${period}`, {
      cache: true,
      cacheTTL: 30000,
      signal,
    });
  }

  async updateConfig(
    config: Partial<AppConfig>,
    signal?: AbortSignal
  ): Promise<APIResponse<AppConfig>> {
    return this.client.put<AppConfig>('/api/config', config, { signal });
  }

  async testConnection(url: string, signal?: AbortSignal): Promise<APIResponse<{ status: string }>> {
    const tempClient = new SafeAPIClient(url);
    return tempClient.get<{ status: string }>('/api/health', {
      timeout: 5000,
      retries: 1,
      signal,
    });
  }

  clearCache(): void {
    this.client.clearCache();
  }
}

// Export singleton instance
export const safeApiService = new SafeAPIService('http://192.168.0.100:8000');
