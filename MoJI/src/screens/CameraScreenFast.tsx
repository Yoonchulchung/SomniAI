import React, {useEffect, useRef, useState, useCallback } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Modal, Switch, TextInput, ScrollView, Alert } from 'react-native'
import { 
  Camera, 
  useCameraDevice, 
  useCameraFormat, 
  useFrameProcessor,
  runAtTargetFps 
} from 'react-native-vision-camera'
import { useIsFocused } from '@react-navigation/core'
import { MMKV } from 'react-native-mmkv'
import { useSettings } from '../context/AppContext';
import { useResizePlugin } from 'vision-camera-resize-plugin';

const storage = new MMKV()

declare global {
  var __FastStream: () => {
    sendFrame: (buffer: ArrayBuffer, ip: string) => { queued: boolean; totalSent: number }
    getStats: () => any
    resetStats: () => any
  }
}
const moji = global.__FastStream()

const STORAGE_KEYS = {
  SERVER_URL: 'server_url',
  FPS: 'fps',
}

export function CameraScreenFast(): React.ReactElement {
  const device = useCameraDevice('back')
  const isFocused = useIsFocused()
  const { config } = useSettings();

  const format = useCameraFormat(device, [
    { videoResolution: { width: 640, height: 480 } },
    { fps: 5 }
  ])

  const [serverUrl, setServerUrl] = useState(config.aiServerUrl || storage.getString(STORAGE_KEYS.SERVER_URL) || '')
  const [fps, setFps] = useState(5)
  const [isTransmitting, setIsTransmitting] = useState(true)
  
  const [stats, setStats] = useState<any>({ totalSent: 0, successRate: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const [tempUrl, setTempUrl] = useState(serverUrl)
  const [tempFps, setTempFps] = useState(fps)

  useEffect(() => { Camera.requestCameraPermission() }, [])

  useEffect(() => {
    if (!isFocused) return
    const interval = setInterval(() => {
        const s = moji.getStats()
        setStats(s)
    }, 500)
    return () => clearInterval(interval)
  }, [isFocused])


  const { resize } = useResizePlugin();

  //React -> JNI -> C++
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'

    if (!isTransmitting) return

    runAtTargetFps(fps, () => {
      
      const resized = resize(frame, {
        scale: {
          width: 640,
          height: 480,
        },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      })
      const buffer = resized.buffer

      if (serverUrl && buffer.byteLength > 0) {
          moji.sendFrame(buffer, serverUrl)
      }
    })
  }, [isTransmitting, fps, serverUrl, resize])


  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        {device != null && (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            format={format}
            
            frameProcessor={frameProcessor} 
            pixelFormat="yuv"
            isActive={isFocused}
            androidPreviewViewType="texture-view"
          />
        )}

        <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => setIsTransmitting(!isTransmitting)}>
                <Text style={styles.controlButtonText}>{isTransmitting ? '⏸️' : '▶️'}</Text>
            </TouchableOpacity>
            <View style={styles.topInfo}>
                <Text style={styles.fpsText}>{fps} FPS</Text>
            </View>
            <TouchableOpacity style={styles.controlButton} onPress={() => setShowSettings(true)}>
                <Text style={styles.controlButtonText}>⚙️</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
         <Text style={styles.statusText}>
            Sent: {stats.totalSent} | Success: {stats.successRate}%
         </Text>
      </View>
      
      <Modal visible={showSettings} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Settings</Text>
                  <Text style={styles.inputLabel}>Server URL</Text>
                  <TextInput 
                    style={styles.input} 
                    value={tempUrl} 
                    onChangeText={setTempUrl} 
                    autoCapitalize="none"
                  />
                   <Text style={styles.inputLabel}>FPS: {tempFps}</Text>
                   {/* FPS 슬라이더 대용 버튼들 */}
                   <View style={{flexDirection:'row', gap:10, marginBottom:20}}>
                      {[5, 10, 20, 30].map(v => (
                          <TouchableOpacity key={v} onPress={()=>setTempFps(v)} style={[styles.fpsButton, tempFps===v && styles.fpsButtonActive]}>
                              <Text style={{color:'white'}}>{v}</Text>
                          </TouchableOpacity>
                      ))}
                   </View>

                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton]} 
                    onPress={() => {
                        setServerUrl(tempUrl)
                        setFps(tempFps)
                        storage.set(STORAGE_KEYS.FPS, tempFps)
                        storage.set(STORAGE_KEYS.SERVER_URL, tempUrl)
                        setShowSettings(false)
                    }}
                  >
                      <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    cameraContainer: { flex: 1 },
    topControls: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
    controlButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white' },
    controlButtonText: { fontSize: 24, color: 'white' },
    topInfo: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
    fpsText: { color: 'white', fontWeight: 'bold' },
    statsContainer: { padding: 20, backgroundColor: '#222', alignItems: 'center' },
    statusText: { color: 'white', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#333', padding: 20, borderRadius: 10 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    input: { backgroundColor: '#444', color: 'white', padding: 10, borderRadius: 5, marginBottom: 20 },
    inputLabel: { color: '#aaa', marginBottom: 5 },
    button: { padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 10 },
    saveButton: { backgroundColor: '#4CAF50' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    fpsButton: { padding: 10, borderWidth:1, borderColor:'#666', borderRadius:5 },
    fpsButtonActive: { backgroundColor: '#666' }
})