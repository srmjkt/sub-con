// OSINT service — orchestrates collectors, persists findings to Prisma,
// runs classification, and provides stats for the dashboard.

import { prisma } from '@/lib/prisma'
import {
  collectGithubOrg,
  collectGithubRepo,
} from './collectors/github'
import { collectRssFeed } from './collectors/rss'
import { collectDomain, collectIpAddress } from './collectors/domain'
import type {
  OsintFindingInput,
  OsintCollectionResult,
  OsintStats,
  OsintSourceSummary,
} from './types'

function mapSeverity(s: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (s) {
    case 'LOW': return 'LOW'
    case 'MEDIUM': return 'MEDIUM'
    case 'HIGH': return 'HIGH'
    case 'CRITICAL': return 'CRITICAL'
    default: return 'LOW'
  }
}

function mapCategory(c: string): 'EXPOSED_SECRET' | 'EXPOSED_INFRA' | 'DATA_LEAK' | 'VULNERABILITY' | 'MALICIOUS_DOMAIN' | 'SUSPICIOUS_ACTIVITY' | 'GENERAL' {
  switch (c) {
    case 'EXPOSED_SECRET': return 'EXPOSED_SECRET'
    case 'EXPOSED_INFRA': return 'EXPOSED_INFRA'
    case 'DATA_LEAK': return 'DATA_LEAK'
    case 'VULNERABILITY': return 'VULNERABILITY'
    case 'MALICIOUS_DOMAIN': return 'MALICIOUS_DOMAIN'
    case 'SUSPICIOUS_ACTIVITY': return 'SUSPICIOUS_ACTIVITY'
    default: return 'GENERAL'
  }
}

export async function runCollection(sourceId: string): Promise<OsintCollectionResult> {
  const source = await prisma.osintSource.findUnique({ where: { id: sourceId } })
  if (!source || !source.isEnabled) {
    throw new Error('Source not found or disabled')
  }

  const collection = await prisma.osintCollection.create({
    data: {
      sourceId,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  let itemsFetched = 0
  let itemsNew = 0
  let error: string | null = null
  const findings: OsintFindingInput[] = []

  try {
    switch (source.type) {
      case 'GITHUB_ORG':
        findings.push(...(await collectGithubOrg(source.target)))
        break
      case 'GITHUB_REPO': {
        const [owner, repo] = source.target.split('/')
        if (!owner || !repo) throw new Error('Invalid repo target format: owner/repo')
        findings.push(...(await collectGithubRepo(owner, repo)))
        break
      }
      case 'RSS_FEED':
        findings.push(...(await collectRssFeed(source.target, source.name)))
        break
      case 'DOMAIN':
        findings.push(...(await collectDomain(source.target)))
        break
      case 'IP_ADDRESS':
        findings.push(...(await collectIpAddress(source.target)))
        break
      case 'USERNAME':
        break
      default:
        throw new Error(`Unsupported source type: ${source.type}`)
    }

    itemsFetched = findings.length

    for (const f of findings) {
      const existing = await prisma.osintFinding.findFirst({
        where: {
          collectionId: collection.id,
          title: f.title,
          url: f.url || undefined,
        },
      })
      if (existing) continue

      await prisma.osintFinding.create({
        data: {
          collectionId: collection.id,
          title: f.title,
          description: f.description || null,
          url: f.url || null,
          severity: mapSeverity(f.severity || 'LOW'),
          confidence: Math.min(Math.max(Number(f.confidence || 0.5), 0), 1),
          category: mapCategory(f.category),
          tags: f.tags ? { set: f.tags } : undefined,
          sourceType: f.sourceType,
          rawData: f.rawData ? (f.rawData as any) : undefined,
          location: f.location ? (f.location as any) : undefined,
        },
      })
      itemsNew++
    }

    await prisma.osintSource.update({
      where: { id: sourceId },
      data: { lastCollectedAt: new Date() },
    })
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  } finally {
    await prisma.osintCollection.update({
      where: { id: collection.id },
      data: {
        status: error ? 'FAILED' : 'COMPLETED',
        completedAt: new Date(),
        itemsFetched,
        itemsNew,
        error,
      },
    })
  }

  return {
    sourceId,
    status: error ? 'FAILED' : 'COMPLETED',
    itemsFetched,
    itemsNew,
    error: error || undefined,
    findings,
  }
}

export async function runAllCollections(): Promise<OsintCollectionResult[]> {
  const sources = await prisma.osintSource.findMany({ where: { isEnabled: true } })
  const results: OsintCollectionResult[] = []
  for (const source of sources) {
    try {
      results.push(await runCollection(source.id))
    } catch (err) {
      results.push({
        sourceId: source.id,
        status: 'FAILED',
        itemsFetched: 0,
        itemsNew: 0,
        error: err instanceof Error ? err.message : String(err),
        findings: [],
      })
    }
  }
  return results
}

export async function getStats(): Promise<OsintStats> {
  const [
    totalSources,
    enabledSources,
    totalCollections,
    totalFindings,
    findingsBySeverityRows,
    findingsByCategoryRows,
    recentFindings,
  ] = await Promise.all([
    prisma.osintSource.count(),
    prisma.osintSource.count({ where: { isEnabled: true } }),
    prisma.osintCollection.count(),
    prisma.osintFinding.count(),
    prisma.osintFinding.groupBy({
      by: ['severity'],
      _count: { severity: true },
    }),
    prisma.osintFinding.groupBy({
      by: ['category'],
      _count: { category: true },
    }),
    prisma.osintFinding.findMany({
      take: 10,
      orderBy: { collectedAt: 'desc' },
      include: {
        indicators: true,
        collection: { include: { source: true } },
      },
    }),
  ])

  const findingsBySeverity: Record<string, number> = {}
  for (const row of findingsBySeverityRows) {
    findingsBySeverity[row.severity] = row._count.severity
  }

  const findingsByCategory: Record<string, number> = {}
  for (const row of findingsByCategoryRows) {
    findingsByCategory[row.category] = row._count.category
  }

  return {
    totalSources,
    enabledSources,
    totalCollections,
    totalFindings,
    findingsBySeverity,
    findingsByCategory,
    recentFindings: recentFindings.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description || '',
      url: f.url || '',
      severity: f.severity as 'LOW',
      confidence: f.confidence,
      category: f.category as 'GENERAL',
      tags: (f.tags as string[] | null) || [],
      sourceType: f.sourceType,
      rawData: f.rawData as Record<string, unknown> | undefined,
      location: f.location as Record<string, unknown> | undefined,
      indicators: f.indicators.map((i) => ({
        type: i.type as 'OTHER',
        value: i.value,
        context: i.context || undefined,
      })),
    })),
  }
}

