/**
 * Badge Component
 * Status badge component
 */

import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ label, variant = 'default', size = 'md', dot = false }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  const dotColors = {
    default: 'bg-gray-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {dot && <span className={`w-2 h-2 rounded-full ${dotColors[variant]} animate-pulse`}></span>}
      {label}
    </span>
  );
}
