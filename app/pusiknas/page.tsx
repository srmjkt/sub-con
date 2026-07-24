import CrimeSummary from '@/components/CrimeSummary';

export const metadata = {
  title: 'Pusiknas Crime Data',
};

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pusiknas — Crime Data Preview</h1>
      <CrimeSummary />
    </main>
  );
}
