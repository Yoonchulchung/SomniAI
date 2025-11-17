/**
 * Analytics Page
 * Data visualization and analytics
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, BarChart3, TrendingUp, Clock, Zap, Server, Activity, Cpu, HardDrive } from 'lucide-react';

interface SystemHealth {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  system: {
    platform: string;
    arch: string;
    hostname: string;
    uptime: number;
    loadAverage: number[];
  };
  process: {
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    uptime: number;
    pid: number;
  };
}

export default function AnalyticsPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch system health data
  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/system/health');
      const data = await response.json();
      if (data.success) {
        setSystemHealth(data.data);
        setLastUpdate(new Date());
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      setIsLoading(false);
    }
  };

  // Initial fetch and set up interval
  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
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
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-600">데이터 분석 및 시각화</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                label={isLoading ? 'LOADING' : 'LIVE'}
                variant={isLoading ? 'default' : 'success'}
                dot={!isLoading}
              />
              <span className="text-xs text-gray-500">
                {lastUpdate.toLocaleTimeString('ko-KR')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card elevated>
            <CardHeader
              title="프레임 전송 통계"
              subtitle="지난 24시간"
              icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
            />
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-blue-400 mx-auto mb-3" />
                  <p className="text-gray-600">차트 영역</p>
                  <p className="text-sm text-gray-500 mt-1">데이터 수집 중...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card elevated>
            <CardHeader
              title="MQTT 메시지 트래픽"
              subtitle="실시간 데이터"
              icon={<TrendingUp className="w-6 h-6 text-green-600" />}
            />
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-600">차트 영역</p>
                  <p className="text-sm text-gray-500 mt-1">데이터 수집 중...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card elevated>
            <CardHeader
              title="응답 시간"
              subtitle="평균 지연 시간"
              icon={<Clock className="w-6 h-6 text-purple-600" />}
            />
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">평균</span>
                  <span className="text-2xl font-bold text-purple-600">24ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">최소</span>
                  <span className="text-lg font-semibold text-gray-900">12ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">최대</span>
                  <span className="text-lg font-semibold text-gray-900">87ms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card elevated>
            <CardHeader
              title="시스템 성능"
              subtitle={systemHealth ? '실시간 모니터링' : '연결 대기 중'}
              icon={<Zap className="w-6 h-6 text-orange-600" />}
            />
            <CardContent>
              {isLoading || !systemHealth ? (
                <div className="flex items-center justify-center h-40">
                  <Activity className="w-8 h-8 text-gray-400 animate-pulse" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* CPU Usage */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-gray-700">CPU</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {systemHealth.cpu.usage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, systemHealth.cpu.usage)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">{systemHealth.cpu.cores} cores</span>
                      <span className="text-xs text-gray-500">
                        Load: {systemHealth.system.loadAverage[0].toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-gray-700">Memory</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {systemHealth.memory.usagePercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${systemHealth.memory.usagePercent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {formatBytes(systemHealth.memory.used)}
                      </span>
                      <span className="text-xs text-gray-500">
                        / {formatBytes(systemHealth.memory.total)}
                      </span>
                    </div>
                  </div>

                  {/* Process Memory */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-gray-700">Process Heap</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatBytes(systemHealth.process.memoryUsage.heapUsed)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(systemHealth.process.memoryUsage.heapUsed / systemHealth.process.memoryUsage.heapTotal) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        Uptime: {formatUptime(systemHealth.process.uptime)}
                      </span>
                      <span className="text-xs text-gray-500">
                        / {formatBytes(systemHealth.process.memoryUsage.heapTotal)}
                      </span>
                    </div>
                  </div>

                  {/* System Info */}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Hostname:</span>
                        <span className="ml-1 font-medium text-gray-700">
                          {systemHealth.system.hostname}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Uptime:</span>
                        <span className="ml-1 font-medium text-gray-700">
                          {formatUptime(systemHealth.system.uptime)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Platform:</span>
                        <span className="ml-1 font-medium text-gray-700">
                          {systemHealth.system.platform}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Arch:</span>
                        <span className="ml-1 font-medium text-gray-700">
                          {systemHealth.system.arch}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
