/**
 * MQTT Context
 * Global MQTT state management with React Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MMKV } from 'react-native-mmkv';
import {
  mqttService,
  type MQTTConfig,
  type MQTTMessage,
  type MQTTConnectionState,
} from '../services/mqtt';
import { apiLogger } from '../utils/logger';

const storage = new MMKV({ id: 'mqtt-storage' });

const STORAGE_KEYS = {
  CONFIG: 'mqtt_config',
  AUTO_CONNECT: 'mqtt_auto_connect',
};

interface MQTTContextType {
  // Connection state
  connectionState: MQTTConnectionState;
  isConnected: boolean;
  config: MQTTConfig | null;

  // Connection actions
  connect: (config: MQTTConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;

  // Messaging actions
  publish: (topic: string, payload: string | object, options?: { qos?: 0 | 1 | 2; retained?: boolean }) => Promise<void>;
  subscribe: (topic: string, qos?: 0 | 1 | 2, callback?: (message: MQTTMessage) => void) => Promise<void>;
  unsubscribe: (topic: string) => Promise<void>;

  // Message history
  messages: MQTTMessage[];
  clearMessages: () => void;

  // Subscriptions
  subscriptions: string[];

  // Settings
  autoConnect: boolean;
  setAutoConnect: (value: boolean) => void;
  saveConfig: (config: MQTTConfig) => void;
  getSavedConfig: () => MQTTConfig | null;

  // Error
  lastError: Error | null;
  clearError: () => void;
}

const MQTTContext = createContext<MQTTContextType | undefined>(undefined);

interface MQTTProviderProps {
  children: React.ReactNode;
  maxMessages?: number;
}

export const MQTTProvider: React.FC<MQTTProviderProps> = ({
  children,
  maxMessages = 100,
}) => {
  const [connectionState, setConnectionState] = useState<MQTTConnectionState>('disconnected');
  const [config, setConfig] = useState<MQTTConfig | null>(null);
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [autoConnect, setAutoConnectState] = useState(() => {
    return storage.getBoolean(STORAGE_KEYS.AUTO_CONNECT) ?? false;
  });
  const [lastError, setLastError] = useState<Error | null>(null);

  const isInitialMount = useRef(true);

  // Get saved configuration
  const getSavedConfig = useCallback((): MQTTConfig | null => {
    try {
      const saved = storage.getString(STORAGE_KEYS.CONFIG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      apiLogger.error('Failed to load MQTT config', error as Error);
    }
    return null;
  }, []);

  // Save configuration
  const saveConfig = useCallback((newConfig: MQTTConfig) => {
    try {
      storage.set(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
      setConfig(newConfig);
      apiLogger.debug('MQTT config saved');
    } catch (error) {
      apiLogger.error('Failed to save MQTT config', error as Error);
    }
  }, []);

  // Set auto-connect
  const setAutoConnect = useCallback((value: boolean) => {
    storage.set(STORAGE_KEYS.AUTO_CONNECT, value);
    setAutoConnectState(value);
  }, []);

  // Connect to MQTT broker
  const connect = useCallback(async (mqttConfig: MQTTConfig) => {
    try {
      setLastError(null);

      await mqttService.connect(mqttConfig, {
        onConnectionChange: (state) => {
          setConnectionState(state);
          apiLogger.debug('MQTT connection state changed', { state });
        },
        onMessageArrived: (message) => {
          apiLogger.debug('MQTT message arrived', {
            topic: message.topic,
            payloadLength: message.payload.length,
          });

          setMessages((prev) => {
            const updated = [message, ...prev];
            return updated.slice(0, maxMessages); // Limit message history
          });
        },
        onError: (error) => {
          apiLogger.error('MQTT error', error);
          setLastError(error);
        },
      });

      setConfig(mqttConfig);
      saveConfig(mqttConfig);
    } catch (error) {
      const err = error as Error;
      setLastError(err);
      throw err;
    }
  }, [maxMessages, saveConfig]);

  // Disconnect from MQTT broker
  const disconnect = useCallback(async () => {
    try {
      await mqttService.disconnect();
      setSubscriptions([]);
      setConnectionState('disconnected');
    } catch (error) {
      const err = error as Error;
      setLastError(err);
      throw err;
    }
  }, []);

  // Reconnect
  const reconnect = useCallback(async () => {
    if (config) {
      await disconnect();
      await connect(config);
    }
  }, [config, connect, disconnect]);

  // Publish message
  const publish = useCallback(async (
    topic: string,
    payload: string | object,
    options?: { qos?: 0 | 1 | 2; retained?: boolean }
  ) => {
    try {
      setLastError(null);
      await mqttService.publish(topic, payload, options);
    } catch (error) {
      const err = error as Error;
      setLastError(err);
      throw err;
    }
  }, []);

  // Subscribe to topic
  const subscribe = useCallback(async (
    topic: string,
    qos: 0 | 1 | 2 = 0,
    callback?: (message: MQTTMessage) => void
  ) => {
    try {
      setLastError(null);
      await mqttService.subscribe(topic, qos, callback);
      setSubscriptions(mqttService.getSubscriptions());
    } catch (error) {
      const err = error as Error;
      setLastError(err);
      throw err;
    }
  }, []);

  // Unsubscribe from topic
  const unsubscribe = useCallback(async (topic: string) => {
    try {
      setLastError(null);
      await mqttService.unsubscribe(topic);
      setSubscriptions(mqttService.getSubscriptions());
    } catch (error) {
      const err = error as Error;
      setLastError(err);
      throw err;
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;

      if (autoConnect) {
        const savedConfig = getSavedConfig();
        if (savedConfig) {
          apiLogger.info('Auto-connecting to MQTT broker');
          connect(savedConfig).catch((error) => {
            apiLogger.error('Auto-connect failed', error);
          });
        }
      }
    }

    // Cleanup on unmount
    return () => {
      mqttService.disconnect().catch(() => {});
    };
  }, [autoConnect, connect, getSavedConfig]);

  const value: MQTTContextType = {
    connectionState,
    isConnected: connectionState === 'connected',
    config,
    connect,
    disconnect,
    reconnect,
    publish,
    subscribe,
    unsubscribe,
    messages,
    clearMessages,
    subscriptions,
    autoConnect,
    setAutoConnect,
    saveConfig,
    getSavedConfig,
    lastError,
    clearError,
  };

  return <MQTTContext.Provider value={value}>{children}</MQTTContext.Provider>;
};

/**
 * useMQTT Hook
 */
export function useMQTT(): MQTTContextType {
  const context = useContext(MQTTContext);
  if (context === undefined) {
    throw new Error('useMQTT must be used within a MQTTProvider');
  }
  return context;
}
