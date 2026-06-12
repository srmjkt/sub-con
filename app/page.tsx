"use client"

import { useMemo } from 'react'
import { Clock3, ExternalLink, Radio } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import type { NewsItem } from '@/types/security'

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}

export default function Home() {
  const { data, connection, isLive, toggleLive } = useRealtimeData('dashboard')

  const sourceItems = useMemo(() => {
    const grouped = { Kompas: [] as NewsItem[], Detik: [] as NewsItem[], Liputan6: [] as NewsItem[], CNNIndonesia: [] as NewsItem[], Kumparan: [] as NewsItem[] }

    for (const update of data) {
      if (update.type === 'news') {
        const item = update.data as NewsItem
        grouped[item.source].push(item)
      }
    }

    return grouped
  }, [data])

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
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Radio className="h-3.5 w-3.5" />
                Live dashboard
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Sub-Con Dashboard
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Kompas, Detik, Liputan6, CNNIndonesia, and Kumparan updates streams live as news updates.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                <p className="text-slate-400">Connection</p>
                <p className="mt-1 font-medium text-white">{connection.isConnected ? 'Connected' : 'Disconnected'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                <p className="text-slate-400">Mode</p>
                <p className="mt-1 font-medium text-white">{isLive ? 'Live' : 'Paused'}</p>
              </div>
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

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {sources.map((source) => {
            const items = sourceItems[source]
            const latest = items[0]
            const classes = sourceClasses[source]

            return (
              <article key={source} className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-black/20 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={`text-sm uppercase tracking-[0.2em] ${classes.heading}`}>{source}</p>
                    <h2 className="mt-2 text-2xl font-semibold">Latest coverage</h2>
                  </div>
                  {latest ? <StatusBadge status={latest.status} /> : null}
                </div>

                {latest ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className={`text-sm font-medium ${classes.category}`}>{latest.category}</p>
                      <h3 className="mt-3 text-xl font-semibold leading-snug text-white">
                        {latest.headline}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{latest.summary}</p>
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
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white">{item.headline}</p>
                            <span className="text-xs text-slate-400">{formatTime(item.timestamp)}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{item.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-400">Waiting for {source} updates...</p>
                )}
              </article>
            )
          })}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Activity</p>
              <h2 className="mt-2 text-2xl font-semibold">Recent source updates</h2>
            </div>
            <p className="text-sm text-slate-400">Showing {data.length} updates</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.slice(0, 6).map((update) => {
              if (update.type !== 'news') return null

              const item = update.data as NewsItem

              return (
                <div key={item.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {item.source}
                    </p>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-white">{item.headline}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.summary}</p>
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
