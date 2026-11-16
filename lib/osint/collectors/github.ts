// GitHub OSINT collector (passive, public API only — no auth required for basic lookups)
// Gathers public org/repo metadata and scans repo descriptions/READMEs for exposed secrets/infra hints.

import { classifySecurityRelevance } from '@/lib/securityClassifier'
import { extractLocation } from '@/lib/locationExtractor'
import type { OsintFindingInput, OsintIndicatorInput, OsintSeverity, OsintCategory } from '../types'

const GITHUB_API = 'https://api.github.com'

function ghHeaders() {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'sub-con-osint-collector/1.0',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function ghFetch(path: string): Promise<any> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: ghHeaders() })
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) return null
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  }
  return res.json()
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

function extractIndicators(text: string): OsintIndicatorInput[] {
  const indicators: OsintIndicatorInput[] = []
  const seen = new Set<string>()

  const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
  for (const m of text.matchAll(ipv4Regex)) {
    if (!seen.has(m[0])) { seen.add(m[0]); indicators.push({ type: 'IP_ADDRESS', value: m[0] }) }
  }

  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/g
  for (const m of text.matchAll(domainRegex)) {
    const v = m[0]
    if (!seen.has(v)) { seen.add(v); indicators.push({ type: 'DOMAIN', value: v }) }
  }

  const emailRegex = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/g
  for (const m of text.matchAll(emailRegex)) {
    if (!seen.has(m[0])) { seen.add(m[0]); indicators.push({ type: 'EMAIL', value: m[0] }) }
  }

  const keyRegex = /(?:api[_-]?key|token|secret|password|access[_-]?key)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{16,})['"]?/gi
  for (const m of text.matchAll(keyRegex)) {
    const v = m[1]
    if (!seen.has(v)) { seen.add(v); indicators.push({ type: 'API_KEY', value: v, context: m[0] }) }
  }

  return indicators
}

function classifyFinding(text: string, sourceType: string): { category: OsintCategory; severity: OsintSeverity; confidence: number; tags: string[] } {
  const classification = classifySecurityRelevance(text, '')
  const loc = extractLocation(text, '')

  let category: OsintCategory = 'GENERAL'
  if (classification.category === 'cyber_security' || /api.?key|token|secret|password/.test(text)) category = 'EXPOSED_SECRET'
  else if (classification.category === 'corporate_security') category = 'EXPOSED_INFRA'
  else if (/leak|breach|dump/.test(text)) category = 'DATA_LEAK'
  else if (/cve-\d{4}-\d+/i.test(text)) category = 'VULNERABILITY'

  const severity = severityFromCategory(category)
  const tags = [...classification.tags]
  if (loc.province) tags.push(`location:${loc.province}`)
  if (loc.city) tags.push(`location:${loc.city}`)

  return { category, severity, confidence: classification.confidence, tags }
}

export async function collectGithubOrg(org: string): Promise<OsintFindingInput[]> {
  const findings: OsintFindingInput[] = []

  const orgData = await ghFetch(`/orgs/${encodeURIComponent(org)}`)
  if (!orgData) return findings

  const orgText = `${orgData.name || ''} ${orgData.description || ''} ${orgData.blog || ''} ${orgData.location || ''}`
  const orgClass = classifyFinding(orgText, 'github')
  const orgIndicators = extractIndicators(orgText)
  if (orgData.blog) orgIndicators.push({ type: 'DOMAIN', value: orgData.blog.replace(/^https?:\/\//, '').replace(/\/$/, ''), context: 'org blog' })
  if (orgData.location) orgIndicators.push({ type: 'OTHER', value: orgData.location, context: 'org location' })

  findings.push({
    title: `GitHub Organization: ${orgData.login}`,
    description: orgData.description || null,
    url: orgData.html_url,
    severity: orgClass.severity,
    confidence: orgClass.confidence,
    category: orgClass.category,
    tags: orgClass.tags,
    sourceType: 'github',
    rawData: {
      login: orgData.login,
      name: orgData.name,
      description: orgData.description,
      public_repos: orgData.public_repos,
      followers: orgData.followers,
      location: orgData.location,
      blog: orgData.blog,
      created_at: orgData.created_at,
      updated_at: orgData.updated_at,
    },
    location: orgData.location ? { province: null, city: orgData.location, district: null, village: null, rw: null, rt: null } : undefined,
    indicators: orgIndicators,
  })

  const repos = await ghFetch(`/orgs/${encodeURIComponent(org)}/repos?per_page=100&type=public&sort=updated`)
  if (!Array.isArray(repos)) return findings

  for (const repo of repos) {
    const repoText = `${repo.name} ${repo.description || ''} ${repo.homepage || ''} ${repo.language || ''} ${repo.topics?.join(' ') || ''}`
    const repoClass = classifyFinding(repoText, 'github')
    const repoIndicators = extractIndicators(repoText)
    if (repo.homepage) repoIndicators.push({ type: 'DOMAIN', value: repo.homepage.replace(/^https?:\/\//, '').replace(/\/$/, ''), context: 'repo homepage' })
    if (repo.language) repoIndicators.push({ type: 'OTHER', value: repo.language, context: 'repo language' })

    if (repoClass.severity !== 'LOW' || repoIndicators.length > 0 || repo.private === false) {
      findings.push({
        title: `GitHub Repo: ${org}/${repo.name}`,
        description: repo.description || null,
        url: repo.html_url,
        severity: repoClass.severity,
        confidence: repoClass.confidence,
        category: repoClass.category,
        tags: [...repoClass.tags, `language:${repo.language}`, `stars:${repo.stargazers_count}`, `forks:${repo.forks_count}`],
        sourceType: 'github',
        rawData: {
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          open_issues: repo.open_issues_count,
          private: repo.private,
          html_url: repo.html_url,
          clone_url: repo.clone_url,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          pushed_at: repo.pushed_at,
          topics: repo.topics,
          homepage: repo.homepage,
        },
        location: repo.homepage ? { province: null, city: null, district: null, village: null, rw: null, rt: null, other: repo.homepage } : undefined,
        indicators: repoIndicators,
      })
    }
  }

  return findings
}

export async function collectGithubRepo(owner: string, repo: string): Promise<OsintFindingInput[]> {
  const findings: OsintFindingInput[] = []
  const repoData = await ghFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
  if (!repoData) return findings

  const repoText = `${repoData.name} ${repoData.description || ''} ${repoData.homepage || ''} ${repoData.language || ''}`
  const repoClass = classifyFinding(repoText, 'github')
  const indicators = extractIndicators(repoText)
  if (repoData.homepage) indicators.push({ type: 'DOMAIN', value: repoData.homepage.replace(/^https?:\/\//, '').replace(/\/$/, ''), context: 'repo homepage' })

  findings.push({
    title: `GitHub Repo: ${owner}/${repo}`,
    description: repoData.description || null,
    url: repoData.html_url,
    severity: repoClass.severity,
    confidence: repoClass.confidence,
    category: repoClass.category,
    tags: [...repoClass.tags, `language:${repoData.language}`, `stars:${repoData.stargazers_count}`],
    sourceType: 'github',
    rawData: {
      name: repoData.name,
      full_name: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      open_issues: repoData.open_issues_count,
      private: repoData.private,
      html_url: repoData.html_url,
      clone_url: repoData.clone_url,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      pushed_at: repoData.pushed_at,
      topics: repoData.topics,
      homepage: repoData.homepage,
    },
    indicators,
  })

  return findings
}