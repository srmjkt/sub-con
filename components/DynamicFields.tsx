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

  useEffect(() => {
    async function fetchFields() {
      if (!user?.branchId) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/admin/branches/${user.branchId}/module-config`)
        const data = await res.json()
        const configs = data.configs || []
        const config = configs.find((c: { module: string }) => c.module === module)
        setFields(config?.customFields || [])
      } catch (error) {
        console.error("Failed to fetch custom fields:", error)
      }
      setLoading(false)
    }
    fetchFields()
  }, [user, module])

  return { customFields: fields, loading }
}

export function DynamicFields({ module, values, onChange }: DynamicFieldsProps) {
  const { customFields, loading } = useCustomFields(module)

  if (loading) return <p className="text-sm text-slate-400">Loading custom fields...</p>
  if (customFields.length === 0) return null

  return (
    <>
      {customFields.map((field) => (
        <div
          key={field.id}
          className={(field.colSpan || 1) === 2 ? "md:col-span-2" : ""}
        >
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {field.fieldLabel}
            {field.isRequired && <span className="text-red-400 ml-1">*</span>}
            <span className="text-slate-500 ml-2 text-xs">(custom)</span>
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

export function CustomFieldDisplay({ module, data }: { module: string; data: Record<string, string> | null }) {
  const { customFields } = useCustomFields(module)

  if (customFields.length === 0) return null

  return (
    <>
      {customFields.map((field) => {
        const value = data?.[field.fieldName]
        return (
          <div key={field.id} className="mt-2">
            <span className="text-xs text-slate-500">{field.fieldLabel}:</span>
            <span className={`text-sm ml-2 ${value ? "text-slate-300" : "text-slate-600 italic"}`}>
              {value ?? "(empty)"}
            </span>
          </div>
        )
      })}
    </>
  )
}
