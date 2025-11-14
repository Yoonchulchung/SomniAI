/**
 * System Controller
 * Provides system health and performance metrics
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import os from 'os';

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
}

export default new SystemController();
