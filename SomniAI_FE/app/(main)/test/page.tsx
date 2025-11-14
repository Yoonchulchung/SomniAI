/**
 * API Test Page
 * Test server endpoints with custom JSON payloads
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Send, Code, Trash2, Copy, Check, Terminal } from 'lucide-react';

interface Response {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  duration: number;
}

interface LogEntry {
  timestamp: number;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  details?: any;
}

export default function TestPage() {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [url, setUrl] = useState('http://localhost:4000/api/health');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('{\n  "message": "Hello World"\n}');
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Add log entry
  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const log: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      details,
    };
    setLogs((prev) => [...prev, log].slice(-100)); // Keep last 100 logs
  };

  const sendRequest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    addLog('info', `요청 준비: ${method} ${url}`);

    try {
      // Parse headers
      let parsedHeaders: Record<string, string> = {};
      if (headers.trim()) {
        try {
          parsedHeaders = JSON.parse(headers);
          addLog('info', '헤더 파싱 완료', { count: Object.keys(parsedHeaders).length });
        } catch (e) {
          addLog('error', '헤더 JSON 파싱 실패');
          throw new Error('Invalid JSON in headers');
        }
      }

      // Parse body for POST/PUT/PATCH
      let parsedBody: any = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        try {
          parsedBody = JSON.parse(body);
          addLog('info', '요청 본문 파싱 완료');
        } catch (e) {
          addLog('error', '요청 본문 JSON 파싱 실패');
          throw new Error('Invalid JSON in body');
        }
      }

      const startTime = Date.now();
      addLog('info', '요청 전송 중...');

      // Send request
      const fetchOptions: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      if (parsedBody) {
        fetchOptions.body = JSON.stringify(parsedBody);
      }

      const res = await fetch(url, fetchOptions);
      const duration = Date.now() - startTime;

      addLog('success', `응답 수신: ${res.status} ${res.statusText}`, { duration: `${duration}ms` });

      // Parse response
      const contentType = res.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await res.json();
        addLog('info', 'JSON 응답 파싱 완료');
      } else {
        data = await res.text();
        addLog('info', '텍스트 응답 수신');
      }

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        data,
        duration,
      });

      addLog('success', '요청 완료', { status: res.status, duration: `${duration}ms` });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed';
      addLog('error', `요청 실패: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setMethod('GET');
    setUrl('http://localhost:4000/api/health');
    setHeaders('{\n  "Content-Type": "application/json"\n}');
    setBody('{\n  "message": "Hello World"\n}');
    setResponse(null);
    setError(null);
    setLogs([]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
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
              <h1 className="text-2xl font-bold text-gray-900">API Tester</h1>
              <p className="text-sm text-gray-600">서버 API 테스트 도구</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Panel */}
          <div className="space-y-6">
            <Card elevated>
              <CardHeader
                title="요청 설정"
                icon={<Code className="w-6 h-6 text-indigo-600" />}
              />
              <CardContent>
                <div className="space-y-4">
                  {/* Method and URL */}
                  <div className="flex gap-3">
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-semibold"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="http://localhost:4000/api/..."
                    />
                  </div>

                  {/* Headers */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Headers (JSON)
                    </label>
                    <textarea
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      className="w-full h-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                      placeholder='{"Content-Type": "application/json"}'
                    />
                  </div>

                  {/* Body (for POST/PUT/PATCH) */}
                  {['POST', 'PUT', 'PATCH'].includes(method) && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Body (JSON)
                      </label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full h-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        placeholder='{"key": "value"}'
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={sendRequest}
                      variant="primary"
                      fullWidth
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Request
                        </>
                      )}
                    </Button>
                    <Button onClick={clearAll} variant="outline">
                      <Trash2 className="w-5 h-5" />
                      Clear
                    </Button>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700 font-medium">Error:</p>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card elevated>
              <CardHeader title="빠른 테스트" />
              <CardContent>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setMethod('GET');
                      setUrl('http://localhost:4000/api/health');
                      setHeaders('{\n  "Content-Type": "application/json"\n}');
                    }}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-gray-900">Health Check</div>
                    <div className="text-xs text-gray-600">GET /api/health</div>
                  </button>
                  <button
                    onClick={() => {
                      setMethod('GET');
                      setUrl('http://localhost:4000/api/system/health');
                      setHeaders('{\n  "Content-Type": "application/json"\n}');
                    }}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-gray-900">System Health</div>
                    <div className="text-xs text-gray-600">GET /api/system/health</div>
                  </button>
                  <button
                    onClick={() => {
                      setMethod('GET');
                      setUrl('http://localhost:4000/api/mqtt/status');
                      setHeaders('{\n  "Content-Type": "application/json"\n}');
                    }}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-gray-900">MQTT Status</div>
                    <div className="text-xs text-gray-600">GET /api/mqtt/status</div>
                  </button>
                  <button
                    onClick={() => {
                      setMethod('POST');
                      setUrl('http://localhost:4000/api/mqtt/publish');
                      setHeaders('{\n  "Content-Type": "application/json"\n}');
                      setBody('{\n  "topic": "test/topic",\n  "message": "Hello MQTT",\n  "qos": 0\n}');
                    }}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-gray-900">Publish MQTT</div>
                    <div className="text-xs text-gray-600">POST /api/mqtt/publish</div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Response Panel */}
          <div>
            <Card elevated>
              <CardHeader
                title="응답"
                icon={<Code className="w-6 h-6 text-green-600" />}
              />
              <CardContent>
                {!response && !loading && (
                  <div className="text-center py-12 text-gray-400">
                    <Send className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p>요청을 보내면 응답이 여기에 표시됩니다</p>
                  </div>
                )}

                {loading && (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-3"></div>
                    <p className="text-gray-600">요청 전송 중...</p>
                  </div>
                )}

                {response && (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${getStatusColor(response.status)}`}>
                          {response.status}
                        </span>
                        <span className="text-gray-600">{response.statusText}</span>
                      </div>
                      <Badge
                        label={`${response.duration}ms`}
                        variant={response.duration < 100 ? 'success' : response.duration < 500 ? 'default' : 'warning'}
                      />
                    </div>

                    {/* Response Headers */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Headers</h3>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <pre className="text-xs font-mono text-gray-700">
                          {JSON.stringify(response.headers, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Response Body */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Body</h3>
                        <button
                          onClick={copyResponse}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm font-mono text-gray-200">
                          {typeof response.data === 'string'
                            ? response.data
                            : JSON.stringify(response.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Logs Panel */}
            <Card elevated className="mt-6">
              <CardHeader
                title="활동 로그"
                subtitle={`${logs.length}개의 로그`}
                icon={<Terminal className="w-6 h-6 text-purple-600" />}
              />
              <CardContent>
                <div className="mb-3 flex items-center justify-between">
                  {logs.length > 0 && (
                    <button
                      onClick={clearLogs}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      로그 삭제
                    </button>
                  )}
                </div>
                <div className="bg-gray-900 rounded-lg p-3 max-h-80 overflow-y-auto font-mono text-xs">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">활동 로그가 없습니다</p>
                      <p className="text-xs mt-1">요청을 보내면 로그가 표시됩니다</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => {
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
