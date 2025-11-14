/**
 * Secure API Service Layer
 * Enhanced API client with comprehensive security features
 */

import { apiLogger } from '../utils/logger';
import {
  sanitizeURL,
  sanitizeEndpoint,
  sanitizeJSON,
  getSecureHeaders,
  rateLimiter,
  isContentSecure,
} from '../utils/security';
import type { APIResponse, APIError } from '../types';

interface SecureRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  signal?: AbortSignal;
  validateResponse?: boolean;
  rateLimitKey?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

class SecureAPIClient {
  private baseURL: string;
  private defaultTimeout = 10000;
  private defaultRetries = 3;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private maxCacheSize = 100;

  constructor(baseURL: string) {
    const urlResult = sanitizeURL(baseURL);
    if (!urlResult.success) {
      throw new Error(`Invalid base URL: ${urlResult.error.message}`);
    }
    this.baseURL = urlResult.value;
  }

  /**
   * Update base URL with validation
   */
  setBaseURL(url: string): void {
    const urlResult = sanitizeURL(url);
    if (!urlResult.success) {
      throw new Error(`Invalid URL: ${urlResult.error.message}`);
    }
    this.baseURL = urlResult.value;
    this.clearCache();
  }

  /**
   * Generic secure request method
   */
  private async request<T>(
    endpoint: string,
    config: SecureRequestConfig = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      cache = false,
      cacheTTL = 60000,
      signal,
      validateResponse = true,
      rateLimitKey,
    } = config;

    // Sanitize endpoint
    const safeEndpoint = sanitizeEndpoint(endpoint);

    // Rate limiting check
    const limitKey = rateLimitKey || `${method}:${safeEndpoint}`;
    if (!rateLimiter.isAllowed(limitKey)) {
      const error: APIError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: { endpoint: safeEndpoint },
      };

      apiLogger.warn('Rate limit exceeded', { endpoint: safeEndpoint });

      return {
        success: false,
        data: null as any,
        error,
        timestamp: Date.now(),
      };
    }

    // Build full URL
    const url = `${this.baseURL}${safeEndpoint}`;
    const cacheKey = `${method}:${url}:${JSON.stringify(body)}`;

    // Check cache for GET requests
    if (cache && method === 'GET') {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        apiLogger.debug(`Cache hit: ${safeEndpoint}`);
        return {
          success: true,
          data: cached,
          timestamp: Date.now(),
        };
      }
    }

    // Check pending requests (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      apiLogger.debug(`Request deduplication: ${safeEndpoint}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create request promise
    const requestPromise = this.executeWithRetry<T>(
      url,
      method,
      headers,
      body,
      timeout,
      retries,
      signal,
      validateResponse
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
   * Execute request with exponential backoff retry and security checks
   */
  private async executeWithRetry<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: unknown,
    timeout: number,
    retries: number,
    externalSignal?: AbortSignal,
    validateResponse: boolean = true
  ): Promise<APIResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      // Check if external signal was aborted
      if (externalSignal?.aborted) {
        const error: APIError = {
          code: 'REQUEST_CANCELLED',
          message: 'Request was cancelled',
          details: { url, method },
        };

        return {
          success: false,
          data: null as any,
          error,
          timestamp: Date.now(),
        };
      }

      try {
        apiLogger.debug(`Request attempt ${attempt + 1}/${retries + 1}: ${method} ${url}`);

        const response = await this.executeRequest<T>(
          url,
          method,
          headers,
          body,
          timeout,
          externalSignal,
          validateResponse
        );

        apiLogger.info(`Request successful: ${method} ${url}`, {
          status: response.success ? 'success' : 'error',
        });

        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (lastError.message.includes('HTTP 4')) {
          break;
        }

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
   * Execute single HTTP request with security validations
   */
  private async executeRequest<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: unknown,
    timeout: number,
    externalSignal?: AbortSignal,
    validateResponse: boolean = true
  ): Promise<APIResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine signals
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      // Get secure headers
      const secureHeaders = getSecureHeaders(headers);

      // Validate request body
      let requestBody: string | undefined;
      if (body !== undefined) {
        const serialized = JSON.stringify(body);
        const jsonResult = sanitizeJSON(serialized);

        if (!jsonResult.success) {
          throw new Error(`Invalid request body: ${jsonResult.error.message}`);
        }

        requestBody = serialized;
      }

      // Execute fetch
      const response = await fetch(url, {
        method,
        headers: secureHeaders,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check HTTP status
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse and validate response
      const responseText = await response.text();

      // Validate response content security
      if (validateResponse) {
        const contentCheck = isContentSecure(responseText);
        if (!contentCheck.success) {
          throw new Error(`Insecure response content: ${contentCheck.error.message}`);
        }
      }

      // Parse JSON with validation
      const jsonResult = sanitizeJSON<T>(responseText);
      if (!jsonResult.success) {
        throw new Error(`Invalid response JSON: ${jsonResult.error.message}`);
      }

      return {
        success: true,
        data: jsonResult.value,
        timestamp: Date.now(),
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout or cancelled');
      }

      throw error;
    }
  }

  /**
   * Cache management with size limit
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
    // Enforce cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

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
   * HTTP Methods
   */

  async get<T>(endpoint: string, config?: Omit<SecureRequestConfig, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<SecureRequestConfig, 'method' | 'body'>
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<SecureRequestConfig, 'method' | 'body'>
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async delete<T>(endpoint: string, config?: Omit<SecureRequestConfig, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<SecureRequestConfig, 'method' | 'body'>
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }
}

// Create singleton instance
export const secureApiClient = new SecureAPIClient('http://192.168.0.100:8000');
