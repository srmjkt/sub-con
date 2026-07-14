import React, { useEffect, useState } from 'react';
import { fetchByYear } from '@/lib/pusiknas';

type Props = { year?: number };

export default function CrimeSummary({ year = 2025 }: Props) {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchByYear(year)
      .then((res) => { if (mounted) setData(res as any[]); })
      .catch((err) => { console.error(err); if (mounted) setError(String(err)); });
    return () => { mounted = false; };
  }, [year]);

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return <div>Loading crime data for {year}…</div>;

  return (
    <div>
      <h3 className="text-lg font-semibold">Crime summary {year}</h3>
      <ul className="list-disc pl-6">
        {data.map((r, i) => (
          <li key={i}>{r.crime_type || r.kategori || '—'}: {r.count || r.jumlah || 0}</li>
        ))}
      </ul>
    </div>
  );
}
