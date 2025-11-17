/**
 * Environment Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://somniai:somniai@localhost:5432/somniai',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  REDIS_TTL: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour default

  // MQTT
  MQTT_BROKER: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
  MQTT_CLIENT_ID: process.env.MQTT_CLIENT_ID || 'somniai-server',
  MQTT_USERNAME: process.env.MQTT_USERNAME,
  MQTT_PASSWORD: process.env.MQTT_PASSWORD,

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
} as const;

export default config;
