/**
 * Animated Number Component
 * Smoothly animates number changes
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
  duration?: number;
  formatter?: (value: number) => string;
  decimals?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  style,
  duration = 800,
  formatter,
  decimals = 0,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState('0');

  useEffect(() => {
    // Listen to animated value changes
    const listener = animatedValue.addListener(({ value: newValue }) => {
      const rounded = decimals > 0 ? newValue.toFixed(decimals) : Math.round(newValue).toString();
      const formatted = formatter ? formatter(parseFloat(rounded)) : rounded;
      setDisplayValue(formatted);
    });

    // Animate to new value
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, duration, decimals, formatter]);

  return <Text style={style}>{displayValue}</Text>;
};
