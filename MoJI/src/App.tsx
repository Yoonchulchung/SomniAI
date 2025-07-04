import { NavigationContainer } from '@react-navigation/native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { CameraPage } from './CameraPage'
import { Camera } from 'react-native-vision-camera'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import type { Routes } from './Routes'

const Stack = createNativeStackNavigator<Routes>()

export function App(): React.ReactElement | null {
   const cameraPermission = Camera.getCameraPermissionStatus()
   const microphonePermission = Camera.getMicrophonePermissionStatus()
   
   console.log(`Camera: ${cameraPermission} | Microphone : ${microphonePermission}')


   return(
		<NavigationContainer>
			<GestureHandlerRootView style={styles.root}>
				<Stack.Navigator
					screenOptions={{
					headerShown: false,
					statusBarStyle: 'dark',
					animationTypeForReplace: 'push'}}
					initialRouteName='CameraPage'>
					<Stack.Screen name="CameraPage" component={CameraPage} />
				<\Stack.Navigator>
			</GestureHandlerRootView>
		</NavigationContinaer>
	)

}
