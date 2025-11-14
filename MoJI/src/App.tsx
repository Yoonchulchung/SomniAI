import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native'
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Camera } from 'react-native-vision-camera'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet, Text } from 'react-native'
import { HomeScreen } from './screens/HomeScreen'
import { MonitorScreen } from './screens/MonitorScreen'
import { AnalyticsScreen } from './screens/AnalyticsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

const Tab = createBottomTabNavigator()

export function App(): React.ReactElement | null {
   const cameraPermission = Camera.getCameraPermissionStatus()
   const microphonePermission = Camera.getMicrophonePermissionStatus()

   console.log(`Camera: ${cameraPermission} | Microphone : ${microphonePermission}`)

   return(
		<NavigationContainer>
			<GestureHandlerRootView style={styles.root}>
				<Tab.Navigator
					screenOptions={{
						headerShown: false,
						tabBarActiveTintColor: '#2196F3',
						tabBarInactiveTintColor: '#999',
						tabBarStyle: {
							backgroundColor: '#fff',
							borderTopWidth: 1,
							borderTopColor: '#e0e0e0',
							height: 60,
							paddingBottom: 8,
							paddingTop: 8,
						},
						tabBarLabelStyle: {
							fontSize: 12,
							fontWeight: '600',
						},
					}}
					initialRouteName="Home">
					<Tab.Screen
						name="Home"
						component={HomeScreen}
						options={{
							tabBarLabel: 'Home',
							tabBarIcon: ({ color, size }) => (
								<Text style={{ fontSize: 24, color }}>🏠</Text>
							),
						}}
					/>
					<Tab.Screen
						name="Monitor"
						component={MonitorScreen}
						options={{
							tabBarLabel: 'Monitor',
							tabBarIcon: ({ color, size }) => (
								<Text style={{ fontSize: 24, color }}>📹</Text>
							),
						}}
					/>
					<Tab.Screen
						name="Analytics"
						component={AnalyticsScreen}
						options={{
							tabBarLabel: 'Analytic',
							tabBarIcon: ({ color, size }) => (
								<Text style={{ fontSize: 24, color }}>📊</Text>
							),
						}}
					/>
					<Tab.Screen
						name="Settings"
						component={SettingsScreen}
						options={{
							tabBarLabel: 'Settings',
							tabBarIcon: ({ color, size }) => (
								<Text style={{ fontSize: 24, color }}>⚙️</Text>
							),
						}}
					/>
				</Tab.Navigator>
			</GestureHandlerRootView>
		</NavigationContainer>
	)
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})