/**
 * Optimized Home Screen
 * Enterprise-grade performance with memoization, virtualization, and optimized re-renders
 */

import React, { memo, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { useAppContext, useDashboard } from '../context/AppContext';
import { useData } from '../hooks/useData';
import { apiService } from '../services/api';
import { StatCard } from '../components/StatCard';
import { ProgressBar } from '../components/ProgressBar';
import { theme } from '../theme';
import type { ActivityItem, DashboardData } from '../types';
import dashboardDataMock from '../data/mockDashboard.json';
import { performanceMonitor } from '../utils/performance';

// Separate memoized components for optimal performance
const Header = memo(() => (
  <View style={styles.header}>
    <Text style={styles.title}>대시보드</Text>
    <Text style={styles.subtitle}>MoJI 스트리밍 상태</Text>
  </View>
));
Header.displayName = 'Header';

interface ConnectionStatusProps {
  isConnected: boolean;
  serverUrl: string;
  uptime: number;
}

const ConnectionStatus = memo<ConnectionStatusProps>(
  ({ isConnected, serverUrl, uptime }) => {
    const formatUptime = useCallback((seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}시간 ${minutes}분`;
    }, []);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>연결 상태</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isConnected
                  ? theme.colors.success[500]
                  : theme.colors.error[500],
              },
            ]}>
            <Text style={styles.statusBadgeText}>
              {isConnected ? '연결됨' : '연결 안됨'}
            </Text>
          </View>
        </View>
        <Text style={styles.serverUrl}>{serverUrl}</Text>
        <Text style={styles.uptime}>업타임: {formatUptime(uptime)}</Text>
      </View>
    );
  },
  (prev, next) =>
    prev.isConnected === next.isConnected &&
    prev.serverUrl === next.serverUrl &&
    prev.uptime === next.uptime
);
ConnectionStatus.displayName = 'ConnectionStatus';

interface QuickStatsProps {
  totalFramesSent: number;
  successRate: number;
  averageFps: number;
  networkUsage: number;
}

const QuickStats = memo<QuickStatsProps>(
  ({ totalFramesSent, successRate, averageFps, networkUsage }) => (
    <>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <StatCard
            value={totalFramesSent}
            label="전송된 프레임"
            icon="📦"
            color={theme.colors.primary[500]}
          />
        </View>
        <View style={styles.statCard}>
          <StatCard
            value={`${successRate}%`}
            label="성공률"
            icon="✅"
            color={theme.colors.success[500]}
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <StatCard
            value={averageFps}
            label="평균 FPS"
            icon="⚡"
            color={theme.colors.warning[500]}
          />
        </View>
        <View style={styles.statCard}>
          <StatCard
            value={`${networkUsage.toFixed(1)} MB`}
            label="네트워크 사용량"
            icon="📡"
            color={theme.colors.info[500]}
          />
        </View>
      </View>
    </>
  ),
  (prev, next) =>
    prev.totalFramesSent === next.totalFramesSent &&
    prev.successRate === next.successRate &&
    prev.averageFps === next.averageFps &&
    prev.networkUsage === next.networkUsage
);
QuickStats.displayName = 'QuickStats';

interface SystemHealthProps {
  cpu: number;
  memory: number;
  battery: number;
}

const SystemHealth = memo<SystemHealthProps>(
  ({ cpu, memory, battery }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>시스템 상태</Text>
      <View style={styles.healthContainer}>
        <View style={styles.healthItem}>
          <Text style={styles.healthLabel}>CPU</Text>
          <View style={styles.progressBarWrapper}>
            <ProgressBar
              progress={cpu}
              color={theme.colors.primary[500]}
              height={8}
            />
          </View>
          <Text style={styles.healthValue}>{cpu}%</Text>
        </View>

        <View style={styles.healthItem}>
          <Text style={styles.healthLabel}>메모리</Text>
          <View style={styles.progressBarWrapper}>
            <ProgressBar
              progress={memory}
              color={theme.colors.primary[500]}
              height={8}
            />
          </View>
          <Text style={styles.healthValue}>{memory}%</Text>
        </View>

        <View style={styles.healthItem}>
          <Text style={styles.healthLabel}>배터리</Text>
          <View style={styles.progressBarWrapper}>
            <ProgressBar
              progress={battery}
              color={
                battery > 20
                  ? theme.colors.success[500]
                  : theme.colors.error[500]
              }
              height={8}
            />
          </View>
          <Text style={styles.healthValue}>{battery}%</Text>
        </View>
      </View>
    </View>
  ),
  (prev, next) =>
    prev.cpu === next.cpu &&
    prev.memory === next.memory &&
    prev.battery === next.battery
);
SystemHealth.displayName = 'SystemHealth';

interface ActivityItemComponentProps {
  item: ActivityItem;
}

const ActivityItemComponent = memo<ActivityItemComponentProps>(
  ({ item }) => {
    const getStatusColor = useCallback((status: string) => {
      switch (status) {
        case 'success':
          return theme.colors.success[500];
        case 'warning':
          return theme.colors.warning[500];
        case 'error':
          return theme.colors.error[500];
        default:
          return theme.colors.info[500];
      }
    }, []);

    const formatTimestamp = useCallback((timestamp: string) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }, []);

    return (
      <View style={styles.activityItem}>
        <View
          style={[
            styles.activityDot,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        />
        <View style={styles.activityContent}>
          <Text style={styles.activityMessage}>{item.message}</Text>
          <Text style={styles.activityTime}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.message === next.item.message &&
    prev.item.timestamp === next.item.timestamp
);
ActivityItemComponent.displayName = 'ActivityItemComponent';

/**
 * Main HomeScreen Component
 */
export const HomeScreen: React.FC = () => {
  const { actions } = useAppContext();
  const dashboard = useDashboard();

  // Fetch dashboard data with caching
  const {
    data,
    isLoading,
    refetch,
  } = useData<DashboardData>(
    async () => {
      // In production, use: return apiService.getDashboard();
      // For now, use mock data
      return {
        success: true,
        data: dashboardDataMock as DashboardData,
        timestamp: Date.now(),
      };
    },
    {
      cacheKey: 'dashboard',
      cacheDuration: 5000, // 5 seconds
      refetchInterval: 10000, // Auto-refresh every 10 seconds
      enabled: true,
      onSuccess: (data) => {
        actions.setDashboardData(data);
      },
      onError: (error) => {
        actions.setDashboardError(error.message);
      },
    }
  );

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.start('HomeScreen:render');
    return () => {
      performanceMonitor.end('HomeScreen:render');
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    performanceMonitor.start('HomeScreen:refresh');
    await refetch();
    performanceMonitor.end('HomeScreen:refresh');
  }, [refetch]);

  // Memoized activity list render
  const renderActivity: ListRenderItem<ActivityItem> = useCallback(
    ({ item }) => <ActivityItemComponent item={item} />,
    []
  );

  const keyExtractor = useCallback(
    (item: ActivityItem) => item.id.toString(),
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 60,
      offset: 60 * index,
      index,
    }),
    []
  );

  // Render list header with memoization
  const ListHeaderComponent = useMemo(
    () => (
      <>
        <Header />

        {data && (
          <>
            <ConnectionStatus
              isConnected={data.status.isConnected}
              serverUrl={data.status.serverUrl}
              uptime={data.status.uptime}
            />

            <QuickStats
              totalFramesSent={data.quickStats.totalFramesSent}
              successRate={data.quickStats.successRate}
              averageFps={data.quickStats.averageFps}
              networkUsage={data.quickStats.networkUsage}
            />

            <SystemHealth
              cpu={data.systemHealth.cpu}
              memory={data.systemHealth.memory}
              battery={data.systemHealth.battery}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>최근 활동</Text>
            </View>
          </>
        )}
      </>
    ),
    [data]
  );

  if (!data && isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data?.recentActivity || []}
      renderItem={renderActivity}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      initialNumToRender={10}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary[500]]}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxxl + theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
  },
  title: {
    fontSize: theme.typography.fontSize.display1,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.background.primary,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
  },
  statusBadgeText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  serverUrl: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  uptime: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.disabled,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
  },
  healthContainer: {
    gap: theme.spacing.lg,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  healthLabel: {
    width: 60,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  progressBarWrapper: {
    flex: 1,
  },
  healthValue: {
    width: 50,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    textAlign: 'right',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  activityTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.disabled,
  },
});
