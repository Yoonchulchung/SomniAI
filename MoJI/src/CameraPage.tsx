import React, {useEffect, useRef, useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Camera, runAtTargetFps, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera'
import { useIsFocused } from '@react-navigation/core'
import { NativeModules, Platform } from 'react-native'

declare global {
  var __FastStream: () => {
    sendFrame: (buffer: ArrayBuffer, ip: string) => void
  }
}

const mojiNativeModule = NativeModules.MoJIFastStreaming
if (Platform.OS === 'android') {

  if (mojiNativeModule && typeof mojiNativeModule.install === 'function') {
     var result = mojiNativeModule.install()
     if (result){
         console.log("Succeed to Install Moji Native Module")
      }
      else{
         console.log("Failed to Install Moji Native Module")
      }
    }
}

const moji = global.__FastStream()

export function CameraPage(): React.ReactElement {

    const device = useCameraDevice('back')
    const camera = useRef<Camera>(null)
    const isFocused = useIsFocused()
        
    useEffect(() => {
        Camera.requestCameraPermission()
    }, [isFocused])


    const frameProcessor = useFrameProcessor((frame) => {
    'worklet'

    runAtTargetFps(10, () => {
        'worklet'
        if (frame.pixelFormat === 'rgb') {

            const buffer = frame.toArrayBuffer()
            // Send Data to Server through Native Language
            moji.sendFrame(buffer, '192.168.0.1')
        }
    })
    }, [])
    
    return (
        <View style={styles.container} >
            <View style={styles.cameraContainer} >
                {device != null && (
                    <Camera
                        ref={camera}
                        pixelFormat={'rgb'}
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={isFocused}
                        photo={true}
                        audio={false}
                        frameProcessor={frameProcessor}
                    />
                )}
            </View>

            <View style={styles.textContainer} >
                <Text style={styles.text}> Server Data  </Text>
            </View>

            <View style={styles.textContainer} >
                <Text style={styles.text}> Server Statuts  </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex : 1,
        backgroundColor : 'black'
    },

    cameraContainer: {
        flex: 1,
        backgroundColor : 'black',
        overflow : 'hidden',
    },

    textContainer : {
        flex: 1,
        backgroundColor : 'black',
        alignContent: 'center',
        alignItems: 'center'
    },
    text: {
        color: 'white',
        fontSize : 20,
    }
})
