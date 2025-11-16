'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api-client';

interface User {
  user_id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
}

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
      console.error('Failed to load user:', error);
      Cookies.remove('access_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (name: string, password: string) => {
    try {
      const response = await authApi.login(name, password);
      Cookies.set('access_token', response.access_token, { expires: 1 }); // 1일
      setUser({ user_id: response.user_id, name: response.name });
      router.push('/dashboard');
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
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
