'use client';

/**
 * Authentication Context
 * Manages user authentication state
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'USER';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // 1. [수정] 토큰이 있는지 먼저 확인합니다.
      const token = localStorage.getItem('token');

      // 2. 토큰이 없으면 API 요청을 보내지 않고 바로 로딩 종료 (비로그인/게스트 상태)
      if (!token) {
        setUser(null);
        setLoading(false);
        return; 
      }

      // 3. 토큰이 있을 때만 서버에 "이 토큰 유효해?" 하고 물어봅니다.
      const response = await authAPI.me();
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        // 성공 응답이 아니면(토큰 만료 등) 유저 초기화
        setUser(null);
        localStorage.removeItem('token'); // 잘못된 토큰 삭제
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      localStorage.removeItem('token'); // 에러 발생 시(401 등) 토큰 삭제 권장
    } finally {
      // 4. 성공하든 실패하든 로딩은 반드시 끝냅니다.
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    if (response.data.success) {
      const { token, user: userData } = response.data.data;
      localStorage.setItem('token', token);
      setUser(userData);
    } else {
      throw new Error(response.data.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      // 로그아웃 API 호출 시도 (실패해도 클라이언트 로그아웃은 진행)
      await authAPI.logout(); 
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      // SPA 방식 리다이렉트 권장 (window.location.href는 앱을 새로고침함)
      // 만약 next/navigation을 쓸 수 있다면 router.push('/') 권장
      window.location.href = '/'; 
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
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