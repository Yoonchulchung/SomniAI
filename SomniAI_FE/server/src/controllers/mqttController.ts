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
  async getStatus(req: Request, res: Response) {
    const isConnected = mqttService.isConnected();

    const response: ApiResponse<{ connected: boolean }> = {
      success: true,
      data: { connected: isConnected },
    };

    res.json(response);
  }
}

export default new MqttController();
