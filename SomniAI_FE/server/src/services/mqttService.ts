/**
 * MQTT Service
 * Handles MQTT connections, pub/sub operations, and message queuing with Redis
 */

import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config/env';
import cacheService from './cacheService';
import { MqttMessage } from '../types';

export class MqttService {
  private client: MqttClient | null = null;
  private messageQueueKey = 'mqtt:messages';

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

        this.client = mqtt.connect(config.MQTT_BROKER, options);

        this.client.on('connect', () => {
          console.log('✓ MQTT connected successfully');
          resolve();
        });

        this.client.on('error', (error) => {
          console.error('MQTT connection error:', error);
          reject(error);
        });

        this.client.on('message', async (topic, payload) => {
          await this.handleMessage(topic, payload);
        });

        this.client.on('reconnect', () => {
          console.log('⟳ MQTT reconnecting...');
        });

        this.client.on('offline', () => {
          console.log('⚠ MQTT offline');
        });
      } catch (error) {
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

    console.log(`MQTT message received on ${topic}:`, message.payload);
  }

  /**
   * Subscribe to topic
   */
  subscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.subscribe(topic, (error) => {
        if (error) {
          console.error(`Failed to subscribe to ${topic}:`, error);
          reject(error);
        } else {
          console.log(`Subscribed to topic: ${topic}`);
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
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.unsubscribe(topic, (error) => {
        if (error) {
          console.error(`Failed to unsubscribe from ${topic}:`, error);
          reject(error);
        } else {
          console.log(`Unsubscribed from topic: ${topic}`);
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
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.publish(topic, message, options || {}, (error) => {
        if (error) {
          console.error(`Failed to publish to ${topic}:`, error);
          reject(error);
        } else {
          console.log(`Published message to ${topic}`);
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
        this.client.end(false, {}, () => {
          console.log('MQTT disconnected');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default new MqttService();
