/**
 * Optimized ProgressBar Component with Animation
 * Smooth animations using Animated API
 */

import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { theme } from '../theme';
import type { ProgressBarProps } from '../types';

interface ProgressBarComponentProps extends ProgressBarProps {
  style?: ViewStyle;
}

const ProgressBarComponent: React.FC<ProgressBarComponentProps> = ({
  progress,
  color = theme.colors.primary[500],
  backgroundColor = theme.colors.gray[200],
  height = 8,
  animated = true,
  style,
  testID,
  accessibilityLabel,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    if (animated) {
      Animated.spring(animatedWidth, {
        toValue: clampedProgress,
        useNativeDriver: false,
        tension: 40,
        friction: 8,
      }).start();
    } else {
      animatedWidth.setValue(clampedProgress);
    }
  }, [progress, animated, animatedWidth]);

  const widthInterpolate = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor, borderRadius: height / 2 },
        style,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: progress }}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolate,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

/**
 * Memoized component - only re-renders when progress or colors change
 */
export const ProgressBar = memo(ProgressBarComponent, (prevProps, nextProps) => {
  return (
    prevProps.progress === nextProps.progress &&
    prevProps.color === nextProps.color &&
    prevProps.backgroundColor === nextProps.backgroundColor &&
    prevProps.height === nextProps.height &&
    prevProps.animated === nextProps.animated
  );
});

ProgressBar.displayName = 'ProgressBar';
