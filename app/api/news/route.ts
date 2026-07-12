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

  // Ensure URL is a valid absolute URL; fall back to a Google search for the headline
  if (!rawUrl || !rawUrl.startsWith('http')) {
    rawUrl = `https://www.google.com/search?q=${encodeURIComponent(headline + ' ' + source)}`
  }

  // Classify security relevance
  const classification = classifySecurityRelevance(headline, summary)

  // Extract location from headline and summary
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
    'https://rss.kompas.com/',
    'https://indeks.kompas.com/headline/rss.xml',
    'https://news.google.com/rss/search?q=site:kompas.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Detik: [
    'https://rss.detik.com/',
    'https://news.detik.com/index.rss',
    'https://news.google.com/rss/search?q=site:detik.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Liputan6: [
    'https://rss.liputan6.com/',
    'https://feed.liputan6.com/',
    'https://news.google.com/rss/search?q=site:liputan6.com&hl=id&gl=ID&ceid=ID:id',
  ],
  CNNIndonesia: [
    'https://www.cnnindonesia.com/nasional/rss',
    'https://www.cnnindonesia.com/rss',
    'https://news.google.com/rss/search?q=site:cnnindonesia.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Kumparan: [
    'https://lapi.kumparan.com/v2.0/rss/',
    'https://kumparan.com/rss',
    'https://news.google.com/rss/search?q=site:kumparan.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Tempo: [
    'https://rss.tempo.co/',
    'https://news.google.com/rss/search?q=site:tempo.co&hl=id&gl=ID&ceid=ID:id',
  ],
  Tribun: [
    'https://rss.tribunnews.com/',
    'https://news.google.com/rss/search?q=site:tribunnews.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Okezone: [
    'https://rss.okezone.com/',
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

// Cache for storing fetched news so we can do pagination without re-fetching RSS every time
let cachedNews: NewsItemRaw[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60_000 // 1 minute cache

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

  // Deduplicate
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedSources = searchParams.get('sources')
  const showAll = searchParams.get('showAll') === 'true'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '6', 10)
  const refresh = searchParams.get('refresh') === 'true'
  const filterProvince = searchParams.get('province')
  const filterCity = searchParams.get('city')
  const filterDistrict = searchParams.get('district')

  const sourcesToFetch: SourceKey[] = requestedSources
    ? (requestedSources.split(',').filter(s => s) as SourceKey[])
    : (Object.keys(RSS_URLS) as SourceKey[])

  // If refresh is requested or specific sources are selected, force re-fetch from RSS
  let allNews: NewsItemRaw[]
  if (requestedSources) {
    // Specific sources -> always fetch fresh
    const results = await Promise.all(sourcesToFetch.map(fetchSource))
    allNews = results.flat().sort((a, b) => b.timestamp - a.timestamp)
  } else {
    allNews = await getAllNews(refresh)
  }

  // Filter: only return security-relevant items (unless showAll=true)
  let filteredNews = allNews
  if (!showAll) {
    filteredNews = allNews.filter((item) => item.security?.isRelevant === true)
  }

  // Apply location filter if specified
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

  // Paginate
  const totalItems = filteredNews.length
  const totalPages = Math.ceil(totalItems / limit)
  const startIndex = (page - 1) * limit
  const paginatedItems = filteredNews.slice(startIndex, startIndex + limit)

  const now = Date.now()

  // Summary of how many items were filtered out
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