// RSS news collector — mirrors existing /api/news pattern but persists findings to OSINT tables.

import Parser from 'rss-parser'
import { classifySecurityRelevance } from '@/lib/securityClassifier'
import { extractLocation } from '@/lib/locationExtractor'
import type { OsintFindingInput, OsintIndicatorInput, OsintSeverity, OsintCategory } from '../types'

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
})

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function severityFromCategory(category: OsintCategory): OsintSeverity {
  switch (category) {
    case 'EXPOSED_SECRET': return 'CRITICAL'
    case 'DATA_LEAK': return 'HIGH'
    case 'EXPOSED_INFRA': return 'MEDIUM'
    case 'VULNERABILITY': return 'MEDIUM'
    case 'MALICIOUS_DOMAIN': return 'HIGH'
    case 'SUSPICIOUS_ACTIVITY': return 'MEDIUM'
    default: return 'LOW'
  }
}

export async function collectRssFeed(feedUrl: string, sourceName: string): Promise<OsintFindingInput[]> {
  const findings: OsintFindingInput[] = []
  let feed: any
  try {
    feed = await parser.parseURL(feedUrl)
  } catch (err) {
    throw new Error(`RSS parse failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  const items = feed.items || []
  for (const item of items) {
    const headline = String(item.title ?? '').trim()
    const summary = stripHtml(String(item.contentSnippet ?? item.content ?? '')).slice(0, 500)
    const url = String(item.link ?? '')
    const timestamp = item.isoDate ? new Date(String(item.isoDate)).getTime() : Date.now()

    if (!headline && !summary) continue

    const classification = classifySecurityRelevance(headline, summary)
    const location = extractLocation(headline, summary)

    // Map security category to OSINT category
    let category: OsintCategory = 'GENERAL'
    const cat = classification.category
    if (cat === 'cyber_security') category = 'VULNERABILITY'
    else if (/leak|breach|dumps?/i.test(`${headline} ${summary}`)) category = 'DATA_LEAK'
    else if (cat === 'corporate_security') category = 'EXPOSED_INFRA'
    else if (cat === 'crime_terrorism') category = 'SUSPICIOUS_ACTIVITY'
    else if (cat === 'disaster_emergency') category = 'SUSPICIOUS_ACTIVITY'

    const indicators: OsintIndicatorInput[] = []
    const text = `${headline} ${summary}`
    // URLs found in summary
    const urlRegex = /https?:\/\/[^\s<>"' ]+/g
    for (const m of text.matchAll(urlRegex)) {
      indicators.push({ type: 'DOMAIN', value: m[0], context: 'rss summary' })
    }

    findings.push({
      title: headline,
      description: summary || undefined,
      url: url || undefined,
      severity: classification.isRelevant ? severityFromCategory(category) : 'LOW',
      confidence: classification.confidence,
      category,
      tags: [...classification.tags, `source:${sourceName}`],
      sourceType: 'rss',
      rawData: {
        source: sourceName,
        headline,
        summary,
        pubDate: item.pubDate,
        isoDate: item.isoDate,
        author: item.author,
        categories: item.categories,
      },
      location: location as unknown as Record<string, unknown>,
      indicators,
    })
  }

  return findings
}