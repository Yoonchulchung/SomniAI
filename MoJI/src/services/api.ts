/**
 * API Service Layer
 * Enterprise-grade HTTP client with retry, caching, and error handling
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
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APIClient {
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
    this.baseURL = url;
    this.clearCache();
  }

  /**
   * Generic request method with retry logic
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
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${method}:${url}:${JSON.stringify(body)}`;

    // Check cache
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

    // Create request promise
    const requestPromise = this.executeWithRetry<T>(
      url,
      method,
      headers,
      body,
      timeout,
      retries
    );

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;

      // Cache successful GET requests
      if (cache && method === 'GET' && response.success) {
        this.setCache(cacheKey, response.data, cacheTTL);
      }

      return response;
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
    retries: number
  ): Promise<APIResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        apiLogger.debug(`Request attempt ${attempt + 1}/${retries + 1}: ${method} ${url}`);

        const response = await this.executeRequest<T>(
          url,
          method,
          headers,
          body,
          timeout
        );

        apiLogger.info(`Request successful: ${method} ${url}`, {
          status: response.success ? 'success' : 'error',
        });

        return response;
      } catch (error) {
        lastError = error as Error;
        apiLogger.warn(`Request attempt ${attempt + 1} failed: ${method} ${url}`, {
          error: lastError.message,
        });

        if (attempt < retries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
          apiLogger.debug(`Retrying after ${backoffDelay}ms`);
          await this.sleep(backoffDelay);
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
   * Execute single HTTP request
   */
  private async executeRequest<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: unknown,
    timeout: number
  ): Promise<APIResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
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
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    apiLogger.debug('Cache cleared');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }
}

/**
 * API Service for MoJI Application
 */
class APIService {
  private client: APIClient;

  constructor(baseURL: string) {
    this.client = new APIClient(baseURL);
  }

  /**
   * Update server URL
   */
  setServerURL(url: string): void {
    this.client.setBaseURL(url);
  }

  /**
   * Fetch dashboard data
   */
  async getDashboard(): Promise<APIResponse<DashboardData>> {
    return this.client.get<DashboardData>('/api/dashboard', {
      cache: true,
      cacheTTL: 5000, // 5 seconds
    });
  }

  /**
   * Fetch analytics data
   */
  async getAnalytics(
    period: 'today' | 'thisWeek' | 'thisMonth'
  ): Promise<APIResponse<AnalyticsData>> {
    return this.client.get<AnalyticsData>(`/api/analytics?period=${period}`, {
      cache: true,
      cacheTTL: 30000, // 30 seconds
    });
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<AppConfig>): Promise<APIResponse<AppConfig>> {
    return this.client.put<AppConfig>('/api/config', config);
  }

  /**
   * Send frame data
   */
  async sendFrame(frameData: ArrayBuffer): Promise<APIResponse<{ success: boolean }>> {
    // This will be handled by native code
    // This is a placeholder for API documentation
    return {
      success: true,
      data: { success: true },
      timestamp: Date.now(),
    };
  }

  /**
   * Test connection
   */
  async testConnection(url: string): Promise<APIResponse<{ status: string }>> {
    const tempClient = new APIClient(url);
    return tempClient.get<{ status: string }>('/api/health', {
      timeout: 5000,
      retries: 1,
    });
  }

  /**
   * Get transmission stats
   */
  async getTransmissionStats(): Promise<
    APIResponse<{
      totalFrames: number;
      successRate: number;
      averageFps: number;
    }>
  > {
    return this.client.get('/api/transmission/stats', {
      cache: true,
      cacheTTL: 2000, // 2 seconds
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.client.clearCache();
  }
}

// Create singleton instance
export const apiService = new APIService('http://192.168.0.100:8000');
