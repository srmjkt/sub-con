import { NextResponse } from 'next/server';
import { getProvinceByCode } from '@/lib/indonesiaLocations';
import { prisma } from '@/lib/prisma';

const GITHUB_API = 'https://api.github.com/repos/JfrAziz/indonesia-district/contents';
const RAW_BASE = 'https://raw.githubusercontent.com/JfrAziz/indonesia-district/master';

// Alternative sources for fallback
const GEO_BOUNDARIES_URL = 'https://www.geoboundaries.org/gbRequest.html';
const HDX_INDONESIA = 'https://data.humdata.org/dataset/cod-ab-idn';

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

// Helper to normalize district names for matching
function normalizeDistrictNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/^kecamatan\s+/i, 'kecamatan_')
    .replace(/^kec\.\s+/i, 'kec_')
    .replace(/^kec\s+/i, 'kec_')
    .trim();
}

// Calculate similarity between two strings (simple Levenshtein-like)
function getNameSimilarity(a: string, b: string): number {
  const str1 = a.toLowerCase();
  const str2 = b.toLowerCase();
  
  if (str1 === str2) return 1;
  if (str1.includes(str2) || str2.includes(str1)) return 0.95;
  
  // Check for common prefixes/suffixes
  const prefixes = ['kecamatan', 'kec', 'kelurahan', 'desa'];
  let norm1 = str1;
  let norm2 = str2;
  
  for (const prefix of prefixes) {
    norm1 = norm1.replace(new RegExp(`^${prefix}\\s+`), '');
    norm2 = norm2.replace(new RegExp(`^${prefix}\\s+`), '');
  }
  
  if (norm1 === norm2) return 0.9;
  
  // Levenshtein distance
  const maxLen = Math.max(norm1.length, norm2.length);
  let distance = 0;
  
  for (let i = 0; i < maxLen; i++) {
    if (norm1[i] !== norm2[i]) distance++;
  }
  
  const similarity = 1 - (distance / maxLen);
  return similarity > 0.7 ? similarity : 0;
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

    // Generate polygon features for each district with better visual arrangement
    // Arrange in a grid pattern with offset to create a more natural look
    const features = districtRecords.map((record, idx) => {
      // Create a 3x5 grid (15 districts fits nicely)
      const cols = 5;
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      
      // Center around Bandung area (rough Java coordinates)
      const baseLat = -6.9;
      const baseLon = 107.6;
      const latStep = 0.12;  // Spacing between rows
      const lonStep = 0.12;  // Spacing between columns
      
      const centerLat = baseLat + (row - 2) * latStep;
      const centerLon = baseLon + (col - 2) * lonStep;
      const offset = 0.045;  // Size of each polygon
      
      // Create a rounded rectangle instead of a square for better appearance
      return {
        type: 'Feature' as const,
        properties: {
          name: record.district,
          district: record.district,
          kecamatan: record.district,
          id: `${province}_${city}_${record.district}_${idx}`,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [centerLon - offset, centerLat - offset],
            [centerLon + offset, centerLat - offset],
            [centerLon + offset, centerLat + offset],
            [centerLon - offset, centerLat + offset],
            [centerLon - offset, centerLat - offset],
          ]],
        },
      };
    });

    console.log(`[Districts GeoJSON] Generated ${features.length} fallback polygon features for ${city} in grid layout`);

    return {
      type: 'FeatureCollection' as const,
      features,
      source: 'fallback_database_grid',
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
    
    // Improve city matching: handle "Kota " prefix
    const isCityType = city.toLowerCase().startsWith('kota ') || city.toLowerCase().startsWith('kota') || city.includes('Kota');
    const searchTerms = [
      isCityType ? `kota_${cityNormalized}` : cityNormalized, // Try with Kota prefix first if applicable
      cityNormalized // Try without prefix
    ];

    console.log(`[Districts GeoJSON] Looking for province slug: ${provinceSlug}, city folder: ${cityNormalized}, isCityType: ${isCityType}, searchTerms: ${searchTerms.join(', ')}`);


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

    // Try to find city directory with improved matching
    let cityDir: any = null;
    const dirs = (Array.isArray(provinceContents) ? provinceContents : []).filter((item: any) => item.type === 'dir');
    
    // Try each search term in order
    for (const searchTerm of searchTerms) {
      const match = dirs.find((item: any) => item.name.toLowerCase() === `id${provinceCode}_${searchTerm}` || item.name.toLowerCase().endsWith(`_${searchTerm}`));
      if (match) {
        console.log(`[Districts GeoJSON] Matched city directory: "${match.name}" with search term "${searchTerm}"`);
        cityDir = match;
        break;
      }
    }

    if (!cityDir) {
      console.warn(`[Districts GeoJSON] City directory not found in GitHub. Available dirs:`, 
        dirs.map((i: any) => i.name).slice(0, 10)
      );
      
      // Use fallback GeoJSON from database
      const fallbackGeoJson = await generateFallbackGeoJson(provinceName, city);
      if (fallbackGeoJson.features.length > 0) {
        if (!cachedGeoJson) cachedGeoJson = {};
        cachedGeoJson[cacheKey] = fallbackGeoJson;
        cacheTimestamp = now;
        console.log(`[Districts GeoJSON] Using fallback (city directory not found)`);
        return NextResponse.json(fallbackGeoJson);
      }
      
      return NextResponse.json({ 
        error: 'City not found in GitHub repository, and no fallback data available', 
        provinceSlug, 
        searchTerms,
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

    // Get list of expected district names from database to help filter/match
    let expectedDistricts: string[] = [];
    try {
      const districtRecords = await prisma.districtCrimeData.findMany({
        where: { province: provinceName, city },
        select: { district: true },
        distinct: ['district'],
      });
      expectedDistricts = districtRecords.map(r => r.district);
      console.log(`[Districts GeoJSON] Expected districts from DB: ${expectedDistricts.join(', ')}`);
    } catch (err) {
      console.warn(`[Districts GeoJSON] Could not fetch expected districts from DB:`, err);
    }

    // Filter/aggregate features to match district level using fuzzy matching
    // GitHub often returns sub-village level, so we need to intelligently filter
    let filteredFeatures = flattened;
    
    if (expectedDistricts.length > 0 && flattened.length > expectedDistricts.length * 2) {
      console.log(`[Districts GeoJSON] Applying fuzzy matching: ${flattened.length} features vs ${expectedDistricts.length} expected districts`);
      
      // Use fuzzy matching to find best features
      const matchedFeatures: typeof flattened = [];
      const usedIndices = new Set<number>();
      
      for (const expectedDistrict of expectedDistricts) {
        let bestMatch: { feature: any; similarity: number; index: number } | null = null;
        
        for (let i = 0; i < flattened.length; i++) {
          if (usedIndices.has(i)) continue;
          
          const feature = flattened[i];
          const featureName = (feature.properties?.name || feature.properties?.district || feature.properties?.kecamatan || feature.properties?.name_en || '').toString().trim();
          
          const similarity = getNameSimilarity(expectedDistrict, featureName);
          
          if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.similarity)) {
            bestMatch = { feature, similarity, index: i };
          }
        }
        
        if (bestMatch && bestMatch.similarity > 0.7) {
          console.log(`[Districts GeoJSON] Matched "${expectedDistrict}" (similarity: ${bestMatch.similarity.toFixed(2)}) to feature`);
          matchedFeatures.push(bestMatch.feature);
          usedIndices.add(bestMatch.index);
        } else {
          console.warn(`[Districts GeoJSON] No match found for district "${expectedDistrict}"`);
        }
      }
      
      if (matchedFeatures.length > 0) {
        filteredFeatures = matchedFeatures;
        console.log(`[Districts GeoJSON] Matched ${matchedFeatures.length} features out of ${expectedDistricts.length} expected districts`);
      }
    }
    
    // If fuzzy matching didn't work and we have many unmatched features, use fallback
    if (filteredFeatures.length === 0 && expectedDistricts.length > 0) {
      console.log(`[Districts GeoJSON] No matches found with fuzzy matching. Using database fallback instead of ${flattened.length} unmatched features`);
      const fallbackGeoJson = await generateFallbackGeoJson(provinceName, city);
      if (fallbackGeoJson.features.length > 0) {
        if (!cachedGeoJson) cachedGeoJson = {};
        cachedGeoJson[cacheKey] = fallbackGeoJson;
        cacheTimestamp = now;
        console.log(`[Districts GeoJSON] Returning ${fallbackGeoJson.features.length} fallback features for ${city}`);
        return NextResponse.json(fallbackGeoJson);
      }
    }

    const result = {
      type: 'FeatureCollection' as const,
      features: filteredFeatures,
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
