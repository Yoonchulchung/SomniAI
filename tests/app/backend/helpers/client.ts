/**
 * HTTP Client Helper
 * API 요청을 위한 헬퍼 함수
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { TEST_CONFIG } from './config';

export class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = TEST_CONFIG.API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: TEST_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // 모든 상태 코드를 유효한 응답으로 처리
    });

    // Request interceptor
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async get(url: string, config?: AxiosRequestConfig) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    return this.client.delete(url, config);
  }
}

export const apiClient = new APIClient();
