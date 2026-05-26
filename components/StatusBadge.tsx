import React from 'react'

interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'critical'
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium'
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const statusClasses = {
    healthy: 'bg-green-900/30 text-green-300 border border-green-700/50',
    warning: 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50',
    critical: 'bg-red-900/30 text-red-300 border border-red-700/50',
  }

  const dotClasses = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  }

  const statusLabel = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  }

  return (
    <div className={`${baseClasses} ${sizeClasses[size]} ${statusClasses[status]}`}>
      <div className={`h-2 w-2 rounded-full ${dotClasses[status]}`} />
      {statusLabel[status]}
    </div>
  )
}
