/**
 * MQTT Screen - Improved UI
 * Modern MQTT control panel with connection, publish, subscribe, and message history
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useMQTT } from '../context/MQTTContext';
import {
  MQTTConnectionSettings,
  MQTTPublish,
  MQTTSubscribe,
} from '../components/MQTTControls';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import type { MQTTMessage } from '../services/mqtt';

export function MQTTScreen() {
  const { theme } = useTheme();
  const { messages, clearMessages, connectionState } = useMQTT();
  const [selectedTab, setSelectedTab] = useState<
    'connection' | 'publish' | 'subscribe' | 'messages'
  >('connection');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const renderMessage = ({ item, index }: { item: MQTTMessage; index: number }) => {
    const timestamp = new Date(item.timestamp).toLocaleTimeString('ko-KR');
    const itemAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(itemAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={{ opacity: itemAnim, transform: [{ translateY: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <Card style={{ marginBottom: theme.spacing.sm }} elevated>
          <View style={styles.messageHeader}>
            <View style={styles.messageTopicRow}>
              <Text style={styles.messageIcon}>📨</Text>
              <Text
                style={[styles.messageTopic, { color: theme.colors.primary[600] }]}
                numberOfLines={1}>
                {item.topic}
              </Text>
            </View>
            <Text style={[styles.messageTime, { color: theme.colors.text.tertiary }]}>
              {timestamp}
            </Text>
          </View>

          <Text
            style={[
              styles.messagePayload,
              {
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.border.light,
              },
            ]}>
            {item.payload}
          </Text>

          <View style={styles.messageFooter}>
            <Badge
              label={`QoS ${item.qos}`}
              variant={item.qos === 2 ? 'success' : item.qos === 1 ? 'info' : 'default'}
              size="sm"
            />
            {item.retained && (
              <Badge label="Retained" variant="warning" size="sm" dot />
            )}
          </View>
        </Card>
      </Animated.View>
    );
  };

  const getConnectionColor = () => {
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

  const getConnectionVariant = (): 'success' | 'error' | 'warning' | 'default' => {
    switch (connectionState) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      case 'connecting':
      case 'reconnecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'connection':
        return '🔌';
      case 'publish':
        return '📤';
      case 'subscribe':
        return '📥';
      case 'messages':
        return '💬';
      default:
        return '';
    }
  };

  const renderTabButton = (
    tab: 'connection' | 'publish' | 'subscribe' | 'messages',
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.tab,
        selectedTab === tab && [
          styles.tabActive,
          { borderBottomColor: theme.colors.primary[500] },
        ],
      ]}
      onPress={() => setSelectedTab(tab)}>
      <Text style={styles.tabIcon}>{getTabIcon(tab)}</Text>
      <Text
        style={[
          styles.tabText,
          {
            color:
              selectedTab === tab
                ? theme.colors.primary[600]
                : theme.colors.text.secondary,
          },
        ]}>
        {label}
        {tab === 'messages' && messages.length > 0 && ` (${messages.length})`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              MQTT 제어 패널
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              IoT 메시지 브로커
            </Text>
          </View>
          <View style={styles.statusIndicator}>
            <Badge
              label={connectionState.toUpperCase()}
              variant={getConnectionVariant()}
              size="sm"
              dot
            />
          </View>
        </View>

        {/* Tab Bar */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: theme.colors.background.primary,
              borderBottomColor: theme.colors.border.light,
            },
          ]}>
          {renderTabButton('connection', '연결')}
          {renderTabButton('publish', '발행')}
          {renderTabButton('subscribe', '구독')}
          {renderTabButton('messages', '메시지')}
        </View>

        {/* Content */}
        {selectedTab === 'messages' ? (
          <View style={styles.messagesContainer}>
            {messages.length > 0 && (
              <View style={[styles.messagesHeader, { backgroundColor: theme.colors.background.primary }]}>
                <Text style={[styles.messagesTitle, { color: theme.colors.text.primary }]}>
                  📬 수신 메시지
                </Text>
                <Button
                  title="전체 삭제"
                  onPress={clearMessages}
                  variant="danger"
                  size="sm"
                  icon="🗑️"
                />
              </View>
            )}

            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                  메시지 없음
                </Text>
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                  토픽을 구독하면 수신된 메시지가 여기에 표시됩니다
                </Text>
              </View>
            ) : (
              <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => `${item.topic}-${item.timestamp}-${index}`}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}>
            {selectedTab === 'connection' && <MQTTConnectionSettings />}
            {selectedTab === 'publish' && <MQTTPublish />}
            {selectedTab === 'subscribe' && <MQTTSubscribe />}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 3,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messagesTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  messagesList: {
    padding: 16,
    paddingTop: 12,
  },
  messageHeader: {
    marginBottom: 12,
  },
  messageTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  messageIcon: {
    fontSize: 18,
  },
  messageTopic: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  messagePayload: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: 'monospace',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
