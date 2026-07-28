import CrimeHeatmapLoader from '@/components/CrimeHeatmapLoader';

export const metadata = {
  title: 'Pusiknas Crime Data',
};

const OFFICIAL_PBI_IFRAME =
  'https://app.powerbi.com/view?r=eyJrIjoiMGMyZDM5MTYtNzFmMi00Njg5LWE0NzQtNjdkODk4OTgyYmE1IiwidCI6IjNjYjUwZGViLWUxNTctNGY0OS1hMWIwLWI4MWJmOWQyOTJiNCIsImMiOjEwfQ%3D%3D';

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pusiknas — Data Kejahatan</h1>
      <p className="text-sm text-gray-600 mb-4">
        Visualisasi peta panas menggunakan data dari proxy PowerBI. Jika ada provinsi yang belum tampil, lihat
        laporan resmi Pusiknas di bawah.
      </p>
      <CrimeHeatmapLoader />

      <div className="mt-8 rounded-lg overflow-hidden border border-gray-200">
        <h2 className="text-xl font-bold mb-2">Laporan Resmi Pusiknas</h2>
        <div className="w-full" style={{ height: '720px' }}>
          <iframe
            title="Pusiknas Data Kejahatan"
            src={OFFICIAL_PBI_IFRAME}
            className="w-full h-full border-0"
            allow="autoplay; clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    </main>
  );
}
