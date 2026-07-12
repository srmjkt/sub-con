"use client"

import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { SEVERITY_LABELS } from "@/lib/securityClassifier"
import { getProvinces, getCities, getDistricts, getVillageSuggestions, getRWOptions, getRTOptions } from "@/lib/indonesiaLocations"

interface NewsItem {
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
    score: number
  }
}

interface PaginationInfo {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasMore: boolean
}

const INITIAL_LIMIT = 6

// Helper to format date in dd/mm/yyyy (Indonesian format)
function formatDateID(timestamp: number): string {
  const d = new Date(timestamp)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// Available news sources
const NEWS_SOURCES = [
  { key: "", label: "All Sources" },
  { key: "Kompas", label: "Kompas" },
  { key: "Detik", label: "Detik" },
  { key: "Liputan6", label: "Liputan6" },
  { key: "CNNIndonesia", label: "CNN Indonesia" },
  { key: "Kumparan", label: "Kumparan" },
  { key: "Tempo", label: "Tempo" },
  { key: "Tribun", label: "Tribun" },
  { key: "Okezone", label: "Okezone" },
]

// Provincial capitals with SVG map positions (x%, y%) for interactive dots
const PROVINCE_CAPITALS = [
  { name: "Banda Aceh", province: "Aceh", x: 8, y: 5 },
  { name: "Medan", province: "Sumatera Utara", x: 12, y: 14 },
  { name: "Padang", province: "Sumatera Barat", x: 8, y: 26 },
  { name: "Pekanbaru", province: "Riau", x: 18, y: 18 },
  { name: "Tanjung Pinang", province: "Kepulauan Riau", x: 26, y: 20 },
  { name: "Jambi", province: "Jambi", x: 18, y: 30 },
  { name: "Palembang", province: "Sumatera Selatan", x: 22, y: 38 },
  { name: "Bengkulu", province: "Bengkulu", x: 14, y: 36 },
  { name: "Bandar Lampung", province: "Lampung", x: 22, y: 46 },
  { name: "Pangkal Pinang", province: "Kepulauan Bangka Belitung", x: 26, y: 32 },
  { name: "Serang", province: "Banten", x: 30, y: 42 },
  { name: "Jakarta", province: "DKI Jakarta", x: 34, y: 44 },
  { name: "Bandung", province: "Jawa Barat", x: 36, y: 46 },
  { name: "Semarang", province: "Jawa Tengah", x: 42, y: 45 },
  { name: "Yogyakarta", province: "Daerah Istimewa Yogyakarta", x: 40, y: 49 },
  { name: "Surabaya", province: "Jawa Timur", x: 50, y: 45 },
  { name: "Pontianak", province: "Kalimantan Barat", x: 34, y: 20 },
  { name: "Palangka Raya", province: "Kalimantan Tengah", x: 44, y: 28 },
  { name: "Banjarmasin", province: "Kalimantan Selatan", x: 46, y: 36 },
  { name: "Samarinda", province: "Kalimantan Timur", x: 54, y: 22 },
  { name: "Tanjung Selor", province: "Kalimantan Utara", x: 54, y: 14 },
  { name: "Manado", province: "Sulawesi Utara", x: 62, y: 8 },
  { name: "Gorontalo", province: "Gorontalo", x: 64, y: 14 },
  { name: "Palu", province: "Sulawesi Tengah", x: 58, y: 22 },
  { name: "Mamuju", province: "Sulawesi Barat", x: 56, y: 30 },
  { name: "Makassar", province: "Sulawesi Selatan", x: 60, y: 38 },
  { name: "Kendari", province: "Sulawesi Tenggara", x: 66, y: 34 },
  { name: "Denpasar", province: "Bali", x: 54, y: 50 },
  { name: "Mataram", province: "Nusa Tenggara Barat", x: 56, y: 54 },
  { name: "Kupang", province: "Nusa Tenggara Timur", x: 66, y: 56 },
  { name: "Ambon", province: "Maluku", x: 74, y: 32 },
  { name: "Sofifi", province: "Maluku Utara", x: 72, y: 20 },
  { name: "Jayapura", province: "Papua", x: 86, y: 26 },
  { name: "Manokwari", province: "Papua Barat", x: 78, y: 18 },
  { name: "Merauke", province: "Papua Selatan", x: 88, y: 38 },
  { name: "Nabire", province: "Papua Tengah", x: 82, y: 30 },
  { name: "Wamena", province: "Papua Pegunungan", x: 86, y: 32 },
  { name: "Sorong", province: "Papua Barat Daya", x: 76, y: 24 },
]

// Helper to load province positions from localStorage (fallback to hardcoded defaults)
function loadProvincePositions() {
  if (typeof window === "undefined") return PROVINCE_CAPITALS
  try {
    const saved = localStorage.getItem("provinceDotPositions")
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length === PROVINCE_CAPITALS.length) {
        return parsed
      }
    }
  } catch {}
  return PROVINCE_CAPITALS
}

