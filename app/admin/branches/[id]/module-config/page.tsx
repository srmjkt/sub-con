"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

interface Branch {
  id: string
  name: string
}

interface CustomField {
  id: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  isRequired: boolean
  options: string | null
  order: number
  colSpan?: number
}

interface ModuleConfig {
  id: string
  module: string
  isEnabled: boolean
  customFields: CustomField[]
}

const DEFAULT_FIELDS: Record<string, { fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; colSpan?: number }[]> = {
  incidents: [
    { fieldName: "title", fieldLabel: "Title", fieldType: "text", isRequired: true, colSpan: 2 },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: true, colSpan: 2 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "severity", fieldLabel: "Severity", fieldType: "select", isRequired: true, colSpan: 1 },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1 },
    { fieldName: "location", fieldLabel: "Location", fieldType: "text", isRequired: false, colSpan: 1 },
  ],
  attendance: [
    { fieldName: "employeeName", fieldLabel: "Employee Name", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1 },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false, colSpan: 2 },
  ],
  trainings: [
    { fieldName: "title", fieldLabel: "Training Title", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "duration", fieldLabel: "Duration", fieldType: "text", isRequired: false, colSpan: 1 },
    { fieldName: "trainer", fieldLabel: "Trainer", fieldType: "text", isRequired: false, colSpan: 1 },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false, colSpan: 2 },
    { fieldName: "participants", fieldLabel: "Number of Participants", fieldType: "number", isRequired: false, colSpan: 1 },
  ],
  simulations: [
    { fieldName: "title", fieldLabel: "Simulation Title", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "scenario", fieldLabel: "Scenario", fieldType: "text", isRequired: false, colSpan: 1 },
    { fieldName: "participants", fieldLabel: "Number of Participants", fieldType: "number", isRequired: false, colSpan: 1 },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false, colSpan: 2 },
    { fieldName: "result", fieldLabel: "Result", fieldType: "select", isRequired: false, colSpan: 1 },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false, colSpan: 2 },
  ],
  mockDrills: [
    { fieldName: "title", fieldLabel: "Drill Title", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true, colSpan: 1 },
    { fieldName: "drillType", fieldLabel: "Drill Type", fieldType: "select", isRequired: true, colSpan: 1 },
    { fieldName: "participants", fieldLabel: "Number of Participants", fieldType: "number", isRequired: false, colSpan: 1 },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false, colSpan: 2 },
    { fieldName: "result", fieldLabel: "Result", fieldType: "select", isRequired: false, colSpan: 1 },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false, colSpan: 2 },
  ],
  inventory: [
    { fieldName: "itemName", fieldLabel: "Item Name", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "quantity", fieldLabel: "Quantity", fieldType: "number", isRequired: true, colSpan: 1 },
    { fieldName: "unit", fieldLabel: "Unit", fieldType: "text", isRequired: true, colSpan: 1 },
    { fieldName: "category", fieldLabel: "Category", fieldType: "text", isRequired: false, colSpan: 1 },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true, colSpan: 1 },
  ],
}

