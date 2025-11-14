import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const STORAGE_KEYS = {
  SERVER_URL: 'server_url',
  FPS: 'fps',
  BATTERY_SAVER: 'battery_saver',
  AUTO_PAUSE: 'auto_pause_background',
  VIBRATION: 'vibration_enabled',
  STATS_VISIBLE: 'stats_visible',
  AUTO_RECONNECT: 'auto_reconnect',
  NOTIFICATION: 'notification_enabled',
};

export function SettingsScreen() {
  const [serverUrl, setServerUrl] = useState(
    storage.getString(STORAGE_KEYS.SERVER_URL) || 'http://192.168.0.100:8000'
  );
  const [fps, setFps] = useState(storage.getNumber(STORAGE_KEYS.FPS) || 10);
  const [batterySaver, setBatterySaver] = useState(
    storage.getBoolean(STORAGE_KEYS.BATTERY_SAVER) || false
  );
  const [autoPause, setAutoPause] = useState(
    storage.getBoolean(STORAGE_KEYS.AUTO_PAUSE) ?? true
  );
  const [vibration, setVibration] = useState(
    storage.getBoolean(STORAGE_KEYS.VIBRATION) ?? true
  );
  const [statsVisible, setStatsVisible] = useState(
    storage.getBoolean(STORAGE_KEYS.STATS_VISIBLE) ?? true
  );
  const [autoReconnect, setAutoReconnect] = useState(
    storage.getBoolean(STORAGE_KEYS.AUTO_RECONNECT) ?? true
  );
  const [notification, setNotification] = useState(
    storage.getBoolean(STORAGE_KEYS.NOTIFICATION) ?? true
  );

  const handleSaveServerUrl = () => {
    storage.set(STORAGE_KEYS.SERVER_URL, serverUrl);
    Alert.alert('저장 완료', '서버 URL이 저장되었습니다.');
  };

  const handleFpsChange = (newFps: number) => {
    setFps(newFps);
    storage.set(STORAGE_KEYS.FPS, newFps);
  };

  const handleToggle = (key: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    storage.set(key, value);
  };

  const handleResetSettings = () => {
    Alert.alert(
      '설정 초기화',
      '모든 설정을 초기값으로 되돌리시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => {
            storage.clearAll();
            setServerUrl('http://192.168.0.100:8000');
            setFps(10);
            setBatterySaver(false);
            setAutoPause(true);
            setVibration(true);
            setStatsVisible(true);
            setAutoReconnect(true);
            setNotification(true);
            Alert.alert('초기화 완료', '모든 설정이 초기화되었습니다.');
          },
        },
      ]
    );
  };

  const fpsOptions = [1, 5, 10, 15, 20, 30];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
        <Text style={styles.subtitle}>앱 설정 및 환경 구성</Text>
      </View>

      {/* Connection Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>연결 설정</Text>

        <View style={styles.card}>
          <Text style={styles.label}>서버 URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.0.100:8000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveServerUrl}>
            <Text style={styles.buttonText}>저장</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>자동 재연결</Text>
            <Text style={styles.settingDescription}>
              연결이 끊어지면 자동으로 재연결 시도
            </Text>
          </View>
          <Switch
            value={autoReconnect}
            onValueChange={(value) =>
              handleToggle(STORAGE_KEYS.AUTO_RECONNECT, value, setAutoReconnect)
            }
          />
        </View>
      </View>

      {/* Performance Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>성능 설정</Text>

        <View style={styles.card}>
          <Text style={styles.label}>FPS (초당 프레임)</Text>
          <View style={styles.fpsSelector}>
            {fpsOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.fpsOption,
                  fps === option && styles.fpsOptionActive,
                ]}
                onPress={() => handleFpsChange(option)}>
                <Text
                  style={[
                    styles.fpsOptionText,
                    fps === option && styles.fpsOptionTextActive,
                  ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {batterySaver && (
            <Text style={styles.warningText}>
              ⚠️ 배터리 세이버 모드 활성화 시 최대 5 FPS로 제한됩니다
            </Text>
          )}
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>배터리 세이버 모드</Text>
            <Text style={styles.settingDescription}>
              FPS를 5로 제한하여 배터리 소모 감소
            </Text>
          </View>
          <Switch
            value={batterySaver}
            onValueChange={(value) =>
              handleToggle(STORAGE_KEYS.BATTERY_SAVER, value, setBatterySaver)
            }
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>백그라운드 자동 일시정지</Text>
            <Text style={styles.settingDescription}>
              앱이 백그라운드로 전환되면 전송 일시정지
            </Text>
          </View>
          <Switch
            value={autoPause}
            onValueChange={(value) =>
              handleToggle(STORAGE_KEYS.AUTO_PAUSE, value, setAutoPause)
            }
          />
        </View>
      </View>

      {/* UI Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>화면 설정</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>통계 정보 표시</Text>
            <Text style={styles.settingDescription}>
              모니터 화면에서 실시간 통계 표시
            </Text>
          </View>
          <Switch
            value={statsVisible}
            onValueChange={(value) =>
              handleToggle(STORAGE_KEYS.STATS_VISIBLE, value, setStatsVisible)
            }
          />
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림 설정</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>알림 사용</Text>
            <Text style={styles.settingDescription}>
              연결 상태 변경 시 알림 표시
            </Text>
          </View>
          <Switch
            value={notification}
            onValueChange={(value) =>
              handleToggle(STORAGE_KEYS.NOTIFICATION, value, setNotification)
            }
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>진동 피드백</Text>
            <Text style={styles.settingDescription}>
              연결/연결 해제 시 진동으로 알림
            </Text>
          </View>
          <Switch
            value={vibration}
            onValueChange={(value) =>
              handleToggle(STORAGE_KEYS.VIBRATION, value, setVibration)
            }
          />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>버전</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>빌드</Text>
            <Text style={styles.infoValue}>2025.11.14</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>개발</Text>
            <Text style={styles.infoValue}>SomniAI Team</Text>
          </View>
        </View>
      </View>

      {/* Reset Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetSettings}>
          <Text style={styles.resetButtonText}>설정 초기화</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fpsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  fpsOption: {
    flex: 1,
    minWidth: 50,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  fpsOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  fpsOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  fpsOptionTextActive: {
    color: '#fff',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F44336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
