'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks';
import { useRouter } from 'next/navigation';
import { logsApi } from '@/lib/api';
import type { ApiLog } from '@/types';

interface PaginationInfo {
  page: number;
  items_per_page: number;
  total: number;
  total_pages: number;
}

interface LogsResponse {
  success: boolean;
  data: {
    logs: ApiLog[];
    pagination: PaginationInfo;
  };
}

interface StatsResponse {
  success: boolean;
  data: {
    total_requests: number;
    average_duration_ms: number;
    status_code_distribution: Array<{ status_code: number; count: number }>;
    top_endpoints: Array<{ endpoint: string; count: number }>;
  };
}

export default function LogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [stats, setStats] = useState<StatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    endpoint: '',
    method: '',
    status_code: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { page, items_per_page: 20 };
      if (filters.endpoint) params.endpoint = filters.endpoint;
      if (filters.method) params.method = filters.method;
      if (filters.status_code) params.status_code = parseInt(filters.status_code);

      const [logsData, statsData] = await Promise.all([
        logsApi.getLogs(params).catch(() => null),
        logsApi.getStats().catch(() => null),
      ]);

      if (logsData) {
        setLogs(logsData.logs);
        setPagination({
          page: logsData.page,
          items_per_page: logsData.items_per_page,
          total: logsData.total,
          total_pages: logsData.total_pages,
        });
      }

      if (statsData) {
        setStats({
          total_requests: statsData.total_requests,
          average_duration_ms: statsData.avg_duration_ms,
          status_code_distribution: Object.entries(statsData.status_distribution || {}).map(([status_code, count]) => ({
            status_code: parseInt(status_code),
            count: count as number,
          })),
          top_endpoints: Object.entries(statsData.endpoint_distribution || {}).map(([endpoint, count]) => ({
            endpoint,
            count: count as number,
          })),
        });
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    loadData();
  };

  const clearFilters = () => {
    setFilters({ endpoint: '', method: '', status_code: '' });
    setPage(1);
    setTimeout(loadData, 100);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600 bg-green-50';
    if (statusCode >= 300 && statusCode < 400) return 'text-blue-600 bg-blue-50';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'text-blue-600 bg-blue-50';
      case 'POST':
        return 'text-green-600 bg-green-50';
      case 'PUT':
        return 'text-yellow-600 bg-yellow-50';
      case 'DELETE':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 대시보드로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">API 로그</h1>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          >
            새로고침
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">총 요청</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.total_requests.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">평균 응답 시간</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.average_duration_ms.toFixed(0)} ms</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">상태 코드 분포</h3>
              <div className="space-y-1 mt-2">
                {stats.status_code_distribution.slice(0, 3).map((stat) => (
                  <div key={stat.status_code} className="flex justify-between text-sm">
                    <span className={`px-2 py-1 rounded ${getStatusColor(stat.status_code)}`}>
                      {stat.status_code}
                    </span>
                    <span className="text-gray-600">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">상위 엔드포인트</h3>
              <div className="space-y-1 mt-2 text-xs">
                {stats.top_endpoints.slice(0, 3).map((stat, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate flex-1 text-gray-700">{stat.endpoint}</span>
                    <span className="text-gray-500 ml-2">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">필터</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="엔드포인트"
              value={filters.endpoint}
              onChange={(e) => handleFilterChange('endpoint', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange('method', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">모든 메소드</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              placeholder="상태 코드"
              value={filters.status_code}
              onChange={(e) => handleFilterChange('status_code', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                적용
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 로그 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메소드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    엔드포인트
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    응답 시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(log.method)}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">{log.endpoint}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(log.status_code)}`}>
                          {log.status_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.duration_ms !== null ? `${log.duration_ms} ms` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.user_id || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {pagination && pagination.total_pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={page === pagination.total_pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    전체 <span className="font-medium">{pagination.total}</span>개 중{' '}
                    <span className="font-medium">{(page - 1) * pagination.items_per_page + 1}</span>-
                    <span className="font-medium">
                      {Math.min(page * pagination.items_per_page, pagination.total)}
                    </span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      이전
                    </button>
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.total_pages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pagination.total_pages - 2) {
                        pageNum = pagination.total_pages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNum
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                      disabled={page === pagination.total_pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      다음
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
