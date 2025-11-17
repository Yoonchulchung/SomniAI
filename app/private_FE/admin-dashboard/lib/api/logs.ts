import { apiClient } from './client';
import type { ApiLog, ApiLogParams, ApiLogStats } from '@/types';

export interface LogsResponse {
  logs: ApiLog[];
  total: number;
  page: number;
  items_per_page: number;
  total_pages: number;
}

export const logsApi = {
  /**
   * API 로그 목록 조회 (필터링 및 페이지네이션)
   */
  getLogs: async (params?: ApiLogParams): Promise<LogsResponse> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    return apiClient.get<LogsResponse>(`/api-logs?${queryParams.toString()}`);
  },

  /**
   * 특정 로그 상세 조회
   */
  getLogDetail: async (logId: string): Promise<ApiLog> => {
    return apiClient.get<ApiLog>(`/api-logs/${logId}`);
  },

  /**
   * API 로그 통계 조회
   */
  getStats: async (userId?: string): Promise<ApiLogStats> => {
    const queryParams = userId ? `?user_id=${userId}` : '';
    return apiClient.get<ApiLogStats>(`/api-logs/stats/summary${queryParams}`);
  },
};
