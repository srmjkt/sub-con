"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface InventoryItem {
  id: string; itemName: string; quantity: number; unit: string; category: string | null
  status: string; lastUpdated: string
  branch: { id: string; name: string }; createdBy: { id: string; name: string }
}

export default function InputterInventoryPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [itemName, setItemName] = useState("")
  const [quantity, setQuantity] = useState(0)
  const [unit, setUnit] = useState("pcs")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("available")
  const [submitting, setSubmitting] = useState(false)

  async function fetchData() {
    const res = await fetch("/api/data/inventory")
    const data = await res.json()
    setItems(data.inventory || []); setLoading(false)
  }
  useEffect(() => { if (user) fetchData() }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true)
    try {
      const res = await fetch("/api/data/inventory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName, quantity, unit, category, status }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }
      setSuccess("Inventory item created successfully")
      setItemName(""); setQuantity(0); setUnit("pcs"); setCategory(""); setStatus("available")
      setShowForm(false); await fetchData()
    } catch { setError("An error occurred") }
    setSubmitting(false)
  }

  const statusColors: Record<string, string> = {
    available: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
    low: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
    out_of_stock: "border-red-700/50 bg-red-900/30 text-red-300",
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
                <h1 className="text-3xl font-semibold tracking-tight text-white">Inventory</h1>
                <p className="mt-2 text-sm text-slate-300">Manage inventory for {user.branch?.name}</p>
              </div>
              <button onClick={() => setShowForm(!showForm)} className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20">
                {showForm ? "Cancel" : "+ Add Item"}
              </button>
            </div>
          </section>
          {error && <div className="rounded-2xl border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-700/50 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">{success}</div>}
          {showForm && (
            <section className="rounded-[28px] border border-cyan-400/20 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">Add Inventory Item</h2>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Item Name *</label>
                  <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none" placeholder="Item name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={0} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="liters">Liters</option>
                    <option value="boxes">Boxes</option>
                    <option value="sets">Sets</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                    <option value="">Select category</option>
                    <option value="equipment">Equipment</option>
                    <option value="supplies">Supplies</option>
                    <option value="safety">Safety</option>
                    <option value="tools">Tools</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none">
                    <option value="available">Available</option>
                    <option value="low">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button type="submit" disabled={submitting} className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50">
                    {submitting ? "Submitting..." : "Add Item"}
                  </button>
                </div>
              </form>
            </section>
          )}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4">Inventory ({items.length})</h2>
            {items.length === 0 ? <div className="text-center py-12"><p className="text-slate-400">No inventory items yet.</p></div> : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{item.itemName}</h3>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status] || ""}`}>{item.status.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>📦 {item.quantity} {item.unit}</span>
                        {item.category && <span>🏷️ {item.category}</span>}
                        <span>📅 Updated {new Date(item.lastUpdated).toLocaleDateString()}</span>
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