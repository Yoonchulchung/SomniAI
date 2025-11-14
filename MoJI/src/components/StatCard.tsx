/**
 * Optimized StatCard Component
 * Enterprise-grade performance with memo and animations
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';
import type { StatCardProps } from '../types';

interface StatCardComponentProps extends StatCardProps {
  style?: ViewStyle;
  valueStyle?: TextStyle;
  labelStyle?: TextStyle;
}

const StatCardComponent: React.FC<StatCardComponentProps> = ({
  value,
  label,
  icon,
  color = theme.colors.primary[500],
  trend,
  style,
  valueStyle,
  labelStyle,
  testID,
  accessibilityLabel,
}) => {
  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  }, [value]);

  const trendIcon = useMemo(() => {
    if (!trend) return null;
    return trend.direction === 'up' ? '↑' : '↓';
  }, [trend]);

  const trendColor = useMemo(() => {
    if (!trend) return theme.colors.gray[500];
    return trend.direction === 'up'
      ? theme.colors.success[500]
      : theme.colors.error[500];
  }, [trend]);

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || label}>
      {icon && <Text style={styles.icon}>{icon}</Text>}

      <View style={styles.content}>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color }, valueStyle]}>
            {formattedValue}
          </Text>
          {trend && (
            <View style={styles.trendContainer}>
              <Text style={[styles.trendIcon, { color: trendColor }]}>
                {trendIcon}
              </Text>
              <Text style={[styles.trendValue, { color: trendColor }]}>
                {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.label, labelStyle]}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  icon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  value: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    marginRight: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
  trendValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: 2,
  },
});

/**
 * Memoized component - only re-renders when props actually change
 */
export const StatCard = memo(StatCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.label === nextProps.label &&
    prevProps.icon === nextProps.icon &&
    prevProps.color === nextProps.color &&
    prevProps.trend?.value === nextProps.trend?.value &&
    prevProps.trend?.direction === nextProps.trend?.direction
  );
});

StatCard.displayName = 'StatCard';
