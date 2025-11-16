'use client';

import { useState, useEffect, useCallback } from 'react';
import { logsApi } from '@/lib/api';
import type { ApiLog, ApiLogParams, ApiLogStats } from '@/types';
import { PAGINATION } from '@/lib/utils/constants';

export interface UseLogsResult {
  logs: ApiLog[];
  stats: ApiLogStats | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  filters: ApiLogParams;
  setFilters: (filters: ApiLogParams) => void;
  setPage: (page: number) => void;
  refetch: () => void;
}

export function useLogs(initialFilters?: ApiLogParams): UseLogsResult {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [stats, setStats] = useState<ApiLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialFilters?.page || PAGINATION.DEFAULT_PAGE);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<ApiLogParams>(initialFilters || {});

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: ApiLogParams = {
        ...filters,
        page: currentPage,
        limit: filters.limit || PAGINATION.DEFAULT_ITEMS_PER_PAGE,
      };

      const [logsData, statsData] = await Promise.all([
        logsApi.getLogs(params),
        logsApi.getStats().catch(() => null),
      ]);

      setLogs(logsData.logs || []);
      setTotalPages(logsData.total_pages || 0);
      setTotalItems(logsData.total || 0);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그를 불러오는데 실패했습니다.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSetFilters = useCallback((newFilters: ApiLogParams) => {
    setFilters(newFilters);
    setCurrentPage(PAGINATION.DEFAULT_PAGE); // 필터 변경 시 첫 페이지로
  }, []);

  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    logs,
    stats,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    filters,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    refetch: fetchLogs,
  };
}
