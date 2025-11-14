/**
 * Sidebar Navigation Component
 * Left sidebar with menu items
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Video, BarChart3, Radio, FileText, Settings, Menu, X, TestTube } from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Monitor',
    href: '/monitor',
    icon: Video,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'MQTT',
    href: '/mqtt',
    icon: Radio,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    title: 'Description',
    href: '/description',
    icon: FileText,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    title: 'API Test',
    href: '/test',
    icon: TestTube,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🧠</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SomniAI</h1>
                <p className="text-xs text-gray-500">Control Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                      ${
                        isActive
                          ? `${item.bgColor} ${item.color} font-semibold shadow-sm`
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-current rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p className="font-semibold">SomniAI v1.0.0</p>
              <p className="mt-1">© 2025 SomniAI Team</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
