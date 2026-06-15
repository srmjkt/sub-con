'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ConnectionState, RealtimeUpdate, NewsItem } from '@/types/security'

export function useRealtimeData(clientId: string) {
  const [data, setData] = useState<RealtimeUpdate[]>([])
  const [connection, setConnection] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
  })
  const [isLive, setIsLive] = useState(true)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)
  const [nextPollIn, setNextPollIn] = useState<number>(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch('/api/news', {
        cache: 'no-store',
      })
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
        security?: {
          isRelevant: boolean
          category: string
          severity: string
          confidence: number
          tags: string[]
          reason: string
        }
      }> = result.items ?? []

      const now = Date.now()
      setLastFetchedAt(now)
      setNextPollIn(10)

      // Only add items we haven't seen before (client-side deduplication)
      const newItems = items.filter((item) => !seenIdsRef.current.has(item.id))

      if (newItems.length > 0) {
        // Mark as seen
        for (const item of newItems) {
          seenIdsRef.current.add(item.id)
        }

        // Keep seen IDs manageable
        if (seenIdsRef.current.size > 300) {
          const idsArray = Array.from(seenIdsRef.current)
          seenIdsRef.current = new Set(idsArray.slice(-150))
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
            security: item.security as NewsItem['security'],
          },
          timestamp: item.timestamp,
        }))

        setData((prev) => {
          const combined = [...updates, ...prev]
          return combined.slice(0, 100)
        })
      }

      setConnection({
        isConnected: true,
        isReconnecting: false,
        lastConnectedAt: now,
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
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      setNextPollIn(0)
      return
    }

    // Initial fetch
    fetchNews()

    // Poll every 10 seconds for fresh data
    pollIntervalRef.current = setInterval(() => {
      fetchNews()
    }, 10000)

    // Countdown ticker every second
    countdownRef.current = setInterval(() => {
      setNextPollIn((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [isLive, fetchNews])

  return {
    data,
    connection,
    isLive,
    lastFetchedAt,
    nextPollIn,
    toggleLive: () => setIsLive((prev) => !prev),
  }
}