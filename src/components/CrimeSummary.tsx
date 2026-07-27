"use client";

import React, { useEffect, useState } from 'react';
import { fetchWithFilters } from '@/lib/pusiknas/client.fetchWithFilters';

type Props = {};

export default function CrimeSummaryClient(_props: Props) {
  const [query, setQuery] = useState<string>('');
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
        console.log('Fetching Pusiknas data with query:', query);
        const data = await fetchWithFilters(
          {
            q: query.trim() || undefined,
          },
          { signal }
        );
        console.log('Pusiknas response:', data);
        if (!signal.aborted) setRows(data || []);
      } catch (e: any) {
        if (!signal.aborted) {
          const errMsg = String(e.message || e);
          console.error('Pusiknas error:', errMsg);
          setError(errMsg);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    const t = setTimeout(load, 500);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <label className="block mb-2">Cari data kejahatan</label>
        <input
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          placeholder="Contoh: Polda Metro Jaya, Bogor, Pencurian..."
          className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-cyan-400/50 focus:outline-none"
        />
      </div>

      {loading && <div className="text-cyan-400">Loading…</div>}
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
