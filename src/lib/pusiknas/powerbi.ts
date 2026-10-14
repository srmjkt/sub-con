// PowerBI semantic-query helpers for the Pusiknas proxy (/api/pusiknas).
//
// Everything here was validated against the live public report endpoint:
//   * model columns come from the report's conceptual schema; the province
//     dimension lives on VIEW_DATA_LP.Nama_Propinsi and counts on the
//     Jumlah_CT measure (the older kode_provinsi/provinsi/jenis columns and
//     the "Statistik Kriminal - Detail (2)" measure no longer exist / return
//     text).
//   * string literals must be single-quoted ('Jawa Barat') while typed
//     literals stay raw (2026L), and In-filter values are one tuple per
//     value ([[v1], [v2]]), never a single multi-value tuple.
//   * grouped results arrive as dsr.DS[0].PH[].DM1 rows that omit repeated
//     cells ("R": n -> inherit from previous row) and leading null cells
//     ("Ø": n -> first n slots are null); measure-only results arrive as a
//     single DM0 entry keyed by slot name.
//
// Regression coverage lives in tests/pusiknas_powerbi.test.ts, which runs
// offline against captured real responses in sample_responses/.

import {
  getProvinceByCode,
  getProvinceCode,
  normalizeProvince,
} from '../../../lib/indonesiaLocations';

/** Canonical name of the Yogyakarta province (used for filter expansion). */
const DIY = 'Daerah Istimewa Yogyakarta';
/** Alternate spelling of Yogyakarta stored in VIEW_DATA_LP.Nama_Propinsi. */
const DIY_ALT = 'DI YOGYAKARTA';

export const DATASET_ID = 'edcee19b-e8fc-4f8a-bdc1-6a3410863eed';
export const REPORT_ID = 'ec40848e-ee84-4f8a-b5a1016130676';
export const VISUAL_ID = '7ba22eff7ec9a6002391';
export const MODEL_ID = 5179165;

export interface InConditionOptions {
  /** Emit the literal verbatim instead of quoting it as a string. */
  raw?: boolean;
}

/**
 * Builds a PowerBI `In` condition. String values are single-quoted (DAX
 * string literal, embedded quotes doubled); values matching /^\d+L$/ such as
 * the LocalDateTable year are emitted raw when `raw` is set. Each value gets
 * its own literal tuple — a single tuple holding several values is rejected
 * by the endpoint ("expression count ... does not match").
 */
export function makeInCondition(
  source: string,
  property: string,
  values: string[],
  options: InConditionOptions = {}
) {
  const valueTuples = values.map((v) => {
    const literal = options.raw ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
    return [{ Literal: { Value: literal } }];
  });
  return {
    Condition: {
      In: {
        Expressions: [
          { Column: { Expression: { SourceRef: { Source: source } }, Property: property } },
        ],
        Values: valueTuples,
      },
    },
  };
}

export interface PusiknasQueryOptions {
  year?: string | null;
  /** 'province' groups by province; any other value returns the plain total. */
  groupBy?: string | null;
  province?: string | null;
  polda?: string | null;
  satker?: string | null;
  crimeType?: string | null;
  /** Pre-built condition objects appended verbatim (route `where` param). */
  extraWhere?: unknown[] | null;
}

function sanitizeYear(year: string | null | undefined): string {
  const digits = String(year ?? '').replace(/\D/g, '');
  return digits.length > 0 ? digits : '2026';
}

function splitValues(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * Province filters arrive as display names ("Jawa Barat"), legacy codes
 * ("31") or aliases. Resolves codes to names and, because the dataset stores
 * Yogyakarta under two spellings, expands that province to both variants so
 * `In` matches every row regardless of which spelling a record used.
 */
function resolveProvinceValues(input: string | null | undefined): string[] {
  const names: string[] = [];
  for (const raw of splitValues(input)) {
    const name = /^\d{1,2}$/.test(raw) ? getProvinceByCode(raw) ?? raw : raw;
    names.push(name);
    if (normalizeProvince(name) === DIY) names.push(DIY, DIY_ALT);
  }
  return Array.from(new Set(names));
}

/**
 * Builds the full PowerBI `querydata` payload for /api/pusiknas.
 * `groupBy === 'province'` selects the province heatmap shape
 * (Nama_Propinsi + Jumlah_CT grouped); otherwise a single total.
 */
export function buildPowerBIQuery(options: PusiknasQueryOptions): Record<string, any> {
  const year = sanitizeYear(options.year);
  const grouped = options.groupBy === 'province';

  const select: any[] = grouped
    ? [
        {
          Column: { Expression: { SourceRef: { Source: 'v' } }, Property: 'Nama_Propinsi' },
          Name: 'provinsi',
          NativeReferenceName: 'Nama_Propinsi',
        },
        {
          Measure: { Expression: { SourceRef: { Source: 'v' } }, Property: 'Jumlah_CT' },
          Name: 'count',
          NativeReferenceName: 'Jumlah_CT',
        },
      ]
    : [
        {
          Measure: { Expression: { SourceRef: { Source: 'v' } }, Property: 'Jumlah_CT' },
          Name: 'count',
          NativeReferenceName: 'Jumlah_CT',
        },
      ];

  const where: any[] = [makeInCondition('l', 'Year', [`${year}L`], { raw: true })];
  const provinceValues = resolveProvinceValues(options.province);
  if (provinceValues.length > 0) {
    where.push(makeInCondition('v', 'Nama_Propinsi', provinceValues));
  }
  const poldaValues = splitValues(options.polda);
  if (poldaValues.length > 0) where.push(makeInCondition('v1', 'Polda', poldaValues));
  const satkerValues = splitValues(options.satker);
  if (satkerValues.length > 0) where.push(makeInCondition('v1', 'satker', satkerValues));
  const crimeValues = splitValues(options.crimeType);
  if (crimeValues.length > 0) where.push(makeInCondition('v', 'Jenis_Kejahatan', crimeValues));
  if (Array.isArray(options.extraWhere)) where.push(...options.extraWhere);

  return {
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
                  Select: select,
                  Where: where,
                  Binding: {
                    Primary: { Groupings: [{ Projections: select.map((_, i) => i) }] },
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
          DatasetId: DATASET_ID,
          Sources: [{ ReportId: REPORT_ID, VisualId: VISUAL_ID }],
        },
      },
    ],
    cancelQueries: [],
    modelId: MODEL_ID,
  };
}

