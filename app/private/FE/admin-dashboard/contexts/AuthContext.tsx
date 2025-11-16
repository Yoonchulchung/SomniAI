'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import type { User, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 토큰이 있으면 사용자 정보 로드
    const token = Cookies.get('access_token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error) {
      console.warn('Failed to load user info, token may be invalid:', error);
      // 토큰이 있지만 사용자 정보를 가져올 수 없는 경우 토큰 제거
      Cookies.remove('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (name: string, password: string) => {
    try {
      const response = await authApi.login({ name, password });
      Cookies.set('access_token', response.access_token, { expires: 1 }); // 1일

      // 사용자 정보 설정
      if (response.user) {
        setUser(response.user);
      } else {
        // 응답에서 사용자 정보 구성 (레거시 API 호환)
        const userData: User = {
          id: (response as any).user_id || 'unknown',
          name: (response as any).name || name,
        };
        setUser(userData);
      }
      router.push('/dashboard');
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || '로그인에 실패했습니다.');
    }
  };

  const logout = () => {
    Cookies.remove('access_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
