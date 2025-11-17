/**
 * Redis Client Configuration
 * Handles caching, session management, and MQTT message queuing
 */

import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis connection failed after 10 retries');
        return new Error('Redis connection failed');
      }
      return retries * 100; // Exponential backoff
    },
  },
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('✓ Redis client ready');
});

redisClient.on('reconnecting', () => {
  console.log('⟳ Redis reconnecting...');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis connection established');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const disconnectRedis = async () => {
  try {
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
};

export default redisClient;
