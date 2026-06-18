"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface DashboardStats {
  incidents: number; attendance: number; trainings: number
  simulations: number; mockDrills: number; inventory: number
}

export default function ViewerDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      const res = await fetch("/api/dashboard")
      const data = await res.json()
      setStats(data.stats); setLoading(false)
    }
    fetchData()
  }, [user])

  if (authLoading || loading) return <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center"><div className="text-white">Loading...</div></div>
  if (!user) return null

  const statCards = [
    { label: "Incident Reports", value: stats?.incidents || 0, icon: "⚠️", href: "/viewer/incidents" },
    { label: "Attendance Records", value: stats?.attendance || 0, icon: "📋", href: "/viewer/attendance" },
    { label: "Trainings", value: stats?.trainings || 0, icon: "📚", href: "/viewer/trainings" },
    { label: "Simulations", value: stats?.simulations || 0, icon: "🎯", href: "/viewer/simulations" },
    { label: "Mock Drills", value: stats?.mockDrills || 0, icon: "🚨", href: "/viewer/mock-drills" },
    { label: "Inventory Items", value: stats?.inventory || 0, icon: "📦", href: "/viewer/inventory" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role={user.role} branchName={user.branch?.name} />
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200 mb-3">
                  Data Viewer
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">View Dashboard</h1>
                <p className="mt-2 text-sm text-slate-300">View data for {user.branch?.name || "your branch"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Welcome back,</p>
                <p className="text-lg font-medium text-white">{user.name}</p>
              </div>
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => (
              <a key={card.label} href={card.href} className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-black/20 backdrop-blur transition hover:border-emerald-400/30 hover:bg-slate-950/80">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{card.icon}</span>
                  <span className="text-3xl font-bold text-white">{card.value}</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">{card.label}</p>
                <p className="mt-1 text-xs text-emerald-400">Click to view →</p>
              </a>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}