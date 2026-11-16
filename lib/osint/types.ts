// OSINT module types — mirrors Prisma enums for client/server use

export type OsintSourceType =
  | 'GITHUB_ORG'
  | 'GITHUB_REPO'
  | 'RSS_FEED'
  | 'DOMAIN'
  | 'IP_ADDRESS'
  | 'USERNAME'

export type OsintCollectionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export type OsintSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type OsintCategory =
  | 'EXPOSED_SECRET'
  | 'EXPOSED_INFRA'
  | 'DATA_LEAK'
  | 'VULNERABILITY'
  | 'MALICIOUS_DOMAIN'
  | 'SUSPICIOUS_ACTIVITY'
  | 'GENERAL'

export type OsintIndicatorType =
  | 'IP_ADDRESS'
  | 'DOMAIN'
  | 'EMAIL'
  | 'USERNAME'
  | 'API_KEY'
  | 'PASSWORD_HASH'
  | 'BITCOIN_ADDRESS'
  | 'CVE'
  | 'SOCIAL_MEDIA'
  | 'OTHER'

export interface OsintIndicatorInput {
  type: OsintIndicatorType
  value: string
  context?: string
}

export interface OsintFindingInput {
  title: string
  description?: string
  url?: string
  severity?: OsintSeverity
  confidence?: number
  category: OsintCategory
  tags?: string[]
  sourceType: string
  rawData?: Record<string, unknown>
  location?: Record<string, unknown>
  indicators?: OsintIndicatorInput[]
}

export interface OsintCollectionResult {
  sourceId: string
  status: OsintCollectionStatus
  itemsFetched: number
  itemsNew: number
  error?: string
  findings: OsintFindingInput[]
}

export interface OsintStats {
  totalSources: number
  enabledSources: number
  totalCollections: number
  totalFindings: number
  findingsBySeverity: Record<OsintSeverity, number>
  findingsByCategory: Record<OsintCategory, number>
  recentFindings: OsintFindingInput[]
}

export interface OsintSourceSummary {
  id: string
  name: string
  type: OsintSourceType
  target: string
  isEnabled: boolean
  lastCollectedAt: Date | null
  totalCollections: number
  totalFindings: number
}