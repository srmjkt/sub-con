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
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Mock data generator for demo purposes
  const generateMockUpdate = useCallback((): RealtimeUpdate => {
    const sources = ['Kompas', 'Detik'] as const
    const source = sources[Math.floor(Math.random() * sources.length)]
    const isKompas = source === 'Kompas'
    const kompasStories = [
      {
        headline: 'Kompas: Analis pasar menyorot lonjakan aktivitas digital',
        summary: 'Laporan terbaru menempatkan kanal digital sebagai pendorong utama trafik pagi ini.',
        category: 'Bisnis',
      },
      {
        headline: 'Kompas: Pergerakan indikator stabil di sesi pembukaan',
        summary: 'Sinyal pasar bergerak konsisten dengan sentimen positif dari pembaca regional.',
        category: 'Ekonomi',
      },
    ]
    const detikStories = [
      {
        headline: 'Detik: Update cepat minat baca naik menjelang siang',
        summary: 'Detik mencatat kenaikan interaksi untuk tema breaking news dan highlight lokal.',
        category: 'Headline',
      },
      {
        headline: 'Detik: Sorotan utama bertahan di daftar terpopuler',
        summary: 'Konten singkat dan tajam kembali memimpin engagement di dashboard pemantauan.',
        category: 'Trending',
      },
    ]
    const storyPool = isKompas ? kompasStories : detikStories
    const story = storyPool[Math.floor(Math.random() * storyPool.length)]
    const status = Math.random() > 0.8 ? 'warning' : 'healthy'
    
    return {
      type: 'news',
      clientId,
      data: {
        id: `${source.toLowerCase()}-${Date.now()}`,
        source,
        headline: story.headline,
        summary: story.summary,
        category: story.category,
        status,
        timestamp: Date.now(),
        url: isKompas ? 'https://www.kompas.com' : 'https://www.detik.com',
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

    setData([generateMockUpdate(), generateMockUpdate()])

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
