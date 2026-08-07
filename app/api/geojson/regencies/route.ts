import { NextResponse } from 'next/server';

const KAB_KOTA_URL = 'https://raw.githubusercontent.com/AlfianAliM/Indonesia-GeoJSON/master/kab_kota.geojson';
let cachedGeoJson: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const provinceCode = url.searchParams.get('province');

    const now = Date.now();
    if (!cachedGeoJson || now - cacheTimestamp > CACHE_TTL) {
      const res = await fetch(KAB_KOTA_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to load regency GeoJSON' }, { status: 502 });
      }
      cachedGeoJson = await res.json();
      cacheTimestamp = now;
    }

    if (!provinceCode) {
      return NextResponse.json({ features: cachedGeoJson.features });
    }

    const features = (cachedGeoJson.features || []).filter((f: any) => {
      const code = String(f.properties?.code || '');
      return code.startsWith(`${provinceCode}.`);
    });

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (error) {
    console.error('Error fetching regency GeoJSON:', error);
    return NextResponse.json({ error: 'Failed to load reg GeoJSON' }, { status: 500 });
  }
}
