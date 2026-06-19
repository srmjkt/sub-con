"use client"

import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Sub-Con</h1>
          <p className="text-xl text-slate-300 mb-8">Security & Compliance Management System</p>
          <Link
            href="/login"
            className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-8 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const dashboardUrl = {
    ADMIN: "/admin",
    INPUTTER: "/inputter",
    VIEWER: "/viewer",
  }[user.role]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Welcome to Sub-Con</h1>
          <p className="text-xl text-slate-300">Security & Compliance Management System</p>
          <p className="text-sm text-slate-400 mt-2">Logged in as: {user.name} ({user.role})</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Link
            href={dashboardUrl}
            className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur hover:bg-white/10 transition group"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-300 transition">Dashboard</h2>
              <p className="text-sm text-slate-400">View your personalized dashboard</p>
            </div>
          </Link>

          <Link
            href="/admin/branches"
            className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur hover:bg-white/10 transition group"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🏢</div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-300 transition">Branches</h2>
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
                <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-300 transition">Users</h2>
                <p className="text-sm text-slate-400">Manage user accounts</p>
              </div>
            </Link>
          )}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500">© 2026 Sub-Con. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}