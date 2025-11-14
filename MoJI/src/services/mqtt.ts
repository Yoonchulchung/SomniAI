/**
 * MQTT Service
 * Secure MQTT client for publishing and subscribing to topics
 * Using mqtt.js JavaScript library
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { apiLogger } from '../utils/logger';
import { sanitizeString, validatePattern, ValidationPatterns } from '../utils/security';

export interface MQTTConfig {
  host: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  protocol: 'tcp' | 'ws' | 'wss' | 'mqtt' | 'mqtts';
  keepalive?: number;
  cleanSession?: boolean;
  reconnectPeriod?: number;
  connectTimeout?: number;
  qos?: 0 | 1 | 2;
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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageRateLimiter: Map<string, number> = new Map();
  private maxMessagesPerMinute = 100;

  /**
   * Validate MQTT configuration
   */
  private validateConfig(config: MQTTConfig): { valid: boolean; error?: string } {
    // Validate host
    if (!config.host || config.host.trim() === '') {
      return { valid: false, error: 'Host is required' };
    }

    // Sanitize host
    const sanitizedHost = sanitizeString(config.host);
    if (sanitizedHost !== config.host) {
      return { valid: false, error: 'Invalid characters in host' };
    }

    // Validate port
    if (!config.port || config.port < 1 || config.port > 65535) {
      return { valid: false, error: 'Invalid port number' };
    }

    // Validate client ID
    if (!config.clientId || config.clientId.trim() === '') {
      return { valid: false, error: 'Client ID is required' };
    }

    // Validate protocol
    const validProtocols = ['tcp', 'ws', 'wss', 'mqtt', 'mqtts'];
    if (!validProtocols.includes(config.protocol)) {
      return { valid: false, error: 'Invalid protocol' };
    }

    // Validate URL format
    const urlPattern = /^[a-zA-Z0-9.-]+$/;
    if (!urlPattern.test(sanitizedHost) && !validatePattern(sanitizedHost, ValidationPatterns.IP)) {
      return { valid: false, error: 'Invalid host format' };
    }

    return { valid: true };
  }

  /**
   * Validate topic name
   */
  private validateTopic(topic: string): { valid: boolean; error?: string } {
    if (!topic || topic.trim() === '') {
      return { valid: false, error: 'Topic is required' };
    }

    // MQTT topic rules
    if (topic.length > 65535) {
      return { valid: false, error: 'Topic too long' };
    }

    // Check for null character
    if (topic.includes('\u0000')) {
      return { valid: false, error: 'Topic contains null character' };
    }

    return { valid: true };
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Clean old entries
    this.messageRateLimiter.forEach((timestamp, mapKey) => {
      if (timestamp < windowStart) {
        this.messageRateLimiter.delete(mapKey);
      }
    });

    // Count messages in current window
    const recentMessages = Array.from(this.messageRateLimiter.values()).filter(
      (timestamp) => timestamp >= windowStart
    ).length;

    if (recentMessages >= this.maxMessagesPerMinute) {
      apiLogger.warn('Rate limit exceeded', { key, limit: this.maxMessagesPerMinute });
      return false;
    }

    this.messageRateLimiter.set(`${key}_${now}`, now);
    return true;
  }

  /**
   * Build MQTT broker URL
   */
  private buildBrokerUrl(config: MQTTConfig): string {
    const protocol = config.protocol === 'mqtt' ? 'tcp' : config.protocol;
    return `${protocol}://${config.host}:${config.port}`;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(config: MQTTConfig, callbacks?: MQTTEventCallbacks): Promise<void> {
    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      const error = new Error(validation.error || 'Invalid configuration');
      apiLogger.error('MQTT configuration validation failed', error, { config });
      throw error;
    }

    // Store callbacks
    if (callbacks) {
      this.eventCallbacks = callbacks;
    }

    // Disconnect existing connection
    if (this.client) {
      await this.disconnect();
    }

    try {
      this.updateConnectionState('connecting');
      this.config = config;

      const brokerUrl = this.buildBrokerUrl(config);

      const options: IClientOptions = {
        clientId: config.clientId,
        username: config.username,
        password: config.password,
        keepalive: config.keepalive || 60,
        clean: config.cleanSession !== false,
        reconnectPeriod: config.reconnectPeriod || 1000,
        connectTimeout: config.connectTimeout || 30000,
        protocol: config.protocol as any,
      };

      apiLogger.info('Connecting to MQTT broker', {
        url: brokerUrl,
        clientId: config.clientId,
      });

      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        apiLogger.info('MQTT connected successfully');
        this.reconnectAttempts = 0;
        this.updateConnectionState('connected');
      });

      this.client.on('reconnect', () => {
        apiLogger.info('MQTT reconnecting');
        this.reconnectAttempts++;
        this.updateConnectionState('reconnecting');
      });

      this.client.on('disconnect', () => {
        apiLogger.info('MQTT disconnected');
        this.updateConnectionState('disconnected');
      });

      this.client.on('offline', () => {
        apiLogger.warn('MQTT offline');
        this.updateConnectionState('disconnected');
      });

      this.client.on('error', (error: Error) => {
        apiLogger.error('MQTT error', error);
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

        apiLogger.debug('MQTT message received', { topic, payloadLength: payload.length });

        // Notify global callback
        if (this.eventCallbacks.onMessageArrived) {
          this.eventCallbacks.onMessageArrived(message);
        }

        // Notify topic-specific listeners
        this.notifyListeners(topic, message);
      });

    } catch (error) {
      apiLogger.error('Failed to connect to MQTT broker', error as Error, { config });
      this.updateConnectionState('error');
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, {}, () => {
          apiLogger.info('MQTT disconnected');
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
    // Check connection
    if (!this.client || !this.isConnected()) {
      throw new Error('Not connected to MQTT broker');
    }

    // Validate topic
    const topicValidation = this.validateTopic(topic);
    if (!topicValidation.valid) {
      throw new Error(topicValidation.error || 'Invalid topic');
    }

    // Rate limiting
    if (!this.checkRateLimit(`publish_${topic}`)) {
      throw new Error('Rate limit exceeded');
    }

    // Convert payload to string
    const payloadString = typeof payload === 'object' ? JSON.stringify(payload) : payload;

    // Validate payload size (256KB max)
    if (payloadString.length > 262144) {
      throw new Error('Payload too large (max 256KB)');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(
        topic,
        payloadString,
        {
          qos: options?.qos || this.config?.qos || 0,
          retain: options?.retained || false,
        },
        (error) => {
          if (error) {
            apiLogger.error('Failed to publish MQTT message', error, { topic });
            reject(error);
          } else {
            apiLogger.debug('MQTT message published', { topic, payloadLength: payloadString.length });
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
    // Check connection
    if (!this.client || !this.isConnected()) {
      throw new Error('Not connected to MQTT broker');
    }

    // Validate topic
    const topicValidation = this.validateTopic(topic);
    if (!topicValidation.valid) {
      throw new Error(topicValidation.error || 'Invalid topic');
    }

    // Add callback if provided
    if (callback) {
      if (!this.messageListeners.has(topic)) {
        this.messageListeners.set(topic, new Set());
      }
      this.messageListeners.get(topic)!.add(callback);
    }

    // Subscribe if not already subscribed
    if (!this.subscriptions.has(topic)) {
      return new Promise((resolve, reject) => {
        this.client!.subscribe(topic, { qos }, (error) => {
          if (error) {
            apiLogger.error('Failed to subscribe to MQTT topic', error, { topic });
            reject(error);
          } else {
            this.subscriptions.add(topic);
            apiLogger.info('Subscribed to MQTT topic', { topic, qos });
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
          apiLogger.error('Failed to unsubscribe from MQTT topic', error, { topic });
          reject(error);
        } else {
          this.subscriptions.delete(topic);
          this.messageListeners.delete(topic);
          apiLogger.info('Unsubscribed from MQTT topic', { topic });
          resolve();
        }
      });
    });
  }

  /**
   * Notify listeners for a topic
   */
  private notifyListeners(topic: string, message: MQTTMessage): void {
    // Exact match
    if (this.messageListeners.has(topic)) {
      this.messageListeners.get(topic)!.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          apiLogger.error('Error in MQTT message listener', error as Error, { topic });
        }
      });
    }

    // Wildcard matching
    this.messageListeners.forEach((listeners, pattern) => {
      if (this.matchTopic(pattern, topic)) {
        listeners.forEach((callback) => {
          try {
            callback(message);
          } catch (error) {
            apiLogger.error('Error in MQTT message listener', error as Error, { topic, pattern });
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
        return true; // Multi-level wildcard matches everything
      }
      if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
        return false; // Single-level wildcard or exact match
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

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
    this.messageRateLimiter.clear();
    this.eventCallbacks = {};
  }
}

// Export singleton instance
export const mqttService = new MQTTService();
export default mqttService;
