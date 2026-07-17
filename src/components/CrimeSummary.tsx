import React, { useEffect, useState } from 'react';
import { fetchWithFilters } from '@/lib/pusiknas/client';

type Props = {};

export default function CrimeSummaryClient(_props: Props) {
  const [year, setYear] = useState<string>('2026');
  const [province, setProvince] = useState<string>('');
  const [polda, setPolda] = useState<string>('');
  const [satker, setSatker] = useState<string>('');
  const [crimeType, setCrimeType] = useState<string>('');
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
        const data = await fetchWithFilters({ year, province, polda, satker, crime_type: crimeType }, { signal });
        if (!signal.aborted) setRows(data || []);
      } catch (e: any) {
        if (!signal.aborted) setError(String(e.message || e));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    // debounce
    const t = setTimeout(load, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [year, province, polda, satker, crimeType]);

  return (
    <div className="p-4">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <label>
          Year
          <select value={year} onChange={(e)=>setYear(e.target.value)} className="ml-2">
            <option>2026</option>
            <option>2025</option>
            <option>2024</option>
            <option>2023</option>
          </select>
        </label>
        <label>
          Province
          <input value={province} onChange={(e)=>setProvince(e.target.value)} placeholder="kode_provinsi (e.g. 31)" className="ml-2" />
        </label>
        <label>
          Polda
          <input value={polda} onChange={(e)=>setPolda(e.target.value)} placeholder="Polda name" className="ml-2" />
        </label>
        <label>
          Satker
          <input value={satker} onChange={(e)=>setSatker(e.target.value)} placeholder="satker" className="ml-2" />
        </label>
        <label>
          Crime type
          <input value={crimeType} onChange={(e)=>setCrimeType(e.target.value)} placeholder="Pencurian" className="ml-2" />
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
