import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { classifySecurityRelevance } from '@/lib/securityClassifier'
import { extractLocation } from '@/lib/locationExtractor'
import type { SecurityClassification } from '@/types/security'
import type { LocationInfo } from '@/lib/locationExtractor'

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
})

type SourceKey = 'Kompas' | 'Detik' | 'Liputan6' | 'CNNIndonesia' | 'Kumparan' | 'Tempo' | 'Tribun' | 'Okezone'

interface NewsItemRaw {
  id: string
  source: SourceKey
  headline: string
  summary: string
  category: string
  url: string
  timestamp: number
  security?: SecurityClassification
  location?: LocationInfo
}

function mapRssItem(
  item: Record<string, unknown>,
  source: SourceKey,
): NewsItemRaw {
  let rawUrl = String(item.link ?? '')
  const headline = cleanHeadline(String(item.title ?? ''))
  const summary = stripHtml(
    String(item.contentSnippet ?? item.content ?? ''),
  ).slice(0, 280)
  const timestamp = item.isoDate
    ? new Date(String(item.isoDate)).getTime()
    : item.pubDate
      ? new Date(String(item.pubDate)).getTime()
      : Date.now()

  if (!rawUrl || !rawUrl.startsWith('http')) {
    rawUrl = `https://www.google.com/search?q=${encodeURIComponent(headline + ' ' + source)}`
  }

  const classification = classifySecurityRelevance(headline, summary)
  const location = extractLocation(headline, summary)

  return {
    id: String(item.guid ?? item.link ?? `${source}-${timestamp}`),
    source,
    headline,
    summary,
    category: extractCategory(item, rawUrl),
    url: rawUrl,
    timestamp,
    security: classification,
    location,
  }
}

