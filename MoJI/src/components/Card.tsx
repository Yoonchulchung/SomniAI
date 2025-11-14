/**
 * Card Component
 * Reusable card component with theme support and animations
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevated = true,
  padding = 'md',
  animated = false,
}) => {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const paddingMap = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
  };

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }).start();
    }
  };

  const cardContent = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.background.elevated,
          padding: paddingMap[padding],
          borderRadius: theme.borderRadius.lg,
          transform: animated && onPress ? [{ scale: scaleAnim }] : undefined,
        },
        elevated && theme.shadows.md,
        style,
      ]}>
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={animated ? 1 : 0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

/**
 * Card Header Component
 */
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {icon && <View style={styles.icon}><Animated.Text style={{ fontSize: 24 }}>{icon}</Animated.Text></View>}
        <View>
          <Animated.Text style={[styles.title, { color: theme.colors.text.primary }]}>
            {title}
          </Animated.Text>
          {subtitle && (
            <Animated.Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              {subtitle}
            </Animated.Text>
          )}
        </View>
      </View>
      {action && <View>{action}</View>}
    </View>
  );
};

/**
 * Card Section Component
 */
interface CardSectionProps {
  children: React.ReactNode;
  title?: string;
  divider?: boolean;
}

export const CardSection: React.FC<CardSectionProps> = ({ children, title, divider = false }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.section,
        divider && {
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.light,
          paddingTop: theme.spacing.md,
          marginTop: theme.spacing.md,
        },
      ]}>
      {title && (
        <Animated.Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
          {title}
        </Animated.Text>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  section: {},
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
});
