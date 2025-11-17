// API 관련 타입 정의

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ApiLogParams extends PaginationParams {
  endpoint?: string;
  method?: string;
  status_code?: number;
}

export interface ApiLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status_code: number;
  duration_ms: number;
  user_id?: string;
  error_message?: string;
}

export interface ApiLogStats {
  total_requests: number;
  avg_duration_ms: number;
  status_distribution: Record<string, number>;
  endpoint_distribution: Record<string, number>;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}
