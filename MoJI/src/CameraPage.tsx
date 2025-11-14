import React, {useEffect, useRef, useState } from 'react'
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, Switch, Vibration, AppState, ScrollView, Alert } from 'react-native'
import { Camera, runAtTargetFps, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera'
import { useIsFocused } from '@react-navigation/core'
import { NativeModules, Platform } from 'react-native'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV()

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

const STORAGE_KEYS = {
  SERVER_URL: 'server_url',
  FPS: 'fps',
  RECENT_URLS: 'recent_urls',
  FAVORITE_URLS: 'favorite_urls',
  BATTERY_SAVER: 'battery_saver',
  AUTO_PAUSE: 'auto_pause',
}

export function CameraPage(): React.ReactElement {

    const device = useCameraDevice('back')
    const camera = useRef<Camera>(null)
    const isFocused = useIsFocused()

    // Load saved settings
    const [serverUrl, setServerUrl] = useState(storage.getString(STORAGE_KEYS.SERVER_URL) || 'http://192.168.0.69:8000/')
    const [tempUrl, setTempUrl] = useState(serverUrl)
    const [fps, setFps] = useState(storage.getNumber(STORAGE_KEYS.FPS) || 10)
    const [tempFps, setTempFps] = useState(fps)

    const [showSettings, setShowSettings] = useState(false)
    const [isTransmitting, setIsTransmitting] = useState(true)
    const [batterySaver, setBatterySaver] = useState(storage.getBoolean(STORAGE_KEYS.BATTERY_SAVER) || false)
    const [autoPause, setAutoPause] = useState(storage.getBoolean(STORAGE_KEYS.AUTO_PAUSE) || true)
    const [statsExpanded, setStatsExpanded] = useState(true)

    const [recentUrls, setRecentUrls] = useState<string[]>(
        JSON.parse(storage.getString(STORAGE_KEYS.RECENT_URLS) || '[]')
    )
    const [favoriteUrls, setFavoriteUrls] = useState<string[]>(
        JSON.parse(storage.getString(STORAGE_KEYS.FAVORITE_URLS) || '[]')
    )

    const [stats, setStats] = useState<TransmissionStats>({
        totalSent: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        lastResponseTimeMs: 0
    })

    const [totalDataSent, setTotalDataSent] = useState(0) // in bytes
    const [lastConnectionState, setLastConnectionState] = useState(true)
    const framesSentRef = useRef(0)

    // Camera permission
    useEffect(() => {
        Camera.requestCameraPermission()
    }, [])

    // Stats update
    useEffect(() => {
        if (!isFocused) return

        const interval = setInterval(() => {
            try {
                const currentStats = moji.getStats()
                setStats(currentStats)

                // Calculate data sent (approximate: RGB frame = width * height * 3 bytes)
                // Assuming 640x480 = 921,600 bytes per frame
                const frameSize = 640 * 480 * 3
                setTotalDataSent(currentStats.successCount * frameSize)

                // Connection state change notification
                const isConnected = currentStats.successRate >= 70
                if (lastConnectionState !== isConnected) {
                    if (!isConnected && currentStats.totalSent > 0) {
                        Vibration.vibrate(200)
                    } else if (isConnected && currentStats.totalSent > 5) {
                        Vibration.vibrate([0, 100, 100, 100])
                    }
                    setLastConnectionState(isConnected)
                }
            } catch (error) {
                console.error("Failed to get stats:", error)
            }
        }, 500)

        return () => clearInterval(interval)
    }, [isFocused, lastConnectionState])

    // Auto-pause when app goes to background
    useEffect(() => {
        if (!autoPause) return

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'background') {
                setIsTransmitting(false)
            } else if (nextAppState === 'active') {
                setIsTransmitting(true)
            }
        })

        return () => subscription.remove()
    }, [autoPause])

    // Apply battery saver FPS
    const effectiveFps = batterySaver ? Math.min(fps, 5) : fps

    const frameProcessor = useFrameProcessor((frame) => {
    'worklet'

    if (!isTransmitting) return

    runAtTargetFps(effectiveFps, () => {
        'worklet'
        if (frame.pixelFormat === 'rgb') {
            const buffer = frame.toArrayBuffer()
            try {
                moji.sendFrame(buffer, serverUrl)
            } catch (error) {
                console.error("Failed to send frame:", error)
            }
        }
    })
    }, [serverUrl, isTransmitting, effectiveFps])

    const handleSaveUrl = () => {
        let url = tempUrl.trim()

        if (!url) {
            Alert.alert('Error', 'Please enter a server URL')
            return
        }

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
        storage.set(STORAGE_KEYS.SERVER_URL, url)

        // Add to recent URLs
        const updated = [url, ...recentUrls.filter(u => u !== url)].slice(0, 5)
        setRecentUrls(updated)
        storage.set(STORAGE_KEYS.RECENT_URLS, JSON.stringify(updated))

        // Save FPS
        setFps(tempFps)
        storage.set(STORAGE_KEYS.FPS, tempFps)

        setShowSettings(false)
        moji.resetStats()
        setTotalDataSent(0)

        console.log('Settings saved:', { url, fps: tempFps })
    }

    const toggleFavorite = (url: string) => {
        const isFavorite = favoriteUrls.includes(url)
        const updated = isFavorite
            ? favoriteUrls.filter(u => u !== url)
            : [...favoriteUrls, url]

        setFavoriteUrls(updated)
        storage.set(STORAGE_KEYS.FAVORITE_URLS, JSON.stringify(updated))
    }

    const selectUrl = (url: string) => {
        setTempUrl(url)
    }

    const toggleBatterySaver = () => {
        const newValue = !batterySaver
        setBatterySaver(newValue)
        storage.set(STORAGE_KEYS.BATTERY_SAVER, newValue)
    }

    const toggleAutoPause = () => {
        const newValue = !autoPause
        setAutoPause(newValue)
        storage.set(STORAGE_KEYS.AUTO_PAUSE, newValue)
    }

    const getStatusColor = () => {
        if (!isTransmitting) return '#FF9800' // Orange - paused
        if (stats.totalSent === 0) return '#888888' // Gray - not started
        if (stats.successRate >= 90) return '#4CAF50' // Green - good
        if (stats.successRate >= 70) return '#FFC107' // Yellow - warning
        return '#F44336' // Red - error
    }

    const getStatusText = () => {
        if (!isTransmitting) return 'Paused'
        if (stats.totalSent === 0) return 'Waiting...'
        if (stats.successRate >= 90) return 'Connected'
        if (stats.successRate >= 70) return 'Unstable'
        return 'Error'
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
    }

    const formatFps = (value: number) => {
        const fpsValues = [1, 5, 10, 15, 20, 30]
        const closest = fpsValues.reduce((prev, curr) =>
            Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
        )
        return closest
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
                        isActive={isFocused && isTransmitting}
                        photo={true}
                        audio={false}
                        frameProcessor={frameProcessor}
                    />
                )}

                {/* Top Controls */}
                <View style={styles.topControls}>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => setIsTransmitting(!isTransmitting)}
                    >
                        <Text style={styles.controlButtonText}>
                            {isTransmitting ? '⏸️' : '▶️'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.topInfo}>
                        <Text style={styles.fpsText}>{effectiveFps} FPS</Text>
                        {batterySaver && <Text style={styles.batterySaverText}>🔋</Text>}
                    </View>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => {
                            setTempUrl(serverUrl)
                            setTempFps(fps)
                            setShowSettings(true)
                        }}
                    >
                        <Text style={styles.controlButtonText}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Status Bar */}
            <View style={styles.statsContainer} >
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
                <Text style={styles.statusText}>{getStatusText()}</Text>
                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setStatsExpanded(!statsExpanded)}
                >
                    <Text style={styles.expandButtonText}>
                        {statsExpanded ? '▼' : '▲'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Expandable Stats Details */}
            {statsExpanded && (
                <View style={styles.detailsContainer} >
                    <ScrollView>
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
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Data Sent:</Text>
                            <Text style={styles.statValue}>{formatBytes(totalDataSent)}</Text>
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Settings Modal */}
            <Modal
                visible={showSettings}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>Settings</Text>

                            {/* Server URL */}
                            <Text style={styles.sectionTitle}>Server URL</Text>
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

                            {/* Favorite URLs */}
                            {favoriteUrls.length > 0 && (
                                <View style={styles.urlSection}>
                                    <Text style={styles.inputLabel}>Favorites</Text>
                                    {favoriteUrls.map((url, idx) => (
                                        <View key={idx} style={styles.urlItem}>
                                            <TouchableOpacity
                                                style={styles.urlButton}
                                                onPress={() => selectUrl(url)}
                                            >
                                                <Text style={styles.urlText} numberOfLines={1}>{url}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => toggleFavorite(url)}>
                                                <Text style={styles.starButton}>⭐</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Recent URLs */}
                            {recentUrls.length > 0 && (
                                <View style={styles.urlSection}>
                                    <Text style={styles.inputLabel}>Recent</Text>
                                    {recentUrls.map((url, idx) => (
                                        <View key={idx} style={styles.urlItem}>
                                            <TouchableOpacity
                                                style={styles.urlButton}
                                                onPress={() => selectUrl(url)}
                                            >
                                                <Text style={styles.urlText} numberOfLines={1}>{url}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => toggleFavorite(url)}>
                                                <Text style={styles.starButton}>
                                                    {favoriteUrls.includes(url) ? '⭐' : '☆'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* FPS Setting */}
                            <Text style={styles.sectionTitle}>Frame Rate: {formatFps(tempFps)} FPS</Text>
                            <View style={styles.sliderContainer}>
                                <Text style={styles.sliderLabel}>1</Text>
                                <View style={styles.fpsButtons}>
                                    {[1, 5, 10, 15, 20, 30].map(value => (
                                        <TouchableOpacity
                                            key={value}
                                            style={[
                                                styles.fpsButton,
                                                tempFps === value && styles.fpsButtonActive
                                            ]}
                                            onPress={() => setTempFps(value)}
                                        >
                                            <Text style={[
                                                styles.fpsButtonText,
                                                tempFps === value && styles.fpsButtonTextActive
                                            ]}>{value}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.sliderLabel}>30</Text>
                            </View>

                            {/* Battery Saver */}
                            <View style={styles.switchRow}>
                                <View>
                                    <Text style={styles.switchLabel}>Battery Saver Mode</Text>
                                    <Text style={styles.switchHint}>Limits FPS to 5 to save battery</Text>
                                </View>
                                <Switch
                                    value={batterySaver}
                                    onValueChange={toggleBatterySaver}
                                    trackColor={{ false: '#767577', true: '#4CAF50' }}
                                />
                            </View>

                            {/* Auto Pause */}
                            <View style={styles.switchRow}>
                                <View>
                                    <Text style={styles.switchLabel}>Auto Pause</Text>
                                    <Text style={styles.switchHint}>Pause when app goes to background</Text>
                                </View>
                                <Switch
                                    value={autoPause}
                                    onValueChange={toggleAutoPause}
                                    trackColor={{ false: '#767577', true: '#4CAF50' }}
                                />
                            </View>

                            {/* Buttons */}
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
                        </ScrollView>
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
        flex: 6,
        backgroundColor : 'black',
        overflow : 'hidden',
    },

    topControls: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },

    controlButtonText: {
        fontSize: 24,
    },

    topInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },

    fpsText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },

    batterySaverText: {
        fontSize: 16,
    },

    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: '#1a1a1a',
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
        flex: 1,
    },

    expandButton: {
        padding: 8,
    },

    expandButtonText: {
        color: '#888',
        fontSize: 16,
    },

    detailsContainer: {
        maxHeight: 180,
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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        padding: 20,
    },

    modalContent: {
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        padding: 24,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: '#444',
    },

    modalTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 24,
        textAlign: 'center',
    },

    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 12,
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

    urlSection: {
        marginTop: 12,
        marginBottom: 8,
    },

    urlItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },

    urlButton: {
        flex: 1,
        padding: 12,
    },

    urlText: {
        color: '#ccc',
        fontSize: 14,
    },

    starButton: {
        padding: 12,
        fontSize: 20,
    },

    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },

    sliderLabel: {
        color: '#888',
        fontSize: 14,
    },

    fpsButtons: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
    },

    fpsButton: {
        flex: 1,
        padding: 8,
        backgroundColor: '#1a1a1a',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#444',
        alignItems: 'center',
    },

    fpsButtonActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },

    fpsButtonText: {
        color: '#888',
        fontSize: 12,
        fontWeight: 'bold',
    },

    fpsButtonTextActive: {
        color: 'white',
    },

    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },

    switchLabel: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },

    switchHint: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
    },

    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },

    button: {
        flex: 1,
        padding: 16,
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
