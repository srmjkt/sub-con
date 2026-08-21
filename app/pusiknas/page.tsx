'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import PusiknasPowerBIEmbed from '@/components/PusiknasPowerBIEmbed';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CrimeHeatmap = dynamic(() => import('@/components/CrimeHeatmap'), {
  ssr: false,
  loading: () => <p className="p-6">Loading map…</p>,
});

type Tab = 'manual' | 'api' | 'scrape' | 'pbi';

export default function Page() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('api')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/pusiknas')
    }
  }, [user, loading, router])

  if (loading || !user) return null

  const dashboardHref = user.role === 'ADMIN' ? '/admin' : user.role === 'INPUTTER' ? '/inputter' : '/viewer'

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pusiknas — Crime Data</h1>
        <div className="flex items-center gap-3">
          <Link href={dashboardHref} className="text-sm text-cyan-400 hover:text-cyan-300 transition px-3 py-1.5 rounded-lg border border-cyan-400/30 hover:border-cyan-400/50">Dashboard</Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">Back to Home</Link>
        </div>
      </div>

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
