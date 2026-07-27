import CrimeSummary from '@/components/CrimeSummary';

export const metadata = {
  title: 'Pusiknas Crime Data',
};

export default function Page() {
  return (
    <main className="p-6 bg-slate-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-white">Pusiknas — Data Kejahatan</h1>
      <CrimeSummary />
    </main>
  );
}
