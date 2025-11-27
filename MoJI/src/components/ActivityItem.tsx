import React, { memo, useCallback } from 'react';
import type { ActivityItem } from '../types';
import { theme } from '../theme';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

interface ActivityItemComponentProps {
  item: ActivityItem;
}

export const ActivityItemComponent = memo<ActivityItemComponentProps>(
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

const styles = StyleSheet.create({
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
})