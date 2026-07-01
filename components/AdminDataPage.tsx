"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import React, { useState, useEffect, useMemo } from "react"
import { IncidentFileUpload } from "@/components/IncidentFileUpload"

interface Branch {
  id: string
  name: string
}

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

interface EditField {
  key: string
  label: string
  type: "text" | "textarea" | "select" | "number" | "date" | "email" | "checkbox"
  required?: boolean
  options?: { value: string; label: string }[]
  colSpan?: number
  order?: number
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
  searchable?: boolean
  searchPlaceholder?: string
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

export function AdminDataPage<T extends { id: string }>({
  title,
  subtitle,
  apiEndpoint,
  columns,
  editFields,
  emptyMessage = "No data available yet.",
  defaultFormValues = {},
  module,
  searchable = false,
  searchPlaceholder = "Search...",
}: AdminDataPageProps<T>) {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string | number>>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [customFields, setCustomFields] = useState<{ id: string; fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; options: string | null; colSpan?: number; order: number }[]>([])
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)
  // History state for incidents module
  const [historyIncidentId, setHistoryIncidentId] = useState<string | null>(null)
  const [editHistory, setEditHistory] = useState<EditHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyExpandedId, setHistoryExpandedId] = useState<string | null>(null)

  async function fetchEditHistory(incidentId: string) {
    setLoadingHistory(true)
    const res = await fetch(`/api/data/incidents/${incidentId}/edits`)
    const data = await res.json()
    if (res.ok) {
      setEditHistory(data.edits || [])
    }
    setLoadingHistory(false)
  }

  function toggleHistory(incidentId: string) {
    if (historyExpandedId === incidentId) {
      setHistoryExpandedId(null)
      setEditHistory([])
    } else {
      setHistoryExpandedId(incidentId)
      fetchEditHistory(incidentId)
    }
  }

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      try {
        const dataRes = await fetch(apiEndpoint)
        const text = await dataRes.text()
        if (!text) {
          setData([])
        } else {
          const dataJson = JSON.parse(text)
          const dataKey = Object.keys(dataJson).find((k) => Array.isArray(dataJson[k]))
          if (dataKey) setData(dataJson[dataKey])
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch data"
        console.error("Failed to fetch data:", errorMessage)
        setError(errorMessage)
      }
      setLoading(false)
    }
    fetchData()

    if (user.role === 'ADMIN') {
      fetch('/api/admin/branches').then(res => res.json()).then(data => {
        setBranches(data.branches || [])
      }).catch(() => {})
    }
  }, [user, apiEndpoint])

  useEffect(() => {
    if (!module) return

    // For admin viewing list, fetch custom fields from all branches
    if (user?.role === 'ADMIN' && !editingItem && !selectedBranchId && branches.length > 0) {
      async function fetchAllCustomFields() {
        try {
          const allConfigs = await Promise.all(
            branches.map(b =>
              fetch(`/api/admin/branches/${b.id}/module-config`)
                .then(res => res.json())
                .then(data => data.configs || [])
                .catch(() => [])
            )
          )
          const merged = allConfigs.flat()
          const config = merged.find((c: { module: string }) => c.module === module)
          
          // Deduplicate custom fields by fieldName (case-insensitive) before setting state
          const customFields = config?.customFields || []
          
          // Known default field names that should NEVER appear as custom fields (case-insensitive, spaces ignored)
          const knownDefaultNormalized = module === 'incidents' 
            ? new Set(['incidentreportnumber', 'incident report number', 'report number', 'reportnumber', 'title', 'description', 'date', 'severity', 'status', 'location'])
            : new Set()
          
          const seen = new Map<string, { id: string; fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; options: string | null; colSpan?: number; order: number }>()
          customFields.forEach((cf: { id: string; fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; options: string | null; colSpan?: number; order: number }) => {
            const normalizedKey = cf.fieldName.toLowerCase().replace(/\s+/g, '')
            const normalizedLabel = cf.fieldLabel.toLowerCase().replace(/\s+/g, '')
            
            // Skip if this is a known default field
            if (knownDefaultNormalized.has(normalizedKey) || knownDefaultNormalized.has(normalizedLabel)) {
              console.log('[AdminDataPage] Filtering out known default field:', cf.fieldName, 'label:', cf.fieldLabel)
              return
            }
            
            const existing = seen.get(normalizedKey)
            if (!existing) {
              seen.set(normalizedKey, cf)
            }
          })
          
          setCustomFields(Array.from(seen.values()))
        } catch (error) {
          console.error("Failed to fetch custom fields:", error)
        }
      }
      fetchAllCustomFields()
      return
    }

    // For non-admin users, fetch custom fields for their specific branch
    if (user?.role !== 'ADMIN') {
      let branchId = selectedBranchId || user?.branchId

      if (editingItem) {
        const record = editingItem as Record<string, unknown>
        const branch = record.branch as { id?: string } | undefined
        if (branch?.id) {
          branchId = branch.id
        }
      }

      if (!branchId) return

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
    }
  }, [module, user?.role, user?.branchId, editingItem, selectedBranchId, branches])

  // Merge default fields with custom fields and sort by order
  const allFields = useMemo(() => {
    if (!module) return editFields

    console.log('[AdminDataPage] Merging fields - editFields:', editFields.map(f => f.key))
    console.log('[AdminDataPage] Custom fields:', customFields.map(cf => cf.fieldName))

    // Use a Map to ensure no duplicates (keyed by normalized field name)
    const fieldMap = new Map<string, EditField>()
    
    // Add default fields first
    editFields.forEach((field, index) => {
      const normalizedKey = field.key.toLowerCase().replace(/\s+/g, '')
      fieldMap.set(normalizedKey, {
        ...field,
        order: index,
        colSpan: field.colSpan || (field.type === "textarea" ? 2 : 1),
      })
    })

    // Filter out ALL custom fields that match any default field key or label (case-insensitive, spaces ignored)
    const editFieldNormalizedKeys = new Set(editFields.map(f => f.key.toLowerCase().replace(/\s+/g, '')))
    const editFieldNormalizedLabels = new Set(editFields.map(f => f.label.toLowerCase().replace(/\s+/g, '')))
    
    const filteredCustomFields = customFields.filter(cf => {
      const normalizedKey = cf.fieldName.toLowerCase().replace(/\s+/g, '')
      const normalizedLabel = cf.fieldLabel.toLowerCase().replace(/\s+/g, '')
      const matches = editFieldNormalizedKeys.has(normalizedKey) || editFieldNormalizedLabels.has(normalizedLabel)
      if (matches) console.log('[AdminDataPage] Filtering custom field matching edit field:', cf.fieldName, 'label:', cf.fieldLabel)
      return !matches
    })

    // Only add truly new custom fields (skip if normalized key already exists from default fields)
    filteredCustomFields.forEach((cf) => {
      const fieldType = cf.fieldType as EditField["type"]
      const normalizedKey = cf.fieldName.toLowerCase().replace(/\s+/g, '')
      
      // Skip if this key already exists (from default editFields)
      if (fieldMap.has(normalizedKey)) {
        console.log('[AdminDataPage] Skipping custom field that matches existing field:', cf.fieldName)
        return
      }
      
      fieldMap.set(normalizedKey, {
        key: cf.fieldName,
        label: cf.fieldLabel,
        type: fieldType,
        required: cf.isRequired,
        order: cf.order,
        colSpan: cf.colSpan || 1,
        options: cf.fieldType === "select" ? (() => {
          try {
            return JSON.parse(cf.options || "[]").map((opt: string) => ({ value: opt, label: opt }))
          } catch {
            return []
          }
        })() : undefined,
      })
      console.log('[AdminDataPage] Added custom field:', cf.fieldName)
    })

    const finalResult = Array.from(fieldMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    
    // Final deduplication pass - ensure no duplicates by normalized key
    const seenFinal = new Set<string>()
    const dedupedResult = finalResult.filter(field => {
      const normalizedKey = field.key.toLowerCase().replace(/\s+/g, '')
      if (seenFinal.has(normalizedKey)) {
        console.log('[AdminDataPage] Removing duplicate in allFields:', field.key)
        return false
      }
      seenFinal.add(normalizedKey)
      return true
    })
    
    // HARD BLOCKLIST: Remove any custom field that matches incident report number variations
    // This is a last-resort safety net for stubborn duplicates
    const hardBlocklist = ['incidentreportnumber', 'incident report number', 'report number', 'reportnumber']
    const finalFiltered = dedupedResult.filter(field => {
      const normalizedKey = field.key.toLowerCase().replace(/\s+/g, '')
      const normalizedLabel = field.label.toLowerCase().replace(/\s+/g, '')
      const isBlocklisted = hardBlocklist.includes(normalizedKey) || hardBlocklist.includes(normalizedLabel)
      
      // Also check if label contains all three words: incident, report, number (in any order)
      const labelWords = normalizedLabel.split(/\s+/)
      const hasAllThreeWords = labelWords.includes('incident') && labelWords.includes('report') && labelWords.includes('number')
      
      if (isBlocklisted || hasAllThreeWords) {
        // Block if this field's normalized key matches an edit field's normalized key (it's a duplicate)
        const isFromEditFields = editFields.some(ef => ef.key.toLowerCase().replace(/\s+/g, '') === normalizedKey)
        if (!isFromEditFields) {
          return false
        }
      }
      return true
    })
    
    console.log('[AdminDataPage] Final allFields:', finalFiltered.map(f => ({ key: f.key, required: f.required })))
    return finalFiltered
  }, [editFields, customFields, module])

  // Generate dynamic columns for custom fields
  const dynamicCustomFieldColumns = useMemo(() => {
    if (!module) return []
    
    // Get keys from static columns to avoid duplicates in table
    const staticColumnKeys = new Set(columns.map(c => c.key.toLowerCase().replace(/\s+/g, '')))
    
    const filtered = customFields
      .filter((cf) => {
        const normalizedKey = cf.fieldName.toLowerCase().replace(/\s+/g, '')
        // Only include if this field is NOT already in static columns
        return !staticColumnKeys.has(normalizedKey)
      })
      .sort((a, b) => a.order - b.order)
      .map((cf) => ({ key: cf.fieldName, label: cf.fieldLabel }))
    
    // Final deduplication pass on dynamic columns
    const seen = new Set<string>()
    const deduped = filtered.filter((col) => {
      const normalizedKey = col.key.toLowerCase().replace(/\s+/g, '')
      if (seen.has(normalizedKey)) {
        return false
      }
      seen.add(normalizedKey)
      return true
    })
    
    if (deduped.length > 0) {
      console.log('[AdminDataPage] Dynamic custom field columns:', deduped)
    }
    return deduped
  }, [customFields, columns, module])

  // Merge static columns with dynamic custom field columns, sorted by order
  const mergedColumns = useMemo(() => {
    if (!module || dynamicCustomFieldColumns.length === 0) {
      console.log('[AdminDataPage] No dynamic columns, using static columns')
      return columns
    }

    const result: typeof columns = []

    const orderedKeys = allFields
      .filter(f => f.key !== 'branchId' && f.key !== 'reportedById')
      .map(f => f.key)

    console.log('[AdminDataPage] Ordered field keys:', orderedKeys)
    console.log('[AdminDataPage] Dynamic custom field columns:', dynamicCustomFieldColumns)

    const colMap = new Map<string, typeof columns[0]>()
    columns.forEach(col => colMap.set(col.key, col))

    // Create a set of dynamic column keys (normalized) to avoid duplicates
    const dynamicKeys = new Set(dynamicCustomFieldColumns.map(dc => dc.key.toLowerCase().replace(/\s+/g, '')))

    orderedKeys.forEach(key => {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
      const staticCol = colMap.get(key)
      
      // Check if this key exists as a dynamic column (case-insensitive)
      const hasDynamicColumn = Array.from(dynamicKeys).some(dk => dk === normalizedKey)
      
      if (staticCol) {
        result.push(staticCol)
      }
      
      // Only add dynamic column if there's no static column with the same key
      if (hasDynamicColumn && !staticCol) {
        const dynCol = dynamicCustomFieldColumns.find(dc => dc.key.toLowerCase().replace(/\s+/g, '') === normalizedKey)
        if (dynCol) {
          result.push({
            key: dynCol.key,
            label: dynCol.label,
            render: (item: T) => {
              const val = (item as unknown as Record<string, unknown>).customFieldsData as Record<string, string> | undefined
              return val?.[dynCol.key] || "-"
            },
          })
        }
      }
    })

    columns.forEach(col => {
      if (!result.find(r => r.key === col.key)) {
        result.push(col)
      }
    })

    console.log('[AdminDataPage] Final merged columns:', result.map(c => c.key))
    return result
  }, [columns, dynamicCustomFieldColumns, allFields, editFields, module])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const isEdit = !!editingItem
      const url = isEdit ? `${apiEndpoint}/${editingItem!.id}` : apiEndpoint
      const method = isEdit ? "PUT" : "POST"

      const payload: Record<string, unknown> = { ...formValues }
      // Only include truly custom field values (strip any default field names from customValues)
      if (customFields.length > 0) {
        const editFieldNormalizedKeys = new Set(editFields.map(f => f.key.toLowerCase().replace(/\s+/g, '')))
        const filtered: Record<string, string> = {}
        Object.entries(customValues).forEach(([key, val]) => {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
          if (!editFieldNormalizedKeys.has(normalizedKey)) {
            filtered[key] = val
          }
        })
        payload.customFieldsData = filtered
      }
      if (!editingItem && user?.role === 'ADMIN' && selectedBranchId) {
        payload.branchId = selectedBranchId
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

      if (!isEdit && module === "incidents" && result.incident?.id) {
        setNewlyCreatedId(result.incident.id)
      } else {
        resetForm()
        const dataRes = await fetch(apiEndpoint)
        const text = await dataRes.text()
        if (text) {
          const dataJson = JSON.parse(text)
          const dataKey = Object.keys(dataJson).find((k) => Array.isArray(dataJson[k]))
          if (dataKey) setData(dataJson[dataKey])
        }
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
    setNewlyCreatedId(null)
    setEditingItem(item)
    const values: Record<string, string | number> = {}
    editFields.forEach((field) => {
      const val = (item as unknown as Record<string, unknown>)[field.key]
      values[field.key] = val !== null && val !== undefined ? (typeof val === "string" ? val : String(val)) : ""
    })
    // Strip any default field names from customFieldsData to prevent UI duplicates
    if ((item as unknown as Record<string, unknown>).customFieldsData) {
      const raw = (item as unknown as Record<string, unknown>).customFieldsData as Record<string, string>
      const editFieldNormalizedKeys = new Set(editFields.map(f => f.key.toLowerCase().replace(/\s+/g, '')))
      const filtered: Record<string, string> = {}
      Object.entries(raw).forEach(([key, val]) => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '')
        if (!editFieldNormalizedKeys.has(normalizedKey)) {
          filtered[key] = val
        }
      })
      setCustomValues(filtered)
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
    setNewlyCreatedId(null)
    setFormValues({})
    setCustomValues({})
  }

  function openCreateForm() {
    setNewlyCreatedId(null)
    setEditingItem(null)
    setFormValues({ ...defaultFormValues })
    setCustomValues({})
    setSelectedBranchId("")
    setShowForm(true)
    setError("")
    setSuccess("")
  }

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const query = searchQuery.toLowerCase().trim()
    return data.filter((item) => {
      // Search across all string fields of the item
      const record = item as unknown as Record<string, unknown>
      for (const key in record) {
        const val = record[key]
        if (typeof val === 'string' && val.toLowerCase().includes(query)) {
          return true
        }
        // Also search in nested objects like branch name
        if (typeof val === 'object' && val !== null) {
          const nested = val as Record<string, unknown>
          for (const nk in nested) {
            const nv = nested[nk]
            if (typeof nv === 'string' && nv.toLowerCase().includes(query)) {
              return true
            }
          }
        }
      }
      return false
    })
  }, [data, searchQuery])

  const cols = mergedColumns

  // Use mergedColumns for rendering
  const tableColumns = cols

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
                {!editingItem && user?.role === 'ADMIN' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Branch *</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                    >
                      <option value="">Select a branch...</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {(() => {
                  // Final deduplication pass to ensure no duplicate fields in form
                  const seenFormKeys = new Set<string>()
                  const seenFormLabels = new Set<string>()
                  const uniqueFields: EditField[] = []
                  
                  allFields.forEach((field) => {
                    const normalizedKey = field.key.toLowerCase().replace(/\s+/g, '')
                    const normalizedLabel = field.label.toLowerCase().replace(/\s+/g, '')
                    
                    // Remove if duplicate by key OR by label
                    if (seenFormKeys.has(normalizedKey) || seenFormLabels.has(normalizedLabel)) {
                      console.log('[AdminDataPage] Removing duplicate form field:', field.key, 'label:', field.label)
                      return
                    }
                    seenFormKeys.add(normalizedKey)
                    seenFormLabels.add(normalizedLabel)
                    uniqueFields.push(field)
                  })
                  
                  return uniqueFields.map((field) => {
                    const colSpan = (field as EditField & { colSpan?: number }).colSpan || (field.type === "textarea" ? 2 : 1)
                    return (
                    <div key={field.key} className={colSpan === 2 ? "md:col-span-2" : ""}>
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
                    )
                  })
                })()}

                {module === "incidents" && (
                  <div className="md:col-span-2">
                    {newlyCreatedId || editingItem ? (
                      <IncidentFileUpload incidentId={newlyCreatedId || editingItem!.id} canUpload={true} />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 backdrop-blur">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Attachments (0)</h3>
                        <div className="flex items-center justify-center py-6">
                          <p className="text-sm text-slate-500 text-center">
                            Click <strong>Create Record</strong> first to enable file uploads
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                <div className="md:col-span-2 flex gap-3">
                  {module === "incidents" && newlyCreatedId ? (
                    <button type="button" onClick={resetForm}
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20">
                      Done - Back to List
                    </button>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* Data Table */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{title} ({data.length})</h2>
              {searchable && (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-72 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                />
              )}
            </div>
            {data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">{emptyMessage}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {tableColumns.map((col) => (
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
                    {(() => {
                      if (filteredData.length === 0 && searchQuery.trim()) {
                        return (
                          <tr>
                            <td colSpan={tableColumns.length + 1} className="px-4 py-12 text-center text-slate-400">
                              No results found for "{searchQuery}"
                            </td>
                          </tr>
                        )
                      }
                      return filteredData.map((item) => (
                      <React.Fragment key={item.id}>
                      <tr className="hover:bg-white/5 transition">
                        {tableColumns.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-slate-300">
                            {col.render ? col.render(item) : String((item as unknown as Record<string, unknown>)[col.key] ?? "-")}
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
                            {module === "incidents" && (
                              <button
                                onClick={() => toggleHistory(item.id)}
                                className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                              >
                                {historyExpandedId === item.id ? "Hide History" : "📋 History"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {module === "incidents" && historyExpandedId === item.id && (
                        <tr>
                          <td colSpan={tableColumns.length + 1} className="px-4 py-3 bg-slate-900/50">
                            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
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
                                        <span className="text-red-400 line-through">{edit.oldValue || "(empty)"}</span>
                                        <span className="text-slate-500">→</span>
                                        <span className="text-emerald-400">{edit.newValue || "(empty)"}</span>
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">
                                        Edited by: {edit.editedBy.username || edit.editedBy.email}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                      ))
                    })()}
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
