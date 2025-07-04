import React, {useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import { useIsFocused} from '@react-navigation/core'

export function CameraPage(): React.ReactElement {

    const device = useCameraDevice('back')
    const camera = useRef<Camera>(null)
    const isFocused = useIsFocused()

    useEffect(() => {
        Camera.requestCameraPermission()
    }, [])

    return (
        <View style={styles.container} >
            {device != null && (
                <Camera
                    ref={camera}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isFocused}
                    photo={false}
                    audio={false}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex : 1,
        backgroundColor : 'black'
    }
})