import { NextResponse } from 'next/server'
import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
})

type SourceKey = 'Kompas' | 'Detik' | 'Liputan6' | 'CNNIndonesia' | 'Kumparan'

interface RssSourceConfig {
  urls: string[]
  mapItem: (item: Record<string, unknown>, source: SourceKey) => NewsItemRaw
}

interface NewsItemRaw {
  id: string
  source: SourceKey
  headline: string
  summary: string
  category: string
  url: string
  timestamp: number
}

// Shared mapper for RSS items (works for both direct RSS and Google News RSS)
function mapRssItem(
  item: Record<string, unknown>,
  source: SourceKey,
): NewsItemRaw {
  const rawUrl = String(item.link ?? '')
  // Google News wraps links through a redirect; extract the real URL from title or use as-is
  const headline = cleanHeadline(String(item.title ?? ''))
  const summary = stripHtml(
    String(item.contentSnippet ?? item.content ?? ''),
  ).slice(0, 280)

  return {
    id: String(item.guid ?? item.link ?? `${source}-${Date.now()}`),
    source,
    headline,
    summary,
    category: extractCategory(item, rawUrl),
    url: rawUrl,
    timestamp: item.isoDate
      ? new Date(String(item.isoDate)).getTime()
      : item.pubDate
        ? new Date(String(item.pubDate)).getTime()
        : Date.now(),
  }
}

// Clean Google News "[source]" suffix from headlines
function cleanHeadline(title: string): string {
  return title.replace(/\s*[-–]\s*\w+(\.\w+)*\s*$/, '').trim()
}

// Strip HTML tags from content
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

const RSS_SOURCES: Record<SourceKey, RssSourceConfig> = {
  Kompas: {
    urls: [
      'https://news.google.com/rss/search?q=site:kompas.com&hl=id&gl=ID&ceid=ID:id',
    ],
    mapItem: mapRssItem,
  },
  Detik: {
    urls: [
      'https://news.google.com/rss/search?q=site:detik.com&hl=id&gl=ID&ceid=ID:id',
    ],
    mapItem: mapRssItem,
  },
  Liputan6: {
    urls: [
      'https://news.google.com/rss/search?q=site:liputan6.com&hl=id&gl=ID&ceid=ID:id',
    ],
    mapItem: mapRssItem,
  },
  CNNIndonesia: {
    urls: [
      'https://www.cnnindonesia.com/nasional/rss',
      'https://news.google.com/rss/search?q=site:cnnindonesia.com&hl=id&gl=ID&ceid=ID:id',
    ],
    mapItem: mapRssItem,
  },
  Kumparan: {
    urls: [
      'https://news.google.com/rss/search?q=site:kumparan.com&hl=id&gl=ID&ceid=ID:id',
    ],
    mapItem: mapRssItem,
  },
}

function extractCategory(item: Record<string, unknown>, url: string): string {
  // Try RSS categories field first
  const categories = item.categories
  if (Array.isArray(categories) && categories.length > 0) {
    return String(categories[0])
  }
  if (typeof categories === 'string' && categories) {
    return categories
  }
  // Extract category from URL path
  const urlMatch = url.match(/\.com\/([^/]+)/)
  if (urlMatch?.[1]) {
    return urlMatch[1]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return 'Umum'
}

async function fetchSource(
  source: SourceKey,
  config: RssSourceConfig,
): Promise<NewsItemRaw[]> {
  const allItems: NewsItemRaw[] = []

  for (const url of config.urls) {
    try {
      const feed = await parser.parseURL(url)
      const items = (feed.items ?? [])
        .slice(0, 15)
        .map((item) =>
          config.mapItem(item as unknown as Record<string, unknown>, source),
        )
        .filter((item) => item.headline && item.url)
      allItems.push(...items)
      // If we got enough items from the first URL, no need to try fallbacks
      if (allItems.length >= 5) break
    } catch (error) {
      console.error(`[RSS] Failed to fetch ${source} from ${url}:`, error)
    }
  }

  // Deduplicate by headline
  const seen = new Set<string>()
  return allItems.filter((item) => {
    const key = item.headline.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedSource = searchParams.get('source') as SourceKey | null

  let sourcesToFetch: SourceKey[] = Object.keys(RSS_SOURCES) as SourceKey[]
  if (requestedSource && RSS_SOURCES[requestedSource]) {
    sourcesToFetch = [requestedSource]
  }

  const results = await Promise.all(
    sourcesToFetch.map((source) => fetchSource(source, RSS_SOURCES[source])),
  )

  const allNews = results.flat().sort((a, b) => b.timestamp - a.timestamp)

  return NextResponse.json(
    {
      items: allNews,
      fetchedAt: Date.now(),
      sources: sourcesToFetch,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    },
  )
}