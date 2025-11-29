/**
 * Settings Page
 * Application settings and configuration
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Settings as SettingsIcon, Globe, Video, Radio } from 'lucide-react';

export default function SettingsPage() {
  const [serverUrl, setServerUrl] = useState('http://192.168.0.100:8000');
  const [mqttHost, setMqttHost] = useState('localhost');
  const [mqttPort, setMqttPort] = useState(9001);
  const [fps, setFps] = useState(10);
  const [autoReconnect, setAutoReconnect] = useState(true);

  const handleSave = () => {
    localStorage.setItem('settings', JSON.stringify({
      serverUrl,
      mqttHost,
      mqttPort,
      fps,
      autoReconnect,
    }));
    alert('설정이 저장되었습니다');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600">앱 설정 및 환경 구성</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Server Settings */}
          <Card elevated>
            <CardHeader
              title="서버 설정"
              subtitle="프레임 전송 서버 구성"
              icon={<Globe className="w-6 h-6 text-blue-600" />}
            />
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">서버 URL</label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="http://192.168.0.100:8000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MQTT Settings */}
          <Card elevated>
            <CardHeader
              title="MQTT 설정"
              subtitle="브로커 연결 구성"
              icon={<Radio className="w-6 h-6 text-orange-600" />}
            />
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">호스트</label>
                    <input
                      type="text"
                      value={mqttHost}
                      onChange={(e) => setMqttHost(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">포트</label>
                    <input
                      type="number"
                      value={mqttPort}
                      onChange={(e) => setMqttPort(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={autoReconnect}
                    onChange={(e) => setAutoReconnect(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">자동 재연결</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Video Settings */}
          <Card elevated>
            <CardHeader
              title="비디오 설정"
              subtitle="스트리밍 품질 구성"
              icon={<Video className="w-6 h-6 text-purple-600" />}
            />
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    FPS: {fps}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 FPS</span>
                    <span>30 FPS</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card elevated>
            <CardHeader
              title="앱 정보"
              icon={<SettingsIcon className="w-6 h-6 text-gray-600" />}
            />
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">버전</span>
                  <Badge label="1.0.0" variant="info" size="sm" />
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">빌드</span>
                  <Badge label="2025.11.14" variant="default" size="sm" />
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">개발</span>
                  <span className="text-sm font-semibold text-gray-900">SomniAI Team</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} variant="primary" size="lg" fullWidth>
            💾 설정 저장
          </Button>
        </div>
      </main>
    </div>
  );
}
