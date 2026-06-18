"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface Incident {
  id: string
  title: string
  description: string
  severity: string
  date: string
  location: string | null
  status: string
  branch: { id: string; name: string }
  reportedBy: { id: string; name: string }
  createdAt: string
}

export default function InputterIncidentsPage() {
  const { user, loading: authLoading } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [severity, setSeverity] = useState("low")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [location, setLocation] = useState("")
  const [status, setStatus] = useState("open")
  const [submitting, setSubmitting] = useState(false)

  async function fetchIncidents() {
    const res = await fetch("/api/data/incidents")
    const data = await res.json()
    setIncidents(data.incidents || [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchIncidents()
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/data/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, severity, date, location, status }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create incident report")
        setSubmitting(false)
        return
      }
      setSuccess("Incident report created successfully")
      setTitle("")
      setDescription("")
      setSeverity("low")
      setDate(new Date().toISOString().split("T")[0])
      setLocation("")
      setStatus("open")
      setShowForm(false)
      await fetchIncidents()
    } catch {
      setError("An error occurred")
    }
    setSubmitting(false)
  }

  const severityColors: Record<string, string> = {
    low: "border-slate-700/50 bg-slate-900/30 text-slate-300",
    medium: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
    high: "border-orange-700/50 bg-orange-900/30 text-orange-300",
    critical: "border-red-700/50 bg-red-900/30 text-red-300",
  }

  const statusColors: Record<string, string> = {
    open: "border-red-700/50 bg-red-900/30 text-red-300",
    investigating: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
    resolved: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
    closed: "border-slate-700/50 bg-slate-900/30 text-slate-300",
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
      <Sidebar role={user.role} branchName={user.branch?.name} />

      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Incident Reports
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Log and track security incidents for {user.branch?.name}
                </p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20"
              >
                {showForm ? "Cancel" : "+ New Incident"}
              </button>
            </div>
          </section>

          {/* Messages */}
          {error && (
            <div className="rounded-2xl border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-700/50 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">{success}</div>
          )}

          {/* Create Form */}
          {showForm && (
            <section className="rounded-[28px] border border-cyan-400/20 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">New Incident Report</h2>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Brief description of the incident" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none resize-none"
                    placeholder="Detailed description of the incident" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Severity</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Where the incident occurred" />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" disabled={submitting}
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50">
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Incidents List */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4">
              Recent Incidents ({incidents.length})
            </h2>
            {incidents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No incident reports yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div key={incident.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{incident.title}</h3>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityColors[incident.severity] || severityColors.low}`}>
                            {incident.severity}
                          </span>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[incident.status] || statusColors.open}`}>
                            {incident.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{incident.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>📅 {new Date(incident.date).toLocaleDateString()}</span>
                          {incident.location && <span>📍 {incident.location}</span>}
                          <span>👤 {incident.reportedBy.name}</span>
                        </div>
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