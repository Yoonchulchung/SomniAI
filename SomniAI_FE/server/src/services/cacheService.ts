/**
 * Cache Service using Redis
 * Handles data caching, session management, and temporary storage
 */

import redisClient from '../config/redis';
import { CacheOptions } from '../types';
import { config } from '../config/env';

export class CacheService {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || config.REDIS_TTL;
      await redisClient.setEx(key, expiry, serialized);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string): Promise<number> {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      console.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Clear all cache
   */
  async flush(): Promise<boolean> {
    try {
      await redisClient.flushDb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Push to list (queue)
   */
  async pushToList(key: string, value: any): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.rPush(key, serialized);
      return true;
    } catch (error) {
      console.error(`List push error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Pop from list (queue)
   */
  async popFromList<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.lPop(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`List pop error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get list length
   */
  async getListLength(key: string): Promise<number> {
    try {
      return await redisClient.lLen(key);
    } catch (error) {
      console.error(`List length error for key ${key}:`, error);
      return 0;
    }
  }
}

export default new CacheService();
