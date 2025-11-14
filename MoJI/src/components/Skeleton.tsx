/**
 * Skeleton Loading Component
 * Animated placeholder for content loading
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = theme.borderRadius.sm,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton Card - Pre-built card skeleton
 */
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <Skeleton width="60%" height={24} style={{ marginBottom: theme.spacing.md }} />
    <Skeleton width="100%" height={16} style={{ marginBottom: theme.spacing.sm }} />
    <Skeleton width="80%" height={16} style={{ marginBottom: theme.spacing.sm }} />
    <Skeleton width="90%" height={16} />
  </View>
);

/**
 * Skeleton List - Multiple skeleton cards
 */
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} style={{ marginBottom: theme.spacing.md }} />
    ))}
  </View>
);

/**
 * Skeleton Stats Grid
 */
export const SkeletonStats: React.FC = () => (
  <View style={styles.statsContainer}>
    {Array.from({ length: 4 }).map((_, index) => (
      <View key={index} style={styles.statCard}>
        <Skeleton width={60} height={32} style={{ marginBottom: theme.spacing.sm }} />
        <Skeleton width="80%" height={14} />
      </View>
    ))}
  </View>
);

/**
 * Skeleton Profile
 */
export const SkeletonProfile: React.FC = () => (
  <View style={styles.profile}>
    <Skeleton width={80} height={80} borderRadius={40} style={{ marginRight: theme.spacing.lg }} />
    <View style={{ flex: 1 }}>
      <Skeleton width="70%" height={20} style={{ marginBottom: theme.spacing.sm }} />
      <Skeleton width="50%" height={16} style={{ marginBottom: theme.spacing.sm }} />
      <Skeleton width="60%" height={14} />
    </View>
  </View>
);

/**
 * Skeleton Table Row
 */
export const SkeletonTableRow: React.FC = () => (
  <View style={styles.tableRow}>
    <Skeleton width="25%" height={16} />
    <Skeleton width="35%" height={16} />
    <Skeleton width="20%" height={16} />
    <Skeleton width="15%" height={16} />
  </View>
);

/**
 * Skeleton Table
 */
export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <View style={styles.table}>
    {/* Header */}
    <View style={[styles.tableRow, styles.tableHeader]}>
      <Skeleton width="25%" height={16} />
      <Skeleton width="35%" height={16} />
      <Skeleton width="20%" height={16} />
      <Skeleton width="15%" height={16} />
    </View>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, index) => (
      <SkeletonTableRow key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.gray[300],
  },
  card: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  list: {
    padding: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  table: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  tableHeader: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border.main,
  },
});
