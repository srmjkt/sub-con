"use client";

import { useEffect, useRef, useState } from 'react';

const EMBED_URL = 'https://app.powerbi.com/view?r=eyJrIjoiMGMyZDM5MTYtNzFmMi00Njg5LWE0NzQtNjdkODk4OTgyYmE1IiwidCI6IjNjYjUwZGViLWUxNTctNGY0OS1hMWIwLWI4MWJmOWQyOTJiNCIsImMiOjEwfQ%3D%3D';

export default function PusiknasPowerBIEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    }

    async function init() {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/powerbi-client@2.22.1/dist/powerbi.min.js');
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;

        const powerbi = (window as any).powerbi;
        if (!powerbi) throw new Error('PowerBI SDK not available');

        const reportConfig: any = {
          type: 'report',
          embedUrl: EMBED_URL,
          accessToken: '',
          tokenType: 0, // EmbedTokenType.Embed
          settings: {
            barCode: { type: 0 },
            filterPaneEnabled: true,
            navContentPaneEnabled: true,
          },
        };

        embedRef.current = powerbi.embed(container, reportConfig);

        embedRef.current.on('loaded', () => {
          if (!cancelled) setStatus('ready');
        });

        embedRef.current.on('error', (err: any) => {
          if (!cancelled) {
            console.error('PowerBI embed error', err);
            setError(err?.message || 'Gagal memuat laporan PowerBI');
            setStatus('error');
          }
        });
      } catch (e: any) {
        if (!cancelled) {
          console.error('PowerBI init error', e);
          setError(String(e.message || e));
          setStatus('error');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        if (embedRef.current) {
          embedRef.current.off('loaded');
          embedRef.current.off('error');
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium mb-2">Gagal memuat laporan PowerBI.</p>
        <a
          href={EMBED_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Buka laporan resmi Pusiknas di tab baru
        </a>
        {error && <p className="mt-2 text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: '720px' }}>
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <p className="text-sm font-medium">Loading laporan resmi…</p>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full w-full rounded-lg border border-gray-200 overflow-hidden bg-white"
      />
    </div>
  );
}
