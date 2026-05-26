'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { RealtimeUpdate, ConnectionState } from '@/types/security'

export function useRealtimeData(clientId: string) {
  const [data, setData] = useState<RealtimeUpdate[]>([])
  const [connection, setConnection] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
  })
  const [isLive, setIsLive] = useState(true)
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Mock data generator for demo purposes
  const generateMockUpdate = useCallback((): RealtimeUpdate => {
    const types = ['metric', 'alert', 'compliance'] as const
    const type = types[Math.floor(Math.random() * types.length)]
    
    return {
      type,
      clientId,
      data: {
        value: Math.random() * 100,
        status: Math.random() > 0.7 ? 'warning' : 'healthy',
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    }
  }, [clientId])

  useEffect(() => {
    if (!isLive) {
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
      return
    }

    // Set initial connection state
    setConnection({
      isConnected: true,
      isReconnecting: false,
      lastConnectedAt: Date.now(),
    })

    // Simulate real-time data stream with mock data
    mockIntervalRef.current = setInterval(() => {
      const update = generateMockUpdate()
      setData((prev) => [update, ...prev.slice(0, 49)]) // Keep last 50 updates
    }, 3000)

    return () => {
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
    }
  }, [isLive, generateMockUpdate])

  return {
    data,
    connection,
    isLive,
    toggleLive: () => setIsLive((prev) => !prev),
  }
}
