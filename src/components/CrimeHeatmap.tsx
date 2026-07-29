"use client";

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchWithFilters } from '@/lib/pusiknas/client.fetchWithFilters';
import { normalizeProvince } from '@/lib/indonesiaLocations';

type LatLng = [number, number];

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

export default function CrimeHeatmap({ dataSource = 'manual' }: { dataSource?: 'manual' | 'scrape' | 'api' }) {
  const [year, setYear] = useState('2025');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [geoJson, setGeoJson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
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
          console.error('Heatmap fetch error', e);
          setError(String(e.message || e));
          setRows(FALLBACK_ROWS);
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [year, query, dataSource]);

  useEffect(() => {
    let cancelled = false;
    fetch('https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load Indonesia GeoJSON');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setGeoJson(data);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('GeoJSON load error', e);
          setError('Failed to load Indonesia map data.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { heatData, maxCount } = useMemo(() => {
    const source = rows.length > 0 ? rows : FALLBACK_ROWS;
    const counts: Record<string, number> = {};

    source.forEach((row) => {
      const rawProvince = String(row.provinsi || row.province || row.Provinsi || '').trim();
      if (!rawProvince) return;
      const normalized = normalizeProvince(rawProvince);
      const count = Number(row.count || row.jumlah || row.Count || 0);
      counts[normalized] = (counts[normalized] || 0) + count;
    });

    const maxCount = Math.max(1, ...Object.values(counts));
    const points: { province: string; count: number; intensity: number }[] = [];

    Object.entries(counts).forEach(([province, count]) => {
      if (count <= 0) return;
      points.push({ province, count, intensity: count / maxCount });
    });

    return { heatData: points, maxCount };
  }, [rows]);

  const provinceCountMap = useMemo(() => {
    const map: Record<string, { count: number; intensity: number }> = {};
    heatData.forEach((p) => {
      map[p.province] = { count: p.count, intensity: p.intensity };
    });
    return map;
  }, [heatData]);

  function geoJsonStyle(feature: any) {
    const name = String(feature.properties?.name || feature.properties?.Propinsi || feature.properties?.province || '').trim();
    const normalized = normalizeProvince(name);
    const data = provinceCountMap[normalized];
    const intensity = data ? data.intensity : 0;
    const fillOpacity = data ? 0.7 : 0.05;
    const weight = hoveredProvince === normalized ? 3 : 1;
    const color = hoveredProvince === normalized ? '#ffffff' : '#666666';

    return {
      fillColor: getColor(intensity),
      weight,
      opacity: 0.8,
      color,
      fillOpacity,
    };
  }

  function onEachFeature(feature: any, layer: any) {
    const name = String(feature.properties?.name || feature.properties?.Propinsi || feature.properties?.province || '').trim();
    const normalized = normalizeProvince(name);
    const data = provinceCountMap[normalized];

    layer.on({
      mouseover: () => setHoveredProvince(normalized),
      mouseout: () => setHoveredProvince(null),
    });

    const popupContent = data
      ? `<strong>${normalized}</strong><br/>${data.count.toLocaleString('id-ID')} crimes`
      : `<strong>${normalized}</strong><br/>No data`;

    layer.bindPopup(popupContent);
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Pusiknas — Crime Heatmap</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">Year:</label>
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
          placeholder="Search location / crime..."
          className="w-full rounded-xl border border-white/10 bg-white px-4 py-2 text-slate-900 text-sm placeholder:text-slate-400 focus:border-cyan-400/50 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-200 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-gray-200 relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <p className="text-sm font-medium">Loading map…</p>
          </div>
        )}

        <MapContainer
          center={[-2.5489, 118.0149]}
          zoom={5}
          style={{ height: '600px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {geoJson && (
            <GeoJSON
              key={year + query}
              data={geoJson}
              style={geoJsonStyle}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <span>Less</span>
        <div className="flex items-center gap-1">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
            <div
              key={t}
              className="w-6 h-3 rounded-sm"
              style={{ backgroundColor: getColor(t) }}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {heatData.length === 0 && !loading && (
        <p className="mt-4 text-gray-600 text-sm">No data available for the selected filters.</p>
      )}
    </div>
  );
}
