import CrimeHeatmapLoader from '@/components/CrimeHeatmapLoader';

export const metadata = {
  title: 'Pusiknas Crime Data',
};

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pusiknas — Data Kejahatan</h1>
      <CrimeHeatmapLoader />
    </main>
  );
}
