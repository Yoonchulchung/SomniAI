import React, {useEffect, useRef, useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Camera, runAtTargetFps, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera'
import { useIsFocused} from '@react-navigation/core'


const sendQueue: Array<ArrayBuffer> = []  // Asynchronous Queue

function pushToStack(data: ArrayBuffer) {
  sendQueue.push(data)
}

const [requestState, setRequestState] = useState(0)

async function startSendingLoop() {
  while (true) {
    if (sendQueue.length > 0) {
      const buffer = sendQueue.shift()
      if (buffer) {
        try {
            await fetch('http://localhost:3000/upload', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/octet-stream', // binary type
                },
                body: buffer,})
            setRequestState(1)
        } catch (err) {
            setRequestState(0)
          console.warn('[error] Failed to send data:', err)
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100))  // 100ms
  }
}

export function CameraPage(): React.ReactElement {

    const device = useCameraDevice('back')
    const camera = useRef<Camera>(null)
    const isFocused = useIsFocused()
        
    useEffect(() => {
        Camera.requestCameraPermission()
    }, [])


    const frameProcessor = useFrameProcessor((frame) => {
    'worklet'
    console.log(frame.pixelFormat)
    if (frame.pixelFormat === 'rgb') {
        const buffer = frame.toArrayBuffer()
        const data = new Uint8Array(buffer)
        pushToStack(data)
        //console.log(data)
    }
    }, [])

    // To Do : lock threading

    
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
                <Text style={styles.text}> Server Statuts : {requestState ? 'Okay' : 'FAILED'} </Text>
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
