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
import { ConnectionStatus } from '../components/ServerConnectionStatus';
import { ActivityItemComponent } from '../components/ActivityItem';
import { theme } from '../theme';
import type { ActivityItem, DashboardData } from '../types';
import dashboardDataMock from '../data/mockDashboard.json';
import { performanceMonitor } from '../utils/performance';

const Header = memo(() => (
  <View style={styles.header}>
    <Text style={styles.title}>대시보드</Text>
  </View>
));
Header.displayName = 'Header';

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
              title="AI server status"
            />
            <ConnectionStatus
              isConnected={data.status.isConnected}
              serverUrl={data.status.serverUrl}
              title="Public server status"
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
});
