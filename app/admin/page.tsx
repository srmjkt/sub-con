"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface DashboardStats {
  incidents: number
  attendance: number
  trainings: number
  simulations: number
  mockDrills: number
  inventory: number
}

interface Branch {
  id: string
  name: string
  _count: {
    users: number
    incidentReports: number
    attendanceRecords: number
    trainings: number
    simulations: number
    mockDrills: number
    inventories: number
  }
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      const [dashRes, branchesRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/admin/branches"),
      ])
      const dashData = await dashRes.json()
      const branchesData = await branchesRes.json()
      setStats(dashData.stats)
      setBranches(branchesData.branches || [])
      setLoading(false)
    }
    fetchData()
  }, [user])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  const statCards = [
    { label: "Total Branches", value: branches.length, icon: "🏢", color: "cyan" },
    { label: "Incident Reports", value: stats?.incidents || 0, icon: "⚠️", color: "red" },
    { label: "Attendance Records", value: stats?.attendance || 0, icon: "📋", color: "green" },
    { label: "Trainings", value: stats?.trainings || 0, icon: "📚", color: "blue" },
    { label: "Simulations", value: stats?.simulations || 0, icon: "🎯", color: "purple" },
    { label: "Mock Drills", value: stats?.mockDrills || 0, icon: "🚨", color: "orange" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role={user.role} />

      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200 mb-3">
                  Admin Panel
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Admin Dashboard
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Overview of all branches and their activities
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Welcome back,</p>
                <p className="text-lg font-medium text-white">{user.name}</p>
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-black/20 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{card.icon}</span>
                  <span className="text-3xl font-bold text-white">
                    {card.value}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-400">{card.label}</p>
              </div>
            ))}
          </section>

          {/* Branch Overview */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
                  Branch Overview
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  All Branches
                </h2>
              </div>
            </div>

            {branches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No branches created yet.</p>
                <p className="text-sm text-slate-500 mt-2">
                  Go to Branches page to create your first branch.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-3xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">
                        {branch.name}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {branch._count.users} user{branch._count.users !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <p className="text-lg font-bold text-red-300">{branch._count.incidentReports}</p>
                        <p className="text-[10px] text-slate-400">Incidents</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <p className="text-lg font-bold text-green-300">{branch._count.attendanceRecords}</p>
                        <p className="text-[10px] text-slate-400">Attendance</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                        <p className="text-lg font-bold text-blue-300">{branch._count.trainings}</p>
                        <p className="text-[10px] text-slate-400">Trainings</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}