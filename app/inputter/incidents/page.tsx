"use client"
import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useCustomFields, CustomFieldDisplay } from "@/components/DynamicFields"
import { IncidentFileUpload } from "@/components/IncidentFileUpload"
interface Incident {
  id: string
  title: string
  description: string
  severity: string
  date: string
  location: string | null
  status: string
  incidentReportNumber: string | null
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
const DEFAULT_FIELD_NAMES = new Set(["title", "description", "date", "severity", "status", "location", "incidentReportNumber"])
// Normalized set for case-insensitive and space-insensitive matching
const DEFAULT_FIELD_NAMES_NORMALIZED = new Set(
  Array.from(DEFAULT_FIELD_NAMES).map(name => name.toLowerCase().replace(/\s+/g, ''))
)
const DEFAULT_FIELDS = [
  { key: "incidentReportNumber", label: "Incident Report Number", type: "text", colSpan: 1, order: 0 },
  { key: "title", label: "Title", type: "text", required: true, colSpan: 2, order: 1 },
  { key: "description", label: "Description", type: "textarea", required: true, colSpan: 2, order: 2 },
  { key: "date", label: "Date", type: "date", required: true, colSpan: 1, order: 3 },
  { key: "severity", label: "Severity", type: "select", colSpan: 1, order: 4, options: ["low", "medium", "high", "critical"] },
  { key: "status", label: "Status", type: "select", colSpan: 1, order: 5, options: ["open", "investigating", "resolved", "closed"] },
  { key: "location", label: "Location", type: "text", colSpan: 1, order: 6 },
]
interface MergedField {
  key: string
  label: string
  type: string
  required?: boolean
  colSpan?: number
  order?: number
  options?: string[]
}
function useMergedFields() {
  const { customFields } = useCustomFields("incidents")
  const allFields: MergedField[] = useMemo(() => {
    const merged: MergedField[] = DEFAULT_FIELDS.map(f => ({ ...f }))
    customFields.forEach((cf: { fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; options: string | null; colSpan?: number; order: number }) => {
      const normalizedCfKey = cf.fieldName.toLowerCase().replace(/\s+/g, '')
      const existingIndex = merged.findIndex(f => f.key.toLowerCase().replace(/\s+/g, '') === normalizedCfKey)
      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          label: cf.fieldLabel,
          required: cf.isRequired,
          colSpan: cf.colSpan || 1,
          order: cf.order,
        }
      } else if (!DEFAULT_FIELD_NAMES_NORMALIZED.has(normalizedCfKey)) {
        const field: MergedField = {
          key: cf.fieldName,
          label: cf.fieldLabel,
          type: cf.fieldType,
          required: cf.isRequired,
          colSpan: cf.colSpan || 1,
          order: cf.order,
        }
        if (cf.fieldType === "select" && cf.options) {
          try {
            field.options = JSON.parse(cf.options)
          } catch { /* ignore */ }
        }
        merged.push(field)
      }
    })
    // Final deduplication: remove any fields with duplicate normalized keys
    const seenKeys = new Set<string>()
    const deduped = merged.filter(f => {
      const normalizedKey = f.key.toLowerCase().replace(/\s+/g, '')
      if (seenKeys.has(normalizedKey)) return false
      seenKeys.add(normalizedKey)
      return true
    })
    return deduped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [customFields])
  return allFields
}
function renderField(
  field: MergedField,
  value: string,
  onChange: (key: string, value: string) => void
) {
  const colSpan = field.colSpan || (field.type === "textarea" ? 2 : 1)
  return (
    <div key={field.key} className={colSpan === 2 ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {field.label}{field.required ? " *" : ""}
      </label>
      {field.type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          required={field.required}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none resize-none"
        />
      ) : field.type === "select" ? (
        <select
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          required={field.required}
          className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
        >
          {field.options?.map((opt: string) => (
            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
      ) : field.type === "number" ? (
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          required={field.required}
          className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
        />
      ) : (
        <input
          type={field.type === "date" ? "date" : "text"}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          required={field.required}
          className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      )}
    </div>
  )
}
export default function InputterIncidentsPage() {
  const { user, loading: authLoading } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [error, setError] = useState("")
  // Merged fields
  const allFields = useMergedFields()
  // Form state (dynamic key-value)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormValues, setEditFormValues] = useState<Record<string, string>>({})
  const [editSubmitting, setEditSubmitting] = useState(false)
  // History state
  const [historyIncidentId, setHistoryIncidentId] = useState<string | null>(null)

  const [success, setSuccess] = useState("")
  const [editHistory, setEditHistory] = useState<EditHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  // Create draft incident when form opens for file upload
  useEffect(() => {
    if (showForm && !draftId && !editingId && !newlyCreatedId) {
      createDraftIncident()
    }
  }, [showForm])
  async function createDraftIncident() {
    try {
      const branchId = user?.branchId
      if (!branchId) return
      const res = await fetch("/api/data/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "(draft)",
          description: "(draft)",
          date: new Date().toISOString().split("T")[0],
          branchId,
          status: "open",
          severity: "low",
          isDraft: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.incident?.id) {
        setDraftId(data.incident.id)
      }
    } catch (err) {
      console.error("Failed to create draft:", err)
    }
  }
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
    // Strip any default field names from customFieldsData to prevent UI duplicates
    const filteredCustomData: Record<string, string> = {}
    if (incident.customFieldsData) {
      Object.entries(incident.customFieldsData).forEach(([key, val]) => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
        if (!DEFAULT_FIELD_NAMES_NORMALIZED.has(normalizedKey)) {
          filteredCustomData[key] = val
        }
      })
    }
    const values: Record<string, string> = {
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      date: incident.date.split("T")[0],
      location: incident.location || "",
      status: incident.status,
      incidentReportNumber: incident.incidentReportNumber || "",
      ...filteredCustomData,
    }
    setEditFormValues(values)
  }
  function closeEditModal() {
    setEditingId(null)
    setNewlyCreatedId(null)
    setEditFormValues({})
  }
  function handleFormChange(key: string, value: string) {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }
  function handleEditFormChange(key: string, value: string) {
    setEditFormValues(prev => ({ ...prev, [key]: value }))
  }
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setError("")
    setEditSubmitting(true)
    // Extract custom fields data (use normalized check to prevent duplicates)
    const customFieldsData: Record<string, string> = {}
    Object.entries(editFormValues).forEach(([key, val]) => {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
      if (!DEFAULT_FIELD_NAMES_NORMALIZED.has(normalizedKey)) {
        customFieldsData[key] = val
      }
    })
    try {
      const res = await fetch(`/api/data/incidents/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormValues.title,
          description: editFormValues.description,
          severity: editFormValues.severity || "low",
          date: editFormValues.date,
          location: editFormValues.location,
          status: editFormValues.status || "open",
          incidentReportNumber: editFormValues.incidentReportNumber,
          customFieldsData,
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
    // Extract custom fields data (use normalized check to prevent duplicates)
    const customFieldsData: Record<string, string> = {}
    Object.entries(formValues).forEach(([key, val]) => {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
      if (!DEFAULT_FIELD_NAMES_NORMALIZED.has(normalizedKey)) {
        customFieldsData[key] = val
      }
    })

    try {
      const isDraft = !!draftId
      const url = isDraft ? `/api/data/incidents/${draftId}` : "/api/data/incidents"
      const method = isDraft ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formValues.title,
          description: formValues.description,
          severity: formValues.severity || "low",
          date: formValues.date,
          location: formValues.location,
          status: formValues.status || "open",
          incidentReportNumber: formValues.incidentReportNumber,
          customFieldsData,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save incident report")
        setSubmitting(false)
        return
      }
      setSuccess(isDraft ? "Incident report saved successfully" : "Incident report created successfully")
      // Transfer draft ID to newlyCreatedId so upload keeps working
      if (isDraft && draftId) {
        setNewlyCreatedId(draftId)
        setDraftId(null)
      } else if (data.incident?.id) {
        setNewlyCreatedId(data.incident.id)
      } else {
        setFormValues({})
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
              <h2 className="text-lg font-semibold text-white mb-4">
                {newlyCreatedId ? "Incident Report" : "New Incident Report"}
              </h2>
              <form onSubmit={newlyCreatedId ? (e) => e.preventDefault() : handleSubmit} className="grid gap-4 md:grid-cols-2">
                {allFields.map(field => renderField(field, formValues[field.key] || "", handleFormChange))}
                {(draftId || newlyCreatedId) && (
                  <div className="md:col-span-2">
                    <IncidentFileUpload incidentId={draftId || newlyCreatedId!} canUpload={true} />
                  </div>
                )}
                <div className="md:col-span-2 flex gap-3">
                  {(newlyCreatedId || draftId) ? (
                    <button type="button" onClick={() => { setShowForm(false); setDraftId(null); setNewlyCreatedId(null); setFormValues({}); fetchIncidents(); }}
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20">
                      Done - Back to List
                    </button>
                  ) : (
                    <button type="submit" disabled={submitting}
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50">
                      {submitting ? "Submitting..." : "Submit Report"}
                    </button>
                  )}
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
                  {allFields.map(field => renderField(field, editFormValues[field.key] || "", handleEditFormChange))}
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
