/**
 * Cache Middleware
 * Provides caching functionality for routes
 */

import { Request, Response, NextFunction } from 'express';
import cacheService from '../services/cacheService';

/**
 * Cache middleware factory
 */
export const cacheMiddleware = (ttl?: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        console.log(`Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`Cache MISS: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (data: any) {
        cacheService.set(cacheKey, data, ttl).catch((error) => {
          console.error('Failed to cache response:', error);
        });

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};
