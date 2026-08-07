"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchWithFilters } from '@/lib/pusiknas/client.fetchWithFilters';

type DataSource = 'manual' | 'api' | 'scrape';

interface CrimeHeatmapProps {
  dataSource?: DataSource;
}

// Continuous heat palette (YlOrRd) interpolated for a smooth "heat" look.
const HEAT_STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.0, c: [255, 255, 178] },
  { t: 0.25, c: [254, 217, 118] },
  { t: 0.5, c: [254, 153, 41] },
  { t: 0.75, c: [240, 59, 32] },
  { t: 1.0, c: [189, 0, 38] },
];

function interpolateColor(stops: { t: number; c: [number, number, number] }[], tRaw: number): string {
  const t = Math.max(0, Math.min(1, tRaw));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.t && t <= b.t) {
      const local = (t - a.t) / (b.t - a.t || 1);
      const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * local);
      const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * local);
      const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * local);
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  const last = stops[stops.length - 1].c;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

function getColor(intensity: number): string {
  return interpolateColor(HEAT_STOPS, intensity);
}

const HEAT_GRADIENT =
  'linear-gradient(to right, rgb(255,255,178), rgb(254,217,118), rgb(254,153,41), rgb(240,59,32), rgb(189,0,38))';

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
  const [rows, setRows] = useState<any[]>([]);
  const [geoJson, setGeoJson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setMapKey((k) => k + 1);
  }, [dataSource, year]);

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
  }, [dataSource, year]);

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

  function geoJsonStyle(feature: any) {
    const name = String(feature.properties?.name || feature.properties?.Propinsi || feature.properties?.province || feature.properties?.PROVINSI || '').trim();
    const data = provinceCountMapRef.current[name];
    const intensity = data ? data.intensity : 0;
    const isHovered = hoveredProvince === name;
    const hasData = Boolean(data);

    return {
      className: 'crime-province-path',
      fillColor: getColor(intensity),
      weight: isHovered ? 3 : 1,
      opacity: 0.95,
      color: isHovered ? '#fbbf24' : 'rgba(255,255,255,0.45)',
      fillOpacity: hasData ? (isHovered ? 0.95 : 0.8) : (isHovered ? 0.25 : 0.12),
    };
  }

  function onEachFeature(feature: any, layer: any) {
    const name = String(feature.properties?.name || feature.properties?.Propinsi || feature.properties?.province || feature.properties?.PROVINSI || '').trim();

    // Bind an empty tooltip; content is refreshed on hover so it always reflects
    // the latest data (which loads after the GeoJSON mounts).
    layer.bindTooltip('', { sticky: true, direction: 'top' });

    layer.on({
      mouseover: () => {
        setHoveredProvince(name);
        const data = provinceCountMapRef.current[name];
        layer.setTooltipContent(
          `<div><strong>${name}</strong><br/>${data ? `${formatNumber(data.count)} crimes` : 'No data available'}</div>`
        );
        layer.openTooltip();
        layer.getElement()?.classList.add('crime-province-hover');
      },
      mouseout: () => {
        setHoveredProvince(null);
        layer.closeTooltip();
        layer.getElement()?.classList.remove('crime-province-hover');
      },
    });
  }

  return (
    <div className="crime-heatmap-wrapper p-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .crime-heatmap-wrapper .leaflet-interactive {
            transition: fill 0.35s ease, fill-opacity 0.35s ease, stroke 0.35s ease, stroke-width 0.35s ease, filter 0.35s ease;
            cursor: pointer;
          }
          .crime-heatmap-wrapper .crime-province-hover {
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.95));
          }
        `,
        }}
      />
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

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
        <div
          className="h-3 w-40 rounded-sm"
          style={{ background: HEAT_GRADIENT }}
        />
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
