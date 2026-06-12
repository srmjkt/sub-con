"use client"

import { useMemo, useState } from 'react'
import { Clock3, ExternalLink, Radio, Shield, AlertTriangle, AlertOctagon } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import type { NewsItem, SecurityClassification } from '@/types/security'

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  return formatTime(timestamp)
}

function SecurityBadge({ security }: { security: SecurityClassification }) {
  if (!security || !security.isRelevant) return null

  const severityColors: Record<string, string> = {
    critical: 'border-red-700/50 bg-red-900/30 text-red-300',
    high: 'border-orange-700/50 bg-orange-900/30 text-orange-300',
    medium: 'border-yellow-700/50 bg-yellow-900/30 text-yellow-300',
    low: 'border-slate-700/50 bg-slate-900/30 text-slate-300',
  }

  const categoryLabels: Record<string, string> = {
    social_unrest: 'Social Unrest',
    economic_crisis: 'Economic Crisis',
    crime_terrorism: 'Crime & Terrorism',
    political_crisis: 'Political Crisis',
    disaster_emergency: 'Disaster',
    corporate_security: 'Corporate',
    cyber_security: 'Cyber Security',
    health_crisis: 'Health Crisis',
    energy_food_security: 'Energy & Food',
    regulatory_legal: 'Legal',
  }

  const severityIcons: Record<string, React.ReactNode> = {
    critical: <AlertOctagon className="h-3 w-3" />,
    high: <AlertTriangle className="h-3 w-3" />,
    medium: <AlertTriangle className="h-3 w-3" />,
    low: <Shield className="h-3 w-3" />,
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityColors[security.severity] || severityColors.low}`}
        title={`${security.severity.toUpperCase()} - ${security.reason}`}
      >
        {severityIcons[security.severity]}
        {categoryLabels[security.category] || security.category}
      </div>
      {security.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {security.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const { data, connection, isLive, toggleLive, lastFetchedAt, nextPollIn } =
    useRealtimeData('dashboard')
  const [showAllNews, setShowAllNews] = useState(false)

  // Compute stats
  const securityStats = useMemo(() => {
    const relevant = data.filter((u) => u.data.security?.isRelevant)
    const bySeverity: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    for (const u of relevant) {
      const s = u.data.security!
      bySeverity[s.severity] = (bySeverity[s.severity] || 0) + 1
      byCategory[s.category] = (byCategory[s.category] || 0) + 1
    }
    return { total: data.length, relevant: relevant.length, bySeverity, byCategory }
  }, [data])

  const displayedData = useMemo(() => {
    if (showAllNews) return data
    return data.filter((u) => u.data.security?.isRelevant)
  }, [data, showAllNews])

  const sourceItems = useMemo(() => {
    const grouped = {
      Kompas: [] as NewsItem[],
      Detik: [] as NewsItem[],
      Liputan6: [] as NewsItem[],
      CNNIndonesia: [] as NewsItem[],
      Kumparan: [] as NewsItem[],
    }
    for (const update of displayedData) {
      if (update.type === 'news') {
        const item = update.data as NewsItem
        grouped[item.source].push(item)
      }
    }
    return grouped
  }, [displayedData])

  const sources = ['Kompas', 'Detik', 'Liputan6', 'CNNIndonesia', 'Kumparan'] as const
  const sourceClasses = {
    Kompas: {
      heading: 'text-sky-300',
      category: 'text-sky-200',
      link: 'text-sky-200 hover:border-sky-400/40 hover:bg-sky-400/10',
    },
    Detik: {
      heading: 'text-amber-300',
      category: 'text-amber-200',
      link: 'text-amber-200 hover:border-amber-400/40 hover:bg-amber-400/10',
    },
    Liputan6: {
      heading: 'text-purple-300',
      category: 'text-purple-200',
      link: 'text-purple-200 hover:border-purple-400/40 hover:bg-purple-400/10',
    },
    CNNIndonesia: {
      heading: 'text-red-300',
      category: 'text-red-200',
      link: 'text-red-200 hover:border-red-400/40 hover:bg-red-400/10',
    },
    Kumparan: {
      heading: 'text-emerald-300',
      category: 'text-emerald-200',
      link: 'text-emerald-200 hover:border-emerald-400/40 hover:bg-emerald-400/10',
    },
  } as const

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8 lg:px-10">
        {/* HEADER */}
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Radio className="h-3.5 w-3.5" />
                Live security monitoring
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Sub-Con Dashboard
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Real-time security & safety intelligence from Kompas, Detik, Liputan6, CNNIndonesia, and Kumparan.
                  News is automatically filtered for threats to social, economic, and corporate security in Indonesia.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                <p className="text-slate-400">Connection</p>
                <p className="mt-1 font-medium text-white">
                  {connection.isConnected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                <p className="text-slate-400">Next poll</p>
                <p className="mt-1 font-mono font-medium text-white">
                  {nextPollIn > 0 ? `${nextPollIn}s` : '...'}
                </p>
              </div>
              {lastFetchedAt && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <p className="text-slate-400">Last fetch</p>
                  <p className="mt-1 font-mono font-medium text-emerald-300">
                    {formatRelativeTime(lastFetchedAt)}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={toggleLive}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20"
              >
                {isLive ? 'Pause updates' : 'Resume updates'}
              </button>
            </div>
          </div>
        </section>

        {/* SECURITY STATS BAR */}
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-slate-300">
                  Security intel: <strong className="text-white">{securityStats.relevant}</strong> items
                </span>
              </div>
              {securityStats.bySeverity.critical && (
                <span className="rounded-full border border-red-700/50 bg-red-900/30 px-2.5 py-0.5 text-xs font-semibold text-red-300">
                  Critical: {securityStats.bySeverity.critical}
                </span>
              )}
              {securityStats.bySeverity.high && (
                <span className="rounded-full border border-orange-700/50 bg-orange-900/30 px-2.5 py-0.5 text-xs font-semibold text-orange-300">
                  High: {securityStats.bySeverity.high}
                </span>
              )}
              {securityStats.bySeverity.medium && (
                <span className="rounded-full border border-yellow-700/50 bg-yellow-900/30 px-2.5 py-0.5 text-xs font-semibold text-yellow-300">
                  Medium: {securityStats.bySeverity.medium}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={showAllNews}
                  onChange={() => setShowAllNews((v) => !v)}
                  className="h-3.5 w-3.5 accent-cyan-400"
                />
                Show all news
              </label>
              <div className="text-xs text-slate-500">
                Filtered <strong>{data.length - securityStats.relevant}</strong> non-security items
              </div>
            </div>
          </div>
        </section>

        {/* SOURCE CARDS */}
        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {sources.map((source) => {
            const items = sourceItems[source].filter(
              (i) => showAllNews || i.security?.isRelevant,
            )
            const latest = items[0]
            const classes = sourceClasses[source]

            return (
              <article
                key={source}
                className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-black/20 backdrop-blur"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={`text-sm uppercase tracking-[0.2em] ${classes.heading}`}>
                      {source}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {items.length > 0 ? `Security intel` : `Monitoring`}
                    </h2>
                  </div>
                  {items.length > 0 && (
                    <div className="text-right text-xs text-slate-400">
                      {items.length} update{items.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {latest ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      {latest.security && (
                        <div className="mb-3">
                          <SecurityBadge security={latest.security} />
                        </div>
                      )}
                      <p className={`text-sm font-medium ${classes.category}`}>
                        {latest.category}
                      </p>
                      <h3 className="mt-3 text-xl font-semibold leading-snug text-white">
                        {latest.headline}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {latest.summary}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatTime(latest.timestamp)}
                        </span>
                        <a
                          href={latest.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 ${classes.link} transition`}
                        >
                          Open source
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-white">
                                {item.headline}
                              </p>
                              {item.security && (
                                <div className="mt-1">
                                  <SecurityBadge security={item.security} />
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 text-xs text-slate-400">
                              {formatTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{item.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col items-center gap-3 text-center">
                    <Shield className="h-8 w-8 text-slate-600" />
                    <p className="text-sm text-slate-400">
                      No security-relevant updates from {source} yet
                    </p>
                    <p className="text-xs text-slate-500">
                      Monitoring for threats, unrest, crisis indicators...
                    </p>
                  </div>
                )}
              </article>
            )
          })}
        </section>

        {/* ACTIVITY FEED */}
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
                Security Activity Feed
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Latest security & safety updates
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Showing {displayedData.length} security updates
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedData.slice(0, 6).map((update) => {
              if (update.type !== 'news') return null
              const item = update.data as NewsItem

              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {item.source}
                    </p>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  {item.security && (
                    <div className="mt-2">
                      <SecurityBadge security={item.security} />
                    </div>
                  )}
                  <p className="mt-3 text-base font-semibold text-white">
                    {item.headline}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {item.summary}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{item.category}</span>
                    <span>{formatTime(item.timestamp)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}