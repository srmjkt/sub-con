"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface AttendanceRecord {
  id: string
  employeeName: string
  date: string
  status: string
  notes: string | null
  branch: { id: string; name: string }
  recordedBy: { id: string; name: string }
}

export default function InputterAttendancePage() {
  const { user, loading: authLoading } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [employeeName, setEmployeeName] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [status, setStatus] = useState("present")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function fetchData() {
    const res = await fetch("/api/data/attendance")
    const data = await res.json()
    setRecords(data.records || [])
    setLoading(false)
  }

  useEffect(() => { if (user) fetchData() }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setSuccess(""); setSubmitting(true)
    try {
      const res = await fetch("/api/data/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeName, date, status, notes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }
      setSuccess("Attendance recorded successfully")
      setEmployeeName(""); setDate(new Date().toISOString().split("T")[0]); setStatus("present"); setNotes("")
      setShowForm(false); await fetchData()
    } catch { setError("An error occurred") }
    setSubmitting(false)
  }

  const statusColors: Record<string, string> = {
    present: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
    absent: "border-red-700/50 bg-red-900/30 text-red-300",
    late: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
    leave: "border-blue-700/50 bg-blue-900/30 text-blue-300",
  }

  if (authLoading || loading) return <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center"><div className="text-white">Loading...</div></div>
  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role={user.role} branchName={user.branch?.name} />
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">Attendance Records</h1>
                <p className="mt-2 text-sm text-slate-300">Track daily attendance for {user.branch?.name}</p>
              </div>
              <button onClick={() => setShowForm(!showForm)} className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20">
                {showForm ? "Cancel" : "+ Record Attendance"}
              </button>
            </div>
          </section>

          {error && <div className="rounded-2xl border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-700/50 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">{success}</div>}

          {showForm && (
            <section className="rounded-[28px] border border-cyan-400/20 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">New Attendance Record</h2>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Employee Name *</label>
                  <input type="text" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Full name of employee" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Optional notes" />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" disabled={submitting} className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50">
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Records ({records.length})</h2>
            {records.length === 0 ? (
              <div className="text-center py-12"><p className="text-slate-400">No attendance records yet.</p></div>
            ) : (
              <div className="space-y-3">
                {records.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{r.employeeName}</h3>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[r.status] || ""}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>📅 {new Date(r.date).toLocaleDateString()}</span>
                        {r.notes && <span>📝 {r.notes}</span>}
                      </div>
                    </div>
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