"use client";

import { useState, useRef, useEffect } from 'react';

const EMBED_URL = 'https://app.powerbi.com/view?r=eyJrIjoiMGMyZDM5MTYtNzFmMi00Njg5LWE0NzQtNjdkODk4OTgyYmE1IiwidCI6IjNjYjUwZGViLWUxNTctNGY0OS1hMWIwLWI4MWJmOWQyOTJiNCIsImMiOjEwfQ%3D%3D';

export default function PusiknasPowerBIEmbed() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => setLoading(false);
    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, []);

  return (
    <div className="relative w-full" style={{ height: '85vh', minHeight: '600px' }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <p className="text-sm font-medium">Loading official report…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium mb-2">Failed to load PowerBI report.</p>
          <a
            href={EMBED_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open official Pusiknas report in a new tab
          </a>
          {error && <p className="mt-2 text-xs">{error}</p>}
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="Pusiknas Data Kejahatan"
        src={EMBED_URL}
        className="h-full w-full border-0"
        allow="autoplay; clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        onError={() => setError('Iframe failed to load the report.')}
        style={{ display: error ? 'none' : 'block' }}
      />
    </div>
  );
}
