/**
 * Statistics Controller
 * Handles statistics and analytics endpoints
 */

import { Request, Response } from 'express';
import { ApiResponse, StreamStats } from '../types';
import cacheService from '../services/cacheService';
import mqttService from '../services/mqttService';

export class StatsController {
  /**
   * Get current system statistics
   */
  async getStats(req: Request, res: Response) {
    const mqttMessageCount = await mqttService.getMessageCount();
    const activeStreams = await cacheService.get<number>('stats:active_streams') || 1;
    const totalFrames = await cacheService.get<number>('stats:total_frames') || 1200;
    const connectedDevices = await cacheService.get<number>('stats:connected_devices') || 3;

    const stats: StreamStats = {
      activeStreams,
      totalFrames,
      mqttMessages: mqttMessageCount,
      connectedDevices,
    };

    const response: ApiResponse<StreamStats> = {
      success: true,
      data: stats,
    };

    res.json(response);
  }

  /**
   * Update statistics
   */
  async updateStats(req: Request, res: Response) {
    const { activeStreams, totalFrames, connectedDevices } = req.body;

    if (activeStreams !== undefined) {
      await cacheService.set('stats:active_streams', activeStreams);
    }
    if (totalFrames !== undefined) {
      await cacheService.set('stats:total_frames', totalFrames);
    }
    if (connectedDevices !== undefined) {
      await cacheService.set('stats:connected_devices', connectedDevices);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Statistics updated successfully',
    };

    res.json(response);
  }

  /**
   * Increment frame counter
   */
  async incrementFrames(req: Request, res: Response) {
    const count = await cacheService.increment('stats:total_frames');

    const response: ApiResponse<{ count: number }> = {
      success: true,
      data: { count },
    };

    res.json(response);
  }
}

export default new StatsController();
