import React, {useEffect, useRef, useState } from 'react'
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal } from 'react-native'
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

    const [serverUrl, setServerUrl] = useState('http://192.168.0.69:8000/')
    const [tempUrl, setTempUrl] = useState('http://192.168.0.69:8000/')
    const [showSettings, setShowSettings] = useState(false)

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
                moji.sendFrame(buffer, serverUrl)
            } catch (error) {
                console.error("Failed to send frame:", error)
            }
        }
    })
    }, [serverUrl])

    const handleSaveUrl = () => {
        let url = tempUrl.trim()

        // Add http:// if not present
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url
        }

        // Add trailing slash if not present
        if (!url.endsWith('/')) {
            url = url + '/'
        }

        setServerUrl(url)
        setTempUrl(url)
        setShowSettings(false)

        // Reset stats when changing URL
        moji.resetStats()

        console.log('Server URL updated to:', url)
    }

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

                {/* Settings Button Overlay */}
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => {
                        setTempUrl(serverUrl)
                        setShowSettings(true)
                    }}
                >
                    <Text style={styles.settingsButtonText}>⚙️</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer} >
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
                <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>

            <View style={styles.detailsContainer} >
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Server:</Text>
                    <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="middle">
                        {serverUrl}
                    </Text>
                </View>
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

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Server Settings</Text>

                        <Text style={styles.inputLabel}>Server URL:</Text>
                        <TextInput
                            style={styles.input}
                            value={tempUrl}
                            onChangeText={setTempUrl}
                            placeholder="http://192.168.0.69:8000/"
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                        />

                        <Text style={styles.helperText}>
                            Example: 192.168.0.69:8000 or http://server.com:8000/
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setShowSettings(false)}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={handleSaveUrl}
                            >
                                <Text style={styles.buttonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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

    settingsButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },

    settingsButtonText: {
        fontSize: 24,
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
        flex: 1.2,
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },

    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 3,
    },

    statLabel: {
        color: '#888',
        fontSize: 14,
        flex: 1,
    },

    statValue: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        flex: 2,
        textAlign: 'right',
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    modalContent: {
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#444',
    },

    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 20,
        textAlign: 'center',
    },

    inputLabel: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
    },

    input: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        color: 'white',
        fontSize: 16,
        marginBottom: 8,
    },

    helperText: {
        color: '#666',
        fontSize: 12,
        marginBottom: 24,
        fontStyle: 'italic',
    },

    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },

    button: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },

    cancelButton: {
        backgroundColor: '#444',
    },

    saveButton: {
        backgroundColor: '#4CAF50',
    },

    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
})
