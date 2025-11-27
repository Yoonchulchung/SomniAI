/**
 * Main Application Component
 * Enterprise-grade app with providers, error boundaries, and optimizations
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Camera } from 'react-native-vision-camera';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, StatusBar } from 'react-native';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { MQTTProvider } from './context/MQTTContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { HomeScreen } from './screens/HomeScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { MQTTScreen } from './screens/MQTTScreen';
import { theme } from './theme';
import { appLogger } from './utils/logger';
import { performanceMonitor } from './utils/performance';

const Tab = createBottomTabNavigator();

/**
 * Tab Navigator Component
 */
const TabNavigator: React.FC = () => {
  const cameraPermission = Camera.getCameraPermissionStatus();
  const microphonePermission = Camera.getMicrophonePermissionStatus();

  useEffect(() => {
    appLogger.info('Camera permissions', {
      camera: cameraPermission,
      microphone: microphonePermission,
    });
  }, [cameraPermission, microphonePermission]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary[600],
        tabBarInactiveTintColor: theme.colors.gray[400],
        tabBarStyle: {
          backgroundColor: theme.colors.background.primary,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 25,
          paddingTop: 12,
          paddingHorizontal: 8,
          ...theme.shadows.lg,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 18,
          fontWeight: '700',
          marginTop: 0,
        },
      }}
      initialRouteName="Home">
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home Tab',
        }}
      />
      <Tab.Screen
        name="Capture"
        component={CaptureScreen}
        options={{
          tabBarLabel: 'Capture',
          tabBarAccessibilityLabel: 'Capture Tab',
        }}
      />
      <Tab.Screen
        name="MQTT"
        component={MQTTScreen}
        options={{
          tabBarLabel: 'MQTT',
          tabBarAccessibilityLabel: 'MQTT Tab',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'Settings Tab',
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Main App Component with Providers
 */
export function App(): React.ReactElement {
  useEffect(() => {
    // Performance monitoring
    performanceMonitor.start('App:mount');
    appLogger.info('Application started', {
      version: '1.0.0',
      environment: __DEV__ ? 'development' : 'production',
    });

    return () => {
      const mountTime = performanceMonitor.end('App:mount');
      appLogger.info('Application unmounted', { mountTime });
    };
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        appLogger.error('Unhandled React error', error, {
          componentStack: errorInfo.componentStack,
        });
      }}>
      <ThemeProvider defaultTheme="light" followSystem={false}>
        <MQTTProvider maxMessages={100}>
          <AppProvider>
            <GestureHandlerRootView style={styles.root}>
              <StatusBar
                barStyle="dark-content"
                backgroundColor={theme.colors.background.primary}
              />
              <NavigationContainer>
                <TabNavigator />
              </NavigationContainer>
              <ToastContainer />
            </GestureHandlerRootView>
          </AppProvider>
        </MQTTProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
});
