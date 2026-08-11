import { NextResponse } from 'next/server';
import { getProvinceByCode } from '@/lib/indonesiaLocations';

const GITHUB_API = 'https://api.github.com/repos/JfrAziz/indonesia-district/contents';
const RAW_BASE = 'https://raw.githubusercontent.com/JfrAziz/indonesia-district/master';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let cachedGeoJson: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function getJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed ${url}: ${res.status} ${text}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function normalizeForFolder(name: string): string {
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

    const provinceName = getProvinceByCode(provinceCode);
    if (!provinceName) {
      return NextResponse.json({ error: 'Invalid province code', provinceCode }, { status: 400 });
    }

    const cacheKey = `${provinceCode}:${city}`;
    const now = Date.now();
    if (cachedGeoJson && now - cacheTimestamp < CACHE_TTL) {
      const cached = cachedGeoJson[cacheKey];
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const provinceSlug = `id${provinceCode}_${normalizeForFolder(provinceName)}`;
    const cityNormalized = normalizeForFolder(city);

    let provinceContents: any[];
    try {
      provinceContents = await getJson(`${GITHUB_API}/${provinceSlug}`);
    } catch (e: any) {
      return NextResponse.json({ error: `Province lookup failed: ${e.message}`, provinceSlug }, { status: 404 });
    }

    const cityDir = (Array.isArray(provinceContents) ? provinceContents : [])
      .filter((item: any) => item.type === 'dir')
      .find((item: any) => item.name.toLowerCase().endsWith(`_${cityNormalized}`));

    if (!cityDir) {
      return NextResponse.json({ error: 'City not found', provinceSlug, cityNormalized, available: (Array.isArray(provinceContents) ? provinceContents : []).map((i: any) => i.name).slice(0, 20) }, { status: 404 });
    }

    let files: any[];
    try {
      files = await getJson(cityDir.url);
    } catch (e: any) {
      return NextResponse.json({ error: `City listing failed: ${e.message}`, cityDir: cityDir.name }, { status: 404 });
    }

    const geojsonFiles = (Array.isArray(files) ? files : []).filter((f: any) => f.type === 'file' && f.name.endsWith('.geojson'));

    const features = await Promise.all(
      geojsonFiles.map((f: any) =>
        getJson(f.download_url)
          .then((data: any) => Array.isArray(data.features) ? data.features : [])
          .catch(() => []),
      ),
    );

    const flattened = features.flat();
    const result = {
      type: 'FeatureCollection' as const,
      features: flattened,
    };

    if (!cachedGeoJson) cachedGeoJson = {};
    cachedGeoJson[cacheKey] = result;
    cacheTimestamp = now;

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching district GeoJSON:', error);
    return NextResponse.json({ error: 'Failed to load district GeoJSON' }, { status: 500 });
  }
}
