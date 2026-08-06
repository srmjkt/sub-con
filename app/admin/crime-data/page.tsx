"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";

const ALL_PROVINCES = [
  // Sumatera
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
  "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung", "Kepulauan Bangka Belitung",
  // Jawa
  "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Banten",
  "Daerah Istimewa Yogyakarta",
  // Bali & Nusa Tenggara
  "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  // Kalimantan
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan",
  "Kalimantan Timur", "Kalimantan Utara",
  // Sulawesi
  "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan",
  "Sulawesi Tenggara", "Sulawesi Barat", "Gorontalo",
  // Maluku
  "Maluku", "Maluku Utara",
  // Papua
  "Papua", "Papua Barat", "Papua Selatan", "Papua Tengah",
  "Papua Pegunungan", "Papua Barat Daya",
];

interface CrimeDataItem {
  id: string;
  province: string;
  crimeCount: number;
  year: number;
  notes: string | null;
  updatedAt: string;
}

export default function CrimeDataPage() {
  const { user, loading: authLoading } = useAuth();
  const [crimeData, setCrimeData] = useState<CrimeDataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, { crimeCount: string; notes: string; year: string }>>({});
  const [selectedYear, setSelectedYear] = useState('2026');

  useEffect(() => {
    setFormData((prev) => {
      const next = { ...prev };
      ALL_PROVINCES.forEach((province) => {
        if (next[province]) {
          next[province] = { ...next[province], year: selectedYear };
        }
      });
      return next;
    });
  }, [selectedYear]);

  useEffect(() => {
    if (!authLoading && user && user.role === "ADMIN") {
      fetchCrimeData();
    }
  }, [user, authLoading]);

  async function fetchCrimeData() {
    try {
      setLoadingData(true);
      const res = await fetch("/api/admin/crime-data");
      if (!res.ok) throw new Error("Failed to fetch crime data");
      const data = await res.json();
      const items: CrimeDataItem[] = data.crimeData || [];
      setCrimeData(items);

      const formMap: Record<string, { crimeCount: string; notes: string; year: string }> = {};
      items.forEach((item) => {
        formMap[item.province] = {
          crimeCount: String(item.crimeCount),
          notes: item.notes || "",
          year: String(item.year),
        };
      });
      setFormData(formMap);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSave(province: string) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const data = formData[province] || { crimeCount: "0", notes: "" };

      const res = await fetch("/api/admin/crime-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          province,
          crimeCount: Number(data.crimeCount) || 0,
          year: Number(selectedYear),
          notes: data.notes || null,
          updatedById: user?.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to save crime data");
      setSuccess(`Data for ${province} saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchCrimeData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(province: string) {
    if (!confirm(`Delete crime data for ${province}?`)) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/crime-data?province=${encodeURIComponent(province)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete crime data");
      setSuccess(`Data for ${province} deleted`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchCrimeData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleInputChange(province: string, field: "crimeCount" | "notes" | "year", value: string) {
    setFormData((prev) => ({
      ...prev,
      [province]: {
        crimeCount: prev[province]?.crimeCount || "0",
        notes: prev[province]?.notes || "",
        year: prev[province]?.year || selectedYear,
        [field]: value,
      },
    }));
  }

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Not authenticated</p>
          <a href="/login" className="text-cyan-400 hover:underline">Go to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role={user.role} branchId={user.branchId || undefined} />

      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200 mb-3">
                  Admin Panel
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Crime Data Management
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Manually add crime data values for each province. This data will be displayed in the Pusiknas heatmap when you select the "Manual" tab.
                </p>
              </div>
            </div>
          </section>

          {error && (
            <div className="p-3 border border-red-200 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 border border-green-200 rounded bg-green-50 text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Crime Data Table */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="text-left p-2 border border-white/10 text-white">Province</th>
                    <th className="text-left p-2 border border-white/10 text-white">Year</th>
                    <th className="text-left p-2 border border-white/10 text-white">Crime Count</th>
                    <th className="text-left p-2 border border-white/10 text-white">Notes</th>
                    <th className="text-left p-2 border border-white/10 text-white">Last Updated</th>
                    <th className="text-left p-2 border border-white/10 text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_PROVINCES.map((province) => {
                    const existing = crimeData.find((d) => d.province === province);
                    const form = formData[province] || { crimeCount: "", notes: "", year: selectedYear };
                    return (
                      <tr key={province} className="hover:bg-white/5">
                        <td className="p-2 border border-white/10 font-medium text-white">{province}</td>
                        <td className="p-2 border border-white/10">
                          <select
                            value={form.year}
                            onChange={(e) => handleInputChange(province, "year", e.target.value)}
                            className="w-full px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                          >
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                          </select>
                        </td>
                        <td className="p-2 border border-white/10">
                          <input
                            type="number"
                            value={form.crimeCount}
                            onChange={(e) => handleInputChange(province, "crimeCount", e.target.value)}
                            placeholder="0"
                            className="w-24 px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                          />
                        </td>
                        <td className="p-2 border border-white/10">
                          <input
                            type="text"
                            value={form.notes}
                            onChange={(e) => handleInputChange(province, "notes", e.target.value)}
                            placeholder="Optional notes"
                            className="w-full px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                          />
                        </td>
                        <td className="p-2 border border-white/10 text-slate-400 text-xs">
                          {existing ? new Date(existing.updatedAt).toLocaleDateString("id-ID") : "-"}
                        </td>
                        <td className="p-2 border border-white/10">
                          <button
                            onClick={() => handleSave(province)}
                            disabled={saving}
                            className="px-3 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700 disabled:opacity-50 mr-2"
                          >
                            Save
                          </button>
                          {existing && (
                            <button
                              onClick={() => handleDelete(province)}
                              disabled={saving}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm text-white">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-300 rounded p-1 text-sm text-black"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
              <button
                onClick={() => {
                  ALL_PROVINCES.forEach((province) => handleSave(province));
                }}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Save All
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}