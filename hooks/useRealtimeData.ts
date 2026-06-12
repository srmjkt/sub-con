'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ConnectionState, RealtimeUpdate } from '@/types/security'

export function useRealtimeData(clientId: string) {
  const [data, setData] = useState<RealtimeUpdate[]>([])
  const [connection, setConnection] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
  })
  const [isLive, setIsLive] = useState(true)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch('/api/news')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      const items: Array<{
        id: string
        source: string
        headline: string
        summary: string
        category: string
        url: string
        timestamp: number
      }> = result.items ?? []

      // Only add items we haven't seen before
      const newItems = items.filter((item) => !seenIdsRef.current.has(item.id))

      if (newItems.length > 0) {
        // Mark as seen
        for (const item of newItems) {
          seenIdsRef.current.add(item.id)
        }

        // Keep seen IDs manageable
        if (seenIdsRef.current.size > 200) {
          const idsArray = Array.from(seenIdsRef.current)
          seenIdsRef.current = new Set(idsArray.slice(-100))
        }

        const updates: RealtimeUpdate[] = newItems.map((item) => ({
          type: 'news' as const,
          clientId,
          data: {
            id: item.id,
            source: item.source as
              | 'Kompas'
              | 'Detik'
              | 'Liputan6'
              | 'CNNIndonesia'
              | 'Kumparan',
            headline: item.headline,
            summary: item.summary,
            category: item.category,
            status: 'healthy' as const,
            timestamp: item.timestamp,
            url: item.url,
          },
          timestamp: item.timestamp,
        }))

        setData((prev) => {
          const combined = [...updates, ...prev]
          // Keep last 100 updates
          return combined.slice(0, 100)
        })
      }

      setConnection({
        isConnected: true,
        isReconnecting: false,
        lastConnectedAt: Date.now(),
      })
    } catch (error) {
      console.error('[useRealtimeData] Fetch failed:', error)
      setConnection((prev) => ({
        ...prev,
        isConnected: false,
        isReconnecting: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }, [clientId])

  useEffect(() => {
    if (!isLive) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    // Initial fetch
    fetchNews()

    // Poll every 30 seconds for new updates
    pollIntervalRef.current = setInterval(() => {
      fetchNews()
    }, 30000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [isLive, fetchNews])

  return {
    data,
    connection,
    isLive,
    toggleLive: () => setIsLive((prev) => !prev),
  }
}