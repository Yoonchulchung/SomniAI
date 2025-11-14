/**
 * Theme Toggle Component
 * Switch between light and dark themes with smooth animation
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = true,
  size = 'medium',
}) => {
  const { theme, themeMode, toggleTheme, animatedOpacity } = useTheme();

  const sizeMap = {
    small: { container: 40, icon: 16 },
    medium: { container: 48, icon: 20 },
    large: { container: 56, icon: 24 },
  };

  const dimensions = sizeMap[size];

  return (
    <Animated.View style={{ opacity: animatedOpacity }}>
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background.elevated,
            borderColor: theme.colors.border.main,
          },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.7}>
        <View
          style={[
            styles.iconContainer,
            {
              width: dimensions.container,
              height: dimensions.container,
              backgroundColor: theme.colors.primary[500],
            },
          ]}>
          <Text style={{ fontSize: dimensions.icon }}>
            {themeMode === 'dark' ? '🌙' : '☀️'}
          </Text>
        </View>

        {showLabel && (
          <View style={styles.labelContainer}>
            <Text
              style={[
                styles.label,
                { color: theme.colors.text.primary },
              ]}>
              {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.colors.text.secondary },
              ]}>
              Tap to switch
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Simple Icon-only Theme Toggle Button
 */
export const ThemeToggleButton: React.FC<{ onPress?: () => void }> = ({ onPress }) => {
  const { theme, themeMode, toggleTheme } = useTheme();

  const handlePress = () => {
    toggleTheme();
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.background.elevated,
          borderColor: theme.colors.border.main,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <Text style={styles.buttonIcon}>
        {themeMode === 'dark' ? '🌙' : '☀️'}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * Theme Selector with Radio Buttons
 */
interface ThemeSelectorProps {
  showSystemOption?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  showSystemOption = true,
}) => {
  const { theme, themeMode, setThemeMode } = useTheme();

  const options: Array<{ mode: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
    { mode: 'light', label: 'Light', icon: '☀️' },
    { mode: 'dark', label: 'Dark', icon: '🌙' },
  ];

  if (showSystemOption) {
    options.push({ mode: 'system' as any, label: 'System', icon: '⚙️' });
  }

  const handleSelect = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
  };

  return (
    <View style={styles.selectorContainer}>
      <Text
        style={[
          styles.selectorTitle,
          { color: theme.colors.text.primary },
        ]}>
        Appearance
      </Text>

      {options.map((option) => {
        if (option.mode === 'system') return null; // Skip system for now

        const isSelected = themeMode === option.mode;

        return (
          <TouchableOpacity
            key={option.mode}
            style={[
              styles.optionContainer,
              {
                backgroundColor: isSelected
                  ? theme.colors.primary[50]
                  : theme.colors.background.elevated,
                borderColor: isSelected
                  ? theme.colors.primary[500]
                  : theme.colors.border.main,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
            onPress={() => handleSelect(option.mode as 'light' | 'dark')}
            activeOpacity={0.7}>
            <Text style={styles.optionIcon}>{option.icon}</Text>
            <View style={styles.optionTextContainer}>
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected
                      ? theme.colors.primary[700]
                      : theme.colors.text.primary,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}>
                {option.label}
              </Text>
              {isSelected && (
                <Text
                  style={[
                    styles.optionCheck,
                    { color: theme.colors.primary[500] },
                  ]}>
                  ✓
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    marginLeft: 12,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonIcon: {
    fontSize: 24,
  },
  selectorContainer: {
    padding: 16,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 16,
  },
  optionCheck: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
