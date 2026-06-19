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

  const modules = [
    { id: "incidents", name: "Incident Reports" },
    { id: "attendance", name: "Attendance" },
    { id: "trainings", name: "Trainings" },
    { id: "simulations", name: "Simulations" },
    { id: "mockDrills", name: "Mock Drills" },
    { id: "inventory", name: "Inventory" },
  ]

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "textarea", label: "Text Area" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
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
      setConfigs(configsData.configs || [])
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
    setConfigs(
      configs.map((c) => (c.module === moduleId ? { ...c, ...updates } : c))
    )
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
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Module Configuration
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Customize forms and fields for {branch.name}
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

          {/* Module Configs */}
          {modules.map((module) => {
            const config = getConfig(module.id)
            return (
              <section key={module.id} className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">{module.name}</h2>
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

                {config.isEnabled && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-300">Custom Fields</h3>
                      <button
                        onClick={() => addCustomField(module.id)}
                        className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                      >
                        + Add Field
                      </button>
                    </div>

                    {config.customFields.length === 0 ? (
                      <p className="text-sm text-slate-400">No custom fields. Using default fields.</p>
                    ) : (
                      <div className="space-y-3">
                        {config.customFields.map((field) => (
                          <div key={field.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
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

                    <button
                      onClick={() => handleSave(module.id)}
                      disabled={saving}
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
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