export default function HomePage() {
  const { user, loading } = useAuth()
  // Use saved dot positions from localStorage (edited via admin map editor)
  const [savedProvinceCapitals, setSavedProvinceCapitals] = useState<typeof PROVINCE_CAPITALS>([])
  
  useEffect(() => {
    setSavedProvinceCapitals(loadProvincePositions())
  }, [])
  
  const PROVINCE_CAPITALS_ACTIVE = savedProvinceCapitals.length > 0 ? savedProvinceCapitals : PROVINCE_CAPITALS
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [showAllNews, setShowAllNews] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [locationFilter, setLocationFilter] = useState({
    province: "",
    city: "",
    district: "",
    village: "",
    rw: "",
    rt: "",
  })
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([])
  const [availableVillages, setAvailableVillages] = useState<string[]>([])
  const [showLocationFilter, setShowLocationFilter] = useState(false)
  const [showSourceFilter, setShowSourceFilter] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
  const [showMapPanel, setShowMapPanel] = useState(false)
  const [selectedDot, setSelectedDot] = useState<string>("")
  const [hoveredDot, setHoveredDot] = useState<string>("")
  const [mapImageError, setMapImageError] = useState(false)

  // Touch gesture state
  const touchStartY = useRef(0)
  const touchCurrentY = useRef(0)
  const isTouching = useRef(false)
  const pullDistance = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullVisualOffset, setPullVisualOffset] = useState(0)
  const [desktopOverOffset, setDesktopOverOffset] = useState(0)
  const [atTop, setAtTop] = useState(false)
  const [atBottom, setAtBottom] = useState(false)
  const newsSectionRef = useRef<HTMLDivElement>(null)

  // Handle source click from dropdown
  const handleSourceClick = useCallback((sourceKey: string) => {
    if (sourceFilter.includes(sourceKey)) {
      setSourceFilter(sourceFilter.filter(s => s !== sourceKey))
    } else {
      setSourceFilter([...sourceFilter, sourceKey])
    }
    setShowAllNews(false)
  }, [sourceFilter])

  // Update available cities/districts/villages when location filter changes
  useEffect(() => {
    if (locationFilter.province) {
      setAvailableCities(getCities(locationFilter.province))
    } else {
      setAvailableCities([])
    }
    if (locationFilter.province && locationFilter.city) {
      setAvailableDistricts(getDistricts(locationFilter.province, locationFilter.city))
    } else {
      setAvailableDistricts([])
    }
    if (locationFilter.district) {
      setAvailableVillages(getVillageSuggestions(locationFilter.district))
    } else {
      setAvailableVillages([])
    }
  }, [locationFilter.province, locationFilter.city, locationFilter.district])

  // Fetch news with location filter and source filter
  const fetchNewsWithFilter = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      const params = new URLSearchParams()
      params.set('limit', String(INITIAL_LIMIT))
      params.set('page', String(pageNum))
      if (isRefresh) params.set('refresh', 'true')
      if (locationFilter.province) params.set('province', locationFilter.province)
      if (locationFilter.city) params.set('city', locationFilter.city)
      if (locationFilter.district) params.set('district', locationFilter.district)
      if (sourceFilter.length > 0) params.set('sources', sourceFilter.join(','))

      const res = await fetch(`/api/news?${params.toString()}`)
      const data = await res.json()
      return data
    } catch (error) {
      console.error("Failed to fetch news:", error)
      return null
    }
  }, [locationFilter, sourceFilter])

  // Desktop wheel overscroll state
  const wheelAccumulator = useRef(0)
  const wheelActive = useRef(false)

  // Check scroll position to know if at top or bottom
  const checkScrollPosition = useCallback(() => {
    if (newsSectionRef.current) {
      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight

      setAtTop(scrollY <= 10)
      setAtBottom(scrollY + viewportHeight >= docHeight - 50)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', checkScrollPosition, { passive: true })
    checkScrollPosition()
    return () => window.removeEventListener('scroll', checkScrollPosition)
  }, [checkScrollPosition])

  // Vibrate for haptic feedback (mobile)
  const vibrate = useCallback((ms: number = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms)
    }
  }, [])

  // Handle clicking a province dot on the map
  const handleProvinceClick = useCallback((province: string) => {
    if (selectedDot === province) {
      setSelectedDot("")
      setLocationFilter(prev => ({ ...prev, province: "", city: "", district: "", village: "", rw: "", rt: "" }))
    } else {
      setSelectedDot(province)
      setLocationFilter(prev => ({ ...prev, province, city: "", district: "", village: "", rw: "", rt: "" }))
    }
    setShowAllNews(false)
  }, [selectedDot])

  // Fetch initial news
  useEffect(() => {
    async function fetchNews() {
      try {
        setNewsLoading(true)
        const data = await fetchNewsWithFilter(1)
        if (data) {
          setNews(data.items || [])
          setPagination(data.pagination || null)
        }
      } catch (error) {
        console.error("Failed to fetch news:", error)
      }
      setNewsLoading(false)
    }
    fetchNews()
  }, [fetchNewsWithFilter])

  // Pull-to-refresh: fetch newest news from top
  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const data = await fetchNewsWithFilter(1, true)
      if (data) {
        setNews(data.items || [])
        setPagination(data.pagination || null)
        setShowAllNews(false)
      }
      vibrate(20)
    } catch (error) {
      console.error("Failed to refresh news:", error)
    }
    setRefreshing(false)
  }, [refreshing, vibrate, fetchNewsWithFilter])

  // Load more: fetch next page of news (older items)
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !pagination?.hasMore) return
    setLoadingMore(true)
    const nextPage = (pagination?.page || 1) + 1
    try {
      const data = await fetchNewsWithFilter(nextPage)
      if (data) {
        const currentIds = new Set(news.map(n => n.id))
        const newItems = (data.items || []).filter((item: NewsItem) => !currentIds.has(item.id))
        setNews(prev => [...prev, ...newItems])
        setPagination(data.pagination || null)
        setShowAllNews(true)
      }
      vibrate(15)
    } catch (error) {
      console.error("Failed to load more news:", error)
    }
    setLoadingMore(false)
  }, [loadingMore, pagination, news, vibrate, fetchNewsWithFilter])

  // Desktop wheel handler
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isTouching.current) return
    const deltaY = e.deltaY
    if (deltaY < 0 && atTop && news.length > 0 && !refreshing) {
      e.preventDefault()
      wheelAccumulator.current = Math.min(Math.abs(deltaY) * 0.5 + wheelAccumulator.current, 120)
      setDesktopOverOffset(wheelAccumulator.current)
      wheelActive.current = true
      if (wheelAccumulator.current >= 80) {
        wheelAccumulator.current = 0
        setDesktopOverOffset(0)
        wheelActive.current = false
        handleRefresh()
      }
    } else if (deltaY > 0 && atBottom && pagination?.hasMore && news.length > 0 && !loadingMore) {
      e.preventDefault()
      wheelAccumulator.current = Math.min(deltaY * 0.5 + wheelAccumulator.current, 120)
      setDesktopOverOffset(-wheelAccumulator.current)
      wheelActive.current = true
      if (wheelAccumulator.current >= 80) {
        wheelAccumulator.current = 0
        setDesktopOverOffset(0)
        wheelActive.current = false
        handleLoadMore()
      }
    } else {
      if (wheelActive.current) {
        wheelAccumulator.current = 0
        setDesktopOverOffset(0)
        wheelActive.current = false
      }
    }
  }, [atTop, atBottom, pagination, news, refreshing, loadingMore, handleRefresh, handleLoadMore])

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window
    if (!isTouchDevice) {
      window.addEventListener('wheel', handleWheel, { passive: false })
    }
    return () => window.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isTouching.current = true
    touchStartY.current = e.touches[0].clientY
    touchCurrentY.current = e.touches[0].clientY
    pullDistance.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouching.current) return
    touchCurrentY.current = e.touches[0].clientY
    const deltaY = touchCurrentY.current - touchStartY.current
    if (deltaY > 0 && atTop && news.length > 0) {
      pullDistance.current = Math.min(deltaY * 0.5, 120)
      setPullVisualOffset(pullDistance.current)
    } else if (deltaY < 0 && atBottom && pagination?.hasMore && news.length > 0) {
      pullDistance.current = Math.min(Math.abs(deltaY) * 0.5, 120)
      setPullVisualOffset(-pullDistance.current)
    } else {
      setPullVisualOffset(0)
    }
  }, [atTop, atBottom, news, pagination])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    isTouching.current = false
    const deltaY = touchCurrentY.current - touchStartY.current
    if (deltaY > 60 && atTop && news.length > 0) {
      handleRefresh()
    } else if (deltaY < -60 && atBottom && pagination?.hasMore && news.length > 0) {
      handleLoadMore()
    }
    setPullVisualOffset(0)
    pullDistance.current = 0
  }, [atTop, atBottom, news, pagination, handleRefresh, handleLoadMore])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const displayedNews = showAllNews ? news : news.slice(0, INITIAL_LIMIT)
  const selectedProvinceName = PROVINCE_CAPITALS_ACTIVE.find(p => p.province === selectedDot)?.name || selectedDot

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicators */}
      {pullVisualOffset > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform" style={{ transform: `translateY(${pullVisualOffset}px)` }}>
          <div className="flex items-center gap-2 rounded-full bg-slate-800/90 border border-cyan-400/30 px-4 py-2 mt-2 backdrop-blur">
            {refreshing ? (
              <><div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"></div><span className="text-sm text-cyan-200">Refreshing...</span></>
            ) : (
              <><svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span className="text-sm text-slate-300">Release to refresh</span></>
            )}
          </div>
        </div>
      )}
      {pullVisualOffset < 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center transition-transform" style={{ transform: `translateY(${-pullVisualOffset}px)` }}>
          <div className="flex items-center gap-2 rounded-full bg-slate-800/90 border border-emerald-400/30 px-4 py-2 mb-2 backdrop-blur">
            {loadingMore ? (
              <><div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent"></div><span className="text-sm text-emerald-200">Loading older news...</span></>
            ) : (
              <><svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg><span className="text-sm text-slate-300">Release to load older news</span></>
            )}
          </div>
        </div>
      )}

      {/* Map Panel Overlay (left side) */}
      {showMapPanel && (
        <div className="fixed left-0 top-0 h-screen w-[400px] lg:w-[450px] z-40 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl transform transition-transform duration-300">
          <div className="p-4 lg:p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Select Region</h2>
              <button
                onClick={() => {
                  setShowMapPanel(false)
                  setSelectedDot("")
                  setLocationFilter(prev => ({ ...prev, province: "", city: "", district: "", village: "", rw: "", rt: "" }))
                }}
                className="text-slate-400 hover:text-white transition p-2 rounded-lg border border-white/10 hover:border-white/20"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Map Image with Dots */}
            <div className="relative w-full mb-4 bg-slate-950 rounded-xl overflow-hidden" style={{ paddingBottom: "75%" }}>
              {!mapImageError ? (
                <img
                  src="/indonesia-map.png"
                  alt="Indonesia Map"
                  className="absolute inset-0 w-full h-full object-contain"
                  draggable={false}
                  onError={() => setMapImageError(true)}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50" />
              )}
              
              <svg
                viewBox="0 0 100 75"
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                {PROVINCE_CAPITALS_ACTIVE.map((cap) => {
                  const isSelected = selectedDot === cap.province
                  const isHovered = hoveredDot === cap.province
                  const dotRadius = isSelected ? 2.2 : isHovered ? 1.8 : 1.2

                  return (
                    <g key={cap.province}>
                      {isSelected && (
                        <circle
                          cx={cap.x}
                          cy={cap.y}
                          r={4}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="0.3"
                          opacity="0.4"
                        >
                          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        cx={cap.x}
                        cy={cap.y}
                        r={dotRadius}
                        fill={isSelected ? "#ef4444" : "#dc2626"}
                        stroke={isSelected ? "#fca5a5" : isHovered ? "#f87171" : "#7f1d1d"}
                        strokeWidth="0.3"
                        className="cursor-pointer transition-all duration-200"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleProvinceClick(cap.province)}
                        onMouseEnter={() => setHoveredDot(cap.province)}
                        onMouseLeave={() => setHoveredDot("")}
                      />
                      {(isHovered || isSelected) && (
                        <text
                          x={cap.x}
                          y={cap.y - (isSelected ? 4 : 3.5)}
                          textAnchor="middle"
                          fill={isSelected ? "#fca5a5" : "#94a3b8"}
                          fontSize="1.5"
                          fontWeight={isSelected ? "bold" : "normal"}
                          className="pointer-events-none"
                        >
                          {`${cap.province} (${cap.name})`}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Province list */}
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin grid grid-cols-2 gap-1">
              {PROVINCE_CAPITALS_ACTIVE.map((cap) => (
                <button
                  key={cap.province}
                  onClick={() => handleProvinceClick(cap.province)}
                  className={`text-left text-xs px-2 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    selectedDot === cap.province
                      ? "bg-red-900/30 text-red-200 border border-red-700/30"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedDot === cap.province ? "bg-red-400" : "bg-red-700"}`} />
                  {`${cap.province} (${cap.name})`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-sm text-slate-500">v.2026.1.0</div>
          <div className="flex items-center gap-4">
            {showMapPanel && (
              <button
                onClick={() => {
                  setShowMapPanel(false)
                  setSelectedDot("")
                  setLocationFilter(prev => ({ ...prev, province: "", city: "", district: "", village: "", rw: "", rt: "" }))
                }}
                className="text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
              >
                Close Map
              </button>
            )}
            {!showMapPanel && (
              <button
                onClick={() => setShowMapPanel(true)}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition px-3 py-1.5 rounded-lg border border-cyan-400/30 hover:border-cyan-400/50"
              >
                Show Map
              </button>
            )}
            {user ? (
              <div className="text-sm text-slate-400">
                {user.name} ({user.role}) &middot;{" "}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 hover:underline">
                  Dashboard
                </Link>
              </div>
            ) : (
              <Link href="/login" className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline">
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            {user ? "Welcome to Sub-Con" : "Security Risk Management System."}
          </h1>
          <p className="text-xl text-slate-300">Mitigate your risks. Secure your surroundings.</p>
        </div>

        {/* Dashboard Cards (only for logged in users) */}
        {user && (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            <Link
              href={
                user.role === "ADMIN"
                  ? "/admin"
                  : user.role === "INPUTTER"
                  ? "/inputter"
                  : "/viewer"
              }
              className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur hover:bg-white/10 transition group"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-300 transition">
                  Dashboard
                </h2>
                <p className="text-sm text-slate-400">View your personalized dashboard</p>
              </div>
            </Link>

            <Link
              href="/admin/branches"
              className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur hover:bg-white/10 transition group"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🏢</div>
                <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-300 transition">
                  Branches
                </h2>
                <p className="text-sm text-slate-400">Manage branch configurations</p>
              </div>
            </Link>

            {user.role === "ADMIN" && (
              <Link
                href="/admin/users"
                className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur hover:bg-white/10 transition group"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">👥</div>
                  <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-300 transition">
                    Users
                  </h2>
                  <p className="text-sm text-slate-400">Manage user accounts</p>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* News Section */}
        <div className="max-w-6xl mx-auto" ref={newsSectionRef}>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Security News</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {selectedDot ? `News from ${selectedProvinceName}` : "Latest security & compliance news across Indonesia"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {/* Source Filter Toggle */}
                <button
                  onClick={() => setShowSourceFilter(!showSourceFilter)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    showSourceFilter || sourceFilter.length > 0
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 3v18" />
                    </svg>
                    {sourceFilter.length > 0 ? `${sourceFilter.length} Source${sourceFilter.length > 1 ? 's' : ''}` : "Filter by News Source"}
                  </span>
                </button>
                {/* Location Filter Toggle */}
                <button
                  onClick={() => setShowLocationFilter(!showLocationFilter)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    showLocationFilter || locationFilter.province
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {locationFilter.province ? locationFilter.city || locationFilter.province : "Filter by Location"}
                  </span>
                </button>
                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
                >
                  {refreshing ? (
                    <span className="flex items-center gap-1">
                      <div className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-cyan-400 border-t-transparent"></div>
                      Refreshing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </span>
                  )}
                </button>
                {news.length > INITIAL_LIMIT && (
                  <button
                    onClick={() => setShowAllNews(!showAllNews)}
                    className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    {showAllNews ? "Show Less" : "Show All"}
                  </button>
                )}
              </div>
            </div>

            {/* Source Filter Panel */}
            {showSourceFilter && (
              <div className="mb-6 p-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-cyan-200">Filter by News Source</h3>
                  <button
                    onClick={() => {
                      setSourceFilter([])
                      setShowSourceFilter(false)
                    }}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    Clear Filter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {NEWS_SOURCES.map((source) => (
                    <button
                      key={source.key}
                      onClick={() => {
                        handleSourceClick(source.key)
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        sourceFilter.includes(source.key)
                          ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {source.label}
                    </button>
                  ))}
                </div>
                {sourceFilter.length > 0 && (
                  <div className="mt-3 text-xs text-slate-400">
                    Showing news from: <span className="text-cyan-300 ml-1">{sourceFilter.map(s => NEWS_SOURCES.find(ns => ns.key === s)?.label || s).join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Location Filter Panel */}
            {showLocationFilter && (
              <div className="mb-6 p-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-emerald-200">Filter by Location</h3>
                  <button
                    onClick={() => {
                      setLocationFilter({ province: "", city: "", district: "", village: "", rw: "", rt: "" })
                      setShowLocationFilter(false)
                    }}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    Clear Filter
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Province */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Province</label>
                    <select
                      value={locationFilter.province}
                      onChange={(e) => setLocationFilter({ province: e.target.value, city: "", district: "", village: "", rw: "", rt: "" })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
                    >
                      <option value="">All Provinces</option>
                      {getProvinces().map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* City/Regency */}
                  {locationFilter.province && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">City/Regency</label>
                      <select
                        value={locationFilter.city}
                        onChange={(e) => setLocationFilter(prev => ({ ...prev, city: e.target.value, district: "", village: "", rw: "", rt: "" }))}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
                      >
                        <option value="">All Cities</option>
                        {availableCities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* District */}
                  {locationFilter.city && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">District</label>
                      <select
                        value={locationFilter.district}
                        onChange={(e) => setLocationFilter(prev => ({ ...prev, district: e.target.value, village: "", rw: "", rt: "" }))}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
                      >
                        <option value="">All Districts</option>
                        {availableDistricts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Village */}
                  {locationFilter.district && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Village</label>
                      <select
                        value={locationFilter.village}
                        onChange={(e) => setLocationFilter(prev => ({ ...prev, village: e.target.value, rw: "", rt: "" }))}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
                      >
                        <option value="">All Villages</option>
                        {availableVillages.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* RW */}
                  {locationFilter.village && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">RW</label>
                      <select
                        value={locationFilter.rw}
                        onChange={(e) => setLocationFilter(prev => ({ ...prev, rw: e.target.value, rt: "" }))}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
                      >
                        <option value="">All RW</option>
                        {getRWOptions().map(rw => (
                          <option key={rw} value={rw}>RW {rw}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* RT */}
                  {locationFilter.rw && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">RT</label>
                      <select
                        value={locationFilter.rt}
                        onChange={(e) => setLocationFilter(prev => ({ ...prev, rt: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
                      >
                        <option value="">All RT</option>
                        {getRTOptions().map(rt => (
                          <option key={rt} value={rt}>RT {rt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {/* Active Filter Summary */}
                {locationFilter.province && (
                  <div className="mt-3 text-xs text-slate-400">
                    Showing news from:
                    <span className="text-emerald-300 ml-1">
                      {locationFilter.province}
                      {locationFilter.city ? ` > ${locationFilter.city}` : ""}
                      {locationFilter.district ? ` > ${locationFilter.district}` : ""}
                      {locationFilter.village ? ` > ${locationFilter.village}` : ""}
                      {locationFilter.rw ? ` > RW ${locationFilter.rw}` : ""}
                      {locationFilter.rt ? ` > RT ${locationFilter.rt}` : ""}
                    </span>
                  </div>
                )}
              </div>
            )}

            {newsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-400 border-t-transparent"></div>
                <p className="text-slate-400 mt-4">Loading news...</p>
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No security news available at the moment.</p>
                {selectedDot && (
                  <button
                    onClick={() => {
                      setSelectedDot("")
                      setLocationFilter(prev => ({ ...prev, province: "", city: "", district: "", village: "", rw: "", rt: "" }))
                    }}
                    className="mt-3 text-sm text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Clear province filter to see all news
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {displayedNews.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 hover:bg-slate-950/80 transition group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="inline-flex rounded-full border border-cyan-700/50 bg-cyan-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-300">
                          {item.source}
                        </span>
                        {item.security?.isRelevant && (
                          <div className="flex gap-1">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_LABELS[item.security.severity as keyof typeof SEVERITY_LABELS]?.bgColor || 'bg-slate-900/30 border-slate-700/50'} ${SEVERITY_LABELS[item.security.severity as keyof typeof SEVERITY_LABELS]?.color || 'text-slate-300'}`}>
                              {SEVERITY_LABELS[item.security.severity as keyof typeof SEVERITY_LABELS]?.label || item.security.severity}
                            </span>
                            <span className="inline-flex rounded-full border border-emerald-700/50 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                              {item.security.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-white mb-2 group-hover:text-cyan-300 transition line-clamp-2">
                        {item.headline}
                      </h3>
                      <p className="text-sm text-slate-400 mb-3 line-clamp-3">{item.summary}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{item.category}</span>
                        <span title={new Date(item.timestamp).toLocaleString()}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' '}
                          {formatDateID(item.timestamp)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>

                {pagination?.hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent"></div>
                          Loading older news...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          Load Older News
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {pagination && (
                  <div className="mt-4 text-center text-xs text-slate-600">
                    Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">© F4W. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}