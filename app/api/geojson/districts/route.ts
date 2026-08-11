import { NextResponse } from 'next/server';

const BASE_URL = 'https://raw.githubusercontent.com/JfrAziz/indonesia-district/master';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

function normalizeCityForFolder(name: string): string {
  return name
    .toLowerCase()
    .replace(/^kota\s+/i, '')
    .replace(/^kabupaten\s+/i, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const provinceCode = url.searchParams.get('province');
    const city = url.searchParams.get('city');

    if (!provinceCode || !city) {
      return NextResponse.json({ error: 'province and city are required' }, { status: 400 });
    }

    const provinceSlug = `id${provinceCode}`;
    const citySlug = `id${provinceCode}${String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')}_${normalizeCityForFolder(city)}`;

    const provinceContents = await getJson(`${BASE_URL}/${provinceSlug}`);
    const cityDir = provinceContents.find((item: any) => item.type === 'dir' && item.name.startsWith(citySlug));

    if (!cityDir) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    const files = await getJson(cityDir.url);
    const geojsonFiles = files.filter((f: any) => f.type === 'file' && f.name.endsWith('.geojson'));

    const features = await Promise.all(
      geojsonFiles.map((f: any) => getJson(f.download_url).then((data: any) => data.features ?? []))
    );

    const flattened = features.flat();
    return NextResponse.json({
      type: 'FeatureCollection',
      features: flattened,
    });
  } catch (error: any) {
    console.error('Error fetching district GeoJSON:', error);
    return NextResponse.json({ error: 'Failed to load district GeoJSON' }, { status: 500 });
  }
}
