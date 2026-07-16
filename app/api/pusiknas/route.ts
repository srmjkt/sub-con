import { NextResponse } from 'next/server';

const POWERBI_URL = process.env.PUSIKNAS_POWERBI_URL || 'https://wabi-south-east-asia-b-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true';
const RESOURCE_KEY = process.env.PUSIKNAS_POWERBI_RESOURCE_KEY || '';

async function forwardPowerBIQuery(payload: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json, text/plain, */*',
  };
  if (RESOURCE_KEY) headers['X-PowerBI-ResourceKey'] = RESOURCE_KEY;

  const resp = await fetch(POWERBI_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`PowerBI query failed ${resp.status}: ${text}`);
  }

  const json = await resp.json();
  return json;
}

function parsePowerBIResponse(json: any) {
  // Power BI responses commonly return results[0].result.data.dsr.DS[0] with COLUMNS + Rows
  try {
    const results = json?.results ?? [json];
    const firstResult = results[0];
    const candidate = firstResult?.result?.data ?? firstResult?.result ?? firstResult;

    const dsr = candidate?.dsr ?? candidate;
    const ds = dsr?.DS?.[0] ?? dsr?.DS?.[0] ?? dsr?.DS ?? null;
    const columns = ds?.COLUMNS ?? ds?.Columns ?? ds?.columns ?? [];
    const rows = ds?.Rows ?? ds?.rows ?? ds?.R ?? [];

    if (!Array.isArray(columns) || !Array.isArray(rows)) return [];

    return rows.map((r: any[]) => {
      const obj: Record<string, any> = {};
      columns.forEach((c: any, i: number) => {
        // column can be object with Name property or a string
        const key = typeof c === 'string' ? c : c; // keep as-is; consumer will normalize
        obj[key] = r[i];
      });
      return obj;
    });
  } catch (e) {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get('year') ?? '2026';
    const province = url.searchParams.get('province');

    // Build a minimal payload based on the captured cURL: inject the year filter
    const payload = {
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
                    Where: [
                      {
                        Condition: {
                          In: {
                            Expressions: [
                              { Column: { Expression: { SourceRef: { Source: 'l' } }, Property: 'Year' } },
                            ],
                            Values: [[{ Literal: { Value: `${year}L` } }]],
                          },
                        },
                      },
                    ],
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
            Sources: [{ ReportId: 'ec40848e-ee84-4f0e-9d4b-5a1016130676', VisualId: '7ba22eff7ec9a6002391' }],
          },
        },
      ],
      cancelQueries: [],
      modelId: 5179165,
    };

    // If province parameter present, append another Where condition (example)
    if (province) {
      const whereClause = {
        Condition: {
          In: {
            Expressions: [
              { Column: { Expression: { SourceRef: { Source: 'v1' } }, Property: 'kode_provinsi' } },
            ],
            Values: [[{ Literal: { Value: String(province) } }]],
          },
        },
      };
      // push to the Where array inside the command
      // navigate to payload.queries[0].Query.Commands[0].SemanticQueryDataShapeCommand.Query.Where
      try {
        // @ts-ignore
        payload.queries[0].Query.Commands[0].SemanticQueryDataShapeCommand.Query.Where.push(whereClause);
      } catch (e) {
        // ignore
      }
    }

    const resp = await forwardPowerBIQuery(payload);
    const rows = parsePowerBIResponse(resp);

    return NextResponse.json({ rows });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