export default function BranchModuleConfigPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const params = useParams()
  const branchId = params.id as string
  const [branch, setBranch] = useState<Branch | null>(null)
  const [configs, setConfigs] = useState<ModuleConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [draggedField, setDraggedField] = useState<{ moduleId: string; fieldId: string } | null>(null)
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null)
  const [modules, setModules] = useState([
    { id: "incidents", name: "Incident Reports", icon: "⚠️" },
    { id: "attendance", name: "Attendance", icon: "📋" },
    { id: "trainings", name: "Trainings", icon: "📚" },
    { id: "simulations", name: "Simulations", icon: "🎯" },
    { id: "mockDrills", name: "Mock Drills", icon: "🚒" },
    { id: "inventory", name: "Inventory", icon: "📦" },
  ])

  useEffect(() => {
    if (currentUser) fetchData()
  }, [currentUser, branchId])

  async function fetchData() {
    try {
      const [branchRes, configsRes] = await Promise.all([
        fetch(`/api/admin/branches/${branchId}`),
        fetch(`/api/admin/branches/${branchId}/module-config`),
      ])
      const branchData = await branchRes.json()
      const configsData = await configsRes.json()
      setBranch(branchData.branch)
      const savedConfigs = configsData.configs || []
      const allConfigs = modules.map(m => {
        const existing = savedConfigs.find((c: ModuleConfig) => c.module === m.id)
        const defaults = DEFAULT_FIELDS[m.id] || []
        if (existing && existing.customFields.length > 0) {
          return existing
        }
        const defaultCustomFields = defaults.map((def, idx) => ({
          id: `default-${m.id}-${idx}`,
          fieldName: def.fieldName,
          fieldLabel: def.fieldLabel,
          fieldType: def.fieldType,
          isRequired: def.isRequired,
          options: def.fieldType === "select" ? '["option1", "option2", "option3"]' : null,
          order: idx,
          colSpan: def.colSpan || 1,
        }))
        return {
          id: existing?.id || "",
          module: m.id,
          isEnabled: existing ? existing.isEnabled : true,
          customFields: defaultCustomFields,
        }
      })
      setConfigs(allConfigs)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data"
      setError(errorMessage)
    }
    setLoading(false)
  }

  function getConfig(moduleId: string) {
    return configs.find((c) => c.module === moduleId) || {
      id: "",
      module: moduleId,
      isEnabled: true,
      customFields: [],
    }
  }

  function updateConfig(moduleId: string, updates: Partial<ModuleConfig>) {
    setConfigs(prev => {
      const exists = prev.some(c => c.module === moduleId)
      if (exists) {
        return prev.map((c) => (c.module === moduleId ? { ...c, ...updates } : c))
      } else {
        return [...prev, { id: "", module: moduleId, isEnabled: true, customFields: [], ...updates }]
      }
    })
  }

  const [showNewModuleForm, setShowNewModuleForm] = useState(false)
  const [newModuleId, setNewModuleId] = useState("")
  const [newModuleName, setNewModuleName] = useState("")
  const [newModuleIcon, setNewModuleIcon] = useState("📋")

  function addCustomModule() {
    if (!newModuleId || !newModuleName) {
      setError("Please enter both module ID and name")
      return
    }
    if (modules.some(m => m.id === newModuleId)) {
      setError(`Module "${newModuleId}" already exists`)
      return
    }
    setError("")
    setModules(prev => [...prev, { id: newModuleId, name: newModuleName, icon: newModuleIcon }])
    setConfigs(prev => [...prev, { id: "", module: newModuleId, isEnabled: true, customFields: [] }])
    setNewModuleId("")
    setNewModuleName("")
    setNewModuleIcon("📋")
    setShowNewModuleForm(false)
    setSuccess(`Custom module "${newModuleName}" added! Save configuration to persist.`)
  }

  function removeModule(moduleId: string) {
    const module = modules.find(m => m.id === moduleId)
    if (!confirm(`Are you sure you want to remove "${module?.name}"? This will also delete all field configurations for this module.`)) return
    setModules(prev => prev.filter(m => m.id !== moduleId))
    setConfigs(prev => prev.filter(c => c.module !== moduleId))
  }

  function handleDragStart(fieldId: string) {
    setDraggedField({ moduleId: expandedModule!, fieldId })
  }

  function handleDragOver(e: React.DragEvent, fieldId: string) {
    e.preventDefault()
    setDragOverFieldId(fieldId)
  }

  function handleDrop(targetFieldId: string) {
    if (!draggedField || draggedField.moduleId !== expandedModule) return

    const config = getConfig(expandedModule!)
    const fields = [...config.customFields]
    const draggedIndex = fields.findIndex(f => f.id === draggedField.fieldId)
    const targetIndex = fields.findIndex(f => f.id === targetFieldId)

    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      const [draggedFieldData] = fields.splice(draggedIndex, 1)
      fields.splice(targetIndex, 0, draggedFieldData)
      fields.forEach((f, i) => f.order = i)
      updateConfig(expandedModule!, { customFields: fields })
    }

    setDraggedField(null)
    setDragOverFieldId(null)
  }

  function handleDragEnd() {
    setDraggedField(null)
    setDragOverFieldId(null)
  }

  function addCustomField(moduleId: string) {
    const config = getConfig(moduleId)
    const newField: CustomField = {
      id: `temp-${Date.now()}`,
      fieldName: `customField${config.customFields.length + 1}`,
      fieldLabel: `Custom Field ${config.customFields.length + 1}`,
      fieldType: "text",
      isRequired: false,
      options: null,
      order: config.customFields.length,
      colSpan: 1,
    }
    updateConfig(moduleId, {
      customFields: [...config.customFields, newField],
    })
  }

  function removeCustomField(moduleId: string, fieldId: string) {
    const config = getConfig(moduleId)
    const filteredFields = config.customFields.filter((f) => f.id !== fieldId)
    updateConfig(moduleId, { customFields: filteredFields })
  }

  function addDefaultField(moduleId: string, defaultField: { fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; colSpan?: number }) {
    const config = getConfig(moduleId)
    const exists = config.customFields.some(f => f.fieldName === defaultField.fieldName)
    if (exists) {
      setError(`Field "${defaultField.fieldLabel}" already exists`)
      setTimeout(() => setError(""), 3000)
      return
    }
    const newField: CustomField = {
      id: `temp-${Date.now()}`,
      fieldName: defaultField.fieldName,
      fieldLabel: defaultField.fieldLabel,
      fieldType: defaultField.fieldType,
      isRequired: defaultField.isRequired,
      options: defaultField.fieldType === "select" ? '["option1", "option2", "option3"]' : null,
      order: config.customFields.length,
      colSpan: defaultField.colSpan || 1,
    }
    updateConfig(moduleId, {
      customFields: [...config.customFields, newField],
    })
  }

  function updateFieldColSpan(moduleId: string, fieldId: string, colSpan: number) {
    const config = getConfig(moduleId)
    const updatedFields = config.customFields.map(f =>
      f.id === fieldId ? { ...f, colSpan } : f
    )
    updateConfig(moduleId, { customFields: updatedFields })
  }

  async function handleSave(moduleId: string) {
    setSaving(true)
    setError("")
    const config = getConfig(moduleId)

    try {
      const res = await fetch(`/api/admin/branches/${branchId}/module-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: config.module,
          isEnabled: config.isEnabled,
          customFields: config.customFields.map((f) => ({
            fieldName: f.fieldName,
            fieldLabel: f.fieldLabel,
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            options: f.options,
            order: f.order,
            colSpan: f.colSpan,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save config")
        setSaving(false)
        return
      }
      setSuccess(`Configuration saved for ${modules.find((m) => m.id === moduleId)?.name}`)
      await fetchData()
    } catch {
      setError("Failed to save config")
    }
    setSaving(false)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!currentUser || !branch) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role={currentUser.role} />

      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Module Configuration
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Customize forms and fields for <span className="text-cyan-400">{branch.name}</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Drag fields to reorder. Use buttons to change column width (1 or 2 columns).
                </p>
              </div>
              <button
                onClick={() => window.history.back()}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
              >
                ← Back
              </button>
            </div>
          </section>

          {/* Error/Success */}
          {error && (
            <div className="rounded-2xl border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">
              {error}
              <button onClick={() => setError("")} className="ml-2 underline">Dismiss</button>
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-700/50 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">
              {success}
              <button onClick={() => setSuccess("")} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          {/* Add / Remove Module Section */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Manage Modules</h2>
              <button
                onClick={() => setShowNewModuleForm(!showNewModuleForm)}
                className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
              >
                {showNewModuleForm ? "Cancel" : "+ Add New Module"}
              </button>
            </div>
            {showNewModuleForm && (
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Module ID</label>
                  <input
                    type="text"
                    value={newModuleId}
                    onChange={(e) => setNewModuleId(e.target.value)}
                    placeholder="e.g. safetyAudits"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Module Name</label>
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    placeholder="e.g. Safety Audits"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Icon (emoji)</label>
                  <input
                    type="text"
                    value={newModuleIcon}
                    onChange={(e) => setNewModuleIcon(e.target.value)}
                    placeholder="📋"
                    maxLength={2}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addCustomModule}
                    className="w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20"
                  >
                    Create Module
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Module Configs */}
          {modules.map((module) => {
            const config = getConfig(module.id)
            const defaults = DEFAULT_FIELDS[module.id] || []
            const isExpanded = expandedModule === module.id

            return (
              <section key={module.id} className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{module.icon}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-white">{module.name}</h2>
                      <p className="text-xs text-slate-400">
                        {config.customFields.length} field(s) configured
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => removeModule(module.id)}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
                      title="Remove this module"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
                    >
                      {isExpanded ? "Hide" : "Show"} Fields
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.isEnabled}
                        onChange={(e) => updateConfig(module.id, { isEnabled: e.target.checked })}
                        className="rounded border-white/20 bg-slate-950/50 text-cyan-400 focus:ring-cyan-400"
                      />
                      <span className="text-sm text-slate-300">Enabled</span>
                    </label>
                  </div>
                </div>

                {config.isEnabled && isExpanded && (
                  <div className="space-y-6 mt-6">
                    {/* Form Preview - Exact same layout as edit form */}
                    <div className="rounded-xl border border-cyan-400/30 bg-slate-900/50 p-6">
                      <h3 className="text-sm font-semibold text-cyan-300 mb-4">
                        Form Preview - Same layout as edit form
                      </h3>
                      <p className="text-xs text-slate-400 mb-4">
                        Drag fields to reorder. Click "1 col" or "2 col" to change width.
                      </p>

                      {config.customFields.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg">
                          <p className="text-sm text-slate-400">No fields added yet</p>
                          <p className="text-xs text-slate-500 mt-1">Drag fields from "Available Fields" below</p>
                        </div>
                      ) : (
                        <form className="grid gap-4 md:grid-cols-2">
                          {config.customFields.map((field, index) => {
                            const isDraggedOver = dragOverFieldId === field.id && draggedField?.fieldId !== field.id
                            const colSpan = field.colSpan || 1

                            return (
                              <div
                                key={field.id}
                                draggable
                                onDragStart={() => handleDragStart(field.id)}
                                onDragOver={(e) => handleDragOver(e, field.id)}
                                onDrop={() => handleDrop(field.id)}
                                onDragEnd={handleDragEnd}
                                className={`rounded-lg border-2 border-dashed p-4 cursor-move transition ${
                                  colSpan === 2 ? "md:col-span-2" : ""
                                } ${
                                  isDraggedOver
                                    ? "border-cyan-400 bg-cyan-400/10"
                                    : "border-white/20 bg-slate-950/50 hover:border-white/40"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
                                    <span className="text-xs text-slate-600 cursor-move">⋮⋮</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateFieldColSpan(module.id, field.id, colSpan === 1 ? 2 : 1)}
                                      className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300 hover:bg-white/10"
                                      title={colSpan === 1 ? "Expand to 2 columns" : "Shrink to 1 column"}
                                    >
                                      {colSpan} col
                                    </button>
                                    <button
                                      onClick={() => removeCustomField(module.id, field.id)}
                                      className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/20"
                                      title="Remove field"
                                    >✕</button>
                                  </div>
                                </div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                  {field.fieldLabel}
                                  {field.isRequired && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                {field.fieldType === "textarea" ? (
                                  <textarea
                                    disabled
                                    className={`w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-500`}
                                    rows={3}
                                    placeholder="Text area"
                                  />
                                ) : field.fieldType === "select" ? (
                                  <select disabled className={`w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-500`}>
                                    <option>Select {field.fieldLabel}</option>
                                  </select>
                                ) : field.fieldType === "number" ? (
                                  <input
                                    type="number"
                                    disabled
                                    className={`w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-500`}
                                    placeholder="0"
                                  />
                                ) : field.fieldType === "date" ? (
                                  <input
                                    type="date"
                                    disabled
                                    className={`w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-500`}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    disabled
                                    className={`w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-500`}
                                    placeholder={`Enter ${field.fieldLabel}`}
                                  />
                                )}
                              </div>
                            )
                          })}
                        </form>
                      )}
                    </div>

                    {/* Available Fields to Add */}
                    <div className="rounded-xl border border-purple-700/30 bg-purple-900/10 p-4">
                      <h3 className="text-sm font-semibold text-purple-300 mb-3">
                        Available Fields
                      </h3>
                      <p className="text-xs text-slate-400 mb-3">
                        Drag fields from here into the form preview above
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {defaults.map((defField, idx) => {
                          const isAdded = config.customFields.some(f => f.fieldName === defField.fieldName)
                          return (
                            <div
                              key={idx}
                              draggable={!isAdded}
                              onDragStart={() => {
                                if (!isAdded) {
                                  addDefaultField(module.id, defField)
                                }
                              }}
                              className={`text-left rounded-lg border p-3 transition ${
                                isAdded
                                  ? "border-emerald-700/50 bg-emerald-900/20 opacity-50 cursor-not-allowed"
                                  : "border-white/10 bg-slate-950/60 hover:border-cyan-400/30 hover:bg-cyan-400/5 cursor-move"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-white">{defField.fieldLabel}</p>
                                  <p className="text-xs text-slate-400">{defField.fieldType}</p>
                                </div>
                                {isAdded && <span className="text-xs text-emerald-400">✓ Added</span>}
                                {!isAdded && <span className="text-xs text-slate-600">⋮⋮</span>}
                              </div>
                              {defField.isRequired && (
                                <span className="inline-block mt-1 text-[10px] text-red-400">Required</span>
                              )}
                            </div>
                          )
                        })}
                        <div
                          draggable
                          onDragStart={() => addCustomField(module.id)}
                          className="text-left rounded-lg border border-dashed border-purple-400/30 bg-purple-900/5 p-3 hover:border-purple-400/50 hover:bg-purple-900/10 transition cursor-move"
                        >
                          <p className="text-sm font-medium text-purple-300">+ Add Custom Field</p>
                          <p className="text-xs text-slate-400">Drag to add to form</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSave(module.id)}
                      disabled={saving}
                      className="w-full rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Configuration"}
                    </button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}