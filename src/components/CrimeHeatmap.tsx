"use client";

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchWithFilters } from '@/lib/pusiknas/client.fetchWithFilters';
import { normalizeProvince } from '@/lib/indonesiaLocations';

const FALLBACK_ROWS = [
  { provinsi: 'DKI Jakarta', count: 1200 },
  { provinsi: 'Jawa Barat', count: 980 },
  { provinsi: 'Jawa Tengah', count: 850 },
  { provinsi: 'Jawa Timur', count: 760 },
  { provinsi: 'Banten', count: 540 },
  { provinsi: 'Sumatera Utara', count: 480 },
  { provinsi: 'Bali', count: 320 },
];

function getColor(intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  if (clamped < 0.2) return '#ffffcc';
  if (clamped < 0.4) return '#ffeda0';
  if (clamped < 0.6) return '#fed976';
  if (clamped < 0.7) return '#feb24c';
  if (clamped < 0.8) return '#fd8d3c';
  if (clamped < 0.9) return '#fc4e2a';
  return '#bd0026';
}

function HeatmapContent({ dataSource }: { dataSource: 'manual' | 'scrape' | 'api' }) {
  const [year, setYear] = useState('2025');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [geoJson, setGeoJson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        let data: any[] = [];
        if (dataSource === 'manual') {
          data = FALLBACK_ROWS;
        } else if (dataSource === 'api') {
          data = await fetchWithFilters({
            year: Number(year),
            q: query.trim() || undefined,
            groupBy: 'province',
          });
        } else if (dataSource === 'scrape') {
          data = [];
          setError('Scraper mode is not yet implemented.');
        }

        if (!cancelled) {
          setRows((data && data.length > 0) ? data : []);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setRows(FALLBACK_ROWS);
          setLoading(false);
        }
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [year, query, dataSource]);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province.json')
      .then(res => res.json())
      .then(setGeoJson)
      .catch(console.error);
  }, []);

  const { heatData } = useMemo(() => {
    const counts: Record<string, number> = {};
    (rows.length > 0 ? rows : FALLBACK_ROWS).forEach(row => {
      const p = normalizeProvince(String(row.provinsi || row.province || row.Provinsi || ''));
      counts[p] = (counts[p] || 0) + Number(row.count || row.jumlah || 0);
    });
    const max = Math.max(1, ...Object.values(counts));
    return { heatData: Object.entries(counts).map(([province, count]) => ({ province, count, intensity: count / max })) };
  }, [rows]);

  const provinceMap = useMemo(() => Object.fromEntries(heatData.map(d => [d.province, d])), [heatData]);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Pusiknas — Crime Heatmap</h1>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="border rounded p-1">
          <option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option>
        </select>
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-full border rounded p-2 mb-4" />
      {error && <div className="p-3 bg-red-50 text-red-700 rounded mb-4">{error}</div>}
      <div className="rounded-lg overflow-hidden border relative h-[600px]">
        {loading && <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60">Loading…</div>}
        <MapContainer center={[-2.5, 118]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {geoJson && <GeoJSON data={geoJson} style={(f: any) => {
            const n = normalizeProvince(f.properties?.name || '');
            const d = provinceMap[n];
            return { fillColor: getColor(d?.intensity || 0), fillOpacity: d ? 0.7 : 0.05, weight: 1, color: '#666' };
          }} onEachFeature={(f: any, l: any) => {
            const n = normalizeProvince(f.properties?.name || '');
            const d = provinceMap[n];
            l.bindPopup(`<strong>${n}</strong><br/>${d?.count || 0} crimes`);
          }} />}
        </MapContainer>
      </div>
    </div>
  );
}

export default function CrimeHeatmapPage() {
  const [dataSource, setDataSource] = useState<'manual' | 'api' | 'scrape'>('manual');
  return (
    <div className="p-6">
      <div className="flex gap-2 mb-6 border-b pb-4">
        {(['manual', 'api', 'scrape'] as const).map((mode) => (
          <button key={mode} onClick={() => setDataSource(mode)} className={`px-4 py-2 text-sm font-medium rounded ${dataSource === mode ? 'bg-cyan-600 text-white' : 'bg-gray-100'}`}>
            {mode.toUpperCase()} MODE
          </button>
        ))}
      </div>
      <HeatmapContent dataSource={dataSource} />
    </div>
  );
}
