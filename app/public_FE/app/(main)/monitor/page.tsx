/**
 * Monitor Page
 * Webcam monitoring with server streaming
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWebcam } from '@/hooks/useWebcam';
import { WebcamPlayer } from '@/components/webcam/WebcamPlayer';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Settings as SettingsIcon, Activity, Clock, Zap, Terminal } from 'lucide-react';

interface TransmissionLog {
  timestamp: number;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  details?: any;
}

export default function MonitorPage() {
  const [serverUrl, setServerUrl] = useState('http://192.168.0.100:8000/upload');
  const [fps, setFps] = useState(10);
  const [streamingToServer, setStreamingToServer] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const [lastSentTime, setLastSentTime] = useState<number>(0);
  const [streamInterval, setStreamInterval] = useState<NodeJS.Timeout | null>(null);
  const [transmissionLogs, setTransmissionLogs] = useState<TransmissionLog[]>([]);
  const [clientIp, setClientIp] = useState<string>('Loading...');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const webcam = useWebcam({
    width: 1280,
    height: 720,
    facingMode: 'user',
    fps: 30,
  });

  // Add log entry
  const addLog = (level: TransmissionLog['level'], message: string, details?: any) => {
    const log: TransmissionLog = {
      timestamp: Date.now(),
      level,
      message,
      details,
    };
    setTransmissionLogs((prev) => [...prev, log].slice(-100)); // Keep last 100 logs
  };

  // Start streaming to server
  const startServerStreaming = () => {
    if (!webcam.isStreaming) {
      alert('먼저 웹캠을 시작해주세요');
      return;
    }

    setStreamingToServer(true);
    setFramesSent(0);
    addLog('info', `서버 전송 시작: ${serverUrl}`, { fps });

    const interval = setInterval(async () => {
      try {
        const startTime = Date.now();
        await webcam.sendFrame(serverUrl);
        const duration = Date.now() - startTime;

        setFramesSent((prev) => {
          const newCount = prev + 1;
          if (newCount % 10 === 0) {
            addLog('success', `프레임 ${newCount}개 전송 완료`, { duration: `${duration}ms` });
          }
          return newCount;
        });
        setLastSentTime(Date.now());
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        addLog('error', `프레임 전송 실패: ${errorMessage}`, { url: serverUrl });
        console.error('[Monitor] Failed to send frame:', error);
      }
    }, 1000 / fps);

    setStreamInterval(interval);
  };

  // Stop streaming to server
  const stopServerStreaming = () => {
    if (streamInterval) {
      clearInterval(streamInterval);
      setStreamInterval(null);
    }
    setStreamingToServer(false);
    addLog('info', '서버 전송 중지', { totalFrames: framesSent });
  };

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transmissionLogs]);

  // Fetch client IP on mount
  useEffect(() => {
    const fetchClientIp = async () => {
      try {
        const response = await fetch('/api/system/client-ip');
        const data = await response.json();
        if (data.success) {
          setClientIp(data.data.ip);
        } else {
          setClientIp('Unknown');
        }
      } catch (error) {
        console.error('[Monitor] Failed to fetch client IP:', error);
        setClientIp('Error');
      }
    };

    fetchClientIp();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopServerStreaming();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
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
                <h1 className="text-2xl font-bold text-gray-900">Monitor</h1>
                <p className="text-sm text-gray-600">실시간 웹캠 모니터링</p>
              </div>
            </div>
            <Badge
              label={webcam.isStreaming ? 'STREAMING' : 'OFFLINE'}
              variant={webcam.isStreaming ? 'success' : 'default'}
              dot={webcam.isStreaming}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webcam Player */}
          <div className="lg:col-span-2">
            <WebcamPlayer
              videoRef={webcam.videoRef}
              isStreaming={webcam.isStreaming}
              error={webcam.error}
              onStart={() => webcam.startStream()}
              onStop={() => {
                webcam.stopStream();
                stopServerStreaming();
              }}
              onCapture={() => {
                const frame = webcam.captureFrame();
                if (frame) {
                  alert('프레임이 캡처되었습니다');
                }
              }}
            />

            {/* Server Streaming Control */}
            <Card elevated className="mt-6">
              {/* Custom Header with IP */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">서버 전송</h3>
                    <p className="text-sm text-gray-600 mt-1">프레임을 서버로 전송</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-[10px] font-semibold text-blue-700 leading-tight">Client IP</div>
                    <div className="text-xs font-mono text-blue-900 font-semibold">{clientIp}</div>
                  </div>
                </div>
              </div>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      서버 URL
                    </label>
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      disabled={streamingToServer}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="http://192.168.0.100:8000/upload"
                    />
                  </div>

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
                      disabled={streamingToServer}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1 FPS</span>
                      <span>30 FPS</span>
                    </div>
                  </div>

                  {!streamingToServer ? (
                    <Button
                      onClick={startServerStreaming}
                      variant="primary"
                      fullWidth
                      disabled={!webcam.isStreaming}
                    >
                      <Zap className="w-5 h-5" />
                      서버 전송 시작
                    </Button>
                  ) : (
                    <Button onClick={stopServerStreaming} variant="danger" fullWidth>
                      <Zap className="w-5 h-5" />
                      서버 전송 중지
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card elevated>
              <CardHeader
                title="상태"
                icon={<Activity className="w-6 h-6 text-green-600" />}
              />
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">웹캠</span>
                    <Badge
                      label={webcam.isStreaming ? 'ON' : 'OFF'}
                      variant={webcam.isStreaming ? 'success' : 'default'}
                    />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">서버 전송</span>
                    <Badge
                      label={streamingToServer ? 'ON' : 'OFF'}
                      variant={streamingToServer ? 'success' : 'default'}
                    />
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">FPS</span>
                    <span className="text-sm font-semibold text-gray-900">{fps}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Card */}
            <Card elevated>
              <CardHeader
                title="통계"
                icon={<Clock className="w-6 h-6 text-blue-600" />}
              />
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">전송된 프레임</div>
                    <div className="text-3xl font-bold text-blue-600">{framesSent}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">마지막 전송</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {lastSentTime > 0
                        ? new Date(lastSentTime).toLocaleTimeString('ko-KR')
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Camera Devices */}
            {webcam.devices.length > 0 && (
              <Card elevated>
                <CardHeader
                  title="카메라 장치"
                  icon={<SettingsIcon className="w-6 h-6 text-gray-600" />}
                />
                <CardContent>
                  <div className="space-y-2">
                    {webcam.devices.map((device, index) => (
                      <div
                        key={device.deviceId}
                        className="text-sm p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="font-semibold text-gray-900">
                          카메라 {index + 1}
                        </div>
                        <div className="text-gray-600 text-xs mt-1">
                          {device.label || `Device ${device.deviceId.substring(0, 8)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transmission Logs */}
            <Card elevated>
              <CardHeader
                title="전송 로그"
                subtitle={`${transmissionLogs.length}개의 로그`}
                icon={<Terminal className="w-6 h-6 text-purple-600" />}
              />
              <CardContent>
                <div className="mb-3 flex items-center justify-between">
                  {transmissionLogs.length > 0 && (
                    <button
                      onClick={() => setTransmissionLogs([])}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      로그 삭제
                    </button>
                  )}
                </div>
                <div className="bg-gray-900 rounded-lg p-3 max-h-80 overflow-y-auto font-mono text-xs">
                  {transmissionLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">전송 로그가 없습니다</p>
                      <p className="text-xs mt-1">서버 전송을 시작하면 로그가 표시됩니다</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {transmissionLogs.map((log, index) => {
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
                              {log.details && (
                                <div className="text-gray-400 text-[10px] mt-0.5 ml-2 border-l-2 border-gray-700 pl-2">
                                  {typeof log.details === 'string'
                                    ? log.details
                                    : JSON.stringify(log.details)}
                                </div>
                              )}
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
      </main>
    </div>
  );
}
