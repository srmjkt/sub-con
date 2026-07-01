"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/useAuth"

interface Employee {
  id: string
  employeeId: string
  fullName: string
  email: string | null
  department: string | null
  position: string | null
}

interface EmployeeSearchProps {
  value: string
  onChange: (name: string) => void
  onSelect?: (employee: Employee) => void
}

export function EmployeeSearch({ value, onChange, onSelect }: EmployeeSearchProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Employee[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (query.length < 1) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const branchId = user?.branchId
        const params = new URLSearchParams({ q: query })
        if (branchId) params.set("branchId", branchId)
        const res = await fetch(`/api/employees/search?${params}`)
        const data = await res.json()
        setResults(data.employees || [])
        setShowResults(true)
      } catch (err) {
        console.error("Employee search failed:", err)
      }
      setLoading(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, user])

  function handleSelect(emp: Employee) {
    setQuery(emp.fullName)
    onChange(emp.fullName)
    setShowResults(false)
    if (onSelect) onSelect(emp)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value)
          }}
          onFocus={() => { if (results.length > 0) setShowResults(true) }}
          placeholder="Search employee name..."
          className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
        />
        <svg className="absolute left-3 top-3 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-slate-900 shadow-2xl backdrop-blur-xl max-h-60 overflow-y-auto">
          {results.map((emp) => (
            <button
              key={emp.id}
              onClick={() => handleSelect(emp)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-b-0 transition"
            >
              <div className="font-medium text-white text-sm">{emp.fullName}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {emp.employeeId}
                {emp.department && ` - ${emp.department}`}
                {emp.position && ` (${emp.position})`}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && query.length >= 1 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-400">
          No employees found
        </div>
      )}
    </div>
  )
}