/**
 * Safe Storage Wrapper
 * Error-safe MMKV storage with fallback
 */

import { MMKV } from 'react-native-mmkv';
import { storageLogger } from './logger';

class SafeStorage {
  private storage: MMKV | null = null;
  private fallbackStorage: Map<string, any> = new Map();
  private useFallback: boolean = false;

  constructor() {
    try {
      this.storage = new MMKV();
      storageLogger.info('MMKV storage initialized successfully');
    } catch (error) {
      storageLogger.error('Failed to initialize MMKV, using fallback', undefined, error as Error);
      this.useFallback = true;
    }
  }

  /**
   * Safely set a string value
   */
  setString(key: string, value: string): boolean {
    try {
      if (this.useFallback || !this.storage) {
        this.fallbackStorage.set(key, value);
        return true;
      }

      this.storage.set(key, value);
      return true;
    } catch (error) {
      storageLogger.error(`Failed to set string: ${key}`, undefined, error as Error);
      // Try fallback
      try {
        this.fallbackStorage.set(key, value);
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  /**
   * Safely get a string value
   */
  getString(key: string): string | undefined {
    try {
      if (this.useFallback || !this.storage) {
        return this.fallbackStorage.get(key);
      }

      return this.storage.getString(key);
    } catch (error) {
      storageLogger.error(`Failed to get string: ${key}`, undefined, error as Error);
      // Try fallback
      try {
        return this.fallbackStorage.get(key);
      } catch (fallbackError) {
        return undefined;
      }
    }
  }

  /**
   * Safely set a number value
   */
  setNumber(key: string, value: number): boolean {
    try {
      if (this.useFallback || !this.storage) {
        this.fallbackStorage.set(key, value);
        return true;
      }

      this.storage.set(key, value);
      return true;
    } catch (error) {
      storageLogger.error(`Failed to set number: ${key}`, undefined, error as Error);
      try {
        this.fallbackStorage.set(key, value);
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  /**
   * Safely get a number value
   */
  getNumber(key: string): number | undefined {
    try {
      if (this.useFallback || !this.storage) {
        return this.fallbackStorage.get(key);
      }

      return this.storage.getNumber(key);
    } catch (error) {
      storageLogger.error(`Failed to get number: ${key}`, undefined, error as Error);
      try {
        return this.fallbackStorage.get(key);
      } catch (fallbackError) {
        return undefined;
      }
    }
  }

  /**
   * Safely set a boolean value
   */
  setBoolean(key: string, value: boolean): boolean {
    try {
      if (this.useFallback || !this.storage) {
        this.fallbackStorage.set(key, value);
        return true;
      }

      this.storage.set(key, value);
      return true;
    } catch (error) {
      storageLogger.error(`Failed to set boolean: ${key}`, undefined, error as Error);
      try {
        this.fallbackStorage.set(key, value);
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  /**
   * Safely get a boolean value
   */
  getBoolean(key: string): boolean | undefined {
    try {
      if (this.useFallback || !this.storage) {
        return this.fallbackStorage.get(key);
      }

      return this.storage.getBoolean(key);
    } catch (error) {
      storageLogger.error(`Failed to get boolean: ${key}`, undefined, error as Error);
      try {
        return this.fallbackStorage.get(key);
      } catch (fallbackError) {
        return undefined;
      }
    }
  }

  /**
   * Safely set a JSON value
   */
  setJSON<T>(key: string, value: T): boolean {
    try {
      const jsonString = JSON.stringify(value);
      return this.setString(key, jsonString);
    } catch (error) {
      storageLogger.error(`Failed to set JSON: ${key}`, undefined, error as Error);
      return false;
    }
  }

  /**
   * Safely get a JSON value
   */
  getJSON<T>(key: string): T | undefined {
    try {
      const jsonString = this.getString(key);
      if (!jsonString) return undefined;

      return JSON.parse(jsonString) as T;
    } catch (error) {
      storageLogger.error(`Failed to get JSON: ${key}`, undefined, error as Error);
      return undefined;
    }
  }

  /**
   * Safely delete a key
   */
  delete(key: string): boolean {
    try {
      if (this.useFallback || !this.storage) {
        return this.fallbackStorage.delete(key);
      }

      this.storage.delete(key);
      return true;
    } catch (error) {
      storageLogger.error(`Failed to delete: ${key}`, undefined, error as Error);
      try {
        return this.fallbackStorage.delete(key);
      } catch (fallbackError) {
        return false;
      }
    }
  }

  /**
   * Safely check if key exists
   */
  contains(key: string): boolean {
    try {
      if (this.useFallback || !this.storage) {
        return this.fallbackStorage.has(key);
      }

      return this.storage.contains(key);
    } catch (error) {
      storageLogger.error(`Failed to check contains: ${key}`, undefined, error as Error);
      try {
        return this.fallbackStorage.has(key);
      } catch (fallbackError) {
        return false;
      }
    }
  }

  /**
   * Safely get all keys
   */
  getAllKeys(): string[] {
    try {
      if (this.useFallback || !this.storage) {
        return Array.from(this.fallbackStorage.keys());
      }

      return this.storage.getAllKeys();
    } catch (error) {
      storageLogger.error('Failed to get all keys', undefined, error as Error);
      try {
        return Array.from(this.fallbackStorage.keys());
      } catch (fallbackError) {
        return [];
      }
    }
  }

  /**
   * Safely clear all data
   */
  clearAll(): boolean {
    try {
      if (this.useFallback || !this.storage) {
        this.fallbackStorage.clear();
        return true;
      }

      this.storage.clearAll();
      return true;
    } catch (error) {
      storageLogger.error('Failed to clear all', undefined, error as Error);
      try {
        this.fallbackStorage.clear();
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  /**
   * Check if using fallback storage
   */
  isUsingFallback(): boolean {
    return this.useFallback;
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    isInitialized: boolean;
    useFallback: boolean;
    keyCount: number;
  } {
    return {
      isInitialized: this.storage !== null,
      useFallback: this.useFallback,
      keyCount: this.getAllKeys().length,
    };
  }
}

// Export singleton instance
export const safeStorage = new SafeStorage();

/**
 * Storage keys enum for type safety
 */
export enum StorageKeys {
  SERVER_URL = 'server_url',
  FPS = 'fps',
  BATTERY_SAVER = 'battery_saver',
  AUTO_PAUSE = 'auto_pause_background',
  VIBRATION = 'vibration_enabled',
  STATS_VISIBLE = 'stats_visible',
  AUTO_RECONNECT = 'auto_reconnect',
  NOTIFICATION = 'notification_enabled',
  THEME = 'theme',
  LANGUAGE = 'language',
  LAST_SYNC = 'last_sync',
}

/**
 * Typed storage helpers
 */
export const storageHelpers = {
  // Server config
  getServerUrl: (): string => safeStorage.getString(StorageKeys.SERVER_URL) || 'http://192.168.0.100:8000',
  setServerUrl: (url: string): boolean => safeStorage.setString(StorageKeys.SERVER_URL, url),

  // FPS config
  getFPS: (): number => safeStorage.getNumber(StorageKeys.FPS) || 10,
  setFPS: (fps: number): boolean => safeStorage.setNumber(StorageKeys.FPS, fps),

  // Boolean configs
  getBatterySaver: (): boolean => safeStorage.getBoolean(StorageKeys.BATTERY_SAVER) || false,
  setBatterySaver: (enabled: boolean): boolean => safeStorage.setBoolean(StorageKeys.BATTERY_SAVER, enabled),

  getAutoPause: (): boolean => safeStorage.getBoolean(StorageKeys.AUTO_PAUSE) ?? true,
  setAutoPause: (enabled: boolean): boolean => safeStorage.setBoolean(StorageKeys.AUTO_PAUSE, enabled),

  getVibration: (): boolean => safeStorage.getBoolean(StorageKeys.VIBRATION) ?? true,
  setVibration: (enabled: boolean): boolean => safeStorage.setBoolean(StorageKeys.VIBRATION, enabled),

  getStatsVisible: (): boolean => safeStorage.getBoolean(StorageKeys.STATS_VISIBLE) ?? true,
  setStatsVisible: (visible: boolean): boolean => safeStorage.setBoolean(StorageKeys.STATS_VISIBLE, visible),

  getAutoReconnect: (): boolean => safeStorage.getBoolean(StorageKeys.AUTO_RECONNECT) ?? true,
  setAutoReconnect: (enabled: boolean): boolean => safeStorage.setBoolean(StorageKeys.AUTO_RECONNECT, enabled),

  getNotification: (): boolean => safeStorage.getBoolean(StorageKeys.NOTIFICATION) ?? true,
  setNotification: (enabled: boolean): boolean => safeStorage.setBoolean(StorageKeys.NOTIFICATION, enabled),

  // Last sync timestamp
  getLastSync: (): number | undefined => safeStorage.getNumber(StorageKeys.LAST_SYNC),
  setLastSync: (timestamp: number): boolean => safeStorage.setNumber(StorageKeys.LAST_SYNC, timestamp),

  // Clear all
  clearAll: (): boolean => safeStorage.clearAll(),
};
