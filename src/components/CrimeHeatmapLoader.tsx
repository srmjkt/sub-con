'use client';

import dynamic from 'next/dynamic';

const CrimeHeatmap = dynamic(() => import('@/components/CrimeHeatmap'), {
  ssr: false,
  loading: () => <p className="p-6">Loading map…</p>,
});

export default function CrimeHeatmapLoader() {
  return <CrimeHeatmap />;
}
