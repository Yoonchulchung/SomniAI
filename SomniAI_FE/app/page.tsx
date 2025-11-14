'use client';

import Link from 'next/link';
import { Home, Video, BarChart3, Radio, Settings } from 'lucide-react';

export default function HomePage() {
  const menuItems = [
    {
      title: 'Dashboard',
      description: '시스템 상태 및 통계 확인',
      href: '/dashboard',
      icon: Home,
      color: 'bg-blue-500',
    },
    {
      title: 'Monitor',
      description: '웹캠 실시간 모니터링',
      href: '/monitor',
      icon: Video,
      color: 'bg-purple-500',
    },
    {
      title: 'Analytics',
      description: '데이터 분석 및 시각화',
      href: '/analytics',
      icon: BarChart3,
      color: 'bg-green-500',
    },
    {
      title: 'MQTT',
      description: 'MQTT Pub/Sub 제어',
      href: '/mqtt',
      icon: Radio,
      color: 'bg-orange-500',
    },
    {
      title: 'Settings',
      description: '앱 설정 및 환경 구성',
      href: '/settings',
      icon: Settings,
      color: 'bg-gray-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SomniAI</h1>
              <p className="text-sm text-gray-600">Intelligent Monitoring & Control System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">시작하기</h2>
          <p className="text-gray-600">원하는 기능을 선택하세요</p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className={`${item.color} p-3 rounded-xl text-white`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-bold text-blue-600">실시간</div>
            <div className="text-sm text-gray-600 mt-1">웹캠 스트리밍</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-bold text-green-600">MQTT</div>
            <div className="text-sm text-gray-600 mt-1">IoT 통신</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-bold text-purple-600">분석</div>
            <div className="text-sm text-gray-600 mt-1">데이터 시각화</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>© 2025 SomniAI Team. All rights reserved.</p>
            <p className="mt-2">v1.0.0 - Build 2025.11.14</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
