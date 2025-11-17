'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/features/auth/LoginForm';

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로 리다이렉트
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full">
        <LoginForm />
      </div>
    </div>
  );
}
