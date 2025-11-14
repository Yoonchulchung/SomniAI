/**
 * MQTT Screen
 * Full MQTT control panel with connection, publish, subscribe, and message history
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useMQTT } from '../context/MQTTContext';
import {
  MQTTConnectionSettings,
  MQTTPublish,
  MQTTSubscribe,
} from '../components/MQTTControls';
import type { MQTTMessage } from '../services/mqtt';

export function MQTTScreen() {
  const { theme } = useTheme();
  const { messages, clearMessages, connectionState } = useMQTT();
  const [selectedTab, setSelectedTab] = useState<'connection' | 'publish' | 'subscribe' | 'messages'>('connection');

  const renderMessage = ({ item }: { item: MQTTMessage }) => {
    const timestamp = new Date(item.timestamp).toLocaleTimeString('ko-KR');

    return (
      <View
        style={[
          styles.messageCard,
          { backgroundColor: theme.colors.background.elevated },
        ]}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageTopic, { color: theme.colors.primary[500] }]}>
            {item.topic}
          </Text>
          <Text style={[styles.messageTime, { color: theme.colors.text.tertiary }]}>
            {timestamp}
          </Text>
        </View>
        <Text style={[styles.messagePayload, { color: theme.colors.text.primary }]}>
          {item.payload}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageQos, { color: theme.colors.text.secondary }]}>
            QoS: {item.qos}
          </Text>
          {item.retained && (
            <Text style={[styles.messageRetained, { color: theme.colors.warning[500] }]}>
              Retained
            </Text>
          )}
        </View>
      </View>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          MQTT 제어 패널
        </Text>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getConnectionColor() },
            ]}
          />
          <Text style={[styles.statusText, { color: theme.colors.text.secondary }]}>
            {connectionState}
          </Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.background.primary }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'connection' && {
              borderBottomWidth: 2,
              borderBottomColor: theme.colors.primary[500],
            },
          ]}
          onPress={() => setSelectedTab('connection')}>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  selectedTab === 'connection'
                    ? theme.colors.primary[500]
                    : theme.colors.text.secondary,
              },
            ]}>
            연결
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'publish' && {
              borderBottomWidth: 2,
              borderBottomColor: theme.colors.primary[500],
            },
          ]}
          onPress={() => setSelectedTab('publish')}>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  selectedTab === 'publish'
                    ? theme.colors.primary[500]
                    : theme.colors.text.secondary,
              },
            ]}>
            발행
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'subscribe' && {
              borderBottomWidth: 2,
              borderBottomColor: theme.colors.primary[500],
            },
          ]}
          onPress={() => setSelectedTab('subscribe')}>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  selectedTab === 'subscribe'
                    ? theme.colors.primary[500]
                    : theme.colors.text.secondary,
              },
            ]}>
            구독
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'messages' && {
              borderBottomWidth: 2,
              borderBottomColor: theme.colors.primary[500],
            },
          ]}
          onPress={() => setSelectedTab('messages')}>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  selectedTab === 'messages'
                    ? theme.colors.primary[500]
                    : theme.colors.text.secondary,
              },
            ]}>
            메시지 ({messages.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {selectedTab === 'messages' ? (
        <View style={styles.messagesContainer}>
          <View style={styles.messagesHeader}>
            <Text style={[styles.messagesTitle, { color: theme.colors.text.primary }]}>
              수신 메시지
            </Text>
            {messages.length > 0 && (
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: theme.colors.error[500] }]}
                onPress={clearMessages}>
                <Text style={[styles.clearButtonText, { color: theme.colors.text.inverse }]}>
                  전체 삭제
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.text.tertiary }]}>
                수신된 메시지가 없습니다
              </Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => `${item.topic}-${item.timestamp}-${index}`}
              contentContainerStyle={styles.messagesList}
            />
          )}
        </View>
      ) : (
        <ScrollView style={styles.scrollContent}>
          {selectedTab === 'connection' && <MQTTConnectionSettings />}
          {selectedTab === 'publish' && <MQTTPublish />}
          {selectedTab === 'subscribe' && <MQTTSubscribe />}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusIndicator: {
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
    fontSize: 12,
    textTransform: 'capitalize',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  messagesTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    paddingTop: 0,
  },
  messageCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageTopic: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  messageTime: {
    fontSize: 11,
  },
  messagePayload: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageQos: {
    fontSize: 11,
    marginRight: 12,
  },
  messageRetained: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
  },
});
