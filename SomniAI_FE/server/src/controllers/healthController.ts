/**
 * Health Check Controller
 */

import { Request, Response } from 'express';
import { ApiResponse, SystemStatus } from '../types';
import redisClient from '../config/redis';
import mqttService from '../services/mqttService';

export class HealthController {
  /**
   * Health check endpoint
   */
  async health(_req: Request, res: Response) {
    const response: ApiResponse = {
      success: true,
      message: 'Server is healthy',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    };

    res.json(response);
  }

  /**
   * System status endpoint
   */
  async status(_req: Request, res: Response) {
    const redisConnected = redisClient.isReady;
    const mqttConnected = mqttService.isConnected();

    const status: SystemStatus = {
      webcam: 'active',
      mqtt: mqttConnected ? 'connected' : 'disconnected',
      server: 'active',
      redis: redisConnected ? 'connected' : 'disconnected',
    };

    const response: ApiResponse<SystemStatus> = {
      success: true,
      data: status,
    };

    res.json(response);
  }
}

export default new HealthController();
