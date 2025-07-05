import React, {useEffect, useRef, useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Camera, runAtTargetFps, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera'
import { useIsFocused } from '@react-navigation/core'

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
