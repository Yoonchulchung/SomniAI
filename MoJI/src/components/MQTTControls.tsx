/**
 * MQTT Control Components
 * UI components for MQTT connection, publish, and subscribe
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useMQTT } from '../context/MQTTContext';
import { useTheme } from '../context/ThemeContext';
import type { MQTTConfig } from '../services/mqtt';

/**
 * MQTT Connection Settings Component
 */
export const MQTTConnectionSettings: React.FC = () => {
  const { theme } = useTheme();
  const { connect, disconnect, isConnected, config: savedConfig, connectionState } = useMQTT();

  const [host, setHost] = useState(savedConfig?.host || '192.168.0.100');
  const [port, setPort] = useState(savedConfig?.port.toString() || '1883');
  const [clientId, setClientId] = useState(savedConfig?.clientId || `MoJI_${Date.now()}`);
  const [username, setUsername] = useState(savedConfig?.username || '');
  const [password, setPassword] = useState(savedConfig?.password || '');
  const [protocol, setProtocol] = useState<'tcp' | 'ws'>(savedConfig?.protocol as any || 'tcp');

  const handleConnect = async () => {
    try {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        Alert.alert('오류', '올바른 포트 번호를 입력하세요 (1-65535)');
        return;
      }

      if (!host.trim()) {
        Alert.alert('오류', '호스트를 입력하세요');
        return;
      }

      if (!clientId.trim()) {
        Alert.alert('오류', 'Client ID를 입력하세요');
        return;
      }

      const config: MQTTConfig = {
        host: host.trim(),
        port: portNum,
        clientId: clientId.trim(),
        username: username.trim() || undefined,
        password: password || undefined,
        protocol,
        keepalive: 60,
        cleanSession: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        qos: 0,
      };

      await connect(config);
      Alert.alert('성공', 'MQTT 브로커에 연결되었습니다');
    } catch (error) {
      Alert.alert('연결 실패', (error as Error).message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      Alert.alert('연결 해제', 'MQTT 브로커와의 연결이 해제되었습니다');
    } catch (error) {
      Alert.alert('오류', (error as Error).message);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return theme.colors.success[500];
      case 'connecting':
      case 'reconnecting':
        return theme.colors.warning[500];
      case 'error':
        return theme.colors.error[500];
      default:
        return theme.colors.gray[500];
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return '연결됨';
      case 'connecting':
        return '연결 중...';
      case 'reconnecting':
        return '재연결 중...';
      case 'error':
        return '오류';
      default:
        return '연결 안 됨';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          MQTT 브로커 설정
        </Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getConnectionStatusColor() },
            ]}
          />
          <Text style={[styles.statusText, { color: theme.colors.text.secondary }]}>
            {getConnectionStatusText()}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.background.elevated }]}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>호스트 (IP 주소)</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.main,
            },
          ]}
          value={host}
          onChangeText={setHost}
          placeholder="192.168.0.100"
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isConnected}
        />

        <Text style={[styles.label, { color: theme.colors.text.primary }]}>포트</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.main,
            },
          ]}
          value={port}
          onChangeText={setPort}
          placeholder="1883"
          placeholderTextColor={theme.colors.text.tertiary}
          keyboardType="number-pad"
          editable={!isConnected}
        />

        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Client ID</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.main,
            },
          ]}
          value={clientId}
          onChangeText={setClientId}
          placeholder="MoJI_12345"
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isConnected}
        />

        <Text style={[styles.label, { color: theme.colors.text.primary }]}>
          사용자 이름 (선택)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.main,
            },
          ]}
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isConnected}
        />

        <Text style={[styles.label, { color: theme.colors.text.primary }]}>
          비밀번호 (선택)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.main,
            },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="password"
          placeholderTextColor={theme.colors.text.tertiary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isConnected}
        />

        <View style={styles.protocolContainer}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>프로토콜</Text>
          <View style={styles.protocolButtons}>
            <TouchableOpacity
              style={[
                styles.protocolButton,
                protocol === 'tcp' && {
                  backgroundColor: theme.colors.primary[500],
                  borderColor: theme.colors.primary[500],
                },
                { borderColor: theme.colors.border.main },
              ]}
              onPress={() => setProtocol('tcp')}
              disabled={isConnected}>
              <Text
                style={[
                  styles.protocolText,
                  {
                    color:
                      protocol === 'tcp'
                        ? theme.colors.text.inverse
                        : theme.colors.text.primary,
                  },
                ]}>
                TCP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.protocolButton,
                protocol === 'ws' && {
                  backgroundColor: theme.colors.primary[500],
                  borderColor: theme.colors.primary[500],
                },
                { borderColor: theme.colors.border.main },
              ]}
              onPress={() => setProtocol('ws')}
              disabled={isConnected}>
              <Text
                style={[
                  styles.protocolText,
                  {
                    color:
                      protocol === 'ws'
                        ? theme.colors.text.inverse
                        : theme.colors.text.primary,
                  },
                ]}>
                WebSocket
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isConnected
                ? theme.colors.error[500]
                : theme.colors.primary[500],
            },
          ]}
          onPress={isConnected ? handleDisconnect : handleConnect}
          activeOpacity={0.8}>
          <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>
            {isConnected ? '연결 해제' : '연결'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * MQTT Publish Component
 */
interface MQTTPublishProps {
  defaultTopic?: string;
}

export const MQTTPublish: React.FC<MQTTPublishProps> = ({ defaultTopic = 'test/topic' }) => {
  const { theme } = useTheme();
  const { publish, isConnected } = useMQTT();

  const [topic, setTopic] = useState(defaultTopic);
  const [message, setMessage] = useState('');
  const [qos, setQos] = useState<0 | 1 | 2>(0);
  const [retained, setRetained] = useState(false);

  const handlePublish = async () => {
    if (!isConnected) {
      Alert.alert('오류', 'MQTT 브로커에 먼저 연결하세요');
      return;
    }

    if (!topic.trim()) {
      Alert.alert('오류', '토픽을 입력하세요');
      return;
    }

    if (!message.trim()) {
      Alert.alert('오류', '메시지를 입력하세요');
      return;
    }

    try {
      await publish(topic.trim(), message.trim(), { qos, retained });
      Alert.alert('성공', '메시지가 발행되었습니다');
      setMessage('');
    } catch (error) {
      Alert.alert('발행 실패', (error as Error).message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>메시지 발행</Text>

      <View style={[styles.card, { backgroundColor: theme.colors.background.elevated }]}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>토픽</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.main,
            },
          ]}
          value={topic}
          onChangeText={setTopic}
          placeholder="test/topic"
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.label, { color: theme.colors.text.primary }]}>메시지</Text>
        <TextInput
          style={[
            styles.input,
            styles.messageInput,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.main,
            },
          ]}
          value={message}
          onChangeText={setMessage}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.optionsContainer}>
          <View style={styles.qosContainer}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>QoS</Text>
            <View style={styles.qosButtons}>
              {([0, 1, 2] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.qosButton,
                    qos === level && {
                      backgroundColor: theme.colors.primary[500],
                      borderColor: theme.colors.primary[500],
                    },
                    { borderColor: theme.colors.border.main },
                  ]}
                  onPress={() => setQos(level)}>
                  <Text
                    style={[
                      styles.qosText,
                      {
                        color:
                          qos === level
                            ? theme.colors.text.inverse
                            : theme.colors.text.primary,
                      },
                    ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.retainedContainer}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Retained</Text>
            <Switch value={retained} onValueChange={setRetained} />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isConnected
                ? theme.colors.primary[500]
                : theme.colors.gray[400],
            },
          ]}
          onPress={handlePublish}
          disabled={!isConnected}
          activeOpacity={0.8}>
          <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>발행</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * MQTT Subscribe Component
 */
