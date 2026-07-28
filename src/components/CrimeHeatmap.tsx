"use client";

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchWithFilters } from '@/lib/pusiknas/client.fetchWithFilters';
import { getProvinceCoords } from '@/lib/indonesiaLocations';

type LatLng = [number, number];

export default function CrimeHeatmap() {
  const [year, setYear] = useState('2026');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchWithFilters({
      year: Number(year),
      q: query.trim() || undefined,
      groupBy: 'province',
    })
      .then((data) => {
        if (!cancelled) {
          setRows(data || []);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Heatmap fetch error', e);
          setError(String(e.message || e));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [year, query]);

  const heatData = useMemo(() => {
    const counts: Record<string, number> = {};
    let maxCount = 0;

    rows.forEach((row) => {
      const rawProvince = String(row.provinsi || row.province || row.Provinsi || '').trim();
      const count = Number(row.count || row.jumlah || row.Count || 0);
      if (!rawProvince) return;
      counts[rawProvince] = (counts[rawProvince] || 0) + count;
      if (counts[rawProvince] > maxCount) maxCount = counts[rawProvince];
    });

    const points: { coords: LatLng; count: number; intensity: number; province: string }[] = [];
    Object.entries(counts).forEach(([province, count]) => {
      const coords = getProvinceCoords(province);
      if (!coords) return;
      const intensity = maxCount > 0 ? count / maxCount : 0;
      points.push({ coords, count, intensity, province });
    });

    return { points, maxCount };
  }, [rows]);

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Pusiknas — Peta Panas Kejahatan</h2>
        <div className="p-4 border border-red-200 rounded bg-red-50">
          <p className="mb-2">Gagal memuat data peta. Menampilkan mode cadangan.</p>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm">Tahun:</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className="border rounded p-1 text-sm">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari lokasi / kejahatan..."
            className="border rounded p-1 text-sm w-full"
          />
        </div>
        <p className="mt-2 text-red-600 text-xs">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Pusiknas — Peta Panas Kejahatan</h2>
        <p>Loading map…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pusiknas — Peta Panas Kejahatan</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">Tahun:</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-gray-300 rounded p-1 text-sm"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari lokasi / kejahatan..."
          className="w-full rounded-xl border border-white/10 bg-white px-4 py-2 text-slate-900 text-sm placeholder:text-slate-400 focus:border-cyan-400/50 focus:outline-none"
        />
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={[-2.5489, 118.0149]}
          zoom={5}
          style={{ height: '600px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {heatData.points.map((p) => (
            <CircleMarker
              key={p.province}
              center={p.coords}
              radius={12 + p.intensity * 50}
              pathOptions={{
                color: '#ff3333',
                fillColor: '#ff0000',
                fillOpacity: 0.15 + p.intensity * 0.55,
                weight: 1,
                opacity: 0.8,
              }}
            >
              <Popup>
                <strong>{p.province}</strong>
                <br />
                {p.count.toLocaleString('id-ID')} kejahatan
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {heatData.points.length === 0 && !loading && (
        <p className="mt-4 text-gray-600 text-sm">Tidak ada data untuk filter yang dipilih.</p>
      )}
    </div>
  );
}
