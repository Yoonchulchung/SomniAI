/**
 * MQTT Control Page
 * MQTT Publish/Subscribe control panel
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMQTT } from '@/hooks/useMQTT';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Radio, Send, Inbox, MessageSquare } from 'lucide-react';

export default function MQTTPage() {
  const mqtt = useMQTT();
  const [activeTab, setActiveTab] = useState<'connection' | 'publish' | 'subscribe' | 'messages'>('connection');

  // Connection form
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(9001);
  const [clientId, setClientId] = useState(`somni_web_${Math.random().toString(16).substr(2, 8)}`);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Publish form
  const [pubTopic, setPubTopic] = useState('test/topic');
  const [pubMessage, setPubMessage] = useState('Hello from SomniAI!');
  const [pubQos, setPubQos] = useState<0 | 1 | 2>(0);
  const [pubRetained, setPubRetained] = useState(false);

  // Subscribe form
  const [subTopic, setSubTopic] = useState('test/#');
  const [subQos, setSubQos] = useState<0 | 1 | 2>(0);

  const handleConnect = async () => {
    try {
      await mqtt.connect({
        host,
        port,
        clientId,
        username,
        password,
        protocol: 'ws',
      });
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handlePublish = async () => {
    try {
      await mqtt.publish(pubTopic, pubMessage, { qos: pubQos, retained: pubRetained });
      alert('메시지가 발행되었습니다');
    } catch (error) {
      console.error('Publish failed:', error);
    }
  };

  const handleSubscribe = async () => {
    try {
      await mqtt.subscribe(subTopic, subQos);
      alert('토픽 구독이 완료되었습니다');
    } catch (error) {
      console.error('Subscribe failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MQTT Control</h1>
                <p className="text-sm text-gray-600">IoT 메시지 브로커 제어</p>
              </div>
            </div>
            <Badge
              label={mqtt.connectionState.toUpperCase()}
              variant={
                mqtt.connectionState === 'connected' ? 'success' :
                mqtt.connectionState === 'connecting' || mqtt.connectionState === 'reconnecting' ? 'warning' :
                mqtt.connectionState === 'error' ? 'error' : 'default'
              }
              dot={mqtt.connectionState === 'connected'}
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {[
              { id: 'connection', label: '연결', icon: Radio },
              { id: 'publish', label: '발행', icon: Send },
              { id: 'subscribe', label: '구독', icon: Inbox },
              { id: 'messages', label: '메시지', icon: MessageSquare },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'messages' && mqtt.messages.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                    {mqtt.messages.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'connection' && (
          <Card elevated>
            <CardHeader title="MQTT 브로커 연결" icon={<Radio className="w-6 h-6 text-blue-600" />} />
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">호스트</label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">포트</label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="9001"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Username (선택)</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password (선택)</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {!mqtt.isConnected ? (
                  <Button onClick={handleConnect} variant="success" fullWidth>
                    연결
                  </Button>
                ) : (
                  <Button onClick={() => mqtt.disconnect()} variant="danger" fullWidth>
                    연결 해제
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'publish' && (
          <Card elevated>
            <CardHeader title="메시지 발행" icon={<Send className="w-6 h-6 text-green-600" />} />
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">토픽</label>
                  <input
                    type="text"
                    value={pubTopic}
                    onChange={(e) => setPubTopic(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="test/topic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">메시지</label>
                  <textarea
                    value={pubMessage}
                    onChange={(e) => setPubMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="메시지 내용"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">QoS</label>
                    <select
                      value={pubQos}
                      onChange={(e) => setPubQos(Number(e.target.value) as 0 | 1 | 2)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>0 - At most once</option>
                      <option value={1}>1 - At least once</option>
                      <option value={2}>2 - Exactly once</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pubRetained}
                        onChange={(e) => setPubRetained(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-semibold text-gray-700">Retained</span>
                    </label>
                  </div>
                </div>
                <Button onClick={handlePublish} variant="primary" fullWidth disabled={!mqtt.isConnected}>
                  <Send className="w-5 h-5" />
                  발행
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'subscribe' && (
          <Card elevated>
            <CardHeader title="토픽 구독" icon={<Inbox className="w-6 h-6 text-purple-600" />} />
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">토픽 (와일드카드 지원)</label>
                  <input
                    type="text"
                    value={subTopic}
                    onChange={(e) => setSubTopic(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="test/# 또는 test/+"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    # = 다중 레벨 와일드카드, + = 단일 레벨 와일드카드
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">QoS</label>
                  <select
                    value={subQos}
                    onChange={(e) => setSubQos(Number(e.target.value) as 0 | 1 | 2)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>0 - At most once</option>
                    <option value={1}>1 - At least once</option>
                    <option value={2}>2 - Exactly once</option>
                  </select>
                </div>
                <Button onClick={handleSubscribe} variant="primary" fullWidth disabled={!mqtt.isConnected}>
                  <Inbox className="w-5 h-5" />
                  구독
                </Button>

                {/* Current Subscriptions */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">구독 중인 토픽</h3>
                  <div className="space-y-2">
                    {mqtt.getSubscriptions().map((topic) => (
                      <div key={topic} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="font-mono text-sm text-purple-900">{topic}</span>
                        <Button
                          onClick={() => mqtt.unsubscribe(topic)}
                          variant="danger"
                          size="sm"
                        >
                          구독 해제
                        </Button>
                      </div>
                    ))}
                    {mqtt.getSubscriptions().length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">구독 중인 토픽이 없습니다</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'messages' && (
          <Card elevated>
            <CardHeader
              title="수신 메시지"
              subtitle={`${mqtt.messages.length}개의 메시지`}
              icon={<MessageSquare className="w-6 h-6 text-blue-600" />}
            />
            <CardContent>
              {mqtt.messages.length > 0 && (
                <div className="mb-4">
                  <Button onClick={() => mqtt.clearMessages()} variant="danger" size="sm">
                    전체 삭제
                  </Button>
                </div>
              )}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {mqtt.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">수신된 메시지가 없습니다</p>
                  </div>
                ) : (
                  mqtt.messages.map((msg, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-mono text-sm font-semibold text-blue-600">{msg.topic}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString('ko-KR')}
                        </span>
                      </div>
                      <div className="font-mono text-sm bg-white border border-gray-200 rounded p-3 mb-2">
                        {msg.payload}
                      </div>
                      <div className="flex gap-2">
                        <Badge label={`QoS ${msg.qos}`} size="sm" />
                        {msg.retained && <Badge label="Retained" variant="warning" size="sm" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
