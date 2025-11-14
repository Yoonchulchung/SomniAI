import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import dashboardData from '../data/mockDashboard.json';

interface ActivityItem {
  id: number;
  timestamp: string;
  type: string;
  message: string;
  status: string;
}

export function HomeScreen() {
  const [data, setData] = useState(dashboardData);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Mock refresh - in real app, fetch from API
    setTimeout(() => {
      setData({ ...dashboardData });
      setRefreshing(false);
    }, 1000);
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>대시보드</Text>
        <Text style={styles.subtitle}>MoJI 스트리밍 상태</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>연결 상태</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: data.status.isConnected
                  ? '#4CAF50'
                  : '#F44336',
              },
            ]}>
            <Text style={styles.statusBadgeText}>
              {data.status.isConnected ? '연결됨' : '연결 안됨'}
            </Text>
          </View>
        </View>
        <Text style={styles.serverUrl}>{data.status.serverUrl}</Text>
        <Text style={styles.uptime}>
          업타임: {formatUptime(data.status.uptime)}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {data.quickStats.totalFramesSent.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>전송된 프레임</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.quickStats.successRate}%</Text>
          <Text style={styles.statLabel}>성공률</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.quickStats.averageFps}</Text>
          <Text style={styles.statLabel}>평균 FPS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {data.quickStats.networkUsage.toFixed(1)} MB
          </Text>
          <Text style={styles.statLabel}>네트워크 사용량</Text>
        </View>
      </View>

      {/* System Health */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>시스템 상태</Text>
        <View style={styles.healthContainer}>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>CPU</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${data.systemHealth.cpu}%` },
                ]}
              />
            </View>
            <Text style={styles.healthValue}>{data.systemHealth.cpu}%</Text>
          </View>

          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>메모리</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${data.systemHealth.memory}%` },
                ]}
              />
            </View>
            <Text style={styles.healthValue}>{data.systemHealth.memory}%</Text>
          </View>

          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>배터리</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${data.systemHealth.battery}%`,
                    backgroundColor:
                      data.systemHealth.battery > 20 ? '#4CAF50' : '#F44336',
                  },
                ]}
              />
            </View>
            <Text style={styles.healthValue}>{data.systemHealth.battery}%</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>최근 활동</Text>
        {data.recentActivity.map((activity: ActivityItem) => (
          <View key={activity.id} style={styles.activityItem}>
            <View
              style={[
                styles.activityDot,
                { backgroundColor: getStatusColor(activity.status) },
              ]}
            />
            <View style={styles.activityContent}>
              <Text style={styles.activityMessage}>{activity.message}</Text>
              <Text style={styles.activityTime}>
                {formatTimestamp(activity.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  serverUrl: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  uptime: {
    fontSize: 14,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  healthContainer: {
    gap: 16,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthLabel: {
    width: 60,
    fontSize: 14,
    color: '#666',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  healthValue: {
    width: 50,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
});
