/**
 * SomniAI API Server
 * Express application with Redis and MQTT integration
 */

import 'express-async-errors';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { connectRedis, disconnectRedis } from './config/redis';
import { connectDatabase, disconnectDatabase } from './config/database';
import mqttService from './services/mqttService';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

class Server {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares() {
    // Security
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: config.CORS_ORIGIN,
        credentials: true,
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use(limiter);

    // Compression
    this.app.use(compression());

    // Logging
    if (config.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookie parsing
    this.app.use(cookieParser());
  }

  private initializeRoutes() {
    // API routes
    this.app.use(config.API_PREFIX, routes);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        success: true,
        message: 'SomniAI API Server',
        version: '1.0.0',
        endpoints: {
          health: `${config.API_PREFIX}/health`,
          stats: `${config.API_PREFIX}/stats`,
          mqtt: `${config.API_PREFIX}/mqtt`,
          auth: `${config.API_PREFIX}/auth`,
          descriptions: `${config.API_PREFIX}/descriptions`,
          inference: `${config.API_PREFIX}/inference`,
        },
      });
    });
  }

  private initializeErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start() {
    try {
      // await connectDatabase();
      // await connectRedis();

      // let mqttConnected = false;
      // try {
      //   console.log('🔌 Connecting to MQTT broker...');
      //   await Promise.race([
      //     mqttService.connect(),
      //     new Promise((_, reject) => setTimeout(() => reject(new Error('MQTT connection timeout')), 10000))
      //   ]);

      //   // Subscribe to default topics
      //   await mqttService.subscribe('somniai/#');
      //   await mqttService.subscribe('test/topic');
      //   mqttConnected = true;
      //   console.log('✓ MQTT connected successfully');
      // } catch (mqttError) {
      //   console.warn('⚠ MQTT connection failed, continuing without MQTT:', mqttError);
      // }

      // Start server
      const PORT = config.PORT;
      this.app.listen(PORT, () => {
        console.log(`
          SomniAI API Server Ready
          ========================
          Environment: ${config.NODE_ENV.padEnd(23)}
          Port: ${PORT.toString().padEnd(30)}
          `)
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop() {
    console.log('\nShutting down server...');

    try {
      await mqttService.disconnect();
      await disconnectRedis();
      await disconnectDatabase();
      console.log('✓ Server stopped gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();

// Graceful shutdown
process.on('SIGTERM', () => server.stop());
process.on('SIGINT', () => server.stop());

// Start server
server.start();

export default server.app;
