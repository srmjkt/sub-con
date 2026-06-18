"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

interface ViewerDataPageProps<T> {
  title: string
  subtitle?: string
  apiEndpoint: string
  columns: Column<T>[]
  emptyMessage?: string
}

export function ViewerDataPage<T extends Record<string, unknown>>({
  title,
  subtitle,
  apiEndpoint,
  columns,
  emptyMessage = "No data available yet.",
}: ViewerDataPageProps<T>) {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      try {
        const res = await fetch(apiEndpoint)
        const json = await res.json()
        // The API returns different keys depending on the endpoint
        const dataKey = Object.keys(json).find((k) => Array.isArray(json[k]))
        if (dataKey) {
          setData(json[dataKey])
        }
      } catch {
        console.error("Failed to fetch data")
      }
      setLoading(false)
    }
    fetchData()
  }, [user, apiEndpoint])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role={user.role} branchName={user.branch?.name} />
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {subtitle || `View ${title.toLowerCase()} for ${user.branch?.name || "your branch"}`}
            </p>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4">{title} ({data.length})</h2>
            {data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">{emptyMessage}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {columns.map((col) => (
                        <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.map((item, index) => (
                      <tr key={index} className="hover:bg-white/5 transition">
                        {columns.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-slate-300">
                            {col.render ? col.render(item) : String(item[col.key] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}