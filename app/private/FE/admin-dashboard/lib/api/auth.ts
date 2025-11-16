import { apiClient } from './client';
import type { AuthResponse, LoginCredentials, User } from '@/types';

export const authApi = {
  /**
   * 로그인
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/login', credentials);
  },

  /**
   * 회원가입
   */
  register: async (name: string, password: string): Promise<void> => {
    return apiClient.post('/auth/register', { name, password });
  },

  /**
   * 현재 사용자 정보 조회
   */
  getMe: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },
};
