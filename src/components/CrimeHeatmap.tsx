"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchWithFilters } from '@/lib/pusiknas/client.fetchWithFilters';

type DataSource = 'manual' | 'api' | 'scrape';

interface CrimeHeatmapProps {
  dataSource?: DataSource;
}

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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

const MANUAL_ROWS = [
  { provinsi: 'DKI Jakarta', count: 1200 },
  { provinsi: 'Jawa Barat', count: 980 },
  { provinsi: 'Jawa Tengah', count: 850 },
  { provinsi: 'Jawa Timur', count: 760 },
  { provinsi: 'Banten', count: 540 },
  { provinsi: 'Sumatera Utara', count: 480 },
  { provinsi: 'Bali', count: 320 },
];

const SCRAPE_ROWS = [
  { provinsi: 'DKI Jakarta', count: 1500 },
  { provinsi: 'Jawa Barat', count: 1100 },
  { provinsi: 'Jawa Tengah', count: 900 },
  { provinsi: 'Jawa Timur', count: 830 },
  { provinsi: 'Banten', count: 620 },
  { provinsi: 'Sumatera Utara', count: 510 },
  { provinsi: 'Bali', count: 380 },
  { provinsi: 'Aceh', count: 210 },
  { provinsi: 'Papua', count: 170 },
];

