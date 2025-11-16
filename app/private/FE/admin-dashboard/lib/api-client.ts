import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}${API_PREFIX}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - 토큰 자동 추가
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - 에러 처리
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // 인증 실패 시 토큰 제거 및 로그인 페이지로 리다이렉트
          Cookies.remove('access_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // 파일 업로드용 (multipart/form-data)
  async uploadFile<T = any>(url: string, formData: FormData) {
    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();

// 인증 관련 API
export const authApi = {
  login: (name: string, password: string) =>
    apiClient.post<{ access_token: string; user_id: string; name: string }>(
      '/auth/login',
      { name, password }
    ),
  register: (name: string, password: string) =>
    apiClient.post('/auth/register', { name, password }),
  getMe: () => apiClient.get('/auth/me'),
};

// Health & Model API
export const healthApi = {
  health: () => apiClient.get('/health'),
  ping: () => apiClient.get('/ping'),
  getModelInfo: () => apiClient.get('/model/info'),
  getModelStats: () => apiClient.get('/model/stats'),
  reloadModel: (model_type: 'side' | 'air' | 'all', config_path?: string) =>
    apiClient.post('/model/reload', { model_type, config_path }),
};

// Upload API
export const uploadApi = {
  uploadAir: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.uploadFile('/upload-air', formData);
  },
  uploadSide: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.uploadFile('/upload-side', formData);
  },
};

// User API
export const userApi = {
  getUsers: (page: number = 1, items_per_page: number = 10) =>
    apiClient.get(`/users?page=${page}&items_per_page=${items_per_page}`),
  createUser: (name: string, email: string, password: string) =>
    apiClient.post('/users', { name, email, password }),
  updateUser: (userId: string, data: { name?: string; password?: string }) =>
    apiClient.put(`/users/${userId}`, data),
};
