// Location extraction utility for Indonesian news articles
// Detects province, city, and district mentions in news text

import { INDONESIA_LOCATIONS, getProvinces, getCities, getDistricts } from './indonesiaLocations'

export interface LocationInfo {
  province: string | null
  city: string | null
  district: string | null
  village: string | null
  rw: string | null
  rt: string | null
}

// Common Indonesian location aliases / abbreviations that map to official names
// This handles references like "Polda Metro Jaya" → DKI Jakarta, "Polres Bogor" → Bogor, etc.
const LOCATION_ALIASES: Record<string, { province: string; city?: string }> = {
  // Police jurisdiction aliases
  'polda metro jaya': { province: 'DKI Jakarta' },
  'polda metrojaya': { province: 'DKI Jakarta' },
  'polda jaya': { province: 'DKI Jakarta' },
  'polda jakarta': { province: 'DKI Jakarta' },
  'polda jabar': { province: 'Jawa Barat' },
  'polda jawa barat': { province: 'Jawa Barat' },
  'polda jatim': { province: 'Jawa Timur' },
  'polda jawa timur': { province: 'Jawa Timur' },
  'polda jateng': { province: 'Jawa Tengah' },
  'polda jawa tengah': { province: 'Jawa Tengah' },
  'polda sumut': { province: 'Sumatera Utara' },
  'polda sumatera utara': { province: 'Sumatera Utara' },
  'polda sumbar': { province: 'Sumatera Barat' },
  'polda sumsel': { province: 'Sumatera Selatan' },
  'polda lampung': { province: 'Lampung' },
  'polda banten': { province: 'Banten' },
  'polda bali': { province: 'Bali' },
  'polda aceh': { province: 'Aceh' },
  'polda kaltim': { province: 'Kalimantan Timur' },
  'polda kalsel': { province: 'Kalimantan Selatan' },
  'polda sulsel': { province: 'Sulawesi Selatan' },
  'polda sulut': { province: 'Sulawesi Utara' },
  'polda papua': { province: 'Papua' },
  'polda diy': { province: 'Daerah Istimewa Yogyakarta' },
  'polda yogya': { province: 'Daerah Istimewa Yogyakarta' },
  'polda yogyakarta': { province: 'Daerah Istimewa Yogyakarta' },
  'polda riau': { province: 'Riau' },
  'polda kepri': { province: 'Kepulauan Riau' },
  'polda jambi': { province: 'Jambi' },
  'polda bengkulu': { province: 'Bengkulu' },
  'polda kalteng': { province: 'Kalimantan Tengah' },
  'polda kalbar': { province: 'Kalimantan Barat' },
  'polda kaltara': { province: 'Kalimantan Utara' },
  'polda sulteng': { province: 'Sulawesi Tengah' },
  'polda sultra': { province: 'Sulawesi Tenggara' },
  'polda sulbar': { province: 'Sulawesi Barat' },
  'polda gorontalo': { province: 'Gorontalo' },
  'polda maluku': { province: 'Maluku' },
  'polda malut': { province: 'Maluku Utara' },
  'polda maluku utara': { province: 'Maluku Utara' },
  'polda ntb': { province: 'Nusa Tenggara Barat' },
  'polda ntt': { province: 'Nusa Tenggara Timur' },
  'polda babel': { province: 'Kepulauan Bangka Belitung' },

  // Military area aliases
  'kodam jaya': { province: 'DKI Jakarta' },
  'kodam siliwangi': { province: 'Jawa Barat' },
  'kodam brawijaya': { province: 'Jawa Timur' },
  'kodam diponegoro': { province: 'Jawa Tengah' },
  'kodam bukit barisan': { province: 'Sumatera Utara' },
  'kodam iskandar muda': { province: 'Aceh' },
  'kodam trikora': { province: 'Papua' },
  'kodam cenderawasih': { province: 'Papua' },

  // Attorney general / prosecution aliases
  'kejaksaan agung': { province: 'DKI Jakarta', city: 'Jakarta Selatan' },
  'kejagung': { province: 'DKI Jakarta', city: 'Jakarta Selatan' },
  'kejati dki': { province: 'DKI Jakarta' },
  'kejati jabar': { province: 'Jawa Barat' },
  'kejati jatim': { province: 'Jawa Timur' },
  'kejati jateng': { province: 'Jawa Tengah' },

  // Common area abbreviations
  'jabodetabek': { province: 'DKI Jakarta' },
  'jabodetabekjur': { province: 'DKI Jakarta' },
  'jabodetabekpunjur': { province: 'DKI Jakarta' },

  // City abbreviations / alternate names
  'jkt': { province: 'DKI Jakarta' },
  'bdg': { province: 'Jawa Barat', city: 'Bandung' },
  'sby': { province: 'Jawa Timur', city: 'Surabaya' },
  'smg': { province: 'Jawa Tengah', city: 'Semarang' },
  'mdn': { province: 'Sumatera Utara', city: 'Medan' },
  'mks': { province: 'Sulawesi Selatan', city: 'Makassar' },
  'plg': { province: 'Sumatera Selatan', city: 'Palembang' },
  'bks': { province: 'Jawa Barat', city: 'Bekasi' },
  'tgr': { province: 'Banten', city: 'Tangerang' },
  'dps': { province: 'Bali', city: 'Denpasar' },
  'btm': { province: 'Kepulauan Riau', city: 'Batam' },
  'upg': { province: 'Sulawesi Selatan', city: 'Makassar' },
}