export default function CrimeHeatmap({ dataSource = 'api' }: CrimeHeatmapProps) {
  const [year, setYear] = useState('2026');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [geoJson, setGeoJson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setMapKey((k) => k + 1);
  }, [dataSource, year, query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (dataSource === 'manual') {
      fetch(`/api/admin/crime-data?year=${year}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) {
            const crimeData = data.crimeData || [];
            const mapped = crimeData.map((item: any) => ({
              provinsi: item.province,
              count: item.crimeCount,
            }));
            setRows(mapped);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            console.error('Manual crime data fetch error', e);
            setError('Failed to load manual crime data. Please set data in Admin > Crime Data.');
            setRows([]);
            setLoading(false);
          }
        });
      return;
    }

    if (dataSource === 'scrape') {
      setRows(SCRAPE_ROWS);
      setLoading(false);
      return;
    }

    fetchWithFilters({
      year: Number(year),
      q: query.trim() || undefined,
      groupBy: 'province',
    })
      .then((data) => {
        if (!cancelled) {
          setRows(data && data.length > 0 ? data : []);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Heatmap fetch error', e);
          setError(String(e.message || e));
          setRows([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataSource, year, query]);

  useEffect(() => {
    let cancelled = false;
    fetch('https://raw.githubusercontent.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces/main/GeoJSON/indonesia-38-provinces.geojson')
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

  const { heatData } = useMemo(() => {
    const counts: Record<string, number> = {};

    rows.forEach((row) => {
      const rawProvince = String(row.provinsi || row.province || row.Provinsi || '').trim();
      if (!rawProvince) return;
      const count = Number(row.count || row.jumlah || row.Count || row.crimeCount || 0);
      counts[rawProvince] = (counts[rawProvince] || 0) + count;
    });

    const maxCount = Math.max(1, ...Object.values(counts));
    const points: { province: string; count: number; intensity: number }[] = [];

    Object.entries(counts).forEach(([province, count]) => {
      if (count <= 0) return;
      points.push({ province, count, intensity: count / maxCount });
    });

    return { heatData: points };
  }, [rows]);

  const provinceCountMap = useMemo(() => {
    const map: Record<string, { count: number; intensity: number }> = {};
    heatData.forEach((p) => {
      map[p.province] = { count: p.count, intensity: p.intensity };
    });
    return map;
  }, [heatData]);

  const provinceCountMapRef = useRef(provinceCountMap);
  useEffect(() => {
    provinceCountMapRef.current = provinceCountMap;
  }, [provinceCountMap]);

  useEffect(() => {
    if (heatData.length > 0 && !selectedProvince) {
      setSelectedProvince(heatData[0].province);
    }

    if (selectedProvince && !provinceCountMap[selectedProvince]) {
      setSelectedProvince(null);
    }
  }, [heatData, provinceCountMap, selectedProvince]);

  const summary = useMemo(() => {
    const totalCrimes = heatData.reduce((sum, item) => sum + item.count, 0);
    const topProvince = [...heatData].sort((a, b) => b.count - a.count)[0];
    return {
      totalCrimes,
      topProvince,
      provincesWithData: heatData.length,
    };
  }, [heatData]);

  const selectedProvinceData = selectedProvince ? provinceCountMap[selectedProvince] : null;

  const topProvinces = useMemo(() => {
    return [...heatData].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [heatData]);

  function geoJsonStyle(feature: any) {
    const name = String(feature.properties?.name || feature.properties?.Propinsi || feature.properties?.province || feature.properties?.PROVINSI || '').trim();
    const data = provinceCountMapRef.current[name];
    const intensity = data ? data.intensity : 0;
    const isHovered = hoveredProvince === name;
    const isSelected = selectedProvince === name;
    const hasData = Boolean(data);
    const fillOpacity = isSelected ? 0.95 : hasData ? 0.72 : 0.12;
    const weight = isSelected ? 3 : isHovered ? 2 : 1;
    const borderColor = isSelected ? '#f8fafc' : isHovered ? '#fde68a' : '#4b5563';

    return {
      fillColor: getColor(intensity),
      weight,
      opacity: 0.9,
      color: borderColor,
      fillOpacity,
    };
  }

  function onEachFeature(feature: any, layer: any) {
    const name = String(feature.properties?.name || feature.properties?.Propinsi || feature.properties?.province || feature.properties?.PROVINSI || '').trim();

    layer.bindTooltip(
      `<div><strong>${name}</strong><br/>${provinceCountMapRef.current[name] ? `${formatNumber(provinceCountMapRef.current[name].count)} crimes` : 'No data available'}</div>`,
      { sticky: true, direction: 'top' }
    );

    layer.on({
      mouseover: () => {
        setHoveredProvince(name);
        layer.openTooltip();
      },
      mouseout: () => {
        setHoveredProvince(null);
        layer.closeTooltip();
      },
      click: () => {
        setSelectedProvince(name);
        const data = provinceCountMapRef.current[name];
        layer.bindPopup(`<strong>${name}</strong><br/>${data ? `${formatNumber(data.count)} crimes` : 'No data available'}`).openPopup();
      },
    });
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pusiknas — Crime Heatmap
          </h1>
          <p className="text-sm text-slate-500 capitalize">{dataSource} data view</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Year:</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-cyan-400 focus:outline-none"
            disabled={dataSource !== 'api'}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-slate-600">Search filters</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search location / crime..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
            disabled={dataSource !== 'api'}
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-3 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Focused province</p>
              <p className="text-lg font-semibold">{selectedProvince || 'No selection'}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProvince(null)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid gap-3 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Live insight</p>
              <p className="text-xs text-slate-500">Hover or click a province for details</p>
            </div>
            <div className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              {summary.provincesWithData} provinces
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total crimes</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(summary.totalCrimes)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Top province</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{summary.topProvince?.province || '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Selected</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{selectedProvinceData ? formatNumber(selectedProvinceData.count) : '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Top provinces</p>
            <p className="text-xs text-slate-500">Tap to focus</p>
          </div>
          <ul className="space-y-2">
            {topProvinces.map((item) => {
              const isActive = selectedProvince === item.province;
              return (
                <li key={item.province}>
                  <button
                    type="button"
                    onClick={() => setSelectedProvince(item.province)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-50 text-cyan-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-medium">{item.province}</span>
                    <span className="text-xs">{formatNumber(item.count)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div key={mapKey} className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <p className="text-sm font-semibold text-slate-700">Loading map…</p>
          </div>
        )}

        <MapContainer
          center={[-2.5489, 118.0149]}
          zoom={5}
          style={{ height: '600px', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {geoJson && (
            <GeoJSON
              data={geoJson}
              style={geoJsonStyle}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Legend</span>
        <div className="flex items-center gap-1">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
            <div
              key={t}
              className="h-3 w-6 rounded-sm"
              style={{ backgroundColor: getColor(t) }}
            />
          ))}
        </div>
        <span>Lower intensity</span>
        <span className="text-slate-400">•</span>
        <span>Higher intensity</span>
      </div>

      {heatData.length === 0 && !loading && (
        <p className="mt-4 text-sm text-slate-600">No data available for the selected filters.</p>
      )}
    </div>
  );
}
