/**
 * Card Component
 * Reusable card component with variants
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', elevated = true, onClick }: CardProps) {
  const baseClasses = 'bg-white rounded-xl border border-gray-200';
  const elevatedClasses = elevated ? 'shadow-lg' : 'shadow-sm';
  const clickableClasses = onClick ? 'cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all duration-300' : '';

  return (
    <div
      className={`${baseClasses} ${elevatedClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-6 border-b border-gray-100">
      {icon && <div className="text-2xl">{icon}</div>}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
