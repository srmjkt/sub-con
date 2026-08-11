"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";
import { getCities, getDistricts, getProvinceCode } from "@/lib/indonesiaLocations";

const ALL_PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
  "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung", "Kepulauan Bangka Belitung",
  "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Banten",
  "Daerah Istimewa Yogyakarta",
  "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
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

interface RegencyCrimeDataItem {
  id: string;
  province: string;
  city: string;
  crimeCount: number;
  year: number;
  notes: string | null;
  updatedAt: string;
}

interface DistrictCrimeDataItem {
  id: string;
  province: string;
  city: string;
  district: string;
  crimeCount: number;
  year: number;
  notes: string | null;
  updatedAt: string;
}

type Tab = "province" | "regency" | "district";

export default function CrimeDataPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("province");
  const [provinceData, setProvinceData] = useState<CrimeDataItem[]>([]);
  const [regencyData, setRegencyData] = useState<RegencyCrimeDataItem[]>([]);
  const [districtData, setDistrictData] = useState<DistrictCrimeDataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedProvince, setSelectedProvince] = useState("Jawa Barat");
  const [selectedCity, setSelectedCity] = useState("Bandung");

  const [provinceFormData, setProvinceFormData] = useState<Record<string, { crimeCount: string; notes: string; year: string }>>({});
  const [regencyFormData, setRegencyFormData] = useState<Record<string, { crimeCount: string; notes: string; year: string }>>({});
  const [districtFormData, setDistrictFormData] = useState<Record<string, { crimeCount: string; notes: string; year: string }>>({});

  useEffect(() => {
    if (!authLoading && user && user.role === "ADMIN") {
      fetchProvinceData();
      fetchRegencyData();
      fetchDistrictData();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (tab === "province") {
      const formMap: Record<string, { crimeCount: string; notes: string; year: string }> = {};
      provinceData.forEach((item) => {
        formMap[item.province] = {
          crimeCount: String(item.crimeCount),
          notes: item.notes || "",
          year: String(item.year),
        };
      });
      setProvinceFormData(formMap);
    }
  }, [tab, provinceData, selectedYear]);

  useEffect(() => {
    if (tab === "regency") {
      const formMap: Record<string, { crimeCount: string; notes: string; year: string }> = {};
      regencyData.forEach((item) => {
        const key = `${item.province}__${item.city}`;
        formMap[key] = {
          crimeCount: String(item.crimeCount),
          notes: item.notes || "",
          year: String(item.year),
        };
      });
      setRegencyFormData(formMap);
    }
  }, [tab, regencyData, selectedYear]);

  useEffect(() => {
    if (tab === "district") {
      const formMap: Record<string, { crimeCount: string; notes: string; year: string }> = {};
      districtData.forEach((item) => {
        const key = `${item.province}__${item.city}__${item.district}`;
        formMap[key] = {
          crimeCount: String(item.crimeCount),
          notes: item.notes || "",
          year: String(item.year),
        };
      });
      setDistrictFormData(formMap);
    }
  }, [tab, districtData, selectedYear]);

  async function fetchProvinceData() {
    try {
      setLoadingData(true);
      const res = await fetch("/api/admin/crime-data");
      if (!res.ok) throw new Error("Failed to fetch crime data");
      const data = await res.json();
      setProvinceData(data.crimeData || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingData(false);
    }
  }

  async function fetchRegencyData() {
    try {
      const res = await fetch(`/api/admin/crime-data?province=${encodeURIComponent(selectedProvince)}&year=${selectedYear}&level=regency`);
      if (!res.ok) throw new Error("Failed to fetch regency data");
      const data = await res.json();
      setRegencyData(data.crimeData || []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function fetchDistrictData() {
    try {
      const res = await fetch(`/api/admin/crime-data?province=${encodeURIComponent(selectedProvince)}&city=${encodeURIComponent(selectedCity)}&year=${selectedYear}&level=district`);
      if (!res.ok) throw new Error("Failed to fetch district data");
      const data = await res.json();
      setDistrictData(data.crimeData || []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleSaveProvince(province: string) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const data = provinceFormData[province] || { crimeCount: "0", notes: "" };

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
      await fetchProvinceData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRegency(city: string) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const key = `${selectedProvince}__${city}`;
      const data = regencyFormData[key] || { crimeCount: "0", notes: "" };

      const res = await fetch("/api/admin/crime-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          province: selectedProvince,
          city,
          crimeCount: Number(data.crimeCount) || 0,
          year: Number(selectedYear),
          level: "regency",
          notes: data.notes || null,
          updatedById: user?.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to save regency data");
      setSuccess(`Data for ${city} saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchRegencyData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProvince(province: string) {
    if (!confirm(`Delete crime data for ${province}?`)) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/crime-data?province=${encodeURIComponent(province)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete crime data");
      setSuccess(`Data for ${province} deleted`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchProvinceData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRegency(city: string) {
    if (!confirm(`Delete crime data for ${city}?`)) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/crime-data?province=${encodeURIComponent(selectedProvince)}&city=${encodeURIComponent(city)}&level=regency`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete regency data");
      setSuccess(`Data for ${city} deleted`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchRegencyData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDistrict(district: string) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const key = `${selectedProvince}__${selectedCity}__${district}`;
      const data = districtFormData[key] || { crimeCount: "0", notes: "" };

      const res = await fetch("/api/admin/crime-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          province: selectedProvince,
          city: selectedCity,
          district,
          crimeCount: Number(data.crimeCount) || 0,
          year: Number(selectedYear),
          level: "district",
          notes: data.notes || null,
          updatedById: user?.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to save district data");
      setSuccess(`Data for ${district} saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchDistrictData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDistrict(district: string) {
    if (!confirm(`Delete crime data for ${district}?`)) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/crime-data?province=${encodeURIComponent(selectedProvince)}&city=${encodeURIComponent(selectedCity)}&district=${encodeURIComponent(district)}&level=district`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete district data");
      setSuccess(`Data for ${district} deleted`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchDistrictData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleProvinceInputChange(province: string, field: "crimeCount" | "notes" | "year", value: string) {
    setProvinceFormData((prev) => ({
      ...prev,
      [province]: {
        crimeCount: prev[province]?.crimeCount || "0",
        notes: prev[province]?.notes || "",
        year: prev[province]?.year || selectedYear,
        [field]: value,
      },
    }));
  }

  function handleRegencyInputChange(city: string, field: "crimeCount" | "notes" | "year", value: string) {
    setRegencyFormData((prev) => {
      const key = `${selectedProvince}__${city}`;
      return {
        ...prev,
        [key]: {
          crimeCount: prev[key]?.crimeCount || "0",
          notes: prev[key]?.notes || "",
          year: prev[key]?.year || selectedYear,
          [field]: value,
        },
      };
    });
  }

  function handleDistrictInputChange(district: string, field: "crimeCount" | "notes" | "year", value: string) {
    setDistrictFormData((prev) => {
      const key = `${selectedProvince}__${selectedCity}__${district}`;
      return {
        ...prev,
        [key]: {
          crimeCount: prev[key]?.crimeCount || "0",
          notes: prev[key]?.notes || "",
          year: prev[key]?.year || selectedYear,
          [field]: value,
        },
      };
    });
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
                  Manually add crime data values for each province and regency/city. This data will be displayed in the Pusiknas heatmap.
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

          {/* Tabs */}
          <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setTab("province")}
              className={`px-4 py-2 text-sm font-medium ${
                tab === "province" ? "bg-cyan-400/20 text-cyan-100" : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              Province
            </button>
            <button
              type="button"
              onClick={() => setTab("regency")}
              className={`px-4 py-2 text-sm font-medium ${
                tab === "regency" ? "bg-cyan-400/20 text-cyan-100" : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              Regency / City
            </button>
            <button
              type="button"
              onClick={() => setTab("district")}
              className={`px-4 py-2 text-sm font-medium ${
                tab === "district" ? "bg-cyan-400/20 text-cyan-100" : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              District / Kecamatan
            </button>
          </div>

          {/* Province Table */}
          {tab === "province" && (
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
                      const existing = provinceData.find((d) => d.province === province);
                      const form = provinceFormData[province] || { crimeCount: "", notes: "", year: selectedYear };
                      return (
                        <tr key={province} className="hover:bg-white/5">
                          <td className="p-2 border border-white/10 font-medium text-white">{province}</td>
                          <td className="p-2 border border-white/10">
                            <select
                              value={form.year}
                              onChange={(e) => handleProvinceInputChange(province, "year", e.target.value)}
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
                              onChange={(e) => handleProvinceInputChange(province, "crimeCount", e.target.value)}
                              placeholder="0"
                              className="w-24 px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                            />
                          </td>
                          <td className="p-2 border border-white/10">
                            <input
                              type="text"
                              value={form.notes}
                              onChange={(e) => handleProvinceInputChange(province, "notes", e.target.value)}
                              placeholder="Optional notes"
                              className="w-full px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                            />
                          </td>
                          <td className="p-2 border border-white/10 text-slate-400 text-xs">
                            {existing ? new Date(existing.updatedAt).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="p-2 border border-white/10">
                            <button
                              onClick={() => handleSaveProvince(province)}
                              disabled={saving}
                              className="px-3 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700 disabled:opacity-50 mr-2"
                            >
                              Save
                            </button>
                            {existing && (
                              <button
                                onClick={() => handleDeleteProvince(province)}
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
                    ALL_PROVINCES.forEach((province) => handleSaveProvince(province));
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Save All
                </button>
              </div>
            </section>
          )}

          {/* Regency Table */}
          {tab === "regency" && (
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white">Province:</label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      setSelectedProvince(e.target.value);
                      fetchRegencyData();
                    }}
                    className="border border-white/10 bg-white/5 rounded p-2 text-sm text-white"
                  >
                    {ALL_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      fetchRegencyData();
                    }}
                    className="border border-white/10 bg-white/5 rounded p-2 text-sm text-white"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left p-2 border border-white/10 text-white">City / Regency</th>
                      <th className="text-left p-2 border border-white/10 text-white">Year</th>
                      <th className="text-left p-2 border border-white/10 text-white">Crime Count</th>
                      <th className="text-left p-2 border border-white/10 text-white">Notes</th>
                      <th className="text-left p-2 border border-white/10 text-white">Last Updated</th>
                      <th className="text-left p-2 border border-white/10 text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCities(selectedProvince).map((city) => {
                      const existing = regencyData.find((d) => d.city === city);
                      const key = `${selectedProvince}__${city}`;
                      const form = regencyFormData[key] || { crimeCount: "", notes: "", year: selectedYear };
                      return (
                        <tr key={city} className="hover:bg-white/5">
                          <td className="p-2 border border-white/10 font-medium text-white">{city}</td>
                          <td className="p-2 border border-white/10">
                            <select
                              value={form.year}
                              onChange={(e) => handleRegencyInputChange(city, "year", e.target.value)}
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
                              onChange={(e) => handleRegencyInputChange(city, "crimeCount", e.target.value)}
                              placeholder="0"
                              className="w-24 px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                            />
                          </td>
                          <td className="p-2 border border-white/10">
                            <input
                              type="text"
                              value={form.notes}
                              onChange={(e) => handleRegencyInputChange(city, "notes", e.target.value)}
                              placeholder="Optional notes"
                              className="w-full px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                            />
                          </td>
                          <td className="p-2 border border-white/10 text-slate-400 text-xs">
                            {existing ? new Date(existing.updatedAt).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="p-2 border border-white/10">
                            <button
                              onClick={() => handleSaveRegency(city)}
                              disabled={saving}
                              className="px-3 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700 disabled:opacity-50 mr-2"
                            >
                              Save
                            </button>
                            {existing && (
                              <button
                                onClick={() => handleDeleteRegency(city)}
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
            </section>
          )}

          {/* District Table */}
          {tab === "district" && (
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white">Province:</label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      const province = e.target.value;
                      setSelectedProvince(province);
                      const firstCity = getCities(province)[0] || "";
                      setSelectedCity(firstCity);
                      fetchDistrictData();
                    }}
                    className="border border-white/10 bg-white/5 rounded p-2 text-sm text-white"
                  >
                    {ALL_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white">City:</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      fetchDistrictData();
                    }}
                    className="border border-white/10 bg-white/5 rounded p-2 text-sm text-white"
                  >
                    {getCities(selectedProvince).map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      fetchDistrictData();
                    }}
                    className="border border-white/10 bg-white/5 rounded p-2 text-sm text-white"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left p-2 border border-white/10 text-white">District / Kecamatan</th>
                      <th className="text-left p-2 border border-white/10 text-white">Year</th>
                      <th className="text-left p-2 border border-white/10 text-white">Crime Count</th>
                      <th className="text-left p-2 border border-white/10 text-white">Notes</th>
                      <th className="text-left p-2 border border-white/10 text-white">Last Updated</th>
                      <th className="text-left p-2 border border-white/10 text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDistricts(selectedProvince, selectedCity).map((district) => {
                      const existing = districtData.find((d) => d.district === district);
                      const key = `${selectedProvince}__${selectedCity}__${district}`;
                      const form = districtFormData[key] || { crimeCount: "", notes: "", year: selectedYear };
                      return (
                        <tr key={district} className="hover:bg-white/5">
                          <td className="p-2 border border-white/10 font-medium text-white">{district}</td>
                          <td className="p-2 border border-white/10">
                            <select
                              value={form.year}
                              onChange={(e) => handleDistrictInputChange(district, "year", e.target.value)}
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
                              onChange={(e) => handleDistrictInputChange(district, "crimeCount", e.target.value)}
                              placeholder="0"
                              className="w-24 px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                            />
                          </td>
                          <td className="p-2 border border-white/10">
                            <input
                              type="text"
                              value={form.notes}
                              onChange={(e) => handleDistrictInputChange(district, "notes", e.target.value)}
                              placeholder="Optional notes"
                              className="w-full px-2 py-1 border border-white/10 bg-white/5 rounded text-sm text-white"
                            />
                          </td>
                          <td className="p-2 border border-white/10 text-slate-400 text-xs">
                            {existing ? new Date(existing.updatedAt).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="p-2 border border-white/10">
                            <button
                              onClick={() => handleSaveDistrict(district)}
                              disabled={saving}
                              className="px-3 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700 disabled:opacity-50 mr-2"
                            >
                              Save
                            </button>
                            {existing && (
                              <button
                                onClick={() => handleDeleteDistrict(district)}
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
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
