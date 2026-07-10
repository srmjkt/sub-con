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
  { name: "Banda Aceh", province: "Aceh", x: 12, y: 8 },
  { name: "Medan", province: "Sumatera Utara", x: 16, y: 18 },
  { name: "Padang", province: "Sumatera Barat", x: 12, y: 30 },
  { name: "Pekanbaru", province: "Riau", x: 22, y: 22 },
  { name: "Tanjung Pinang", province: "Kepulauan Riau", x: 30, y: 25 },
  { name: "Jambi", province: "Jambi", x: 22, y: 33 },
  { name: "Palembang", province: "Sumatera Selatan", x: 26, y: 40 },
  { name: "Bengkulu", province: "Bengkulu", x: 18, y: 38 },
  { name: "Bandar Lampung", province: "Lampung", x: 26, y: 47 },
  { name: "Pangkal Pinang", province: "Kepulauan Bangka Belitung", x: 30, y: 34 },
  { name: "Serang", province: "Banten", x: 34, y: 44 },
  { name: "Jakarta", province: "DKI Jakarta", x: 38, y: 45 },
  { name: "Bandung", province: "Jawa Barat", x: 40, y: 47 },
  { name: "Semarang", province: "Jawa Tengah", x: 46, y: 46 },
  { name: "Yogyakarta", province: "Daerah Istimewa Yogyakarta", x: 44, y: 50 },
  { name: "Surabaya", province: "Jawa Timur", x: 54, y: 46 },
  { name: "Denpasar", province: "Bali", x: 58, y: 52 },
  { name: "Mataram", province: "Nusa Tenggara Barat", x: 60, y: 56 },
  { name: "Kupang", province: "Nusa Tenggara Timur", x: 70, y: 58 },
  { name: "Pontianak", province: "Kalimantan Barat", x: 38, y: 22 },
  { name: "Palangka Raya", province: "Kalimantan Tengah", x: 48, y: 30 },
  { name: "Banjarmasin", province: "Kalimantan Selatan", x: 50, y: 38 },
  { name: "Samarinda", province: "Kalimantan Timur", x: 58, y: 24 },
  { name: "Tanjung Selor", province: "Kalimantan Utara", x: 58, y: 16 },
  { name: "Manado", province: "Sulawesi Utara", x: 66, y: 12 },
  { name: "Gorontalo", province: "Gorontalo", x: 68, y: 18 },
  { name: "Palu", province: "Sulawesi Tengah", x: 62, y: 26 },
  { name: "Mamuju", province: "Sulawesi Barat", x: 60, y: 33 },
  { name: "Makassar", province: "Sulawesi Selatan", x: 64, y: 40 },
  { name: "Kendari", province: "Sulawesi Tenggara", x: 70, y: 36 },
  { name: "Ambon", province: "Maluku", x: 78, y: 34 },
  { name: "Sofifi", province: "Maluku Utara", x: 76, y: 22 },
  { name: "Jayapura", province: "Papua", x: 90, y: 28 },
  { name: "Manokwari", province: "Papua Barat", x: 82, y: 20 },
  { name: "Merauke", province: "Papua Selatan", x: 92, y: 40 },
  { name: "Nabire", province: "Papua Tengah", x: 86, y: 32 },
  { name: "Wamena", province: "Papua Pegunungan", x: 90, y: 34 },
  { name: "Sorong", province: "Papua Barat Daya", x: 80, y: 26 },
]

export default function HomePage() {
  const { user, loading } = useAuth()
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
  const [sourceFilter, setSourceFilter] = useState<string>("")
  const [selectedDot, setSelectedDot] = useState<string>("")
  const [hoveredDot, setHoveredDot] = useState<string>("")

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
      if (sourceFilter) params.set('source', sourceFilter)
      
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

      // At top: near scroll start
      setAtTop(scrollY <= 10)

      // At bottom: near the very bottom of the page
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
      // Deselect
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
  const selectedProvinceName = PROVINCE_CAPITALS.find(p => p.province === selectedDot)?.name || selectedDot

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
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

      {/* TOP BAR */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-500">v.2026.1.0</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              <span className="text-emerald-400 font-semibold">Sub-Con</span> — Security Risk Management
            </div>
            {user ? (
              <div className="text-sm text-slate-400">
                {user.name} ({user.role}) &middot;{" "}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 hover:underline">Dashboard</Link>
              </div>
            ) : (
              <Link href="/login" className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline">Sign In</Link>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: MAP LEFT + NEWS RIGHT */}
      <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-60px)]">
        {/* LEFT PANEL - Interactive Indonesia Map */}
        <div className="lg:w-[45%] xl:w-[40%] flex-shrink-0 p-4 lg:p-6 lg:sticky lg:top-0 lg:self-start lg:h-screen overflow-y-auto">
          <div className="rounded-[28px] border border-slate-700/50 bg-slate-900/60 p-4 lg:p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Indonesia</h2>
              {selectedDot && (
                <button
                  onClick={() => {
                    setSelectedDot("")
                    setLocationFilter(prev => ({ ...prev, province: "", city: "", district: "", village: "", rw: "", rt: "" }))
                  }}
                  className="text-xs text-slate-400 hover:text-white transition px-2 py-1 rounded-lg border border-white/10"
                >
                  Clear: {selectedProvinceName}
                </button>
              )}
            </div>
            <div className="relative w-full" style={{ paddingBottom: "75%" }}>
              {/* Background map image */}
              <img
                src="/indonesia-map.png"
                alt="Indonesia Map"
                className="absolute inset-0 w-full h-full object-cover rounded-xl"
                draggable={false}
              />
              
              {/* Interactive dots overlay */}
              <svg
                viewBox="0 0 100 75"
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Province dots */}
                {PROVINCE_CAPITALS.map((cap) => {
                  const isSelected = selectedDot === cap.province
                  const isHovered = hoveredDot === cap.province
                  const dotRadius = isSelected ? 2.2 : isHovered ? 1.8 : 1.2

                  return (
                    <g key={cap.province}>
                      {/* Glow effect for selected */}
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
                      {/* Dot */}
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
                      {/* Label on hover or selected */}
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
                          {cap.name}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Province legend / list below map */}
            <div className="mt-4 max-h-[200px] overflow-y-auto scrollbar-thin grid grid-cols-2 gap-1">
              {PROVINCE_CAPITALS.map((cap) => (
                <button
                  key={cap.province}
                  onClick={() => handleProvinceClick(cap.province)}
                  className={`text-left text-xs px-2 py-1 rounded-lg transition flex items-center gap-1.5 ${
                    selectedDot === cap.province
                      ? "bg-red-900/30 text-red-200 border border-red-700/30"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedDot === cap.province ? "bg-red-400" : "bg-red-700"}`} />
                  {cap.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - News Feed */}
        <div className="flex-1 min-w-0 p-4 lg:p-6">
          <div ref={newsSectionRef}>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 lg:p-6 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Security News</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {selectedDot
                      ? `News from ${selectedProvinceName}`
                      : "Latest security & compliance news across Indonesia"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {atTop ? '↓ Scroll past top to refresh' : ''}
                    {atBottom && pagination?.hasMore ? ' ↑ Scroll past bottom for older' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Source Filter */}
                  <div className="flex flex-wrap gap-1">
                    {NEWS_SOURCES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => { setSourceFilter(s.key); setShowAllNews(false) }}
                        className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                          sourceFilter === s.key
                            ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
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
    </div>
  )
}