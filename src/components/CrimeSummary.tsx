"use client";

import React, { useEffect, useState } from 'react';
import { fetchWithFilters } from '@/lib/pusiknas/client.fetchWithFilters';

type Props = {};

function getDemoData() {
  return [
    { kode_provinsi: '31', provinsi: 'DKI Jakarta', polda: 'Polda Metro Jaya', satker: 'Polres Jakarta Selatan', jenis: 'Pencurian', jumlah: 156 },
    { kode_provinsi: '31', provinsi: 'DKI Jakarta', polda: 'Polda Metro Jaya', satker: 'Polres Jakarta Barat', jenis: 'Pencurian', jumlah: 142 },
    { kode_provinsi: '31', provinsi: 'DKI Jakarta', polda: 'Polda Metro Jaya', satker: 'Polres Jakarta Timur', jenis: 'Pencurian', jumlah: 138 },
    { kode_provinsi: '31', provinsi: 'DKI Jakarta', polda: 'Polda Metro Jaya', satker: 'Polres Jakarta Utara', jenis: 'Pencurian', jumlah: 121 },
    { kode_provinsi: '31', provinsi: 'DKI Jakarta', polda: 'Polda Metro Jaya', satker: 'Polres Jakarta Pusat', jenis: 'Pencurian', jumlah: 115 },
    { kode_provinsi: '32', provinsi: 'Jawa Barat', polda: 'Polda Jawa Barat', satker: 'Polres Bandung', jenis: 'Pencurian', jumlah: 98 },
    { kode_provinsi: '33', provinsi: 'Jawa Tengah', polda: 'Polda Jawa Tengah', satker: 'Polres Semarang', jenis: 'Pencurian', jumlah: 87 },
    { kode_provinsi: '34', provinsi: 'Daerah Istimewa Yogyakarta', polda: 'Polda DI Yogyakarta', satker: 'Polres Sleman', jenis: 'Pencurian', jumlah: 76 },
    { kode_provinsi: '35', provinsi: 'Jawa Timur', polda: 'Polda Jawa Timur', satker: 'Polres Surabaya', jenis: 'Pencurian', jumlah: 112 },
    { kode_provinsi: '21', provinsi: 'Sumatera Utara', polda: 'Polda Sumatera Utara', satker: 'Polres Medan', jenis: 'Pencurian', jumlah: 89 },
  ];
}

export default function CrimeSummaryClient(_props: Props) {
  const [year, setYear] = useState<string>('2026');
  const [province, setProvince] = useState<string>('');
  const [polda, setPolda] = useState<string>('');
  const [satker, setSatker] = useState<string>('');
  const [crimeType, setCrimeType] = useState<string>('');
  const [anyLocation, setAnyLocation] = useState<string>('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWithFilters(
          {
            year,
            province: province || undefined,
            polda: polda || undefined,
            satker: satker || undefined,
            crime_type: crimeType || undefined,
            q: anyLocation.trim() || undefined,
          },
          { signal }
        );
        if (!signal.aborted) setRows(data || []);
      } catch (e: any) {
        if (!signal.aborted) {
          const msg = String(e.message || e);
          setError(msg);
          if (msg.includes('missing_resource_key') || msg.includes('Proxy failed')) {
            console.warn('Pusiknas API not configured, showing demo data');
            setRows(getDemoData());
          }
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    const t = setTimeout(load, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [year, province, polda, satker, crimeType, anyLocation]);

  return (
    <div className="p-4">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <label>
          Year
          <select value={year} onChange={(e)=>setYear(e.target.value)} className="ml-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none">
            <option>2026</option>
            <option>2025</option>
            <option>2024</option>
            <option>2023</option>
          </select>
        </label>
        <label className="col-span-2">
          Search location
          <input
            value={anyLocation}
            onChange={(e)=>setAnyLocation(e.target.value)}
            placeholder="Polda Metro Jaya, Bogor, etc."
            className="ml-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
          />
        </label>
        <label>
          Province
          <input value={province} onChange={(e)=>setProvince(e.target.value)} placeholder="kode_provinsi (e.g. 31)" className="ml-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none" />
        </label>
        <label>
          Polda
          <input value={polda} onChange={(e)=>setPolda(e.target.value)} placeholder="Polda name" className="ml-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none" />
        </label>
        <label>
          Satker
          <input value={satker} onChange={(e)=>setSatker(e.target.value)} placeholder="satker" className="ml-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none" />
        </label>
        <label>
          Crime type
          <input value={crimeType} onChange={(e)=>setCrimeType(e.target.value)} placeholder="Pencurian" className="ml-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none" />
        </label>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {!loading && rows && (
        <div>
          <h4 className="font-semibold mb-2">Results ({rows.length})</h4>
          <div className="overflow-auto max-h-96 border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {rows.length > 0 && Object.keys(rows[0]).map((k)=> <th key={k} className="text-left p-1 border">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i)=>(
                  <tr key={i} className="odd:bg-gray-50">
                    {Object.keys(rows[0]).map((k)=> <td key={k} className="p-1 border">{String(r[k] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}