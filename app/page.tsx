"use client"

import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { SEVERITY_LABELS } from "@/lib/securityClassifier"

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

export default function HomePage() {
  const { user, loading } = useAuth()
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [showAllNews, setShowAllNews] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

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

  // Fetch initial news
  useEffect(() => {
    async function fetchNews() {
      try {
        setNewsLoading(true)
        const res = await fetch(`/api/news?limit=${INITIAL_LIMIT}&page=1`)
        const data = await res.json()
        setNews(data.items || [])
        setPagination(data.pagination || null)
      } catch (error) {
        console.error("Failed to fetch news:", error)
      }
      setNewsLoading(false)
    }
    fetchNews()
  }, [])

  // Pull-to-refresh: fetch newest news from top
  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await fetch(`/api/news?limit=${INITIAL_LIMIT}&page=1&refresh=true`)
      const data = await res.json()
      setNews(data.items || [])
      setPagination(data.pagination || null)
      setShowAllNews(false)
      vibrate(20)
    } catch (error) {
      console.error("Failed to refresh news:", error)
    }
    setRefreshing(false)
  }, [refreshing, vibrate])

  // Load more: fetch next page of news (older items)
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !pagination?.hasMore) return
    setLoadingMore(true)
    const nextPage = (pagination?.page || 1) + 1
    try {
      const res = await fetch(`/api/news?limit=${INITIAL_LIMIT}&page=${nextPage}&showAll=${showAllNews}`)
      const data = await res.json()
      const currentIds = new Set(news.map(n => n.id))
      const newItems = (data.items || []).filter((item: NewsItem) => !currentIds.has(item.id))
      setNews(prev => [...prev, ...newItems])
      setPagination(data.pagination || null)
      vibrate(15)
    } catch (error) {
      console.error("Failed to load more news:", error)
    }
    setLoadingMore(false)
  }, [loadingMore, pagination, news, showAllNews, vibrate])

  // Desktop wheel handler – same logic as touch but for mouse scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    // Ignore if touch device is handling this
    if (isTouching.current) return

    const deltaY = e.deltaY // positive = scroll down, negative = scroll up

    if (deltaY < 0 && atTop && news.length > 0 && !refreshing) {
      // Scrolling UP past top → pull-to-refresh
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
      // Scrolling DOWN past bottom → load more
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
      // Reset accumulator when not overscrolling
      if (wheelActive.current) {
        wheelAccumulator.current = 0
        setDesktopOverOffset(0)
        wheelActive.current = false
      }
    }
  }, [atTop, atBottom, pagination, news, refreshing, loadingMore, handleRefresh, handleLoadMore])

  useEffect(() => {
    // Only attach wheel listener on desktop (no touch support)
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

    // Swipe DOWN at top → pull-to-refresh
    if (deltaY > 0 && atTop && news.length > 0) {
      pullDistance.current = Math.min(deltaY * 0.5, 120) // dampened pull distance, max 120px
      setPullVisualOffset(pullDistance.current)
    }
    // Swipe UP at bottom → load more (only if has more)
    else if (deltaY < 0 && atBottom && pagination?.hasMore && news.length > 0) {
      pullDistance.current = Math.min(Math.abs(deltaY) * 0.5, 120) // dampened
      setPullVisualOffset(-pullDistance.current)
    } else {
      setPullVisualOffset(0)
    }
  }, [atTop, atBottom, news, pagination])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    isTouching.current = false
    const deltaY = touchCurrentY.current - touchStartY.current

    // Pulled down far enough at top → refresh
    if (deltaY > 60 && atTop && news.length > 0) {
      handleRefresh()
    }
    // Pulled up far enough at bottom → load more
    else if (deltaY < -60 && atBottom && pagination?.hasMore && news.length > 0) {
      handleLoadMore()
    }

    // Reset visual
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

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator (mobile touch) */}
      {pullVisualOffset > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform"
          style={{ transform: `translateY(${pullVisualOffset}px)` }}
        >
          <div className="flex items-center gap-2 rounded-full bg-slate-800/90 border border-cyan-400/30 px-4 py-2 mt-2 backdrop-blur">
            {refreshing ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"></div>
                <span className="text-sm text-cyan-200">Refreshing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm text-slate-300">Release to refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desktop overscroll indicator (scroll past top) */}
      {desktopOverOffset > 0 && !pullVisualOffset && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform"
          style={{ transform: `translateY(${desktopOverOffset}px)` }}
        >
          <div className="flex items-center gap-2 rounded-full bg-slate-800/90 border border-cyan-400/30 px-4 py-2 mt-2 backdrop-blur">
            {refreshing ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"></div>
                <span className="text-sm text-cyan-200">Refreshing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-cyan-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="text-sm text-slate-300">Scroll more to refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Load-more indicator at bottom (mobile touch) */}
      {pullVisualOffset < 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center transition-transform"
          style={{ transform: `translateY(${-pullVisualOffset}px)` }}
        >
          <div className="flex items-center gap-2 rounded-full bg-slate-800/90 border border-emerald-400/30 px-4 py-2 mb-2 backdrop-blur">
            {loadingMore ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent"></div>
                <span className="text-sm text-emerald-200">Loading older news...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm text-slate-300">Release to load older news</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desktop load-more indicator (scroll past bottom) */}
      {desktopOverOffset < 0 && !pullVisualOffset && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center transition-transform"
          style={{ transform: `translateY(${-desktopOverOffset}px)` }}
        >
          <div className="flex items-center gap-2 rounded-full bg-slate-800/90 border border-emerald-400/30 px-4 py-2 mb-2 backdrop-blur">
            {loadingMore ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent"></div>
                <span className="text-sm text-emerald-200">Loading older news...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm text-slate-300">Scroll more to load older news</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-16">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-sm text-slate-500">v.2026.1.0</div>
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

        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            {user ? `Welcome to Sub-Con` : "Security Risk Management System."}
          </h1>
          <p className="text-xl text-slate-300">Mitigate your risks. Secure your surroundings.</p>
        </div>

        {/* Dashboard Cards (only for logged in users) */}
        {user && (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Security News</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Latest security & compliance news from Detik, Kumparan, Kompas, and more
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {atTop ? '↓ Scroll past top to refresh' : ''}
                  {atBottom && pagination?.hasMore ? ' ↑ Scroll past bottom for older' : ''}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                {/* Manual refresh button */}
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
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                           {new Date(item.timestamp).toLocaleDateString()}
                         </span>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Load more button at bottom (for desktop / fallback) */}
                {pagination?.hasMore && !showAllNews && (
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
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500">© F4W. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}