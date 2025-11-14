/**
 * MQTT Service
 * Secure MQTT client for publishing and subscribing to topics
 */

import { NativeModules, NativeEventEmitter } from 'react-native';
import { apiLogger } from '../utils/logger';
import { sanitizeString, validatePattern, ValidationPatterns } from '../utils/security';

// MQTT native module (using sp-react-native-mqtt)
const { Mqtt } = NativeModules;
const mqttEmitter = new NativeEventEmitter(Mqtt);

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
  private client: any = null;
  private connectionState: MQTTConnectionState = 'disconnected';
  private config: MQTTConfig | null = null;
  private subscriptions: Set<string> = new Set();
  private messageListeners: Map<string, Set<MQTTEventCallback>> = new Map();
  private eventCallbacks: MQTTEventCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup native event listeners
   */
  private setupEventListeners(): void {
    // Connection status
    mqttEmitter.addListener('mqtt_events', (data: any) => {
      apiLogger.debug('MQTT event received', { event: data.event });

      switch (data.event) {
        case 'connect':
          this.handleConnect();
          break;
        case 'disconnect':
          this.handleDisconnect();
          break;
        case 'error':
          this.handleError(new Error(data.message || 'MQTT error'));
          break;
        case 'message':
          this.handleMessage(data);
          break;
        default:
          apiLogger.warn('Unknown MQTT event', { event: data.event });
      }
    });
  }

  /**
   * Validate MQTT configuration
   */
  private validateConfig(config: MQTTConfig): { valid: boolean; error?: string } {
    // Validate host
    if (!config.host || config.host.trim() === '') {
      return { valid: false, error: 'Host is required' };
    }

    // Sanitize host (allow IP or hostname)
    const sanitizedHost = sanitizeString(config.host);
    if (sanitizedHost.length === 0 || sanitizedHost.length > 255) {
      return { valid: false, error: 'Invalid host' };
    }

    // Validate port
    if (!config.port || config.port < 1 || config.port > 65535) {
      return { valid: false, error: 'Port must be between 1 and 65535' };
    }

    // Validate clientId
    if (!config.clientId || config.clientId.trim() === '') {
      return { valid: false, error: 'Client ID is required' };
    }

    const sanitizedClientId = sanitizeString(config.clientId);
    if (sanitizedClientId.length === 0 || sanitizedClientId.length > 128) {
      return { valid: false, error: 'Client ID must be 1-128 characters' };
    }

    // Validate protocol
    const validProtocols = ['tcp', 'ws', 'wss', 'mqtt', 'mqtts'];
    if (!validProtocols.includes(config.protocol)) {
      return { valid: false, error: 'Invalid protocol' };
    }

    return { valid: true };
  }

  /**
   * Connect to MQTT broker
   */
  async connect(config: MQTTConfig, callbacks?: MQTTEventCallbacks): Promise<void> {
    try {
      // Validate config
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Store callbacks
      if (callbacks) {
        this.eventCallbacks = callbacks;
      }

      // Disconnect if already connected
      if (this.client) {
        await this.disconnect();
      }

      this.config = config;
      this.setConnectionState('connecting');

      // Create MQTT client
      const clientConfig = {
        host: config.host,
        port: config.port,
        protocol: config.protocol,
        id: config.clientId,
        user: config.username || '',
        pass: config.password || '',
        keepalive: config.keepalive || 60,
        clean: config.cleanSession !== false, // default true
        reconnectPeriod: config.reconnectPeriod || 5000,
        connectTimeout: config.connectTimeout || 30000,
      };

      apiLogger.info('Connecting to MQTT broker', {
        host: config.host,
        port: config.port,
        protocol: config.protocol,
        clientId: config.clientId,
      });

      // Create client using native module
      await Mqtt.createClient(clientConfig);
      this.client = true; // Mark as created

      // Connect
      await Mqtt.connect();

      this.reconnectAttempts = 0;
    } catch (error) {
      apiLogger.error('MQTT connection failed', error as Error);
      this.setConnectionState('error');
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    try {
      if (!this.client) {
        return;
      }

      apiLogger.info('Disconnecting from MQTT broker');

      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Disconnect
      await Mqtt.disconnect();

      // Clear subscriptions
      this.subscriptions.clear();
      this.messageListeners.clear();

      this.client = null;
      this.config = null;
      this.setConnectionState('disconnected');
    } catch (error) {
      apiLogger.error('MQTT disconnect failed', error as Error);
      throw error;
    }
  }

  /**
   * Subscribe to topic
   */
  async subscribe(topic: string, qos: 0 | 1 | 2 = 0, callback?: MQTTEventCallback): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('MQTT client not connected');
      }

      // Validate topic
      const sanitizedTopic = sanitizeString(topic);
      if (sanitizedTopic.length === 0 || sanitizedTopic.length > 255) {
        throw new Error('Invalid topic');
      }

      apiLogger.info('Subscribing to MQTT topic', { topic, qos });

      await Mqtt.subscribe(topic, qos);

      this.subscriptions.add(topic);

      // Add callback if provided
      if (callback) {
        if (!this.messageListeners.has(topic)) {
          this.messageListeners.set(topic, new Set());
        }
        this.messageListeners.get(topic)!.add(callback);
      }
    } catch (error) {
      apiLogger.error('MQTT subscribe failed', error as Error, { topic });
      throw error;
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribe(topic: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('MQTT client not connected');
      }

      apiLogger.info('Unsubscribing from MQTT topic', { topic });

      await Mqtt.unsubscribe(topic);

      this.subscriptions.delete(topic);
      this.messageListeners.delete(topic);
    } catch (error) {
      apiLogger.error('MQTT unsubscribe failed', error as Error, { topic });
      throw error;
    }
  }

  /**
   * Publish message to topic
   */
  async publish(
    topic: string,
    payload: string | object,
    options: {
      qos?: 0 | 1 | 2;
      retained?: boolean;
    } = {}
  ): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('MQTT client not connected');
      }

      // Validate topic
      const sanitizedTopic = sanitizeString(topic);
      if (sanitizedTopic.length === 0 || sanitizedTopic.length > 255) {
        throw new Error('Invalid topic');
      }

      // Convert payload to string
      let payloadStr: string;
      if (typeof payload === 'object') {
        payloadStr = JSON.stringify(payload);
      } else {
        payloadStr = String(payload);
      }

      // Validate payload size (limit to 256KB)
      if (payloadStr.length > 256 * 1024) {
        throw new Error('Payload too large (max 256KB)');
      }

      const qos = options.qos ?? this.config?.qos ?? 0;
      const retained = options.retained ?? false;

      apiLogger.info('Publishing MQTT message', {
        topic,
        payloadLength: payloadStr.length,
        qos,
        retained,
      });

      await Mqtt.publish(topic, payloadStr, qos, retained);
    } catch (error) {
      apiLogger.error('MQTT publish failed', error as Error, { topic });
      throw error;
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
    return this.connectionState === 'connected';
  }

  /**
   * Get current configuration
   */
  getConfig(): MQTTConfig | null {
    return this.config;
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Handle connection established
   */
  private handleConnect(): void {
    apiLogger.info('MQTT connected');
    this.reconnectAttempts = 0;
    this.setConnectionState('connected');

    // Resubscribe to all topics
    const topics = Array.from(this.subscriptions);
    topics.forEach(async (topic) => {
      try {
        await Mqtt.subscribe(topic, this.config?.qos ?? 0);
        apiLogger.debug('Resubscribed to topic', { topic });
      } catch (error) {
        apiLogger.error('Failed to resubscribe', error as Error, { topic });
      }
    });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    apiLogger.warn('MQTT disconnected');
    this.setConnectionState('disconnected');

    // Auto-reconnect
    if (this.config && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

      apiLogger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, {
        delay,
      });

      this.setConnectionState('reconnecting');

      this.reconnectTimer = setTimeout(() => {
        this.connect(this.config!, this.eventCallbacks).catch((error) => {
          apiLogger.error('Reconnection failed', error);
        });
      }, delay);
    }
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    apiLogger.error('MQTT error', error);
    this.setConnectionState('error');

    if (this.eventCallbacks.onError) {
      this.eventCallbacks.onError(error);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: any): void {
    try {
      const message: MQTTMessage = {
        topic: data.topic,
        payload: data.data || data.message || '',
        qos: data.qos || 0,
        retained: data.retain || false,
        timestamp: Date.now(),
      };

      apiLogger.debug('MQTT message received', {
        topic: message.topic,
        payloadLength: message.payload.length,
      });

      // Call global callback
      if (this.eventCallbacks.onMessageArrived) {
        this.eventCallbacks.onMessageArrived(message);
      }

      // Call topic-specific callbacks
      const listeners = this.messageListeners.get(message.topic);
      if (listeners) {
        listeners.forEach((callback) => {
          try {
            callback(message);
          } catch (error) {
            apiLogger.error('Message callback error', error as Error);
          }
        });
      }

      // Call wildcard listeners
      this.messageListeners.forEach((listeners, pattern) => {
        if (this.topicMatches(message.topic, pattern)) {
          listeners.forEach((callback) => {
            try {
              callback(message);
            } catch (error) {
              apiLogger.error('Message callback error', error as Error);
            }
          });
        }
      });
    } catch (error) {
      apiLogger.error('Error handling MQTT message', error as Error);
    }
  }

  /**
   * Check if topic matches pattern (supports # and + wildcards)
   */
  private topicMatches(topic: string, pattern: string): boolean {
    if (topic === pattern) return true;

    const topicParts = topic.split('/');
    const patternParts = pattern.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') {
        return true; // Multi-level wildcard
      }

      if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return topicParts.length === patternParts.length;
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: MQTTConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;

      if (this.eventCallbacks.onConnectionChange) {
        this.eventCallbacks.onConnectionChange(state);
      }
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.disconnect().catch(() => {});
    this.eventCallbacks = {};
    this.messageListeners.clear();
    this.subscriptions.clear();
  }
}

// Singleton instance
export const mqttService = new MQTTService();