/**
 * Extract location mentions from news headline and summary text.
 * Uses the Indonesian locations database to find matches.
 */
export function extractLocation(headline: string, summary: string): LocationInfo {
  const text = `${headline} ${summary}`.toLowerCase()
  
  // First, check aliases (before exact matching, since aliases like "Polda Metro Jaya"
  // are more specific than generic location names)
  for (const [alias, mapping] of Object.entries(LOCATION_ALIASES)) {
    if (text.includes(alias)) {
      return {
        province: mapping.province,
        city: mapping.city || null,
        district: null,
        village: null,
        rw: null,
        rt: null,
      }
    }
  }

  // Try to find province first
  const provinces = getProvinces()
  let matchedProvince: string | null = null
  let matchedCity: string | null = null
  let matchedDistrict: string | null = null

  // Check provinces (longer matches first to avoid partial matches)
  const sortedProvinces = [...provinces].sort((a, b) => b.length - a.length)
  for (const province of sortedProvinces) {
    if (text.includes(province.toLowerCase())) {
      matchedProvince = province
      break
    }
  }

  // If province found, check its cities
  if (matchedProvince) {
    const cities = getCities(matchedProvince)
    const sortedCities = [...cities].sort((a, b) => b.length - a.length)
    for (const city of sortedCities) {
      if (text.includes(city.toLowerCase())) {
        matchedCity = city
        break
      }
    }

    // If city found, check its districts
    if (matchedCity) {
      const districts = getDistricts(matchedProvince, matchedCity)
      const sortedDistricts = [...districts].sort((a, b) => b.length - a.length)
      for (const district of sortedDistricts) {
        if (text.includes(district.toLowerCase())) {
          matchedDistrict = district
          break
        }
      }
    }
  }

  // If no province found by exact match, try city-first matching
  if (!matchedProvince) {
    // Build a reverse lookup: city -> province
    const cityToProvince = new Map<string, string>()
    for (const prov of INDONESIA_LOCATIONS) {
      for (const c of prov.cities) {
        cityToProvince.set(c.city.toLowerCase(), prov.province)
      }
    }

    // Try to find a city mention
    for (const [cityLower, provinceName] of cityToProvince) {
      if (text.includes(cityLower)) {
        matchedProvince = provinceName
        // Find the exact city name
        const cities = getCities(provinceName)
        for (const city of cities) {
          if (city.toLowerCase() === cityLower) {
            matchedCity = city
            break
          }
        }
        break
      }
    }
  }

  return {
    province: matchedProvince,
    city: matchedCity,
    district: matchedDistrict,
    village: null,
    rw: null,
    rt: null,
  }
}

/**
 * Check if a news item matches the given location filter.
 * Returns true if the item should be included.
 */
export function matchesLocationFilter(
  itemLocation: LocationInfo,
  filter: LocationInfo
): boolean {
  // If no filter is set, include all
  if (!filter.province && !filter.city && !filter.district && !filter.village && !filter.rw && !filter.rt) {
    return true
  }

  // Check each level of the hierarchy
  if (filter.province && itemLocation.province !== filter.province) {
    return false
  }
  if (filter.city && itemLocation.city !== filter.city) {
    return false
  }
  if (filter.district && itemLocation.district !== filter.district) {
    return false
  }
  if (filter.village && itemLocation.village !== filter.village) {
    return false
  }
  if (filter.rw && itemLocation.rw !== filter.rw) {
    return false
  }
  if (filter.rt && itemLocation.rt !== filter.rt) {
    return false
  }

  return true
}