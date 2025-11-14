/**
 * useMQTT Hook
 * React hook for MQTT operations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  mqttService,
  MQTTConfig,
  MQTTMessage,
  MQTTConnectionState,
} from '@/lib/mqtt';

export function useMQTT() {
  const [connectionState, setConnectionState] = useState<MQTTConnectionState>('disconnected');
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Connect to MQTT broker
  const connect = useCallback(async (config: MQTTConfig) => {
    try {
      setError(null);
      await mqttService.connect(config, {
        onConnectionChange: (state) => {
          setConnectionState(state);
        },
        onMessageArrived: (message) => {
          setMessages((prev) => [...prev, message].slice(-100)); // Keep last 100 messages
        },
        onError: (err) => {
          setError(err);
        },
      });
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  // Disconnect from MQTT broker
  const disconnect = useCallback(async () => {
    try {
      await mqttService.disconnect();
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  // Publish message
  const publish = useCallback(
    async (topic: string, payload: string | object, options?: { qos?: 0 | 1 | 2; retained?: boolean }) => {
      try {
        await mqttService.publish(topic, payload, options);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Subscribe to topic
  const subscribe = useCallback(async (topic: string, qos: 0 | 1 | 2 = 0) => {
    try {
      await mqttService.subscribe(topic, qos);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Unsubscribe from topic
  const unsubscribe = useCallback(async (topic: string) => {
    try {
      await mqttService.unsubscribe(topic);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Get subscriptions
  const getSubscriptions = useCallback(() => {
    return mqttService.getSubscriptions();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    messages,
    error,
    connect,
    disconnect,
    publish,
    subscribe,
    unsubscribe,
    clearMessages,
    getSubscriptions,
    isConnected: connectionState === 'connected',
  };
}