/**
 * Decodes a grouped `querydata` response into row objects keyed by the
 * column Names requested in the query.
 *
 * Compression rules observed on the live endpoint:
 *   * "Ø": n  -> the first n cells are null (empty-set marker), e.g. rows
 *     whose group key is blank.
 *   * "R": n  -> trailing cells identical to the previous row are omitted
 *     and must be inherited from the previously decoded row.
 */
function decodeGroupRows(dm1: any[], names: string[]): Array<Record<string, any>> {
  const slots: any[] = dm1.find((e) => Array.isArray(e?.S))?.S ?? [];
  const slotCount = slots.length || names.length || 0;
  const rows: Array<Record<string, any>> = [];
  let prev: any[] | null = null;

  for (const entry of dm1) {
    const explicit: any[] = Array.isArray(entry?.C) ? entry.C : [];
    const leadingNulls = typeof entry['Ø'] === 'number' ? entry['Ø'] : 0;

    const cells: any[] = [];
    for (let i = 0; i < leadingNulls && cells.length < slotCount; i++) cells.push(null);
    for (const value of explicit) {
      if (cells.length >= slotCount) break;
      cells.push(value ?? null);
    }
    while (cells.length < slotCount) {
      cells.push(prev ? prev[cells.length] : null);
    }
    prev = cells;

    const row: Record<string, any> = {};
    names.forEach((name, i) => {
      row[name] = cells[i] ?? null;
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Parses a PowerBI `querydata` response into rows keyed by the requested
 * column Names ({provinsi, count} for the heatmap, {count} for totals).
 * Throws when the endpoint reports a semantic error so the route can
 * surface an actionable message instead of silently returning [].
 */
export function parsePowerBIResponse(json: any): Array<Record<string, any>> {
  const first = json?.results?.[0];
  const data = first?.result?.data;

  // Semantic errors come back with HTTP 200 inside dsr.DataShapes.
  const odataError = data?.dsr?.DataShapes?.[0]?.['odata.error'];
  if (odataError) {
    const message = odataError.message?.value ?? 'PowerBI query failed';
    throw new Error(`${message} [${odataError.code}]`);
  }
  if (!data) {
    const message = first?.result?.error?.message ?? json?.error?.message;
    throw new Error(message || 'PowerBI response missing data');
  }

  const selectMeta: any[] = data.descriptor?.Select ?? [];
  const names: string[] = selectMeta.map((s, i) => s?.Name ?? `col_${i}`);
  if (names.length === 0) return [];

  const ds = data.dsr?.DS?.[0];
  if (!ds) return [];

  const dm1Container = (ds.PH ?? []).find((ph: any) => Array.isArray(ph.DM1));
  if (dm1Container) return decodeGroupRows(dm1Container.DM1, names);

  // Measure-only responses: a single DM0 entry whose slot (M0) carries the
  // value. A DM0 holding A0 is the subtotal of a grouped query with no rows.
  if (selectMeta[0]?.Kind === 2) {
    const dm0Container = (ds.PH ?? []).find((ph: any) => Array.isArray(ph.DM0) && ph.DM0.length > 0);
    const entry = dm0Container?.DM0?.[dm0Container.DM0.length - 1];
    if (entry) {
      const row: Record<string, any> = {};
      (entry.S ?? []).forEach((slot: any, i: number) => {
        row[names[i] ?? slot.N] = entry[slot.N] ?? null;
      });
      return [row];
    }
  }
  return [];
}

/**
 * Canonicalizes grouped province rows: PBI stores names uppercase ("DKI
 * JAKARTA") while maps expect display names ("DKI Jakarta"), Yogyakarta is
 * stored under two spellings, and legacy consumers expect `kode_provinsi`.
 * Duplicate provinces are merged by summing their counts. Rows without a
 * `provinsi` key (measure-only totals) pass through untouched.
 */
export function normalizeProvinceRows(rows: Array<Record<string, any>>): Array<Record<string, any>> {
  const merged = new Map<string, { provinsi: string; kode_provinsi: string | null; count: number }>();
  const passthrough: Array<Record<string, any>> = [];

  for (const row of rows ?? []) {
    if (!row || !('provinsi' in row)) {
      passthrough.push(row);
      continue;
    }
    const provinsi = normalizeProvince(String(row.provinsi ?? '').trim());
    const count = Number(row.count ?? 0) || 0;
    const existing = merged.get(provinsi);
    if (existing) {
      existing.count += count;
    } else {
      merged.set(provinsi, { provinsi, kode_provinsi: getProvinceCode(provinsi) ?? null, count });
    }
  }
  return [...merged.values(), ...passthrough];
}


