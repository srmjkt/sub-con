'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import PusiknasPowerBIEmbed from '@/components/PusiknasPowerBIEmbed';

const CrimeHeatmap = dynamic(() => import('@/components/CrimeHeatmap'), {
  ssr: false,
  loading: () => <p className="p-6">Loading map…</p>,
});

type Tab = 'manual' | 'api' | 'scrape' | 'pbi';

export default function Page() {
  const [tab, setTab] = useState<Tab>('manual');

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pusiknas — Crime Data</h1>

      <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-gray-200 p-1 bg-gray-50">
        {(['manual', 'api', 'scrape', 'pbi'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded ${
              tab === t ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-700 hover:bg-white'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)} {t === 'pbi' ? 'Report' : 'Mode'}
          </button>
        ))}
      </div>

      {tab !== 'pbi' && <CrimeHeatmap dataSource={tab} />}
      {tab === 'pbi' && <PusiknasPowerBIEmbed />}
    </main>
  );
}
