import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { extractLocation } from '@/lib/locationExtractor';

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

function parsePowerBIResponse(json: any) {
  try {
    const results = json?.results ?? [json];
    const firstResult = results[0];
    const candidate = firstResult?.result?.data ?? firstResult?.result ?? firstResult;

    const dsr = candidate?.dsr ?? candidate;
    const ds = dsr?.DS?.[0] ?? dsr?.DS ?? dsr ?? null;
    const columns = ds?.COLUMNS ?? ds?.Columns ?? ds?.columns ?? [];
    const rows = ds?.Rows ?? ds?.rows ?? ds?.R ?? [];

    if (!Array.isArray(columns) || !Array.isArray(rows)) return [];

    return rows.map((r: any[]) => {
      const obj: Record<string, any> = {};
      columns.forEach((c: any, i: number) => {
        const key = typeof c === 'string' ? c : c && c.Name ? c.Name : JSON.stringify(c);
        obj[key] = r[i];
      });
      return obj;
    });
  } catch (e) {
    if (DEBUG) console.error('parsePowerBIResponse error', e);
    return [];
  }
}

function makeInCondition(source: string, property: string, values: string[]) {
  return {
    Condition: {
      In: {
        Expressions: [{ Column: { Expression: { SourceRef: { Source: source } }, Property: property } }],
        Values: [values.map(v => ({ Literal: { Value: String(v) } }))],
      },
    },
  };
}

export async function GET(req: Request) {
  try {
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

    const payload: any = {
      version: '1.0.0',
      queries: [
        {
          Query: {
            Commands: [
              {
                SemanticQueryDataShapeCommand: {
                  Query: {
                    Version: 2,
                    From: [
                      { Name: 'v', Entity: 'VIEW_DATA_LP', Type: 0 },
                      { Name: 'l', Entity: 'LocalDateTable_12add86b-6ca9-411c-b150-5826b6bdf752', Type: 0 },
                      { Name: 'v1', Entity: 'VIEW_MASTER_SATKER_EMP', Type: 0 },
                    ],
                    Select: [
                      {
                        Measure: {
                          Expression: { SourceRef: { Source: 'v' } },
                          Property: 'Statistik Kriminal - Detail (2)',
                        },
                        Name: 'VIEW_DATA_LP.Statistik Kriminal - Detail (2)',
                        NativeReferenceName: 'Statistik Kriminal - Detail (2)',
                      },
                    ],
                    Where: [makeInCondition('l', 'Year', [`${year}L`])],
                    Binding: {
                      Primary: { Groupings: [{ Projections: [0] }] },
                      DataReduction: { DataVolume: 3, Primary: { Top: {} } },
                      Version: 1,
                    },
                    ExecutionMetricsKind: 1,
                  },
                },
              },
            ],
          },
          CacheKey: '{}',
          ApplicationContext: {
            DatasetId: 'edcee19b-e8fc-4f8a-bdc1-6a3410863eed',
            Sources: [{ ReportId: 'ec40848e-ee84-4f8a-b5a1016130676', VisualId: '7ba22eff7ec9a6002391' }],
          },
        },
      ],
      cancelQueries: [],
      modelId: 5179165,
    };

    if (province) {
      const values = province.split(',');
      payload.queries[0].Query.Commands[0].SemanticQueryDataShapeCommand.Query.Where.push(
        makeInCondition('v1', 'kode_provinsi', values)
      );
    }
    if (polda) {
      const values = polda.split(',');
      payload.queries[0].Query.Commands[0].SemanticQueryDataShapeCommand.Query.Where.push(
        makeInCondition('v1', 'Polda', values)
      );
    }
    if (satker) {
      const values = satker.split(',');
      payload.queries[0].Query.Commands[0].SemanticQueryDataShapeCommand.Query.Where.push(
        makeInCondition('v1', 'satker', values)
      );
    }
    if (crime_type) {
      const values = crime_type.split(',');
      payload.queries[0].Query.Commands[0].SemanticQueryDataShapeCommand.Query.Where.push(
        makeInCondition('v', 'jenis', values)
      );
    }
    if (whereExtra) {
      try {
        const extra = JSON.parse(whereExtra);
        if (Array.isArray(extra)) {
          extra.forEach((w) =>
            payload.queries[0].Query.Commands[0].SemanticQueryDataShapeCommand.Query.Where.push(w)
          );
        }
      } catch (e) {
        if (DEBUG) console.error('whereExtra parse error', e);
      }
    }

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
    console.log('[Pusiknas] PowerBI response status:', resp.status);
    const rows = parsePowerBIResponse(resp);
    console.log('[Pusiknas] Parsed rows count:', rows.length);

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
