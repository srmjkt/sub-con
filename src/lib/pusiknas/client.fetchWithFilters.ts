export async function fetchWithFilters(params: Record<string, string | number | undefined>, opts: { signal?: AbortSignal } = {}) {
  const qs = new URLSearchParams();
  if (params.year !== undefined) qs.set('year', `${String(params.year)}L`);
  if (params.province !== undefined) qs.set('province', String(params.province));
  if (params.polda !== undefined) qs.set('polda', String(params.polda));
  if (params.satker !== undefined) qs.set('satker', String(params.satker));
  if (params.crime_type !== undefined) qs.set('crime_type', String(params.crime_type));
  if (params.q !== undefined) qs.set('q', String(params.q));
  if (params.groupBy !== undefined) qs.set('groupBy', String(params.groupBy));

  const url = `/api/pusiknas?${qs.toString()}`;
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    throw new Error(`Proxy failed ${res.status}: ${txt}`);
  }
  const json = await res.json();
  return json.rows || [];
}
