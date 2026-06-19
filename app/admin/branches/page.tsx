"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import Link from "next/link"

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

export default function AdminBranchesPage() {
  const { user, loading: authLoading } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [newBranchName, setNewBranchName] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  async function fetchBranches() {
    const res = await fetch("/api/admin/branches")
    const data = await res.json()
    setBranches(data.branches || [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchBranches()
  }, [user])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setCreating(true)
    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBranchName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create branch")
        setCreating(false)
        return
      }
      setNewBranchName("")
      await fetchBranches()
    } catch {
      setError("An error occurred")
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this branch? This will also delete all associated data.")) return
    try {
      await fetch(`/api/admin/branches/${id}`, { method: "DELETE" })
      await fetchBranches()
    } catch {
      setError("Failed to delete branch")
    }
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) return
    try {
      await fetch(`/api/admin/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      })
      setEditingId(null)
      setEditingName("")
      await fetchBranches()
    } catch {
      setError("Failed to update branch")
    }
  }

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
      <Sidebar role={user.role} />

      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Branch Management
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Create, edit, and delete branches
            </p>
          </section>

          {/* Create Branch Form */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4">Create New Branch</h2>
            {error && (
              <div className="mb-4 rounded-2xl border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Branch name (e.g., Branch A)"
                required
                className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition"
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Branch"}
              </button>
            </form>
          </section>

          {/* Branches List */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4">
              All Branches ({branches.length})
            </h2>
            {branches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No branches yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === branch.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdate(branch.id)}
                            className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-400/20"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditingName("") }}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-base font-semibold text-white">{branch.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
                            <span>{branch._count.users} users</span>
                            <span>•</span>
                            <span>{branch._count.incidentReports} incidents</span>
                            <span>•</span>
                            <span>{branch._count.attendanceRecords} attendance</span>
                            <span>•</span>
                            <span>{branch._count.trainings} trainings</span>
                          </div>
                        </>
                      )}
                    </div>
                    {editingId !== branch.id && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { setEditingId(branch.id); setEditingName(branch.name) }}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(branch.id)}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                        <Link
                          href={`/admin/branches/${branch.id}/module-config`}
                          className="rounded-xl border border-purple-400/30 bg-purple-400/10 px-3 py-2 text-sm text-purple-100 hover:bg-purple-400/20"
                        >
                          Customize
                        </Link>
                      </div>
                    )}
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