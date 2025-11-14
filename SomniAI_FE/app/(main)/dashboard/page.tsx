/**
 * Dashboard Page
 * System overview and statistics
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity, TrendingUp, Zap, Users, Server } from 'lucide-react';

export default function DashboardPage() {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
      setLastChecked(new Date());
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendStatus('disconnected');
      setLastChecked(new Date());
    }
  };

  // Check on mount and every 10 seconds
  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: '활성 스트림', value: '1', change: '+0%', icon: Activity, color: 'text-blue-600' },
    { label: 'MQTT 메시지', value: '247', change: '+12%', icon: Zap, color: 'text-green-600' },
    { label: '전송된 프레임', value: '1.2K', change: '+24%', icon: TrendingUp, color: 'text-purple-600' },
    { label: '연결 장치', value: '3', change: '+1', icon: Users, color: 'text-orange-600' },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">시스템 상태 및 통계 개요</p>
          </div>
          {/* Backend Status Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-700">백엔드 서버</div>
              {lastChecked && (
                <div className="text-xs text-gray-500">
                  마지막 확인: {lastChecked.toLocaleTimeString('ko-KR')}
                </div>
              )}
            </div>
            {backendStatus === 'checking' ? (
              <Badge label="확인 중..." variant="default" />
            ) : backendStatus === 'connected' ? (
              <Badge label="연결됨" variant="success" dot />
            ) : (
              <Badge label="연결 끊김" variant="error" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} elevated>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                  <Badge label={stat.change} variant="success" size="sm" />
                </div>
                <div className={`p-3 bg-gray-50 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card elevated>
            <CardHeader title="시스템 상태" icon={<Activity className="w-6 h-6 text-green-600" />} />
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: '웹캠', status: 'active', color: 'success' },
                  { name: 'MQTT 연결', status: 'disconnected', color: 'default' },
                  { name: '서버 통신', status: 'active', color: 'success' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <Badge
                      label={item.status.toUpperCase()}
                      variant={item.color as any}
                      dot={item.status === 'active'}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card elevated>
            <CardHeader title="최근 활동" icon={<TrendingUp className="w-6 h-6 text-blue-600" />} />
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: '방금 전', message: '웹캠 스트리밍 시작' },
                  { time: '5분 전', message: 'MQTT 메시지 수신: test/topic' },
                  { time: '12분 전', message: '프레임 전송: 247개' },
                ].map((activity, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
