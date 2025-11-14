/**
 * Improved Home Screen
 * Modern dashboard with enhanced UI/UX
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';
import { Card, CardHeader, CardSection } from '../components/Card';
import { Badge } from '../components/Badge';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Skeleton, SkeletonStats } from '../components/Skeleton';
import mockDashboard from '../data/mockDashboard.json';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

export function HomeScreenImproved() {
  const { theme } = useTheme();
  const { state, actions } = useAppContext();
  const [refreshing, setRefreshing] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Load data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadDashboardData = async () => {
    try {
      actions.setDashboardLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      actions.setDashboardData(mockDashboard as any);
    } catch (error) {
      actions.showToast({
        message: 'Failed to load dashboard data',
        type: 'error',
      });
    } finally {
      actions.setDashboardLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (state.dashboard.isLoading && !state.dashboard.data) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Dashboard
          </Text>
        </View>
        <SkeletonStats />
      </View>
    );
  }

  const data = state.dashboard.data || mockDashboard;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary[500]}
        />
      }>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: theme.colors.background.primary, opacity: fadeAnim },
        ]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Dashboard
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
            Welcome back! Here's your overview
          </Text>
        </View>
        <Badge
          label={data.status.isConnected ? 'Connected' : 'Disconnected'}
          variant={data.status.isConnected ? 'success' : 'error'}
          dot
        />
      </Animated.View>

      {/* Quick Stats Grid */}
      <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
        <StatCard
          title="Frames Sent"
          value={data.quickStats.totalFramesSent}
          icon="📸"
          trend={+12.5}
          variant="primary"
        />
        <StatCard
          title="Success Rate"
          value={data.quickStats.successRate}
          suffix="%"
          icon="✅"
          trend={+2.3}
          variant="success"
        />
        <StatCard
          title="Average FPS"
          value={data.quickStats.averageFps}
          icon="🎬"
          trend={-1.2}
          variant="info"
        />
        <StatCard
          title="Network Usage"
          value={data.quickStats.networkUsage}
          suffix="MB/s"
          icon="📡"
          trend={+5.8}
          variant="warning"
        />
      </Animated.View>

      {/* System Health */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Card>
          <CardHeader title="System Health" icon="💚" />
          <CardSection>
            <HealthBar
              label="CPU Usage"
              value={data.systemHealth.cpuUsage}
              variant="primary"
            />
            <HealthBar
              label="Memory Usage"
              value={data.systemHealth.memoryUsage}
              variant="info"
            />
            <HealthBar
              label="Battery Level"
              value={data.systemHealth.batteryLevel}
              variant="success"
            />
            <HealthBar
              label="Temperature"
              value={(data.systemHealth.temperature / 100) * 100}
              variant="warning"
              suffix={`${data.systemHealth.temperature}°C`}
            />
          </CardSection>
        </Card>
      </Animated.View>

      {/* Recent Activity */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Card>
          <CardHeader
            title="Recent Activity"
            subtitle={`${data.recentActivity.length} events`}
            icon="📋"
          />
          <CardSection>
            {data.recentActivity.slice(0, 5).map((activity: any, index: number) => (
              <ActivityItem key={activity.id} activity={activity} isLast={index === 4} />
            ))}
          </CardSection>
        </Card>
      </Animated.View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: string;
  trend?: number;
  variant: 'primary' | 'success' | 'info' | 'warning';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, suffix = '', icon, trend, variant }) => {
  const { theme } = useTheme();

  const variantColors = {
    primary: theme.colors.primary[500],
    success: theme.colors.success[500],
    info: theme.colors.info[500],
    warning: theme.colors.warning[500],
  };

  return (
    <Card style={[styles.statCard, { width: CARD_WIDTH }]} padding="md" animated>
      <View style={styles.statIcon}>
        <Text style={{ fontSize: 32 }}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <AnimatedNumber
          value={value}
          decimals={suffix === '%' || suffix === 'MB/s' ? 1 : 0}
          style={[styles.statValue, { color: theme.colors.text.primary }]}
        />
        {suffix && (
          <Text style={[styles.statSuffix, { color: theme.colors.text.secondary }]}>
            {suffix}
          </Text>
        )}
      </View>
      <Text style={[styles.statTitle, { color: theme.colors.text.secondary }]}>{title}</Text>
      {trend !== undefined && (
        <View style={styles.statTrend}>
          <Text
            style={[
              styles.trendText,
              { color: trend >= 0 ? theme.colors.success[500] : theme.colors.error[500] },
            ]}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </Card>
  );
};

/**
 * Health Bar Component
 */
interface HealthBarProps {
  label: string;
  value: number;
  variant: 'primary' | 'success' | 'info' | 'warning';
  suffix?: string;
}

const HealthBar: React.FC<HealthBarProps> = ({ label, value, variant, suffix }) => {
  const { theme } = useTheme();
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: value,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const variantColors = {
    primary: theme.colors.primary[500],
    success: theme.colors.success[500],
    info: theme.colors.info[500],
    warning: theme.colors.warning[500],
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.healthBar}>
      <View style={styles.healthHeader}>
        <Text style={[styles.healthLabel, { color: theme.colors.text.primary }]}>{label}</Text>
        <Text style={[styles.healthValue, { color: theme.colors.text.secondary }]}>
          {suffix || `${value}%`}
        </Text>
      </View>
      <View style={[styles.healthTrack, { backgroundColor: theme.colors.gray[200] }]}>
        <Animated.View
          style={[
            styles.healthProgress,
            {
              width: progressWidth,
              backgroundColor: variantColors[variant],
            },
          ]}
        />
      </View>
    </View>
  );
};

/**
 * Activity Item Component
 */
interface ActivityItemProps {
  activity: any;
  isLast: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, isLast }) => {
  const { theme } = useTheme();

  const getStatusColor = () => {
    switch (activity.status) {
      case 'success':
        return theme.colors.success[500];
      case 'error':
        return theme.colors.error[500];
      case 'warning':
        return theme.colors.warning[500];
      default:
        return theme.colors.gray[500];
    }
  };

  return (
    <View
      style={[
        styles.activityItem,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border.light,
        },
      ]}>
      <View style={[styles.activityDot, { backgroundColor: getStatusColor() }]} />
      <View style={styles.activityContent}>
        <Text style={[styles.activityMessage, { color: theme.colors.text.primary }]}>
          {activity.message}
        </Text>
        <Text style={[styles.activityTime, { color: theme.colors.text.tertiary }]}>
          {activity.timestamp}
        </Text>
      </View>
      <Badge
        label={activity.type}
        variant={
          activity.status === 'success'
            ? 'success'
            : activity.status === 'error'
            ? 'error'
            : 'default'
        }
        size="sm"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    marginBottom: 0,
  },
  statIcon: {
    marginBottom: 8,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statSuffix: {
    fontSize: 16,
    marginLeft: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  statTrend: {
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  healthBar: {
    marginBottom: 16,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  healthValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  healthTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthProgress: {
    height: '100%',
    borderRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
});
