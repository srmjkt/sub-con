"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface Simulation {
  id: string; title: string; description: string | null; date: string
  participants: number; scenario: string | null; result: string | null; notes: string | null
  branch: { id: string; name: string }; createdBy: { id: string; name: string }
}

export default function InputterSimulationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<Simulation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [participants, setParticipants] = useState(0)
  const [scenario, setScenario] = useState("")
  const [result, setResult] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function fetchData() {
    const res = await fetch("/api/data/simulations")
    const data = await res.json()
    setItems(data.simulations || []); setLoading(false)
  }
  useEffect(() => { if (user) fetchData() }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
    try {
      const res = await fetch("/api/data/simulations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, date, participants, scenario, result, notes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }
      setSuccess("Simulation created successfully")
      setTitle(""); setDescription(""); setDate(new Date().toISOString().split("T")[0]); setParticipants(0); setScenario(""); setResult(""); setNotes("")
      setShowForm(false); await fetchData()
    } catch { setError("An error occurred") }
    setSubmitting(false)
  }

  const resultColors: Record<string, string> = {
    pass: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
    fail: "border-red-700/50 bg-red-900/30 text-red-300",
    partial: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
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
                <h1 className="text-3xl font-semibold tracking-tight text-white">Simulations</h1>
                <p className="mt-2 text-sm text-slate-300">Record simulation exercises for {user.branch?.name}</p>
              </div>
              <button onClick={() => setShowForm(!showForm)} className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20">
                {showForm ? "Cancel" : "+ New Simulation"}
              </button>
            </div>
          </section>
          {error && <div className="rounded-2xl border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-700/50 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">{success}</div>}
          {showForm && (
            <section className="rounded-[28px] border border-cyan-400/20 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">New Simulation</h2>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none" placeholder="Simulation title" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Participants</label>
                  <input type="number" value={participants} onChange={(e) => setParticipants(Number(e.target.value))} min={0} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Scenario</label>
                  <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} rows={2} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none resize-none" placeholder="Describe the scenario" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Result</label>
                  <select value={result} onChange={(e) => setResult(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                    <option value="">Select result</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none" placeholder="Additional notes" />
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
            <h2 className="text-lg font-semibold text-white mb-4">Simulations ({items.length})</h2>
            {items.length === 0 ? <div className="text-center py-12"><p className="text-slate-400">No simulations yet.</p></div> : (
              <div className="space-y-3">
                {items.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{s.title}</h3>
                      {s.result && <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${resultColors[s.result] || ""}`}>{s.result}</span>}
                    </div>
                    {s.description && <p className="text-sm text-slate-400 mt-1">{s.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>📅 {new Date(s.date).toLocaleDateString()}</span>
                      <span>👥 {s.participants} participants</span>
                      {s.scenario && <span>🎭 Scenario recorded</span>}
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