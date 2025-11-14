/**
 * Security Utilities
 * Input sanitization, encryption, and security helpers
 */

import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import type { Result } from '../types';

// Secure storage instance with encryption
const secureStorage = new MMKV({
  id: 'secure-storage',
  encryptionKey: 'somni-ai-secure-key-v1', // In production, use a dynamically generated key
});

/**
 * Input Sanitization
 */

/**
 * Sanitize string input to prevent XSS/injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:text\/html/gi, '') // Remove data URLs
    .slice(0, 10000); // Limit length to prevent DOS
}

/**
 * Sanitize URL to ensure it's safe
 */
export function sanitizeURL(url: string): Result<string, Error> {
  try {
    const trimmed = url.trim();

    // Check for malicious protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const protocol of dangerousProtocols) {
      if (trimmed.toLowerCase().startsWith(protocol)) {
        return {
          success: false,
          error: new Error(`Dangerous protocol detected: ${protocol}`),
        };
      }
    }

    // Validate URL format
    const urlObj = new URL(trimmed);

    // Only allow http/https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return {
        success: false,
        error: new Error(`Invalid protocol: ${urlObj.protocol}`),
      };
    }

    // Check for localhost in production
    if (!__DEV__) {
      const localhost = ['localhost', '127.0.0.1', '0.0.0.0'];
      if (localhost.includes(urlObj.hostname)) {
        return {
          success: false,
          error: new Error('Localhost URLs not allowed in production'),
        };
      }
    }

    return {
      success: true,
      value: urlObj.toString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Validate and sanitize API endpoint
 */
export function sanitizeEndpoint(endpoint: string): string {
  if (typeof endpoint !== 'string') {
    return '/';
  }

  // Remove dangerous characters
  const sanitized = endpoint
    .trim()
    .replace(/[^a-zA-Z0-9\-_/.?&=]/g, '') // Only allow safe chars
    .replace(/\.\.+/g, '.') // Prevent directory traversal
    .replace(/\/\//g, '/') // Remove double slashes
    .slice(0, 500); // Limit length

  // Ensure it starts with /
  return sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'unnamed';
  }

  return filename
    .trim()
    .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Only alphanumeric, dash, underscore, dot
    .replace(/\.\.+/g, '.') // Prevent directory traversal
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .slice(0, 255); // Limit to filesystem max
}

/**
 * Validate and sanitize JSON data
 */
export function sanitizeJSON<T = any>(jsonString: string, maxDepth: number = 10): Result<T, Error> {
  try {
    // Check max length to prevent DOS
    if (jsonString.length > 1024 * 1024) {
      // 1MB max
      return {
        success: false,
        error: new Error('JSON data too large'),
      };
    }

    const parsed = JSON.parse(jsonString);

    // Check depth to prevent DOS
    const checkDepth = (obj: any, depth: number = 0): boolean => {
      if (depth > maxDepth) return false;
      if (typeof obj !== 'object' || obj === null) return true;

      for (const key in obj) {
        if (!checkDepth(obj[key], depth + 1)) return false;
      }
      return true;
    };

    if (!checkDepth(parsed)) {
      return {
        success: false,
        error: new Error('JSON nesting too deep'),
      };
    }

    return {
      success: true,
      value: parsed as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Encryption & Decryption
 */

/**
 * Simple XOR encryption (for demonstration - use proper crypto in production)
 * In production, use react-native-aes-crypto or similar
 */
function xorEncrypt(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(result, 'binary').toString('base64');
}

function xorDecrypt(encrypted: string, key: string): string {
  const data = Buffer.from(encrypted, 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Secure storage for sensitive data
 */
export const SecureStorage = {
  /**
   * Store encrypted data
   */
  setSecure(key: string, value: string): boolean {
    try {
      const encrypted = xorEncrypt(value, 'somni-ai-encryption-key-v1');
      secureStorage.set(key, encrypted);
      return true;
    } catch (error) {
      console.error('Failed to store secure data:', error);
      return false;
    }
  },

  /**
   * Retrieve and decrypt data
   */
  getSecure(key: string): string | null {
    try {
      const encrypted = secureStorage.getString(key);
      if (!encrypted) return null;

      return xorDecrypt(encrypted, 'somni-ai-encryption-key-v1');
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  },

  /**
   * Remove secure data
   */
  deleteSecure(key: string): boolean {
    try {
      secureStorage.delete(key);
      return true;
    } catch (error) {
      console.error('Failed to delete secure data:', error);
      return false;
    }
  },

  /**
   * Clear all secure storage
   */
  clearAll(): boolean {
    try {
      secureStorage.clearAll();
      return true;
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
      return false;
    }
  },
};

/**
 * Token Management
 */

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
}

export const TokenManager = {
  /**
   * Store authentication token securely
   */
  storeToken(tokenData: TokenData): boolean {
    try {
      const serialized = JSON.stringify(tokenData);
      return SecureStorage.setSecure('auth_token', serialized);
    } catch (error) {
      console.error('Failed to store token:', error);
      return false;
    }
  },

  /**
   * Retrieve authentication token
   */
  getToken(): TokenData | null {
    try {
      const serialized = SecureStorage.getSecure('auth_token');
      if (!serialized) return null;

      const parsed = JSON.parse(serialized) as TokenData;

      // Check if token is expired
      if (parsed.expiresAt && Date.now() >= parsed.expiresAt) {
        this.clearToken();
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  },

  /**
   * Check if token is valid
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    return token !== null;
  },

  /**
   * Clear authentication token
   */
  clearToken(): boolean {
    return SecureStorage.deleteSecure('auth_token');
  },

  /**
   * Get authorization header
   */
  getAuthHeader(): Record<string, string> | null {
    const token = this.getToken();
    if (!token) return null;

    return {
      Authorization: `${token.tokenType} ${token.accessToken}`,
    };
  },
};

/**
 * Security Headers for API Requests
 */
export function getSecureHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Platform': Platform.OS,
    'X-Client-Version': '1.0.0',
    'X-Request-ID': generateRequestID(),
    ...customHeaders,
  };

  // Add auth header if available
  const authHeader = TokenManager.getAuthHeader();
  if (authHeader) {
    Object.assign(headers, authHeader);
  }

  // Security headers
  headers['X-Content-Type-Options'] = 'nosniff';

  return headers;
}

/**
 * Generate unique request ID
 */
export function generateRequestID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Rate Limiting
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter((timestamp) => now - timestamp < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Clear rate limit for key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Input Validation Patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^[0-9]+$/,
  alpha: /^[a-zA-Z]+$/,
};

/**
 * Validate input against pattern
 */
export function validatePattern(input: string, pattern: RegExp): boolean {
  return pattern.test(input);
}

/**
 * Content Security Policy check
 */
export function isContentSecure(content: string): Result<true, Error> {
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /on\w+\s*=/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return {
        success: false,
        error: new Error('Potentially dangerous content detected'),
      };
    }
  }

  return { success: true, value: true };
}

/**
 * Hash sensitive data (for comparison, not encryption)
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Timing-safe string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