export const MQTTSubscribe: React.FC = () => {
  const { theme } = useTheme();
  const { subscribe, unsubscribe, subscriptions, isConnected } = useMQTT();

  const [topic, setTopic] = useState('test/#');
  const [qos, setQos] = useState<0 | 1 | 2>(0);

  const handleSubscribe = async () => {
    if (!isConnected) {
      Alert.alert('오류', 'MQTT 브로커에 먼저 연결하세요');
      return;
    }

    if (!topic.trim()) {
      Alert.alert('오류', '토픽을 입력하세요');
      return;
    }

    if (subscriptions.includes(topic.trim())) {
      Alert.alert('알림', '이미 구독 중인 토픽입니다');
      return;
    }

    try {
      await subscribe(topic.trim(), qos);
      Alert.alert('성공', `'${topic}' 토픽을 구독했습니다`);
      setTopic('');
    } catch (error) {
      Alert.alert('구독 실패', (error as Error).message);
    }
  };

  const handleUnsubscribe = async (topicToUnsubscribe: string) => {
    try {
      await unsubscribe(topicToUnsubscribe);
      Alert.alert('성공', `'${topicToUnsubscribe}' 구독이 취소되었습니다`);
    } catch (error) {
      Alert.alert('구독 취소 실패', (error as Error).message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>토픽 구독</Text>

      <View style={[styles.card, { backgroundColor: theme.colors.background.elevated }]}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>토픽</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.main,
            },
          ]}
          value={topic}
          onChangeText={setTopic}
          placeholder="test/#"
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.qosContainer}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>QoS</Text>
          <View style={styles.qosButtons}>
            {([0, 1, 2] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.qosButton,
                  qos === level && {
                    backgroundColor: theme.colors.primary[500],
                    borderColor: theme.colors.primary[500],
                  },
                  { borderColor: theme.colors.border.main },
                ]}
                onPress={() => setQos(level)}>
                <Text
                  style={[
                    styles.qosText,
                    {
                      color:
                        qos === level
                          ? theme.colors.text.inverse
                          : theme.colors.text.primary,
                    },
                  ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isConnected
                ? theme.colors.primary[500]
                : theme.colors.gray[400],
            },
          ]}
          onPress={handleSubscribe}
          disabled={!isConnected}
          activeOpacity={0.8}>
          <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>구독</Text>
        </TouchableOpacity>
      </View>

      {subscriptions.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.background.elevated, marginTop: 16 },
          ]}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>
            구독 중인 토픽 ({subscriptions.length})
          </Text>
          {subscriptions.map((sub) => (
            <View key={sub} style={styles.subscriptionItem}>
              <Text style={[styles.subscriptionText, { color: theme.colors.text.primary }]}>
                {sub}
              </Text>
              <TouchableOpacity
                style={[
                  styles.unsubscribeButton,
                  { backgroundColor: theme.colors.error[500] },
                ]}
                onPress={() => handleUnsubscribe(sub)}>
                <Text style={[styles.unsubscribeText, { color: theme.colors.text.inverse }]}>
                  취소
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  messageInput: {
    height: 100,
    paddingTop: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  qosContainer: {
    flex: 1,
    marginRight: 16,
  },
  qosButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qosButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  qosText: {
    fontSize: 14,
    fontWeight: '600',
  },
  retainedContainer: {
    alignItems: 'center',
  },
  protocolContainer: {
    marginTop: 12,
  },
  protocolButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  protocolButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  protocolText: {
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  subscriptionText: {
    fontSize: 14,
    flex: 1,
  },
  unsubscribeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  unsubscribeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
