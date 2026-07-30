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
  const [tab, setTab] = useState<Tab>('api');

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pusiknas — Crime Data</h1>

      <div className="mb-4 inline-flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'manual' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => setTab('api')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'api' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          API
        </button>
        <button
          type="button"
          onClick={() => setTab('scrape')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'scrape' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Scrape
        </button>
        <button
          type="button"
          onClick={() => setTab('pbi')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'pbi' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Official Report
        </button>
      </div>

      {tab !== 'pbi' && <CrimeHeatmap dataSource={tab} />}
      {tab === 'pbi' && <PusiknasPowerBIEmbed />}
    </main>
  );
}
