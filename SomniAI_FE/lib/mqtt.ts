/**
 * MQTT Client Service for Browser
 * WebSocket-based MQTT client using mqtt.js
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';

export interface MQTTConfig {
  host: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  protocol: 'ws' | 'wss';
  keepalive?: number;
  cleanSession?: boolean;
  reconnectPeriod?: number;
  connectTimeout?: number;
}

export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retained: boolean;
  timestamp: number;
}

export type MQTTConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type MQTTEventCallback = (data: any) => void;

interface MQTTEventCallbacks {
  onConnectionChange?: (state: MQTTConnectionState) => void;
  onMessageArrived?: (message: MQTTMessage) => void;
  onError?: (error: Error) => void;
}

class MQTTService {
  private client: MqttClient | null = null;
  private connectionState: MQTTConnectionState = 'disconnected';
  private config: MQTTConfig | null = null;
  private subscriptions: Set<string> = new Set();
  private messageListeners: Map<string, Set<MQTTEventCallback>> = new Map();
  private eventCallbacks: MQTTEventCallbacks = {};

  /**
   * Build MQTT broker URL for WebSocket
   */
  private buildBrokerUrl(config: MQTTConfig): string {
    return `${config.protocol}://${config.host}:${config.port}/mqtt`;
  }

  /**
   * Connect to MQTT broker via WebSocket
   */
  async connect(config: MQTTConfig, callbacks?: MQTTEventCallbacks): Promise<void> {
    if (callbacks) {
      this.eventCallbacks = callbacks;
    }

    if (this.client) {
      await this.disconnect();
    }

    try {
      this.updateConnectionState('connecting');
      this.config = config;

      const brokerUrl = this.buildBrokerUrl(config);

      const options: IClientOptions = {
        clientId: config.clientId || `somni_web_${Math.random().toString(16).substr(2, 8)}`,
        username: config.username,
        password: config.password,
        keepalive: config.keepalive || 60,
        clean: config.cleanSession !== false,
        reconnectPeriod: config.reconnectPeriod || 1000,
        connectTimeout: config.connectTimeout || 30000,
      };

      console.log('[MQTT] Connecting to broker:', brokerUrl);

      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        console.log('[MQTT] Connected successfully');
        this.updateConnectionState('connected');
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
        this.updateConnectionState('reconnecting');
      });

      this.client.on('disconnect', () => {
        console.log('[MQTT] Disconnected');
        this.updateConnectionState('disconnected');
      });

      this.client.on('offline', () => {
        console.log('[MQTT] Offline');
        this.updateConnectionState('disconnected');
      });

      this.client.on('error', (error: Error) => {
        console.error('[MQTT] Error:', error);
        this.updateConnectionState('error');
        if (this.eventCallbacks.onError) {
          this.eventCallbacks.onError(error);
        }
      });

      this.client.on('message', (topic: string, payload: Buffer, packet: any) => {
        const message: MQTTMessage = {
          topic,
          payload: payload.toString(),
          qos: packet.qos || 0,
          retained: packet.retain || false,
          timestamp: Date.now(),
        };

        console.log('[MQTT] Message received:', { topic, payload: message.payload });

        if (this.eventCallbacks.onMessageArrived) {
          this.eventCallbacks.onMessageArrived(message);
        }

        this.notifyListeners(topic, message);
      });
    } catch (error) {
      console.error('[MQTT] Failed to connect:', error);
      this.updateConnectionState('error');
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, {}, () => {
          console.log('[MQTT] Disconnected');
          this.client = null;
          this.subscriptions.clear();
          this.messageListeners.clear();
          this.updateConnectionState('disconnected');
          resolve();
        });
      });
    }
    this.updateConnectionState('disconnected');
  }

  /**
   * Publish message to topic
   */
  async publish(
    topic: string,
    payload: string | object,
    options?: { qos?: 0 | 1 | 2; retained?: boolean }
  ): Promise<void> {
    if (!this.client || !this.isConnected()) {
      throw new Error('Not connected to MQTT broker');
    }

    const payloadString = typeof payload === 'object' ? JSON.stringify(payload) : payload;

    return new Promise((resolve, reject) => {
      this.client!.publish(
        topic,
        payloadString,
        {
          qos: options?.qos || 0,
          retain: options?.retained || false,
        },
        (error) => {
          if (error) {
            console.error('[MQTT] Failed to publish:', error);
            reject(error);
          } else {
            console.log('[MQTT] Message published:', { topic });
            resolve();
          }
        }
      );
    });
  }

  /**
   * Subscribe to topic
   */
  async subscribe(topic: string, qos: 0 | 1 | 2 = 0, callback?: MQTTEventCallback): Promise<void> {
    if (!this.client || !this.isConnected()) {
      throw new Error('Not connected to MQTT broker');
    }

    if (callback) {
      if (!this.messageListeners.has(topic)) {
        this.messageListeners.set(topic, new Set());
      }
      this.messageListeners.get(topic)!.add(callback);
    }

    if (!this.subscriptions.has(topic)) {
      return new Promise((resolve, reject) => {
        this.client!.subscribe(topic, { qos }, (error) => {
          if (error) {
            console.error('[MQTT] Failed to subscribe:', error);
            reject(error);
          } else {
            this.subscriptions.add(topic);
            console.log('[MQTT] Subscribed to topic:', { topic, qos });
            resolve();
          }
        });
      });
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribe(topic: string): Promise<void> {
    if (!this.client || !this.isConnected()) {
      throw new Error('Not connected to MQTT broker');
    }

    return new Promise((resolve, reject) => {
      this.client!.unsubscribe(topic, {}, (error) => {
        if (error) {
          console.error('[MQTT] Failed to unsubscribe:', error);
          reject(error);
        } else {
          this.subscriptions.delete(topic);
          this.messageListeners.delete(topic);
          console.log('[MQTT] Unsubscribed from topic:', { topic });
          resolve();
        }
      });
    });
  }

  /**
   * Notify listeners for a topic
   */
  private notifyListeners(topic: string, message: MQTTMessage): void {
    if (this.messageListeners.has(topic)) {
      this.messageListeners.get(topic)!.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error('[MQTT] Error in message listener:', error);
        }
      });
    }

    this.messageListeners.forEach((listeners, pattern) => {
      if (this.matchTopic(pattern, topic)) {
        listeners.forEach((callback) => {
          try {
            callback(message);
          } catch (error) {
            console.error('[MQTT] Error in message listener:', error);
          }
        });
      }
    });
  }

  /**
   * Match topic with wildcard pattern
   */
  private matchTopic(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') {
        return true;
      }
      if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return patternParts.length === topicParts.length;
  }

  /**
   * Update connection state
   */
  private updateConnectionState(state: MQTTConnectionState): void {
    this.connectionState = state;
    if (this.eventCallbacks.onConnectionChange) {
      this.eventCallbacks.onConnectionChange(state);
    }
  }

  /**
   * Get connection state
   */
  getConnectionState(): MQTTConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.client?.connected === true;
  }

  /**
   * Get subscribed topics
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Get current config
   */
  getConfig(): MQTTConfig | null {
    return this.config;
  }
}

// Export singleton instance
export const mqttService = new MQTTService();
export default mqttService;
