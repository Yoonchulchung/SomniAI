/**
 * Badge Component
 * Status badges and labels
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
  dot = false,
}) => {
  const { theme } = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: theme.colors.success[50],
          text: theme.colors.success[700],
          dot: theme.colors.success[500],
        };
      case 'error':
        return {
          bg: theme.colors.error[50],
          text: theme.colors.error[700],
          dot: theme.colors.error[500],
        };
      case 'warning':
        return {
          bg: theme.colors.warning[50],
          text: theme.colors.warning[700],
          dot: theme.colors.warning[500],
        };
      case 'info':
        return {
          bg: theme.colors.info[50],
          text: theme.colors.info[700],
          dot: theme.colors.info[500],
        };
      default:
        return {
          bg: theme.colors.gray[100],
          text: theme.colors.gray[700],
          dot: theme.colors.gray[500],
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 2, paddingHorizontal: 6, fontSize: 11 };
      case 'md':
        return { paddingVertical: 4, paddingHorizontal: 8, fontSize: 12 };
      case 'lg':
        return { paddingVertical: 6, paddingHorizontal: 10, fontSize: 13 };
    }
  };

  const colors = getVariantColors();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderRadius: theme.borderRadius.full,
        },
        style,
      ]}>
      {dot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: colors.dot,
              width: sizeStyles.fontSize - 4,
              height: sizeStyles.fontSize - 4,
              borderRadius: (sizeStyles.fontSize - 4) / 2,
              marginRight: 4,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: sizeStyles.fontSize,
            fontWeight: '600',
          },
        ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {},
  text: {
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
