/**
 * Main Layout with Sidebar
 * Layout for authenticated pages with navigation
 */

import { Sidebar } from '@/components/ui/Sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto lg:ml-64">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
