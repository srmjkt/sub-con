"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarProps {
  role: "ADMIN" | "INPUTTER" | "VIEWER"
  branchName?: string | null
}

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/branches", label: "Branches", icon: "🏢" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/incidents", label: "Incidents", icon: "⚠️" },
  { href: "/admin/attendance", label: "Attendance", icon: "📋" },
  { href: "/admin/trainings", label: "Trainings", icon: "📚" },
  { href: "/admin/simulations", label: "Simulations", icon: "🎯" },
  { href: "/admin/mock-drills", label: "Mock Drills", icon: "🚨" },
  { href: "/admin/inventory", label: "Inventory", icon: "📦" },
]

const inputterLinks = [
  { href: "/inputter", label: "Dashboard", icon: "📊" },
  { href: "/inputter/incidents", label: "Incidents", icon: "⚠️" },
  { href: "/inputter/attendance", label: "Attendance", icon: "📋" },
  { href: "/inputter/trainings", label: "Trainings", icon: "📚" },
  { href: "/inputter/simulations", label: "Simulations", icon: "🎯" },
  { href: "/inputter/mock-drills", label: "Mock Drills", icon: "🚨" },
  { href: "/inputter/inventory", label: "Inventory", icon: "📦" },
]

const viewerLinks = [
  { href: "/viewer", label: "Dashboard", icon: "📊" },
  { href: "/viewer/incidents", label: "Incidents", icon: "⚠️" },
  { href: "/viewer/attendance", label: "Attendance", icon: "📋" },
  { href: "/viewer/trainings", label: "Trainings", icon: "📚" },
  { href: "/viewer/simulations", label: "Simulations", icon: "🎯" },
  { href: "/viewer/mock-drills", label: "Mock Drills", icon: "🚨" },
  { href: "/viewer/inventory", label: "Inventory", icon: "📦" },
]

export function Sidebar({ role, branchName }: SidebarProps) {
  const pathname = usePathname()

  const links =
    role === "ADMIN"
      ? adminLinks
      : role === "INPUTTER"
        ? inputterLinks
        : viewerLinks

  const roleLabel =
    role === "ADMIN"
      ? "Administrator"
      : role === "INPUTTER"
        ? "Data Inputter"
        : "Data Viewer"

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/30">
            <span className="text-sm">🛡️</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Sub-Con</p>
            <p className="text-[10px] text-slate-400">{roleLabel}</p>
          </div>
        </div>

        {/* Branch info */}
        {branchName && (
          <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Active Branch
            </p>
            <p className="text-sm font-medium text-white truncate">
              {branchName}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" &&
                link.href !== "/inputter" &&
                link.href !== "/viewer" &&
                pathname.startsWith(link.href))

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive
                    ? "bg-cyan-400/10 text-cyan-200 border border-cyan-400/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" })
              window.location.href = "/login"
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20"
          >
            <span className="text-base">🚪</span>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}