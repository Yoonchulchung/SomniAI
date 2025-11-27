import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { useTheme } from '../context/ThemeContext';
import { Card, CardHeader, CardSection } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { UrlSetting } from '../components/setting/UrlSetting';
import mqtt from 'mqtt';
import { useAppContext, useSettings } from '../context/AppContext';
const storage = new MMKV();

const STORAGE_KEYS = {
  AI_SERVER_URL: 'server_url',
  PUBLIC_SERVER_URL: 'server_url',
  MQTT_SERVER_URL: 'server_url',
  FPS: 'fps',
  BATTERY_SAVER: 'battery_saver',
  AUTO_PAUSE: 'auto_pause_background',
  VIBRATION: 'vibration_enabled',
  STATS_VISIBLE: 'stats_visible',
  AUTO_RECONNECT: 'auto_reconnect',
  NOTIFICATION: 'notification_enabled',
};

export function SettingsScreen() {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { config, isDirty } = useSettings();
  const { actions } = useAppContext();

  const [aiServerUrlTmp, setAiServerUrlTmp] = useState(config.aiServerUrl);
  const [publicServerUrlTmp, setPublicServerUrlTmp] = useState(config.publicServerUrl);
  const [mqttServerUrlTmp, setMqttServerUrlTmp] = useState(config.mqttServerUrl);

  useEffect(() => {
      setAiServerUrlTmp(config.aiServerUrl);
      setPublicServerUrlTmp(config.publicServerUrl);
      setMqttServerUrlTmp(config.mqttServerUrl);
  }, [config.aiServerUrl, config.publicServerUrl, config.mqttServerUrl]);
    
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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSaveAiServerUrl = () => {
    actions.updateConfig({ aiServerUrl: aiServerUrlTmp });
    Alert.alert('저장 완료', 'AI 서버 URL이 저장되었습니다.');
  };
  const handleSavePublicServerUrl = () => {
    actions.updateConfig({ publicServerUrl: publicServerUrlTmp });
    Alert.alert('저장 완료', 'Public 서버 URL이 저장되었습니다.');
  };
  const handleSaveMqttServerUrl = () => {
    actions.updateConfig({ mqttServerUrl: mqttServerUrlTmp });
    Alert.alert('저장 완료', 'MQTT 서버 URL이 저장되었습니다.');
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
            actions.resetState();
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

  const SettingItem: React.FC<{
    label: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon?: string;
  }> = ({ label, description, value, onValueChange, icon }) => (
    <View style={[styles.settingItem, { borderBottomColor: theme.colors.border.light }]}>
      <View style={styles.settingInfo}>
        {icon && <Text style={styles.settingIcon}>{icon}</Text>}
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
            {label}
          </Text>
          <Text style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.gray[300],
          true: theme.colors.primary[300],
        }}
        thumbColor={value ? theme.colors.primary[500] : theme.colors.gray[100]}
      />
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>설정</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            앱 설정 및 환경 구성
          </Text>
        </View>

        {/* Connection Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            연결 설정
          </Text>

          <UrlSetting
            serverUrl = {aiServerUrlTmp}
            title = "AI Server URL"
            setServerUrl = {setAiServerUrlTmp}
            onSave = {handleSaveAiServerUrl}
          />

          <UrlSetting
            serverUrl = {publicServerUrlTmp}
            title = "Public Server URL"
            setServerUrl = {setPublicServerUrlTmp}
            onSave = {handleSavePublicServerUrl}
          />

          <UrlSetting
            serverUrl = {mqttServerUrlTmp}
            title = "MQTT Server URL"
            setServerUrl = {setMqttServerUrlTmp}
            onSave = {handleSaveMqttServerUrl}
          />
          

          <Card>
            <SettingItem
              icon="🔄"
              label="자동 재연결"
              description="연결이 끊어지면 자동으로 재연결 시도"
              value={autoReconnect}
              onValueChange={(value) =>
                handleToggle(STORAGE_KEYS.AUTO_RECONNECT, value, setAutoReconnect)
              }
            />
          </Card>
        </View>

        {/* Performance Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            성능 설정
          </Text>

          <Card style={{ marginBottom: theme.spacing.md }}>
            <CardHeader title="FPS (초당 프레임)" icon="🎬" />
            <CardSection>
              <View style={styles.fpsSelector}>
                {fpsOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.fpsOption,
                      {
                        borderColor: theme.colors.border.default,
                        backgroundColor:
                          fps === option
                            ? theme.colors.primary[500]
                            : theme.colors.background.secondary,
                      },
                    ]}
                    onPress={() => handleFpsChange(option)}>
                    <Text
                      style={[
                        styles.fpsOptionText,
                        {
                          color:
                            fps === option
                              ? theme.colors.text.inverse
                              : theme.colors.text.primary,
                        },
                      ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {batterySaver && (
                <View style={styles.warningContainer}>
                  <Badge label="배터리 세이버 활성화" variant="warning" size="sm" dot />
                  <Text style={[styles.warningText, { color: theme.colors.warning[700] }]}>
                    최대 5 FPS로 제한됩니다
                  </Text>
                </View>
              )}
            </CardSection>
          </Card>

          <Card style={{ marginBottom: theme.spacing.sm }}>
            <SettingItem
              icon="🔋"
              label="배터리 세이버 모드"
              description="FPS를 5로 제한하여 배터리 소모 감소"
              value={batterySaver}
              onValueChange={(value) =>
                handleToggle(STORAGE_KEYS.BATTERY_SAVER, value, setBatterySaver)
              }
            />
          </Card>

          <Card>
            <SettingItem
              icon="⏸️"
              label="백그라운드 자동 일시정지"
              description="앱이 백그라운드로 전환되면 전송 일시정지"
              value={autoPause}
              onValueChange={(value) =>
                handleToggle(STORAGE_KEYS.AUTO_PAUSE, value, setAutoPause)
              }
            />
          </Card>
        </View>

        {/* UI Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            화면 설정
          </Text>

          <Card>
            <SettingItem
              icon="📊"
              label="통계 정보 표시"
              description="모니터 화면에서 실시간 통계 표시"
              value={statsVisible}
              onValueChange={(value) =>
                handleToggle(STORAGE_KEYS.STATS_VISIBLE, value, setStatsVisible)
              }
            />
          </Card>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            알림 설정
          </Text>

          <Card style={{ marginBottom: theme.spacing.sm }}>
            <SettingItem
              icon="🔔"
              label="알림 사용"
              description="연결 상태 변경 시 알림 표시"
              value={notification}
              onValueChange={(value) =>
                handleToggle(STORAGE_KEYS.NOTIFICATION, value, setNotification)
              }
            />
          </Card>

          <Card>
            <SettingItem
              icon="📳"
              label="진동 피드백"
              description="연결/연결 해제 시 진동으로 알림"
              value={vibration}
              onValueChange={(value) =>
                handleToggle(STORAGE_KEYS.VIBRATION, value, setVibration)
              }
            />
          </Card>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            앱 정보
          </Text>

          <Card>
            <CardHeader title="MoJI" icon="📱" />
            <CardSection>
              <View style={[styles.infoRow, { borderBottomColor: theme.colors.border.light }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                  버전
                </Text>
                <Badge label="1.0.0" variant="info" size="sm" />
              </View>
              <View style={[styles.infoRow, { borderBottomColor: theme.colors.border.light }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                  빌드
                </Text>
                <Badge label="2025.11.14" variant="default" size="sm" />
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                  개발
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                  SomniAI Team
                </Text>
              </View>
            </CardSection>
          </Card>
        </View>

        {/* Reset Button */}
        <View style={styles.section}>
          <Button
            title="설정 초기화"
            onPress={handleResetSettings}
            variant="danger"
            size="lg"
            fullWidth
            icon="🔄"
          />
        </View>

        <View style={{ height: 40 }} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  section: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    fontWeight: '500',
  },
  fpsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  fpsOption: {
    flex: 1,
    minWidth: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fpsOptionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 12,
  },
  settingIcon: {
    fontSize: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});
