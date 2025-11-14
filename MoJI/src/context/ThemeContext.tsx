/**
 * Theme Context
 * Manages light/dark theme with persistence and animations
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Appearance, ColorSchemeName, Animated } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { lightTheme, darkTheme, type Theme, type ThemeMode } from '../theme/themes';

const storage = new MMKV({ id: 'theme-storage' });
const THEME_STORAGE_KEY = 'app_theme_mode';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  animatedOpacity: Animated.Value;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  followSystem?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  followSystem = false,
}) => {
  // Get system theme
  const getSystemTheme = (): ThemeMode => {
    const colorScheme: ColorSchemeName = Appearance.getColorScheme();
    return colorScheme === 'dark' ? 'dark' : 'light';
  };

  // Initialize theme mode
  const getInitialTheme = (): ThemeMode => {
    if (followSystem) {
      return getSystemTheme();
    }

    const stored = storage.getString(THEME_STORAGE_KEY) as ThemeMode | undefined;
    return stored || defaultTheme;
  };

  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialTheme());
  const animatedOpacity = useRef(new Animated.Value(1)).current;

  // Get current theme
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  // Set theme mode with persistence and animation
  const setThemeMode = useCallback((mode: ThemeMode) => {
    // Fade out animation
    Animated.timing(animatedOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Change theme
      setThemeModeState(mode);
      storage.set(THEME_STORAGE_KEY, mode);

      // Fade in animation
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [animatedOpacity]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  }, [themeMode, setThemeMode]);

  // Listen to system theme changes if followSystem is true
  useEffect(() => {
    if (!followSystem) return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const systemTheme = colorScheme === 'dark' ? 'dark' : 'light';
      setThemeMode(systemTheme);
    });

    return () => subscription.remove();
  }, [followSystem, setThemeMode]);

  const value: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
    isDark: themeMode === 'dark',
    isLight: themeMode === 'light',
    animatedOpacity,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * useTheme Hook
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * withTheme HOC
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P & { theme: Theme }>
): React.FC<P> {
  return (props: P) => {
    const { theme } = useTheme();
    return <Component {...props} theme={theme} />;
  };
}
