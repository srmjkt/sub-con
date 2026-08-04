export interface FetchOptions {
  year?: number;
  province?: string;
  polda?: string;
  satker?: string;
  crime_type?: string;
  q?: string;
  groupBy?: 'province' | 'polda' | 'satker' | 'crime_type';
}

export async function fetchWithFilters(
  options: FetchOptions = {}
): Promise<any[]> {
  const params = new URLSearchParams();
  
  if (options.year) params.set('year', String(options.year));
  if (options.province) params.set('province', options.province);
  if (options.polda) params.set('polda', options.polda);
  if (options.satker) params.set('satker', options.satker);
  if (options.crime_type) params.set('crime_type', options.crime_type);
  if (options.q) params.set('q', options.q);
  if (options.groupBy) params.set('groupBy', options.groupBy);

  const response = await fetch(`/api/pusiknas?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.rows || [];
}