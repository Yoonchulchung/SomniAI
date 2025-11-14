/**
 * MQTT Service
 * Handles MQTT connections, pub/sub operations, and message queuing with Redis
 */

import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import { config } from '../config/env';
import cacheService from './cacheService';
import { MqttMessage } from '../types';

export interface MqttLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}

export class MqttService extends EventEmitter {
  private client: MqttClient | null = null;
  private messageQueueKey = 'mqtt:messages';
  private logs: MqttLog[] = [];
  private maxLogs = 500; // Keep last 500 logs in memory

  constructor() {
    super();
  }

  /**
   * Add log entry
   */
  private addLog(level: MqttLog['level'], message: string, details?: any) {
    const log: MqttLog = {
      timestamp: Date.now(),
      level,
      message,
      details,
    };

    this.logs.push(log);

    // Keep only maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Emit log event for SSE
    this.emit('log', log);

    // Also log to console
    const prefix = {
      info: 'ℹ',
      warn: '⚠',
      error: '✗',
      success: '✓',
    }[level];

    console.log(`${prefix} MQTT: ${message}`, details || '');
  }

  /**
   * Get all logs
   */
  getLogs(): MqttLog[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
    this.addLog('info', 'Logs cleared');
  }

  /**
   * Connect to MQTT broker
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const options: mqtt.IClientOptions = {
          clientId: config.MQTT_CLIENT_ID,
          clean: true,
          reconnectPeriod: 1000,
        };

        if (config.MQTT_USERNAME && config.MQTT_PASSWORD) {
          options.username = config.MQTT_USERNAME;
          options.password = config.MQTT_PASSWORD;
        }

        this.addLog('info', `Connecting to MQTT broker: ${config.MQTT_BROKER}`, { clientId: config.MQTT_CLIENT_ID });

        this.client = mqtt.connect(config.MQTT_BROKER, options);

        this.client.on('connect', () => {
          this.addLog('success', 'Connected to MQTT broker successfully');
          resolve();
        });

        this.client.on('error', (error) => {
          this.addLog('error', 'MQTT connection error', error.message);
          reject(error);
        });

        this.client.on('message', async (topic, payload) => {
          await this.handleMessage(topic, payload);
        });

        this.client.on('reconnect', () => {
          this.addLog('warn', 'MQTT reconnecting...');
        });

        this.client.on('offline', () => {
          this.addLog('warn', 'MQTT broker offline');
        });
      } catch (error) {
        this.addLog('error', 'Failed to connect to MQTT broker', error instanceof Error ? error.message : String(error));
        reject(error);
      }
    });
  }

  /**
   * Handle incoming MQTT message
   */
  private async handleMessage(topic: string, payload: Buffer) {
    const message: MqttMessage = {
      topic,
      payload: payload.toString(),
      timestamp: Date.now(),
    };

    // Store message in Redis queue
    await cacheService.pushToList(this.messageQueueKey, message);

    // Also increment message counter
    await cacheService.increment('mqtt:message:count');

    this.addLog('info', `Message received on topic: ${topic}`, { payload: payload.toString().substring(0, 100) });
  }

  /**
   * Subscribe to topic
   */
  subscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        const error = new Error('MQTT client not connected');
        this.addLog('error', 'Subscribe failed: client not connected', { topic });
        reject(error);
        return;
      }

      this.client.subscribe(topic, (error) => {
        if (error) {
          this.addLog('error', `Failed to subscribe to topic: ${topic}`, error.message);
          reject(error);
        } else {
          this.addLog('success', `Subscribed to topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe from topic
   */
  unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        const error = new Error('MQTT client not connected');
        this.addLog('error', 'Unsubscribe failed: client not connected', { topic });
        reject(error);
        return;
      }

      this.client.unsubscribe(topic, (error) => {
        if (error) {
          this.addLog('error', `Failed to unsubscribe from topic: ${topic}`, error.message);
          reject(error);
        } else {
          this.addLog('success', `Unsubscribed from topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Publish message to topic
   */
  publish(topic: string, message: string | Buffer, options?: mqtt.IClientPublishOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        const error = new Error('MQTT client not connected');
        this.addLog('error', 'Publish failed: client not connected', { topic });
        reject(error);
        return;
      }

      const payload = typeof message === 'string' ? message : message.toString();
      this.client.publish(topic, message, options || {}, (error) => {
        if (error) {
          this.addLog('error', `Failed to publish to topic: ${topic}`, error.message);
          reject(error);
        } else {
          this.addLog('success', `Published message to topic: ${topic}`, { payload: payload.substring(0, 100), qos: options?.qos || 0 });
          resolve();
        }
      });
    });
  }

  /**
   * Get recent messages from queue
   */
  async getRecentMessages(limit: number = 10): Promise<MqttMessage[]> {
    const messages: MqttMessage[] = [];
    const queueLength = await cacheService.getListLength(this.messageQueueKey);
    const count = Math.min(limit, queueLength);

    for (let i = 0; i < count; i++) {
      const message = await cacheService.popFromList<MqttMessage>(this.messageQueueKey);
      if (message) {
        messages.push(message);
      }
    }

    return messages;
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    const count = await cacheService.get<number>('mqtt:message:count');
    return count || 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client?.connected || false;
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.addLog('info', 'Disconnecting from MQTT broker...');
        this.client.end(false, {}, () => {
          this.addLog('info', 'Disconnected from MQTT broker');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default new MqttService();
