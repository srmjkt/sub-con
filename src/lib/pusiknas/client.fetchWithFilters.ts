export async function fetchWithFilters(params: Record<string, string | number | undefined>, opts: { signal?: AbortSignal } = {}) {
  const qs = new URLSearchParams();
  if (params.year !== undefined) qs.set('year', String(params.year));
  if (params.province !== undefined) qs.set('province', String(params.province));
  if (params.polda !== undefined) qs.set('polda', String(params.polda));
  if (params.satker !== undefined) qs.set('satker', String(params.satker));
  if (params.crime_type !== undefined) qs.set('crime_type', String(params.crime_type));
  if (params.q !== undefined) qs.set('q', String(params.q));
  if (params.groupBy !== undefined) qs.set('groupBy', String(params.groupBy));
  if (params.debug !== undefined) qs.set('debug', String(params.debug));

  const url = `/api/pusiknas?${qs.toString()}`;
  console.log('[fetchWithFilters] Requesting:', url);
  const res = await fetch(url, { signal: opts.signal });
  console.log('[fetchWithFilters] Response status:', res.status);
  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    throw new Error(`Proxy failed ${res.status}: ${txt}`);
  }
  const json = await res.json();
  console.log('[fetchWithFilters] Full response:', JSON.stringify(json, null, 2));
  if (json.rows && json.rows.length > 0) {
    console.log('[fetchWithFilters] First row keys:', Object.keys(json.rows[0]));
    console.log('[fetchWithFilters] First row:', json.rows[0]);
  }
  return json.rows || [];
}
