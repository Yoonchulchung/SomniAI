/**
 * Dashboard Page
 * System overview and statistics
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity, TrendingUp, Zap, Users, Server, Terminal } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'connected' | 'disconnected';
  timestamp: number;
  error: string | null;
}

interface ServiceLog {
  timestamp: number;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
}

export default function DashboardPage() {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Add log entry
  const addLog = (level: ServiceLog['level'], message: string) => {
    const log: ServiceLog = {
      timestamp: Date.now(),
      level,
      message,
    };
    setServiceLogs((prev) => [...prev, log].slice(-100)); // Keep last 100 logs
  };

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      const response = await fetch('/api/health', {
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

  // Check services status
  const checkServicesStatus = async () => {
    try {
      addLog('info', '서비스 상태 확인 시작...');
      const response = await fetch('/api/system/services', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const newServices = data.data.services as ServiceStatus[];
          setServices(newServices);

          // Log each service status
          newServices.forEach(service => {
            if (service.status === 'connected') {
              addLog('success', `${service.name}: 연결됨`);
            } else {
              addLog('error', `${service.name}: 연결 끊김${service.error ? ` (${service.error})` : ''}`);
            }
          });
        } else {
          addLog('error', '서비스 상태 확인 실패');
        }
      } else {
        addLog('error', `서비스 상태 API 오류: ${response.status}`);
      }
    } catch (error) {
      console.error('Services status check failed:', error);
      addLog('error', '서비스 상태 확인 실패: 네트워크 오류');
    }
  };

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serviceLogs]);

  // Check on mount and every 10 seconds
  useEffect(() => {
    checkBackendConnection();
    checkServicesStatus();
    const backendInterval = setInterval(checkBackendConnection, 10000);
    const servicesInterval = setInterval(checkServicesStatus, 10000);
    return () => {
      clearInterval(backendInterval);
      clearInterval(servicesInterval);
    };
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

        {/* Services Connection Logs - Full Width */}
        <Card elevated>
          <CardHeader
            title="서비스 연결 로그"
            subtitle={`${serviceLogs.length}개의 로그 항목`}
            icon={<Terminal className="w-6 h-6 text-purple-600" />}
          />
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs">
              {serviceLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">서비스 연결 로그가 없습니다</p>
                  <p className="text-xs mt-1">서비스 상태를 확인하면 로그가 표시됩니다</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {serviceLogs.map((log, index) => {
                    const levelColors = {
                      info: 'text-blue-400',
                      success: 'text-green-400',
                      warn: 'text-yellow-400',
                      error: 'text-red-400',
                    };

                    const levelIcons = {
                      info: 'ℹ',
                      success: '✓',
                      warn: '⚠',
                      error: '✗',
                    };

                    return (
                      <div key={index} className="flex gap-2 items-start py-0.5">
                        <span className="text-gray-500 whitespace-nowrap text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString('ko-KR', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className={`${levelColors[log.level]} font-bold`}>
                          {levelIcons[log.level]}
                        </span>
                        <div className="flex-1">
                          <span className="text-gray-200">{log.message}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
