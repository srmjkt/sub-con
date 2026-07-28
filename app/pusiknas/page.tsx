'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import PusiknasPowerBIEmbed from '@/components/PusiknasPowerBIEmbed';

const CrimeHeatmap = dynamic(() => import('@/components/CrimeHeatmap'), {
  ssr: false,
  loading: () => <p className="p-6">Loading map…</p>,
});

type Tab = 'heatmap' | 'pbi';

export default function Page() {
  const [tab, setTab] = useState<Tab>('heatmap');

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pusiknas — Data Kejahatan</h1>

      <div className="mb-4 inline-flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setTab('heatmap')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'heatmap' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Peta Panas
        </button>
        <button
          type="button"
          onClick={() => setTab('pbi')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'pbi' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Laporan Resmi
        </button>
      </div>

      {tab === 'heatmap' && <CrimeHeatmap />}
      {tab === 'pbi' && <PusiknasPowerBIEmbed />}
    </main>
  );
}