function cleanHeadline(title: string): string {
  return title.replace(/\s*[-–]\s*\w+(\.\w+)*\s*$/, '').trim()
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function extractCategory(
  item: Record<string, unknown>,
  url: string,
): string {
  const categories = item.categories
  if (Array.isArray(categories) && categories.length > 0) {
    return String(categories[0])
  }
  if (typeof categories === 'string' && categories) {
    return categories as string
  }
  const urlMatch = url.match(/\.com\/([^/]+)/)
  if (urlMatch?.[1]) {
    return urlMatch[1]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return 'Umum'
}

const RSS_URLS: Record<SourceKey, string[]> = {
  Kompas: [
    'https://indeks.kompas.com/headline/rss.xml',
    'https://news.google.com/rss/search?q=site:kompas.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Detik: [
    'https://rss.detik.com/index.php',
    'https://news.google.com/rss/search?q=site:detik.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Liputan6: [
    'https://rss.liputan6.com/rss',
    'https://news.google.com/rss/search?q=site:liputan6.com&hl=id&gl=ID&ceid=ID:id',
  ],
  CNNIndonesia: [
    'https://www.cnnindonesia.com/rss',
    'https://news.google.com/rss/search?q=site:cnnindonesia.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Kumparan: [
    'https://kumparan.com/rss',
    'https://news.google.com/rss/search?q=site:kumparan.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Tempo: [
    'https://rss.tempo.co/',
    'https://news.google.com/rss/search?q=site:tempo.co&hl=id&gl=ID&ceid=ID:id',
  ],
  Tribun: [
    'https://www.tribunnews.com/rss',
    'https://news.google.com/rss/search?q=site:tribunnews.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Okezone: [
    'https://rss.okezone.com/index.php?okemod=rss&okefile=index',
    'https://news.google.com/rss/search?q=site:okezone.com&hl=id&gl=ID&ceid=ID:id',
  ],
}

async function fetchSource(
  source: SourceKey,
): Promise<NewsItemRaw[]> {
  const urls = RSS_URLS[source]
  if (!urls) return []

  const allItems: NewsItemRaw[] = []

  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url)
      const items = (feed.items ?? [])
        .slice(0, 30)
        .map((item) => mapRssItem(item as unknown as Record<string, unknown>, source))
        .filter((item) => item.headline && item.url)
      allItems.push(...items)
      if (allItems.length >= 10) break
    } catch (error) {
      console.error(`[RSS] ${source} fetch error:`, error)
    }
  }

  const seen = new Set<string>()
  return allItems.filter((item) => {
    const key = item.headline.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

let cachedNews: NewsItemRaw[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60_000

async function getAllNews(forceRefresh: boolean = false): Promise<NewsItemRaw[]> {
  const now = Date.now()
  if (!forceRefresh && cachedNews && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedNews
  }

  const sourcesToFetch = Object.keys(RSS_URLS) as SourceKey[]
  const results = await Promise.all(sourcesToFetch.map(fetchSource))

  let allNews = results
    .flat()
    .sort((a, b) => b.timestamp - a.timestamp)

  const seen = new Set<string>()
  allNews = allNews.filter((item) => {
    const key = item.headline.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  cachedNews = allNews
  cacheTimestamp = now
  return allNews
}

/**
 * Search Google News RSS with multiple query variations AND date range parameters
 * to find articles from ANY time period (days, months, years ago).
 * Google News RSS supports the `before:` parameter which forces archive search.
 */
async function searchGoogleNewsArchive(searchQuery: string): Promise<NewsItemRaw[]> {
  const seenUrls = new Set<string>()
  const matches: NewsItemRaw[] = []

  // Build a comprehensive list of query variations
  const terms = searchQuery.trim().split(/\s+/).filter(Boolean)
  const queryVariations: string[] = [
    searchQuery,
    `"${searchQuery}"`,
    searchQuery + ' Indonesia',
    ...(terms.length > 1 ? [terms.join(' ')] : []),
    ...(terms.length > 2 ? [terms.slice(0, 3).join(' ')] : []),
  ]
  const sources = ['kompas', 'detik', 'liputan6', 'cnnindonesia', 'tempo', 'tribunnews', 'okezone', 'kumparan']
  for (const source of sources) {
    queryVariations.push(`site:${source}.com ${searchQuery}`)
  }

  // Current time for date range calculations
  const now = new Date()
  const currentYear = now.getFullYear()

  // Date ranges to try — forces Google to look at different time periods
  // Format: 'after:YYYY-MM-DD before:YYYY-MM-DD'
  const dateRanges: string[] = [
    '', // no date filter (default: recent)
    `after:${currentYear-10}-01-01 before:${currentYear-8}-12-31`, // 8-10 years ago
    `after:${currentYear-8}-01-01 before:${currentYear-6}-12-31`, // 6-8 years ago
    `after:${currentYear-6}-01-01 before:${currentYear-4}-12-31`, // 4-6 years ago
    `after:${currentYear-4}-01-01 before:${currentYear-2}-12-31`, // 2-4 years ago
    `after:${currentYear-2}-01-01 before:${currentYear-1}-12-31`, // 1-2 years ago
    `after:${currentYear-1}-01-01 before:${currentYear-1}-06-30`, // 6-12 months ago
    `after:${currentYear-1}-07-01 before:${currentYear}-01-01`,   // 6-18 months ago
    `after:${currentYear}-01-01`,  // this year
  ]

  for (const query of queryVariations) {
    for (const dateRange of dateRanges) {
      try {
        let url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=id&gl=ID&ceid=ID:id'
        if (dateRange) {
          url += '&tbs=cdr:1,' + dateRange
        }
        const feed = await parser.parseURL(url)
        const items = (feed.items ?? [])
          .slice(0, 50)
          .map((item: Record<string, unknown>) => {
            const mapped = mapRssItem(item, 'Kompas' as SourceKey)
            mapped.source = 'Google News' as any
            return mapped
          })
          .filter((item: NewsItemRaw) => item.headline && item.url && !seenUrls.has(item.url))
        items.forEach((item: NewsItemRaw) => seenUrls.add(item.url))
        matches.push(...items)
      } catch (e) {
        // skip failed queries
      }
    }
  }

  return matches
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedSources = searchParams.get('sources')
  const showAll = searchParams.get('showAll') === 'true'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '6', 10)
  const refresh = searchParams.get('refresh') === 'true'
  const searchQuery = searchParams.get('search')
  const filterProvince = searchParams.get('province')
  const filterCity = searchParams.get('city')
  const filterDistrict = searchParams.get('district')
  const query = searchParams.get('q')?.trim()

  const sourcesToFetch: SourceKey[] = requestedSources
    ? (requestedSources.split(',').filter(s => s) as SourceKey[])
    : (Object.keys(RSS_URLS) as SourceKey[])

  let allNews: NewsItemRaw[]
  if (requestedSources) {
    const results = await Promise.all(sourcesToFetch.map(fetchSource))
    allNews = results.flat().sort((a, b) => b.timestamp - a.timestamp)
  } else {
    allNews = await getAllNews(refresh)
  }

  let filteredNews: NewsItemRaw[]
  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim()
    const terms = q.split(/\s+/).filter(Boolean)

    // Search Google News archive (returns articles from any time period)
    const googleMatches = await searchGoogleNewsArchive(searchQuery)

    // Also search local news (without security filter)
    let localMatches = allNews.filter((item) => {
      return terms.some((term) => 
        item.headline.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      )
    })

    // Merge and deduplicate
    const seen = new Set<string>()
    filteredNews = [...googleMatches, ...localMatches].filter((item) => {
      const key = item.headline.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort by timestamp descending
    filteredNews.sort((a, b) => b.timestamp - a.timestamp)
  } else {
    filteredNews = allNews
    if (!showAll) {
      filteredNews = allNews.filter((item) => item.security?.isRelevant === true)
    }
  }

  if (filterProvince || filterCity || filterDistrict) {
    filteredNews = filteredNews.filter((item) => {
      const loc = item.location
      if (!loc) return false
      if (filterProvince && loc.province !== filterProvince) return false
      if (filterCity && loc.city !== filterCity) return false
      if (filterDistrict && loc.district !== filterDistrict) return false
      return true
    })
  }

  if (query) {
    const queryLower = query.toLowerCase()
    const terms = queryLower.split(/\s+/).filter(Boolean)
    filteredNews = filteredNews.filter((item) => {
      const haystack = `${item.headline} ${item.summary} ${item.category} ${item.source}`.toLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
  }

  const totalItems = filteredNews.length
  const totalPages = Math.ceil(totalItems / limit)
  const startIndex = (page - 1) * limit
  const paginatedItems = filteredNews.slice(startIndex, startIndex + limit)

  const now = Date.now()

  const stats = {
    totalFetched: allNews.length,
    securityFiltered: allNews.filter((i) => i.security?.isRelevant === true).length,
    categories: countCategories(allNews),
  }

  return NextResponse.json(
    {
      items: paginatedItems,
      stats,
      fetchedAt: now,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasMore: page < totalPages,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    },
  )
}

function countCategories(items: NewsItemRaw[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const cat = item.security?.category ?? 'general'
    counts[cat] = (counts[cat] || 0) + 1
  }
  return counts
}

export const dynamic = 'force-dynamic'
export const revalidate = 0