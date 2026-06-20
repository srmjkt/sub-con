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
}

interface ModuleConfig {
  id: string
  module: string
  isEnabled: boolean
  customFields: CustomField[]
}

const DEFAULT_FIELDS: Record<string, { fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean }[]> = {
  incidents: [
    { fieldName: "title", fieldLabel: "Title", fieldType: "text", isRequired: true },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: true },
    { fieldName: "severity", fieldLabel: "Severity", fieldType: "select", isRequired: true },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true },
    { fieldName: "location", fieldLabel: "Location", fieldType: "text", isRequired: false },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true },
  ],
  attendance: [
    { fieldName: "employeeName", fieldLabel: "Employee Name", fieldType: "text", isRequired: true },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false },
  ],
  trainings: [
    { fieldName: "title", fieldLabel: "Training Title", fieldType: "text", isRequired: true },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true },
    { fieldName: "duration", fieldLabel: "Duration", fieldType: "text", isRequired: false },
    { fieldName: "trainer", fieldLabel: "Trainer", fieldType: "text", isRequired: false },
    { fieldName: "participants", fieldLabel: "Number of Participants", fieldType: "number", isRequired: false },
  ],
  simulations: [
    { fieldName: "title", fieldLabel: "Simulation Title", fieldType: "text", isRequired: true },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true },
    { fieldName: "scenario", fieldLabel: "Scenario", fieldType: "text", isRequired: false },
    { fieldName: "participants", fieldLabel: "Number of Participants", fieldType: "number", isRequired: false },
    { fieldName: "result", fieldLabel: "Result", fieldType: "select", isRequired: false },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false },
  ],
  mockDrills: [
    { fieldName: "title", fieldLabel: "Drill Title", fieldType: "text", isRequired: true },
    { fieldName: "description", fieldLabel: "Description", fieldType: "textarea", isRequired: false },
    { fieldName: "date", fieldLabel: "Date", fieldType: "date", isRequired: true },
    { fieldName: "drillType", fieldLabel: "Drill Type", fieldType: "select", isRequired: true },
    { fieldName: "participants", fieldLabel: "Number of Participants", fieldType: "number", isRequired: false },
    { fieldName: "result", fieldLabel: "Result", fieldType: "select", isRequired: false },
    { fieldName: "notes", fieldLabel: "Notes", fieldType: "textarea", isRequired: false },
  ],
  inventory: [
    { fieldName: "itemName", fieldLabel: "Item Name", fieldType: "text", isRequired: true },
    { fieldName: "quantity", fieldLabel: "Quantity", fieldType: "number", isRequired: true },
    { fieldName: "unit", fieldLabel: "Unit", fieldType: "text", isRequired: true },
    { fieldName: "category", fieldLabel: "Category", fieldType: "text", isRequired: false },
    { fieldName: "status", fieldLabel: "Status", fieldType: "select", isRequired: true },
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
  const [modules, setModules] = useState([
    { id: "incidents", name: "Incident Reports", icon: "⚠️" },
    { id: "attendance", name: "Attendance", icon: "📋" },
    { id: "trainings", name: "Trainings", icon: "📚" },
    { id: "simulations", name: "Simulations", icon: "🎯" },
    { id: "mockDrills", name: "Mock Drills", icon: "🚒" },
    { id: "inventory", name: "Inventory", icon: "📦" },
  ])

  const fieldTypes = [
    { value: "text", label: "Text Input" },
    { value: "textarea", label: "Text Area" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date Picker" },
    { value: "select", label: "Dropdown" },
  ]

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
      // Ensure all modules have a config entry
      const allConfigs = modules.map(m => {
        const existing = savedConfigs.find((c: ModuleConfig) => c.module === m.id)
        return existing || { id: "", module: m.id, isEnabled: true, customFields: [] }
      })
      setConfigs(allConfigs)
    } catch {
      setError("Failed to fetch data")
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

  // Add custom module
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

  // Field reordering
  function moveFieldUp(moduleId: string, fieldId: string) {
    const config = getConfig(moduleId)
    const idx = config.customFields.findIndex(f => f.id === fieldId)
    if (idx <= 0) return
    const newFields = [...config.customFields]
    ;[newFields[idx - 1], newFields[idx]] = [newFields[idx], newFields[idx - 1]]
    newFields.forEach((f, i) => f.order = i)
    updateConfig(moduleId, { customFields: newFields })
  }

  function moveFieldDown(moduleId: string, fieldId: string) {
    const config = getConfig(moduleId)
    const idx = config.customFields.findIndex(f => f.id === fieldId)
    if (idx < 0 || idx >= config.customFields.length - 1) return
    const newFields = [...config.customFields]
    ;[newFields[idx], newFields[idx + 1]] = [newFields[idx + 1], newFields[idx]]
    newFields.forEach((f, i) => f.order = i)
    updateConfig(moduleId, { customFields: newFields })
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
    }
    updateConfig(moduleId, {
      customFields: [...config.customFields, newField],
    })
  }

  function updateCustomField(moduleId: string, fieldId: string, updates: Partial<CustomField>) {
    const config = getConfig(moduleId)
    const updatedFields = config.customFields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    )
    updateConfig(moduleId, { customFields: updatedFields })
  }

  function removeCustomField(moduleId: string, fieldId: string) {
    const config = getConfig(moduleId)
    const filteredFields = config.customFields.filter((f) => f.id !== fieldId)
    updateConfig(moduleId, { customFields: filteredFields })
  }

  function addDefaultField(moduleId: string, defaultField: { fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean }) {
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
    }
    updateConfig(moduleId, {
      customFields: [...config.customFields, newField],
    })
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
        <div className="max-w-6xl mx-auto space-y-8">
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
                  Add default fields or create custom fields for each module
                </p>
              </div>
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
                    {/* Default Fields Section */}
                    <div className="rounded-xl border border-blue-700/30 bg-blue-900/10 p-4">
                      <h3 className="text-sm font-semibold text-blue-300 mb-3">
                        Default Fields (Click to add)
                      </h3>
                      <p className="text-xs text-slate-400 mb-3">
                        These are the standard fields for {module.name}. Click to add them to your custom form.
                      </p>
                      <div className="space-y-2">
                        {defaults.map((defField, idx) => {
                          const isAdded = config.customFields.some(f => f.fieldName === defField.fieldName)
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-mono w-6">#{idx + 1}</span>
                              <button
                                onClick={() => addDefaultField(module.id, defField)}
                                disabled={isAdded}
                                className={`flex-1 text-left rounded-lg border p-3 transition ${
                                  isAdded
                                    ? "border-emerald-700/50 bg-emerald-900/20 opacity-50 cursor-not-allowed"
                                    : "border-white/10 bg-slate-950/60 hover:border-cyan-400/30 hover:bg-cyan-400/5"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-white">{defField.fieldLabel}</p>
                                    <p className="text-xs text-slate-400">{defField.fieldType}</p>
                                  </div>
                                  {isAdded && <span className="text-xs text-emerald-400">✓ Added</span>}
                                </div>
                                {defField.isRequired && (
                                  <span className="inline-block mt-1 text-[10px] text-red-400">Required</span>
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Custom Fields Section */}
                    <div className="rounded-xl border border-purple-700/30 bg-purple-900/10 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-purple-300">Custom Fields</h3>
                          <p className="text-xs text-slate-400">
                            Additional fields you've added to this module
                          </p>
                        </div>
                        <button
                          onClick={() => addCustomField(module.id)}
                          className="rounded-lg border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 text-xs font-medium text-purple-100 transition hover:bg-purple-400/20"
                        >
                          + Add Custom Field
                        </button>
                      </div>

                      {config.customFields.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4 text-center">
                          No custom fields added yet. Add default fields above or create custom ones.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {config.customFields.map((field, index) => (
                            <div key={field.id} className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
                                <button
                                  onClick={() => moveFieldUp(module.id, field.id)}
                                  disabled={index === 0}
                                  className="rounded border border-white/10 bg-slate-950/50 px-1.5 py-0.5 text-xs text-slate-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move up"
                                >↑</button>
                                <button
                                  onClick={() => moveFieldDown(module.id, field.id)}
                                  disabled={index === config.customFields.length - 1}
                                  className="rounded border border-white/10 bg-slate-950/50 px-1.5 py-0.5 text-xs text-slate-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move down"
                                >↓</button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">Field Label</label>
                                  <input
                                    type="text"
                                    value={field.fieldLabel}
                                    onChange={(e) => updateCustomField(module.id, field.id, { fieldLabel: e.target.value })}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">Field Name</label>
                                  <input
                                    type="text"
                                    value={field.fieldName}
                                    onChange={(e) => updateCustomField(module.id, field.id, { fieldName: e.target.value })}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">Field Type</label>
                                  <select
                                    value={field.fieldType}
                                    onChange={(e) => updateCustomField(module.id, field.id, { fieldType: e.target.value })}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
                                  >
                                    {fieldTypes.map((ft) => (
                                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-end gap-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.isRequired}
                                      onChange={(e) => updateCustomField(module.id, field.id, { isRequired: e.target.checked })}
                                      className="rounded border-white/20 bg-slate-950/50 text-cyan-400 focus:ring-cyan-400"
                                    />
                                    <span className="text-xs text-slate-300">Required</span>
                                  </label>
                                  <button
                                    onClick={() => removeCustomField(module.id, field.id)}
                                    className="ml-auto rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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