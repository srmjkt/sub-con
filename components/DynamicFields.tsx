"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"

interface CustomField {
  id: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  isRequired: boolean
  options: string | null
  order: number
  colSpan?: number
  optionColors?: Record<string, string> | null
}

interface DynamicFieldsProps {
  module: string
  values: Record<string, string>
  onChange: (fieldName: string, value: string) => void
}

export function useCustomFields(module: string) {
  const { user } = useAuth()
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFields() {
      if (!user?.branchId) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/admin/branches/${user.branchId}/module-config`)
        if (!res.ok) {
          const text = await res.text()
          console.error("Module config fetch failed:", res.status, text)
          setFields([])
          setError("Failed to load field configuration")
          setLoading(false)
          return
        }
        const data = await res.json()
        const configs = data.configs || []
        const config = configs.find((c: { module: string }) => c.module === module)
        const customFields = (config?.customFields || []) as CustomField[]
        console.log(`[useCustomFields] branch ${user.branchId} module ${module}:`, { totalConfigs: configs.length, matchedConfig: config?.module, fieldCount: customFields.length, fields: customFields.map(f => f.fieldName) })
        setFields(customFields)
        setError(null)
      } catch (error) {
        console.error("Failed to fetch custom fields:", error)
        setError("Failed to load custom fields")
        setFields([])
      } finally {
        setLoading(false)
      }
    }
    fetchFields()
  }, [user, module])

  return { customFields: fields, loading, error }
}

export function DynamicFields({ module, values, onChange }: DynamicFieldsProps) {
  const { customFields, loading, error } = useCustomFields(module)
  const { user } = useAuth()

  if (loading) return <p className="text-sm text-slate-400">Loading custom fields...</p>
  if (error) return <div className="text-sm text-red-400">{error}</div>

  // Filter out default fields so they don't duplicate the standard form fields
  const defaultFieldNames = DEFAULT_FIELD_NAMES[module] || new Set()
  const extraCustomFields = customFields.filter(f => !defaultFieldNames.has(f.fieldName))

  if (extraCustomFields.length === 0) return null

  // Sort by order field
  const sortedFields = [...extraCustomFields].sort((a, b) => a.order - b.order)

  console.log(`[DynamicFields] Rendering ${sortedFields.length} custom fields for module ${module}, branch ${user?.branchId}:`, sortedFields.map(f => f.fieldName))

  return (
    <>
      {sortedFields.map((field) => (
        <div
          key={field.id}
          className={(field.colSpan || 1) === 2 ? "md:col-span-2" : ""}
        >
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {field.fieldLabel}
            {field.isRequired && <span className="text-red-400 ml-1">*</span>}
          </label>
          {field.fieldType === "textarea" ? (
            <textarea
              value={values[field.fieldName] || ""}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
              rows={3}
            />
          ) : field.fieldType === "select" ? (
            <select
              value={values[field.fieldName] || ""}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
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
              value={values[field.fieldName] || ""}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
            />
          ) : field.fieldType === "date" ? (
            <input
              type="date"
              value={values[field.fieldName] || ""}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
            />
          ) : (
            <input
              type="text"
              value={values[field.fieldName] || ""}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
              required={field.isRequired}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
              placeholder={`Enter ${field.fieldLabel}`}
            />
          )}
        </div>
      ))}
    </>
  )
}

const DEFAULT_FIELD_NAMES: Record<string, Set<string>> = {
  incidents: new Set(["title", "description", "date", "severity", "status", "location", "incidentReportNumber"]),
  attendance: new Set(["employeeName", "date", "status", "notes"]),
  trainings: new Set(["title", "date", "duration", "trainer", "description", "participants"]),
  simulations: new Set(["title", "date", "scenario", "participants", "description", "result", "notes"]),
  mockDrills: new Set(["title", "date", "drillType", "participants", "description", "result", "notes"]),
  inventory: new Set(["itemName", "quantity", "unit", "category", "status"]),
}

export function CustomFieldDisplay({ module, data }: { module: string; data: Record<string, string> | null }) {
  const { customFields } = useCustomFields(module)
  const defaultFieldNames = DEFAULT_FIELD_NAMES[module] || new Set()

  const extraCustomFields = customFields.filter(f => !defaultFieldNames.has(f.fieldName))

  if (extraCustomFields.length === 0) return null

  const fieldsWithValues = extraCustomFields.filter(f => data?.[f.fieldName])

  if (fieldsWithValues.length === 0) return null

  return (
    <>
      {fieldsWithValues.map((field) => {
        const value = data?.[field.fieldName]
        
        // For select fields with colors, display colored badge
        if (field.fieldType === 'select' && field.optionColors && value) {
          const color = field.optionColors[value] || '#6b7280'
          return (
            <div key={field.id} className="mt-2">
              <span className="text-xs text-slate-500">{field.fieldLabel}:</span>
              <span
                className="inline-block ml-2 px-3 py-1 rounded-lg border text-sm"
                style={{
                  backgroundColor: color + '20',
                  borderColor: color + '40',
                  color: color
                }}
              >
                {value}
              </span>
            </div>
          )
        }
        
        return (
          <div key={field.id} className="mt-2">
            <span className="text-xs text-slate-500">{field.fieldLabel}:</span>
            <span className="text-sm ml-2 text-slate-300">
              {value}
            </span>
          </div>
        )
      })}
    </>
  )
}
