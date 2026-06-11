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
  const recentHeadlinesRef = useRef<Set<string>>(new Set())

  // Mock data generator for demo purposes
  const generateMockUpdate = useCallback((): RealtimeUpdate => {
    const sources = ['Kompas', 'Detik', 'Liputan6', 'CNNIndonesia', 'Kumparan'] as const
    const source = sources[Math.floor(Math.random() * sources.length)]
    
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
      {
        headline: 'Kompas: Sektor teknologi mencatat pertumbuhan signifikan',
        summary: 'Data kuartal terakhir menunjukkan adopsi teknologi yang meningkat di berbagai sektor.',
        category: 'Teknologi',
      },
      {
        headline: 'Kompas: Investasi asing meningkat di kuartal ini',
        summary: 'Pemerintah mencatat lonjakan modal masuk dari investor internasional.',
        category: 'Keuangan',
      },
      {
        headline: 'Kompas: Konsumsi rumah tangga menunjukkan tren positif',
        summary: 'Survei terbaru mengindikasikan peningkatan belanja masyarakat.',
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
      {
        headline: 'Detik: Berita viral mendominasi media sosial',
        summary: 'Konten menarik dengan angle unik menarik perhatian jutaan pembaca.',
        category: 'Viral',
      },
      {
        headline: 'Detik: Analisis mendalam tentang tren konsumsi digital',
        summary: 'Studi terbaru mengungkap perubahan perilaku pembaca digital.',
        category: 'Analisis',
      },
      {
        headline: 'Detik: Laporan khusus tentang perkembangan startup',
        summary: 'Ekosistem startup nasional menunjukkan pertumbuhan yang mengesankan.',
        category: 'Bisnis',
      },
    ]
    const liputan6Stories = [
      {
        headline: 'Liputan6: Berita terkini seputar perkembangan politik nasional',
        summary: 'Analisis mendalam tentang dinamika politik terbaru di tingkat nasional.',
        category: 'Politik',
      },
      {
        headline: 'Liputan6: Sorotan khusus isu lingkungan dan keberlanjutan',
        summary: 'Laporan investigatif tentang tantangan lingkungan dan solusi yang ditawarkan.',
        category: 'Lingkungan',
      },
      {
        headline: 'Liputan6: Update terbaru seputar perkembangan ekonomi digital',
        summary: 'Wawancara eksklusif dengan pelaku usaha di sektor ekonomi digital.',
        category: 'Ekonomi',
      },
      {
        headline: 'Liputan6: Laporan khusus tentang transformasi pendidikan',
        summary: 'Studi kasus implementasi teknologi dalam sistem pendidikan modern.',
        category: 'Pendidikan',
      },
      {
        headline: 'Liputan6: Berita olahraga dan prestasi atlet nasional',
        summary: 'Coverage lengkap kompetisi olahraga dan pencapaian atlet Indonesia.',
        category: 'Olahraga',
      },
    ]
    const cnnStories = [
      {
        headline: 'CNNIndonesia: Breaking news terkini seputar isu global',
        summary: 'Coverage langsung peristiwa penting yang sedang terjadi di dunia.',
        category: 'Internasional',
      },
      {
        headline: 'CNNIndonesia: Analisis ekonomi makro terbaru',
        summary: 'Wawancara dengan pakar ekonomi tentang tren pasar global.',
        category: 'Ekonomi',
      },
      {
        headline: 'CNNIndonesia: Laporan teknologi dan inovasi',
        summary: 'Ulasan mendalam tentang perkembangan teknologi terkini.',
        category: 'Teknologi',
      },
      {
        headline: 'CNNIndonesia: Berita bisnis dan korporasi',
        summary: 'Update terbaru tentang kinerja perusahaan dan tren industri.',
        category: 'Bisnis',
      },
      {
        headline: 'CNNIndonesia: Sorotan isu sosial dan kemanusiaan',
        summary: 'Laporan khusus tentang isu-isu sosial yang mendapat perhatian publik.',
        category: 'Sosial',
      },
    ]
    const kumparanStories = [
      {
        headline: 'Kumparan: Opini dan analisis mendalam tentang tren sosial',
        summary: 'Artikel opini dari penulis ternama tentang isu-isu kontemporer.',
        category: 'Opini',
      },
      {
        headline: 'Kumparan: Feature story tentang kehidupan urban',
        summary: 'Laporan khusus tentang gaya hidup dan tren di perkotaan.',
        category: 'Lifestyle',
      },
      {
        headline: 'Kumparan: Investigasi tentang isu publik',
        summary: 'Laporan investigatif yang mengungkap fakta-fakta penting.',
        category: 'Investigasi',
      },
      {
        headline: 'Kumparan: Review dan rekomendasi hiburan',
        summary: 'Ulasan film, musik, dan konten hiburan terbaru.',
        category: 'Hiburan',
      },
      {
        headline: 'Kumparan: Tips dan tutorial produktivitas',
        summary: 'Panduan praktis untuk meningkatkan produktivitas sehari-hari.',
        category: 'Tips',
      },
    ]
    
    let storyPool
    let url
    switch (source) {
      case 'Kompas':
        storyPool = kompasStories
        url = 'https://www.kompas.com'
        break
      case 'Detik':
        storyPool = detikStories
        url = 'https://www.detik.com'
        break
      case 'Liputan6':
        storyPool = liputan6Stories
        url = 'https://www.liputan6.com'
        break
      case 'CNNIndonesia':
        storyPool = cnnStories
        url = 'https://www.cnnindonesia.com'
        break
      case 'Kumparan':
        storyPool = kumparanStories
        url = 'https://www.kumparan.com'
        break
      default:
        storyPool = kompasStories
        url = 'https://www.kompas.com'
    }
    
    // Filter out recently used headlines to avoid duplicates
    const availableStories = storyPool.filter(story => !recentHeadlinesRef.current.has(story.headline))
    
    // If all stories have been used recently, clear the cache and use all
    const storiesToUse = availableStories.length > 0 ? availableStories : storyPool
    const story = storiesToUse[Math.floor(Math.random() * storiesToUse.length)]
    
    // Add to recent headlines and keep only last 10
    recentHeadlinesRef.current.add(story.headline)
    if (recentHeadlinesRef.current.size > 10) {
      const firstHeadline = recentHeadlinesRef.current.values().next().value
      if (firstHeadline) {
        recentHeadlinesRef.current.delete(firstHeadline)
      }
    }
    
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
        url,
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
    }, 8000)

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
