import fs from 'fs/promises';

export type RawRecord = Record<string, any>;
export type NormalizedRecord = {
  id: string | null;
  date: string | null;
  province: string | null;
  province_code: string | null;
  crime_type: string | null;
  count: number;
  source: string | null;
};

const BASE = process.env.PUSIKNAS_BASE || 'https://pusiknas.polri.go.id';
const CACHE_DIR = '.cache/pusiknas';
const CACHE_TTL = Number(process.env.CACHE_TTL || 3600); // seconds

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function cachePath(name: string) {
  return `${CACHE_DIR}/${name}.json`;
}

async function readCache(name: string) {
  try {
    const p = cachePath(name);
    const stat = await fs.stat(p);
    const age = (Date.now() - stat.mtimeMs) / 1000;
    if (age > CACHE_TTL) return null;
    const data = await fs.readFile(p, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

async function writeCache(name: string, data: any) {
  try {
    await ensureCacheDir();
    await fs.writeFile(cachePath(name), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

// Minimal CSV parser for simple CSV master files (no quoted-comma support)
function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
    return obj;
  });
  return rows;
}

async function fetchUrl(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (contentType.includes('application/json')) return JSON.parse(text);
  if (contentType.includes('text/csv') || url.endsWith('.csv')) return parseCsv(text);
  try { return JSON.parse(text); } catch (e) { return text; }
}

/**
 * Fetch crime data from the (placeholder) JSON endpoint.
 * TODO: Replace the path '/api/data_kejahatan' with the real XHR endpoint discovered from the dashboard.
 */
export async function fetchCrimeJson(params: Record<string, string | number> = {}, useCache = true) {
  const cacheKey = `crime_json_${Object.entries(params).sort().map(([k,v])=>`${k}=${v}`).join('&')}`;
  if (useCache) {
    const cached = await readCache(cacheKey);
    if (cached) return cached;
  }

  // Placeholder path; inspect browser DevTools Network to find actual endpoint
  const path = '/api/data_kejahatan';
  const url = new URL(path, BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const data = await fetchUrl(url.toString(), { method: 'GET' });
  await writeCache(cacheKey, data);
  return data;
}

/**
 * Fetch a master CSV file (from the master_data listing). Use the path you find in /list?id=master_data.
 */
export async function fetchMasterCsv(path: string, useCache = true) {
  const cacheKey = `master_csv_${path.replace(/[^a-z0-9]/gi, '_')}`;
  if (useCache) {
    const cached = await readCache(cacheKey);
    if (cached) return cached;
  }
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const data = await fetchUrl(url, { method: 'GET' });
  await writeCache(cacheKey, data);
  return data;
}

export function normalizeRecord(raw: RawRecord): NormalizedRecord {
  return {
    id: raw.id ?? raw.ID ?? null,
    date: raw.tanggal ?? raw.date ?? raw.tgl ?? null,
    province: raw.provinsi ?? raw.region ?? raw.kabupaten ?? null,
    province_code: raw.kode_provinsi ?? raw.province_code ?? null,
    crime_type: raw.jenis ?? raw.kategori ?? raw.crime_type ?? null,
    count: Number(raw.jumlah ?? raw.count ?? raw.hitung ?? 0),
    source: raw.source ?? null,
  };
}

// New: fetch via server-side proxy API we added. This is the function the React component should call.
export async function fetchByYear(year: number) {
  // client-side: call Next.js API route
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/pusiknas?year=${year}`);
    if (!res.ok) throw new Error(`Server proxy failed: ${res.status}`);
    const json = await res.json();
    return (json.rows || json);
  }

  // server-side fallback: try to use the placeholder fetchCrimeJson (may need adjustments)
  try {
    const rows = await fetchCrimeJson({ tahun: year });
    if (Array.isArray(rows)) return rows.map(normalizeRecord);
    if (rows && Array.isArray(rows.data)) return rows.data.map(normalizeRecord);
    return [];
  } catch (e) {
    return [];
  }
}

export async function fetchByProvince(provinceCode: string | number) {
  const data = await fetchCrimeJson({ provinsi: provinceCode });
  if (Array.isArray(data)) return data.map(normalizeRecord);
  if (data && Array.isArray(data.data)) return data.data.map(normalizeRecord);
  return [] as NormalizedRecord[];
}

export async function getMasterData(path: string) {
  const rows = await fetchMasterCsv(path);
  return rows.map((r: any) => ({ ...r }));
}