export async function getSources(): Promise<OsintSourceSummary[]> {
  const sources = await prisma.osintSource.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { collections: true } },
    },
  })

  // Count findings per source
  const findingCounts = await prisma.osintFinding.groupBy({
    by: ['collectionId'],
    _count: { id: true },
  })
  const collectionToSource = await prisma.osintCollection.findMany({
    select: { id: true, sourceId: true },
  })
  const collectionMap = new Map(collectionToSource.map((c) => [c.id, c.sourceId]))
  const sourceFindingCounts = new Map<string, number>()
  for (const fc of findingCounts) {
    const sourceId = collectionMap.get(fc.collectionId)
    if (sourceId) {
      sourceFindingCounts.set(sourceId, (sourceFindingCounts.get(sourceId) || 0) + fc._count.id)
    }
  }

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type as OsintSourceSummary['type'],
    target: s.target,
    isEnabled: s.isEnabled,
    lastCollectedAt: s.lastCollectedAt || null,
    totalCollections: s._count.collections,
    totalFindings: sourceFindingCounts.get(s.id) || 0,
  }))
}

export async function getFindings({
  page = 1,
  limit = 20,
  severity,
  category,
  sourceType,
  search,
}: {
  page?: number
  limit?: number
  severity?: string
  category?: string
  sourceType?: string
  search?: string
}) {
  const where: Record<string, unknown> = {}
  if (severity) where.severity = severity
  if (category) where.category = category
  if (sourceType) where.sourceType = sourceType
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { contains: search } },
    ]
  }

  const [findings, total] = await Promise.all([
    prisma.osintFinding.findMany({
      where,
      include: {
        indicators: true,
        collection: { include: { source: true } },
      },
      orderBy: { collectedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.osintFinding.count({ where }),
  ])

  return { findings, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function createSource(data: {
  name: string
  type: string
  target: string
  isEnabled?: boolean
  apiKey?: string
}) {
  return prisma.osintSource.create({
    data: {
      name: data.name,
      type: data.type as any,
      target: data.target,
      isEnabled: data.isEnabled ?? true,
      apiKey: data.apiKey || null,
    },
  })
}

export async function toggleSource(id: string, isEnabled: boolean) {
  return prisma.osintSource.update({ where: { id }, data: { isEnabled } })
}

export async function deleteSource(id: string) {
  return prisma.osintSource.delete({ where: { id } })
}

export async function resolveAlert(alertId: string, userId: string) {
  return prisma.osintAlert.update({
    where: { id: alertId },
    data: { isResolved: true, resolvedAt: new Date(), resolvedById: userId },
  })
}

export async function createAlert(findingId: string) {
  const existing = await prisma.osintAlert.findFirst({ where: { findingId } })
  if (existing) return existing
  return prisma.osintAlert.create({ data: { findingId } })
}

export async function getUnresolvedAlerts() {
  return prisma.osintAlert.findMany({
    where: { isResolved: false },
    include: {
      finding: { include: { indicators: true, collection: { include: { source: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
}