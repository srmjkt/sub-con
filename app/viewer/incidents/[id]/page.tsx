"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { IncidentFileUpload } from "@/components/IncidentFileUpload"

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
  customFieldsData: Record<string, string> | null
  createdAt: string
}

export default function ViewerIncidentDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const incidentId = params.id as string
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!incidentId) return
    async function fetchIncident() {
      try {
        const res = await fetch(`/api/data/incidents/${incidentId}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Failed to fetch incident")
          setLoading(false)
          return
        }
        setIncident(data.incident)
      } catch {
        setError("An error occurred")
      }
      setLoading(false)
    }
    fetchIncident()
  }, [incidentId])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <Link href="/viewer/incidents" className="text-cyan-400 hover:underline">Back to incidents</Link>
        </div>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">Incident not found</p>
          <Link href="/viewer/incidents" className="text-cyan-400 hover:underline">Back to incidents</Link>
        </div>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role={user.role} branchName={user.branch?.name} />

      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back button */}
          <Link href="/viewer/incidents" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition">
            ← Back to incidents
          </Link>

          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-semibold tracking-tight text-white mb-3">
                  {incident.title}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityColors[incident.severity] || severityColors.low}`}>
                    {incident.severity}
                  </span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[incident.status] || statusColors.open}`}>
                    {incident.status}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Details */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h2>
              <p className="text-white whitespace-pre-wrap">{incident.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</h3>
                <p className="text-white">{new Date(incident.date).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Location</h3>
                <p className="text-white">{incident.location || "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Reported By</h3>
                <p className="text-white">{incident.reportedBy.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Branch</h3>
                <p className="text-white">{incident.branch.name}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Created At</h3>
              <p className="text-white text-sm">{new Date(incident.createdAt).toLocaleString()}</p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Custom Fields</h3>
              {incident.customFieldsData && Object.keys(incident.customFieldsData).length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(incident.customFieldsData).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-xs text-slate-500">{key}:</span>
                      <span className="text-sm ml-2 text-slate-300">{value || "(empty)"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No custom fields data</p>
              )}
            </div>
          </section>

          {/* Attachments (read-only) */}
          <IncidentFileUpload incidentId={incident.id} canUpload={false} />
        </div>
      </main>
    </div>
  )
}