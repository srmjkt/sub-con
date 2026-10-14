import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { extractLocation } from '@/lib/locationExtractor';
import { getSession } from '@/lib/auth';
import { buildPowerBIQuery, normalizeProvinceRows, parsePowerBIResponse } from '@/lib/pusiknas/powerbi';

const POWERBI_URL =
  process.env.PUSIKNAS_POWERBI_URL ||
  'https://wabi-south-east-asia-b-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true';
const RESOURCE_KEY = process.env.PUSIKNAS_POWERBI_RESOURCE_KEY || '';
const CACHE_DIR = process.env.PUSIKNAS_CACHE_DIR || path.join(os.tmpdir(), 'pusiknas-cache');
const CACHE_TTL = Number(process.env.PUSIKNAS_CACHE_TTL || 60); // seconds
const RATE_LIMIT_WINDOW = Number(process.env.PUSIKNAS_RATE_LIMIT_WINDOW || 60); // seconds
const RATE_LIMIT_MAX = Number(process.env.PUSIKNAS_RATE_LIMIT_MAX || 60); // max requests per window per IP
const DEBUG = Boolean(process.env.PUSIKNAS_DEBUG === 'true');

const rateMap = new Map<string, { count: number; windowStart: number }>();

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (e) {
    if (DEBUG) console.warn('ensureCacheDir error', e);
  }
}

function hashPayload(payload: any) {
  const s = JSON.stringify(payload);
  return crypto.createHash('sha1').update(s).digest('hex');
}

function cacheFilePath(key: string) {
  return path.join(CACHE_DIR, `${key}.json`);
}

async function readCache(key: string) {
  try {
    const p = cacheFilePath(key);
    const stat = await fs.stat(p);
    const age = (Date.now() - stat.mtimeMs) / 1000;
    if (age > CACHE_TTL) return null;
    const txt = await fs.readFile(p, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

async function writeCache(key: string, data: any) {
  try {
    await ensureCacheDir();
    await fs.writeFile(cacheFilePath(key), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    if (DEBUG) console.warn('writeCache error', e);
  }
}

function isRateLimited(ip: string) {
  const now = Math.floor(Date.now() / 1000);
  const rec = rateMap.get(ip);
  if (!rec) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (now - rec.windowStart > RATE_LIMIT_WINDOW) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  rec.count += 1;
  if (rec.count > RATE_LIMIT_MAX) return true;
  rateMap.set(ip, rec);
  return false;
}

async function forwardPowerBIQuery(payload: any) {
  if (!RESOURCE_KEY) throw new Error('missing_resource_key');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json, text/plain, */*',
    'X-PowerBI-ResourceKey': RESOURCE_KEY,
  };

  const controller = new AbortController();
  const timeoutMs = 10_000;
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(POWERBI_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`PowerBI query failed ${resp.status}: ${text}`);
    }

    return await resp.json();
  } finally {
    clearTimeout(id);
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    if (!RESOURCE_KEY) {
      console.error('[Pusiknas] Missing PUSIKNAS_POWERBI_RESOURCE_KEY');
      return NextResponse.json({ error: 'missing_resource_key' }, { status: 400 });
    }

    const url = new URL(req.url);
    const year = url.searchParams.get('year') ?? '2026';
    const query = url.searchParams.get('q')?.trim();
    const aliasLocation = query ? extractLocation(query.toLowerCase(), query.toLowerCase()) : null;
    const province = url.searchParams.get('province') ?? aliasLocation?.province ?? undefined;
    const polda = url.searchParams.get('polda') ?? aliasLocation?.polda ?? undefined;
    const satker = url.searchParams.get('satker') ?? aliasLocation?.satker ?? undefined;
    const crime_type = url.searchParams.get('crime_type');
    const whereExtra = url.searchParams.get('where');
    const groupBy = url.searchParams.get('groupBy');
    let extraWhere: any[] | null = null;
    if (whereExtra) {
      try {
        const parsed = JSON.parse(whereExtra);
        if (Array.isArray(parsed)) extraWhere = parsed;
      } catch (e) {
        if (DEBUG) console.error('whereExtra parse error', e);
      }
    }

    const payload = buildPowerBIQuery({
      year,
      groupBy,
      province,
      polda,
      satker,
      crimeType: crime_type,
      extraWhere,
    });

    const key = hashPayload(payload);
    const cached = await readCache(key);
    if (cached) {
      if (DEBUG) console.log('Returning cached result for', key);
      return NextResponse.json(
        { rows: cached },
        { status: 200, headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
      );
    }

    const resp = await forwardPowerBIQuery(payload);
    const rows = normalizeProvinceRows(parsePowerBIResponse(resp));

    try {
      await writeCache(key, rows);
    } catch (e) {
      if (DEBUG) console.warn('writeCache error', e);
    }

    return NextResponse.json(
      { rows },
      { status: 200, headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (err: any) {
    if (DEBUG) console.error('api/pusiknas error', err);
    const msg = String(err.message || err);
    const code = msg === 'missing_resource_key' ? 400 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
