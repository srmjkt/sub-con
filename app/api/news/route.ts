import { NextResponse } from 'next/server'
import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
})

type SourceKey = 'Kompas' | 'Detik' | 'Liputan6' | 'CNNIndonesia' | 'Kumparan'

interface NewsItemRaw {
  id: string
  source: SourceKey
  headline: string
  summary: string
  category: string
  url: string
  timestamp: number
}

// Track the latest timestamp we've seen per source, so we only emit genuinely new articles
const lastEmittedTimestamps: Record<string, number> = {}

function mapRssItem(
  item: Record<string, unknown>,
  source: SourceKey,
): NewsItemRaw {
  const rawUrl = String(item.link ?? '')
  const headline = cleanHeadline(String(item.title ?? ''))
  const summary = stripHtml(
    String(item.contentSnippet ?? item.content ?? ''),
  ).slice(0, 280)
  const timestamp = item.isoDate
    ? new Date(String(item.isoDate)).getTime()
    : item.pubDate
      ? new Date(String(item.pubDate)).getTime()
      : Date.now()

  return {
    id: String(item.guid ?? item.link ?? `${source}-${timestamp}`),
    source,
    headline,
    summary,
    category: extractCategory(item, rawUrl),
    url: rawUrl,
    timestamp,
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
    'https://news.google.com/rss/search?q=site:kompas.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Detik: [
    'https://news.google.com/rss/search?q=site:detik.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Liputan6: [
    'https://news.google.com/rss/search?q=site:liputan6.com&hl=id&gl=ID&ceid=ID:id',
  ],
  CNNIndonesia: [
    'https://www.cnnindonesia.com/nasional/rss',
    'https://news.google.com/rss/search?q=site:cnnindonesia.com&hl=id&gl=ID&ceid=ID:id',
  ],
  Kumparan: [
    'https://news.google.com/rss/search?q=site:kumparan.com&hl=id&gl=ID&ceid=ID:id',
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
        .slice(0, 20)
        .map((item) => mapRssItem(item as unknown as Record<string, unknown>, source))
        .filter((item) => item.headline && item.url)
      allItems.push(...items)
      if (allItems.length >= 5) break
    } catch (error) {
      console.error(`[RSS] ${source} fetch error:`, error)
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

  const sourcesToFetch: SourceKey[] = requestedSource
    ? [requestedSource]
    : (Object.keys(RSS_URLS) as SourceKey[])

  const results = await Promise.all(
    sourcesToFetch.map(fetchSource),
  )

  // Flatten, sort newest-first
  let allNews = results
    .flat()
    .sort((a, b) => b.timestamp - a.timestamp)

  // Only return items that are genuinely newer than what we've seen before
  const newItems = allNews.filter((item) => {
    const lastTs = lastEmittedTimestamps[item.source] ?? 0
    return item.timestamp > lastTs
  })

  // Mark the latest timestamp per source
  for (const item of newItems) {
    const current = lastEmittedTimestamps[item.source] ?? 0
    if (item.timestamp > current) {
      lastEmittedTimestamps[item.source] = item.timestamp
    }
  }

  const now = Date.now()

  return NextResponse.json(
    {
      items: newItems,
      fetchedAt: now,
      sourceTimestamps: { ...lastEmittedTimestamps },
    },
    {
      headers: {
        // NO caching — every request fetches fresh data
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    },
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0