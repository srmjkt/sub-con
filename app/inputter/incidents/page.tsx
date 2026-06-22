"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import Link from "next/link"
import { DynamicFields, CustomFieldDisplay } from "@/components/DynamicFields"
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

interface EditHistory {
  id: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  editedAt: string
  editedBy: {
    id: string
    name: string
    username: string | null
    email: string
  }
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
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)

  function handleCustomFieldChange(fieldName: string, value: string) {
    setCustomValues(prev => ({ ...prev, [fieldName]: value }))
  }

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSeverity, setEditSeverity] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editLocation, setEditLocation] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [editCustomValues, setEditCustomValues] = useState<Record<string, string>>({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  // History state
  const [historyIncidentId, setHistoryIncidentId] = useState<string | null>(null)
  const [editHistory, setEditHistory] = useState<EditHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  async function fetchIncidents() {
    try {
      const res = await fetch("/api/data/incidents")
      if (!res.ok) {
        const text = await res.text()
        console.error("Failed to fetch incidents:", res.status, text)
        setIncidents([])
        setLoading(false)
        return
      }
      const text = await res.text()
      if (!text) {
        setIncidents([])
        setLoading(false)
        return
      }
      const data = JSON.parse(text)
      setIncidents(data.incidents || [])
    } catch (err) {
      console.error("Failed to parse incidents:", err)
      setIncidents([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      console.log('Inputter user branch:', user.branchId, user.branch?.name)
      fetchIncidents()
    }
  }, [user])

  async function fetchEditHistory(incidentId: string) {
    setLoadingHistory(true)
    const res = await fetch(`/api/data/incidents/${incidentId}/edits`)
    const data = await res.json()
    if (res.ok) {
      setEditHistory(data.edits || [])
    }
    setLoadingHistory(false)
  }

  function openEditModal(incident: Incident) {
    setNewlyCreatedId(null)
    setEditingId(incident.id)
    setEditTitle(incident.title)
    setEditDescription(incident.description)
    setEditSeverity(incident.severity)
    setEditDate(incident.date.split("T")[0])
    setEditLocation(incident.location || "")
    setEditStatus(incident.status)
    setEditCustomValues(incident.customFieldsData || {})
  }

  function closeEditModal() {
    setEditingId(null)
    setNewlyCreatedId(null)
    setEditTitle("")
    setEditDescription("")
    setEditSeverity("")
    setEditDate("")
    setEditLocation("")
    setEditStatus("")
    setEditCustomValues({})
  }

  function handleEditCustomFieldChange(fieldName: string, value: string) {
    setEditCustomValues(prev => ({ ...prev, [fieldName]: value }))
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setError("")
    setEditSubmitting(true)

    try {
      const res = await fetch(`/api/data/incidents/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          severity: editSeverity,
          date: editDate,
          location: editLocation,
          status: editStatus,
          customFieldsData: editCustomValues,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to update incident report")
        setEditSubmitting(false)
        return
      }
      setSuccess("Incident report updated successfully")
      closeEditModal()
      await fetchIncidents()
    } catch {
      setError("An error occurred")
    }
    setEditSubmitting(false)
  }

  function toggleHistory(incidentId: string) {
    if (historyIncidentId === incidentId) {
      setHistoryIncidentId(null)
      setEditHistory([])
    } else {
      setHistoryIncidentId(incidentId)
      fetchEditHistory(incidentId)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/data/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, severity, date, location, status, customFieldsData: customValues }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create incident report")
        setSubmitting(false)
        return
      }
      setSuccess("Incident report created successfully")
      // Store newly created ID for file upload
      if (data.incident?.id) {
        setNewlyCreatedId(data.incident.id)
      } else {
        setTitle("")
        setDescription("")
        setSeverity("low")
        setDate(new Date().toISOString().split("T")[0])
        setLocation("")
        setStatus("open")
        setShowForm(false)
        await fetchIncidents()
      }
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

  if (!user.branchId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">No branch assigned</p>
          <p className="text-slate-400 text-sm">Please contact an administrator to assign you to a branch.</p>
        </div>
      </div>
    )
  }

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
                <DynamicFields module="incidents" values={customValues} onChange={handleCustomFieldChange} />

                {/* File upload after incident creation */}
                {newlyCreatedId && (
                  <div className="md:col-span-2">
                    <IncidentFileUpload incidentId={newlyCreatedId} canUpload={true} />
                  </div>
                )}

                <div className="md:col-span-2">
                  <button type="submit" disabled={submitting}
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50">
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Edit Modal */}
          {editingId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-white/10 rounded-[28px] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Edit Incident Report</h2>
                  <button
                    onClick={closeEditModal}
                    className="text-slate-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleEditSubmit} className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required rows={3}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Severity</label>
                    <select value={editSeverity} onChange={(e) => setEditSeverity(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                    <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none" />
                  </div>
                  <DynamicFields module="incidents" values={editCustomValues} onChange={handleEditCustomFieldChange} />

                  {/* File Attachments */}
                  {editingId && (
                    <div className="md:col-span-2">
                      <IncidentFileUpload incidentId={editingId} canUpload={true} />
                    </div>
                  )}

                  <div className="md:col-span-2 flex gap-3">
                    <button type="submit" disabled={editSubmitting}
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50">
                      {editSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                    <button type="button" onClick={closeEditModal}
                      className="rounded-2xl border border-white/10 bg-slate-950/50 px-6 py-2.5 font-medium text-slate-300 transition hover:bg-white/10">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/inputter/incidents/${incident.id}`} className="text-base font-semibold text-cyan-400 hover:text-cyan-300 hover:underline">
                            {incident.title}
                          </Link>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityColors[incident.severity] || severityColors.low}`}>
                            {incident.severity}
                          </span>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[incident.status] || statusColors.open}`}>
                            {incident.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{incident.description}</p>
                        <CustomFieldDisplay module="incidents" data={incident.customFieldsData} />
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>📅 {new Date(incident.date).toLocaleDateString()}</span>
                          {incident.location && <span>📍 {incident.location}</span>}
                          <span>👤 {incident.reportedBy.name}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/inputter/incidents/${incident.id}`}
                          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openEditModal(incident)}
                          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/20"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => toggleHistory(incident.id)}
                          className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                        >
                          {historyIncidentId === incident.id ? "Hide History" : "📋 History"}
                        </button>
                      </div>
                    </div>

                    {/* Edit History */}
                    {historyIncidentId === incident.id && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <h4 className="text-sm font-semibold text-white mb-3">Edit History</h4>
                        {loadingHistory ? (
                          <p className="text-sm text-slate-400">Loading history...</p>
                        ) : editHistory.length === 0 ? (
                          <p className="text-sm text-slate-400">No edits recorded yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {editHistory.map((edit) => (
                              <div key={edit.id} className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-medium text-cyan-300">{edit.fieldName}</span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(edit.editedAt).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-red-400 line-through">
                                    {edit.oldValue || "(empty)"}
                                  </span>
                                  <span className="text-slate-500">→</span>
                                  <span className="text-emerald-400">
                                    {edit.newValue || "(empty)"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  Edited by: {edit.editedBy.username || edit.editedBy.email}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
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