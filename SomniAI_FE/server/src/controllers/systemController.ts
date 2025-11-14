/**
 * System Controller
 * Provides system health and performance metrics
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import os from 'os';
import prisma from '../config/database';
import redisClient from '../config/redis';
import mqttService from '../services/mqttService';

export class SystemController {
  /**
   * Get system health metrics
   */
  async getHealth(_req: Request, res: Response) {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // Calculate CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach((cpu) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);

      // Get system uptime
      const uptime = os.uptime();

      // Get load average (1, 5, 15 minutes)
      const loadAverage = os.loadavg();

      const response: ApiResponse = {
        success: true,
        data: {
          cpu: {
            usage: Math.min(100, Math.max(0, cpuUsage)),
            cores: cpus.length,
            model: cpus[0]?.model || 'Unknown',
          },
          memory: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            usagePercent: Math.round((usedMem / totalMem) * 100),
          },
          system: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            uptime: uptime,
            loadAverage: loadAverage,
          },
          process: {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            pid: process.pid,
          },
        },
      };

      return res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system health',
      };

      return res.status(500).json(response);
    }
  }

  /**
   * Get services connection status
   */
  async getServicesStatus(_req: Request, res: Response) {
    try {
      const services = [];

      // Check Database (PostgreSQL)
      let dbStatus = 'disconnected';
      let dbError = null;
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch (error) {
        dbError = error instanceof Error ? error.message : 'Unknown error';
      }

      services.push({
        name: 'Database (PostgreSQL)',
        status: dbStatus,
        timestamp: Date.now(),
        error: dbError,
      });

      // Check Redis
      let redisStatus = 'disconnected';
      let redisError = null;
      try {
        if (redisClient.isOpen) {
          await redisClient.ping();
          redisStatus = 'connected';
        }
      } catch (error) {
        redisError = error instanceof Error ? error.message : 'Unknown error';
      }

      services.push({
        name: 'Redis',
        status: redisStatus,
        timestamp: Date.now(),
        error: redisError,
      });

      // Check MQTT
      const mqttStatus = mqttService.isConnected() ? 'connected' : 'disconnected';
      services.push({
        name: 'MQTT Broker',
        status: mqttStatus,
        timestamp: Date.now(),
        error: null,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          services,
          overall: services.every(s => s.status === 'connected') ? 'healthy' : 'degraded',
        },
      };

      return res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get services status',
      };

      return res.status(500).json(response);
    }
  }

  /**
   * Get client IP address
   */
  async getClientIp(req: Request, res: Response) {
    try {
      // Try to get IP from x-forwarded-for header (if behind proxy)
      const forwarded = req.headers['x-forwarded-for'];
      let clientIp: string;

      if (forwarded) {
        // x-forwarded-for can be comma-separated list, get first one
        clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
      } else {
        // Fallback to req.ip or socket remote address
        clientIp = req.ip || req.socket.remoteAddress || 'Unknown';
      }

      // Clean up IPv6 localhost format
      if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
        clientIp = '127.0.0.1';
      }

      const response: ApiResponse = {
        success: true,
        data: {
          ip: clientIp,
          headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip'],
          },
        },
      };

      return res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get client IP',
      };

      return res.status(500).json(response);
    }
  }
}

export default new SystemController();
