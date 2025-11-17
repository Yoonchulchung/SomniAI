/**
 * Type Definitions
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key: string;
}

export interface MqttMessage {
  topic: string;
  payload: string | Buffer;
  qos?: 0 | 1 | 2;
  retain?: boolean;
  timestamp?: number;
}

export interface StreamStats {
  activeStreams: number;
  totalFrames: number;
  mqttMessages: number;
  connectedDevices: number;
}

export interface SystemStatus {
  webcam: 'active' | 'inactive' | 'error';
  mqtt: 'connected' | 'disconnected' | 'error';
  server: 'active' | 'inactive' | 'error';
  redis: 'connected' | 'disconnected' | 'error';
}
