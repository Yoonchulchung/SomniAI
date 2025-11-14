import React, {useEffect, useRef, useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Camera, runAtTargetFps, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera'
import { useIsFocused } from '@react-navigation/core'
import { NativeModules, Platform } from 'react-native'

interface TransmissionStats {
  totalSent: number
  successCount: number
  failureCount: number
  successRate: number
  lastResponseTimeMs: number
}

declare global {
  var __FastStream: () => {
    sendFrame: (buffer: ArrayBuffer, ip: string) => { queued: boolean; totalSent: number }
    getStats: () => TransmissionStats
    resetStats: () => { reset: boolean }
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

    const [stats, setStats] = useState<TransmissionStats>({
        totalSent: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        lastResponseTimeMs: 0
    })

    useEffect(() => {
        Camera.requestCameraPermission()

        // Update stats every 500ms
        const interval = setInterval(() => {
            try {
                const currentStats = moji.getStats()
                setStats(currentStats)
            } catch (error) {
                console.error("Failed to get stats:", error)
            }
        }, 500)

        return () => clearInterval(interval)
    }, [isFocused])


    const frameProcessor = useFrameProcessor((frame) => {
    'worklet'

    runAtTargetFps(10, () => {
        'worklet'
        if (frame.pixelFormat === 'rgb') {

            const buffer = frame.toArrayBuffer()
            // Send Data to Server through Native Language
            try {
                moji.sendFrame(buffer, 'http://192.168.0.69:8000/')
            } catch (error) {
                console.error("Failed to send frame:", error)
            }
        }
    })
    }, [])

    // Status indicator color based on success rate
    const getStatusColor = () => {
        if (stats.totalSent === 0) return '#888888' // Gray - not started
        if (stats.successRate >= 90) return '#4CAF50' // Green - good
        if (stats.successRate >= 70) return '#FFC107' // Yellow - warning
        return '#F44336' // Red - error
    }

    const getStatusText = () => {
        if (stats.totalSent === 0) return 'Waiting...'
        if (stats.successRate >= 90) return 'Connected'
        if (stats.successRate >= 70) return 'Unstable'
        return 'Error'
    }

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

            <View style={styles.statsContainer} >
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
                <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>

            <View style={styles.detailsContainer} >
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Sent:</Text>
                    <Text style={styles.statValue}>{stats.totalSent}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Success:</Text>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.successCount}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Failed:</Text>
                    <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.failureCount}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Success Rate:</Text>
                    <Text style={styles.statValue}>{stats.successRate.toFixed(1)}%</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Response Time:</Text>
                    <Text style={styles.statValue}>{stats.lastResponseTimeMs}ms</Text>
                </View>
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
        flex: 5,
        backgroundColor : 'black',
        overflow : 'hidden',
    },

    statsContainer: {
        flex: 0.5,
        backgroundColor: '#1a1a1a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },

    statusIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 10,
    },

    statusText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },

    detailsContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },

    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 4,
    },

    statLabel: {
        color: '#888',
        fontSize: 14,
    },

    statValue: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
})
