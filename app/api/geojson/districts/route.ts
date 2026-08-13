import { NextResponse } from 'next/server';
import { getProvinceByCode } from '@/lib/indonesiaLocations';
import { prisma } from '@/lib/prisma';

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
    throw new Error(`Failed ${url}: ${res.status} ${text.substring(0, 200)}`);
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

// Fallback: Generate minimal GeoJSON from district names in database
async function generateFallbackGeoJson(province: string, city: string): Promise<any> {
  try {
    console.log(`[Districts GeoJSON] Generating fallback GeoJSON for ${province} - ${city}`);
    
    const districtRecords = await prisma.districtCrimeData.findMany({
      where: { province, city },
      select: { district: true },
      distinct: ['district'],
    });

    const features = districtRecords.map((record, idx) => ({
      type: 'Feature' as const,
      properties: {
        name: record.district,
        district: record.district,
        kecamatan: record.district,
        id: `${province}_${city}_${record.district}_${idx}`,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [107.5 + Math.random() * 2, -6.9 + Math.random() * 2], // Rough center of Java
      },
    }));

    console.log(`[Districts GeoJSON] Generated ${features.length} fallback features for ${city}`);

    return {
      type: 'FeatureCollection' as const,
      features,
      source: 'fallback_database',
    };
  } catch (error) {
    console.error('[Districts GeoJSON] Fallback generation failed:', error);
    return { type: 'FeatureCollection' as const, features: [] };
  }
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

    console.log(`[Districts GeoJSON] Request for province=${provinceName} (${provinceCode}), city=${city}`);

    const cacheKey = `${provinceCode}:${city}`;
    const now = Date.now();
    if (cachedGeoJson && cachedGeoJson[cacheKey] && now - cacheTimestamp < CACHE_TTL) {
      console.log(`[Districts GeoJSON] Returning cached data for ${cacheKey}`);
      return NextResponse.json(cachedGeoJson[cacheKey]);
    }

    const provinceSlug = `id${provinceCode}_${normalizeForFolder(provinceName)}`;
    const cityNormalized = normalizeForFolder(city);

    console.log(`[Districts GeoJSON] Looking for province slug: ${provinceSlug}, city folder: ${cityNormalized}`);

    let provinceContents: any[];
    let githubError: string | null = null;
    
    try {
      provinceContents = await getJson(`${GITHUB_API}/${provinceSlug}`);
      console.log(`[Districts GeoJSON] Province contents found: ${Array.isArray(provinceContents) ? provinceContents.length : 0} items`);
    } catch (e: any) {
      githubError = e.message;
      console.error(`[Districts GeoJSON] Failed to fetch province from GitHub:`, githubError);
      provinceContents = [];
    }

    const cityDir = (Array.isArray(provinceContents) ? provinceContents : [])
      .filter((item: any) => item.type === 'dir')
      .find((item: any) => item.name.toLowerCase().includes(cityNormalized));

    if (!cityDir) {
      console.warn(`[Districts GeoJSON] City directory not found in GitHub. Available dirs:`, 
        (Array.isArray(provinceContents) ? provinceContents : [])
          .filter((i: any) => i.type === 'dir')
          .map((i: any) => i.name)
          .slice(0, 10)
      );
      
      // Use fallback GeoJSON from database
      const fallbackGeoJson = await generateFallbackGeoJson(provinceName, city);
      if (fallbackGeoJson.features.length > 0) {
        if (!cachedGeoJson) cachedGeoJson = {};
        cachedGeoJson[cacheKey] = fallbackGeoJson;
        cacheTimestamp = now;
        return NextResponse.json(fallbackGeoJson);
      }
      
      return NextResponse.json({ 
        error: 'City not found in GitHub repository, and no fallback data available', 
        provinceSlug, 
        cityNormalized,
        githubError
      }, { status: 404 });
    }

    let files: any[];
    try {
      files = await getJson(cityDir.url);
      console.log(`[Districts GeoJSON] City directory contains: ${Array.isArray(files) ? files.length : 0} items`);
    } catch (e: any) {
      console.error(`[Districts GeoJSON] Failed to fetch city directory:`, e.message);
      // Use fallback
      const fallbackGeoJson = await generateFallbackGeoJson(provinceName, city);
      if (fallbackGeoJson.features.length > 0) {
        if (!cachedGeoJson) cachedGeoJson = {};
        cachedGeoJson[cacheKey] = fallbackGeoJson;
        cacheTimestamp = now;
        return NextResponse.json(fallbackGeoJson);
      }
      
      return NextResponse.json({ error: `City listing failed: ${e.message}` }, { status: 404 });
    }

    const geojsonFiles = (Array.isArray(files) ? files : []).filter((f: any) => f.type === 'file' && f.name.endsWith('.geojson'));
    console.log(`[Districts GeoJSON] Found ${geojsonFiles.length} GeoJSON files`);

    if (geojsonFiles.length === 0) {
      console.warn(`[Districts GeoJSON] No GeoJSON files found in city directory. Using fallback.`);
      const fallbackGeoJson = await generateFallbackGeoJson(provinceName, city);
      if (fallbackGeoJson.features.length > 0) {
        if (!cachedGeoJson) cachedGeoJson = {};
        cachedGeoJson[cacheKey] = fallbackGeoJson;
        cacheTimestamp = now;
        return NextResponse.json(fallbackGeoJson);
      }
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }

    const features = await Promise.all(
      geojsonFiles.map((f: any) =>
        getJson(f.download_url)
          .then((data: any) => {
            const count = Array.isArray(data.features) ? data.features.length : 0;
            console.log(`[Districts GeoJSON] File ${f.name}: ${count} features`);
            return Array.isArray(data.features) ? data.features : [];
          })
          .catch((err) => {
            console.error(`[Districts GeoJSON] Failed to fetch ${f.name}:`, err.message);
            return [];
          }),
      ),
    );

    const flattened = features.flat();
    console.log(`[Districts GeoJSON] Total features from GitHub: ${flattened.length}`);

    // If GitHub returned no features, use fallback
    if (flattened.length === 0) {
      console.log(`[Districts GeoJSON] No features from GitHub, using fallback`);
      const fallbackGeoJson = await generateFallbackGeoJson(provinceName, city);
      if (fallbackGeoJson.features.length > 0) {
        if (!cachedGeoJson) cachedGeoJson = {};
        cachedGeoJson[cacheKey] = fallbackGeoJson;
        cacheTimestamp = now;
        return NextResponse.json(fallbackGeoJson);
      }
    }

    const result = {
      type: 'FeatureCollection' as const,
      features: flattened,
    };

    if (!cachedGeoJson) cachedGeoJson = {};
    cachedGeoJson[cacheKey] = result;
    cacheTimestamp = now;

    console.log(`[Districts GeoJSON] Returning ${result.features.length} features for ${city}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Districts GeoJSON] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to load district GeoJSON', details: error.message }, { status: 500 });
  }
}
