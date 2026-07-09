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

/**
 * Extract location mentions from news headline and summary text.
 * Uses the Indonesian locations database to find matches.
 */
export function extractLocation(headline: string, summary: string): LocationInfo {
  const text = `${headline} ${summary}`.toLowerCase()
  
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