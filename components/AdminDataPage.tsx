"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

interface EditField {
  key: string
  label: string
  type: "text" | "textarea" | "select" | "number" | "date"
  required?: boolean
  options?: { value: string; label: string }[]
}

interface AdminDataPageProps<T extends { id: string }> {
  title: string
  subtitle?: string
  apiEndpoint: string
  columns: Column<T>[]
  editFields: EditField[]
  emptyMessage?: string
  defaultFormValues?: Record<string, string | number>
  module?: string
}

export function AdminDataPage<T extends { id: string }>({
  title,
  subtitle,
  apiEndpoint,
  columns,
  editFields,
  emptyMessage = "No data available yet.",
  defaultFormValues = {},
  module,
}: AdminDataPageProps<T>) {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string | number>>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [customFields, setCustomFields] = useState<{ id: string; fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; options: string | null }[]>([])
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      try {
        const dataRes = await fetch(apiEndpoint)
        const text = await dataRes.text()
        if (!text) {
          setData([])
          return
        }
        const dataJson = JSON.parse(text)
        const dataKey = Object.keys(dataJson).find((k) => Array.isArray(dataJson[k]))
        if (dataKey) setData(dataJson[dataKey])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch data"
        console.error("Failed to fetch data:", errorMessage)
        setError(errorMessage)
      }
      setLoading(false)
    }
    fetchData()
  }, [user, apiEndpoint])

  useEffect(() => {
    if (!module || !user?.branchId) return
    const branchId = user.branchId
    async function fetchCustomFields() {
      try {
        const res = await fetch(`/api/admin/branches/${branchId}/module-config`)
        const data = await res.json()
        const configs = data.configs || []
        const config = configs.find((c: { module: string }) => c.module === module)
        setCustomFields(config?.customFields || [])
      } catch (error) {
        console.error("Failed to fetch custom fields:", error)
      }
    }
    fetchCustomFields()
  }, [module, user?.branchId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const isEdit = !!editingItem
      const url = isEdit ? `${apiEndpoint}/${editingItem!.id}` : apiEndpoint
      const method = isEdit ? "PUT" : "POST"

      const payload = { ...formValues }
      if (customFields.length > 0) {
        ;(payload as Record<string, unknown>).customFieldsData = customValues
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || `Failed to ${isEdit ? "update" : "create"} record`)
        setSubmitting(false)
        return
      }
      setSuccess(isEdit ? "Record updated successfully" : "Record created successfully")
      resetForm()
      // Refresh data
      const dataRes = await fetch(apiEndpoint)
      const text = await dataRes.text()
      if (text) {
        const dataJson = JSON.parse(text)
        const dataKey = Object.keys(dataJson).find((k) => Array.isArray(dataJson[k]))
        if (dataKey) setData(dataJson[dataKey])
      }
    } catch {
      setError("An error occurred")
    }
    setSubmitting(false)
  }

  async function handleDelete(item: T) {
    if (!confirm(`Are you sure you want to delete this ${title.slice(0, -1).toLowerCase()}?`)) return
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`${apiEndpoint}/${item.id}`, { method: "DELETE" })
      if (!res.ok) {
        const result = await res.json()
        setError(result.error || "Failed to delete record")
        return
      }
      setSuccess("Record deleted successfully")
      // Refresh data
      const dataRes = await fetch(apiEndpoint)
      const text = await dataRes.text()
      if (text) {
        const dataJson = JSON.parse(text)
        const dataKey = Object.keys(dataJson).find((k) => Array.isArray(dataJson[k]))
        if (dataKey) setData(dataJson[dataKey])
      }
    } catch {
      setError("An error occurred")
    }
  }

  function startEdit(item: T) {
    setEditingItem(item)
    const values: Record<string, string | number> = {}
    editFields.forEach((field) => {
      const val = (item as Record<string, unknown>)[field.key]
      values[field.key] = val !== null && val !== undefined ? (typeof val === "string" ? val : String(val)) : ""
    })
    // Load custom field values
    if ((item as Record<string, unknown>).customFieldsData) {
      setCustomValues((item as Record<string, unknown>).customFieldsData as Record<string, string>)
    } else {
      setCustomValues({})
    }
    setFormValues(values)
    setShowForm(true)
    setError("")
    setSuccess("")
  }

  function resetForm() {
    setShowForm(false)
    setEditingItem(null)
    setFormValues({})
    setCustomValues({})
  }

  function openCreateForm() {
    setEditingItem(null)
    setFormValues({ ...defaultFormValues })
    setCustomValues({})
    setShowForm(true)
    setError("")
    setSuccess("")
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
                <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
                <p className="mt-2 text-sm text-slate-300">
                  {subtitle || `Manage ${title.toLowerCase()} configuration`}
                </p>
              </div>
              <button
                onClick={showForm ? resetForm : openCreateForm}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20"
              >
                {showForm ? "Cancel" : `+ New ${title.slice(0, -1)}`}
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

          {/* Create/Edit Form */}
          {showForm && (
            <section className="rounded-[28px] border border-cyan-400/20 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">
                {editingItem ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}
              </h2>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                {editFields.map((field) => (
                  <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {field.label}{field.required ? " *" : ""}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={String(formValues[field.key] || "")}
                        onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                        required={field.required}
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none resize-none"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={String(formValues[field.key] || "")}
                        onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                        required={field.required}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={String(formValues[field.key] || "")}
                        onChange={(e) => setFormValues({ ...formValues, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value })}
                        required={field.required}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
                {customFields.length > 0 && (
                  <div className="md:col-span-2 mt-4 p-4 rounded-xl border border-purple-700/30 bg-purple-900/10">
                    <h3 className="text-sm font-semibold text-purple-300 mb-3">Custom Fields</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            {field.fieldLabel}
                            {field.isRequired && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {field.fieldType === "textarea" ? (
                            <textarea
                              value={customValues[field.fieldName] || ""}
                              onChange={(e) => setCustomValues(prev => ({ ...prev, [field.fieldName]: e.target.value }))}
                              required={field.isRequired}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                              rows={3}
                            />
                          ) : field.fieldType === "select" ? (
                            <select
                              value={customValues[field.fieldName] || ""}
                              onChange={(e) => setCustomValues(prev => ({ ...prev, [field.fieldName]: e.target.value }))}
                              required={field.isRequired}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                            >
                              <option value="">Select {field.fieldLabel}</option>
                              {(() => {
                                try {
                                  const options = JSON.parse(field.options || "[]")
                                  return options.map((opt: string, i: number) => (
                                    <option key={i} value={opt}>{opt}</option>
                                  ))
                                } catch {
                                  return null
                                }
                              })()}
                            </select>
                          ) : field.fieldType === "number" ? (
                            <input
                              type="number"
                              value={customValues[field.fieldName] || ""}
                              onChange={(e) => setCustomValues(prev => ({ ...prev, [field.fieldName]: e.target.value }))}
                              required={field.isRequired}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                            />
                          ) : field.fieldType === "date" ? (
                            <input
                              type="date"
                              value={customValues[field.fieldName] || ""}
                              onChange={(e) => setCustomValues(prev => ({ ...prev, [field.fieldName]: e.target.value }))}
                              required={field.isRequired}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                            />
                          ) : (
                            <input
                              type="text"
                              value={customValues[field.fieldName] || ""}
                              onChange={(e) => setCustomValues(prev => ({ ...prev, [field.fieldName]: e.target.value }))}
                              required={field.isRequired}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" disabled={submitting}
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : (editingItem ? "Update Record" : "Create Record")}
                  </button>
                  <button type="button" onClick={resetForm}
                    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 font-medium text-slate-400 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Data Table */}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition">
                        {columns.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-slate-300">
                            {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "-")}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/20"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/20"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
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