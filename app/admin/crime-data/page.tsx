"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";

const ALL_PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
  "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung",
  "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Banten",
  "Daerah Istimewa Yogyakarta", "Bali",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan",
  "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan",
  "Sulawesi Tenggara", "Sulawesi Barat", "Gorontalo",
  "Maluku", "Maluku Utara",
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [crimeData, setCrimeData] = useState<CrimeDataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state: province -> { crimeCount, notes }
  const [formData, setFormData] = useState<Record<string, { crimeCount: string; notes: string }>>({});

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      fetchCrimeData();
    }
  }, [user, loading, router]);

  async function fetchCrimeData() {
    try {
      setLoadingData(true);
      const res = await fetch("/api/admin/crime-data");
      if (!res.ok) throw new Error("Failed to fetch crime data");
      const data = await res.json();
      const items: CrimeDataItem[] = data.crimeData || [];
      setCrimeData(items);

      // Initialize form data with existing values
      const formMap: Record<string, { crimeCount: string; notes: string }> = {};
      items.forEach((item) => {
        formMap[item.province] = {
          crimeCount: String(item.crimeCount),
          notes: item.notes || "",
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
          year: new Date().getFullYear(),
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

  function handleInputChange(province: string, field: "crimeCount" | "notes", value: string) {
    setFormData((prev) => ({
      ...prev,
      [province]: {
        crimeCount: prev[province]?.crimeCount || "0",
        notes: prev[province]?.notes || "",
        [field]: value,
      },
    }));
  }

  if (loading || loadingData) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Crime Data Management</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Crime Data Management</h1>
      <p className="text-gray-600 mb-4">
        Manually add crime data values for each province. This data will be displayed in the Pusiknas heatmap when you select the "Manual" tab.
      </p>

      {error && (
        <div className="mb-4 p-3 border border-red-200 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 border border-green-200 rounded bg-green-50 text-green-700 text-sm">
          {success}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2 border">Province</th>
              <th className="text-left p-2 border">Crime Count</th>
              <th className="text-left p-2 border">Notes</th>
              <th className="text-left p-2 border">Last Updated</th>
              <th className="text-left p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ALL_PROVINCES.map((province) => {
              const existing = crimeData.find((d) => d.province === province);
              const form = formData[province] || { crimeCount: "", notes: "" };
              return (
                <tr key={province} className="hover:bg-gray-50">
                  <td className="p-2 border font-medium">{province}</td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={form.crimeCount}
                      onChange={(e) => handleInputChange(province, "crimeCount", e.target.value)}
                      placeholder="0"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => handleInputChange(province, "notes", e.target.value)}
                      placeholder="Optional notes"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="p-2 border text-gray-500 text-xs">
                    {existing ? new Date(existing.updatedAt).toLocaleDateString("id-ID") : "-"}
                  </td>
                  <td className="p-2 border">
                    <button
                      onClick={() => handleSave(province)}
                      disabled={saving}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 mr-2"
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

      <div className="mt-4">
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
    </div>
  );
}