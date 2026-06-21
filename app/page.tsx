"use client"

import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { useState, useEffect } from "react"

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
    score: number
  }
}

export default function HomePage() {
  const { user, loading } = useAuth()
  const [news, setNews] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [showAllNews, setShowAllNews] = useState(false)

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news")
        const data = await res.json()
        setNews(data.items || [])
      } catch (error) {
        console.error("Failed to fetch news:", error)
      }
      setNewsLoading(false)
    }
    fetchNews()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const displayedNews = showAllNews ? news : news.slice(0, 6)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
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
        <div className="max-w-6xl mx-auto">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Security News</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Latest security & compliance news from Detik, Kumparan, Kompas, and more
                </p>
              </div>
              {news.length > 6 && (
                <button
                  onClick={() => setShowAllNews(!showAllNews)}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  {showAllNews ? "Show Less" : "Show All"}
                </button>
              )}
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
                        <span className="inline-flex rounded-full border border-emerald-700/50 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                          {item.security.category}
                        </span>
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
