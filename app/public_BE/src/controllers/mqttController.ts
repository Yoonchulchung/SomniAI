/**
 * MQTT Controller
 * Handles MQTT pub/sub operations
 */

import { Request, Response } from 'express';
import { ApiResponse, MqttMessage } from '../types';
import mqttService from '../services/mqttService';

export class MqttController {
  /**
   * Publish message to MQTT topic
   */
  async publish(req: Request, res: Response) {
    const { topic, message, qos, retain } = req.body;

    if (!topic || !message) {
      const response: ApiResponse = {
        success: false,
        error: 'Topic and message are required',
      };
      return res.status(400).json(response);
    }

    try {
      await mqttService.publish(topic, message, { qos: qos || 0, retain: retain || false });

      const response: ApiResponse = {
        success: true,
        message: 'Message published successfully',
      };

      return res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish message',
      };

      return res.status(500).json(response);
    }
  }

  /**
   * Subscribe to MQTT topic
   */
  async subscribe(req: Request, res: Response) {
    const { topic } = req.body;

    if (!topic) {
      const response: ApiResponse = {
        success: false,
        error: 'Topic is required',
      };
      return res.status(400).json(response);
    }

    try {
      await mqttService.subscribe(topic);

      const response: ApiResponse = {
        success: true,
        message: `Subscribed to topic: ${topic}`,
      };

      return res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      };

      return res.status(500).json(response);
    }
  }

  /**
   * Unsubscribe from MQTT topic
   */
  async unsubscribe(req: Request, res: Response) {
    const { topic } = req.body;

    if (!topic) {
      const response: ApiResponse = {
        success: false,
        error: 'Topic is required',
      };
      return res.status(400).json(response);
    }

    try {
      await mqttService.unsubscribe(topic);

      const response: ApiResponse = {
        success: true,
        message: `Unsubscribed from topic: ${topic}`,
      };

      return res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      };

      return res.status(500).json(response);
    }
  }

  /**
   * Get recent MQTT messages
   */
  async getMessages(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 10;

    try {
      const messages = await mqttService.getRecentMessages(limit);

      const response: ApiResponse<MqttMessage[]> = {
        success: true,
        data: messages,
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get messages',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get MQTT connection status
   */
  async getStatus(_req: Request, res: Response) {
    const isConnected = mqttService.isConnected();

    const response: ApiResponse<{ connected: boolean }> = {
      success: true,
      data: { connected: isConnected },
    };

    res.json(response);
  }

  /**
   * Get MQTT logs
   */
  async getLogs(_req: Request, res: Response) {
    const logs = mqttService.getLogs();

    const response: ApiResponse = {
      success: true,
      data: logs,
    };

    res.json(response);
  }

  /**
   * Clear MQTT logs
   */
  async clearLogs(_req: Request, res: Response) {
    mqttService.clearLogs();

    const response: ApiResponse = {
      success: true,
      message: 'Logs cleared',
    };

    res.json(response);
  }

  /**
   * Stream MQTT logs via Server-Sent Events (SSE)
   */
  streamLogs(req: Request, res: Response) {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Log stream connected' })}\n\n`);

    // Send existing logs
    const existingLogs = mqttService.getLogs();
    existingLogs.forEach((log) => {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    // Listen for new log events
    const logHandler = (log: any) => {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    };

    mqttService.on('log', logHandler);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000); // Every 30 seconds

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      mqttService.removeListener('log', logHandler);
    });
  }
}

export default new MqttController();
