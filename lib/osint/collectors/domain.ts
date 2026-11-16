// Domain / IP passive intelligence collector
// Uses public DNS-over-HTTP (Google) and basic WHOIS-ish lookups via public APIs.
// No authentication, no zone transfers, no brute-forcing — purely public resolution.

import type { OsintFindingInput, OsintIndicatorInput } from '../types'

function severityFromIndicator(type: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (type) {
    case 'MALICIOUS_DOMAIN': return 'HIGH'
    case 'EXPOSED_INFRA': return 'MEDIUM'
    default: return 'LOW'
  }
}

async function dnsResolve(domain: string, recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT'): Promise<string[]> {
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${recordType}`
    const res = await fetch(url, { headers: { Accept: 'application/dns-json' } })
    if (!res.ok) return []
    const json = await res.json()
    if (json.Status !== 0 || !json.Answer) return []
    return json.Answer.filter((a: any) => a.Type === (recordType === 'A' ? 1 : recordType === 'AAAA' ? 28 : recordType === 'CNAME' ? 5 : recordType === 'MX' ? 15 : 16))
      .map((a: any) => a.data)
  } catch {
    return []
  }
}

async function fetchJson(url: string): Promise<any> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'sub-con-osint/1.0' } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function collectDomain(domain: string): Promise<OsintFindingInput[]> {
  const findings: OsintFindingInput[] = []
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]

  const indicators: OsintIndicatorInput[] = [{ type: 'DOMAIN', value: cleanDomain, context: 'queried domain' }]

  // DNS resolution
  const aRecords = await dnsResolve(cleanDomain, 'A')
  const aaaaRecords = await dnsResolve(cleanDomain, 'AAAA')
  const mxRecords = await dnsResolve(cleanDomain, 'MX')
  const txtRecords = await dnsResolve(cleanDomain, 'TXT')

  for (const ip of aRecords) indicators.push({ type: 'IP_ADDRESS', value: ip, context: 'DNS A record' })
  for (const ip of aaaaRecords) indicators.push({ type: 'IP_ADDRESS', value: ip, context: 'DNS AAAA record' })
  for (const mx of mxRecords) indicators.push({ type: 'OTHER', value: mx, context: 'DNS MX record' })

  // Public HTTP header probe (passive — just checks if the site responds)
  let httpStatus: number | null = null
  let serverHeader: string | null = null
  try {
    const res = await fetch(`http://${cleanDomain}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(8000) })
    httpStatus = res.status
    serverHeader = res.headers.get('server') || null
  } catch {
    try {
      const res = await fetch(`https://${cleanDomain}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(8000) })
      httpStatus = res.status
      serverHeader = res.headers.get('server') || null
    } catch { /* ignore */ }
  }

  if (httpStatus) indicators.push({ type: 'OTHER', value: `HTTP ${httpStatus}`, context: 'passive header probe' })
  if (serverHeader) indicators.push({ type: 'OTHER', value: `Server: ${serverHeader}`, context: 'HTTP response header' })

  const rawData: Record<string, unknown> = {
    domain: cleanDomain,
    dns: { A: aRecords, AAAA: aaaaRecords, MX: mxRecords, TXT: txtRecords },
    httpStatus,
    server: serverHeader,
    probedAt: new Date().toISOString(),
  }

  findings.push({
    title: `Domain Intelligence: ${cleanDomain}`,
    description: `Passive DNS and HTTP header probe for ${cleanDomain}`,
    url: `https://${cleanDomain}`,
    severity: 'LOW',
    confidence: 0.6,
    category: 'EXPOSED_INFRA',
    tags: ['dns', 'domain', 'passive-recon'],
    sourceType: 'dns',
    rawData,
    indicators,
  })

  return findings
}

export async function collectIpAddress(ip: string): Promise<OsintFindingInput[]> {
  const findings: OsintFindingInput[] = []
  const indicators: OsintIndicatorInput[] = [{ type: 'IP_ADDRESS', value: ip, context: 'queried IP' }]

  // Try ipinfo.io public endpoint (no key needed, rate limited)
  const info: any = await fetchJson(`https://ipinfo.io/${ip}/json`)
  const rawData: Record<string, unknown> = { ip, probedAt: new Date().toISOString() }
  if (info) {
    rawData.info = info
    if (info.hostname) indicators.push({ type: 'DOMAIN', value: info.hostname, context: 'reverse DNS' })
    if (info.org) indicators.push({ type: 'OTHER', value: info.org, context: 'ISP/ASN' })
    if (info.city) indicators.push({ type: 'OTHER', value: info.city, context: 'city' })
    if (info.region) indicators.push({ type: 'OTHER', value: info.region, context: 'region' })
    if (info.country) indicators.push({ type: 'OTHER', value: info.country, context: 'country' })
  }

  findings.push({
    title: `IP Intelligence: ${ip}`,
    description: `Passive IP lookup for ${ip}`,
    url: `https://ipinfo.io/${ip}`,
    severity: 'LOW',
    confidence: 0.5,
    category: 'EXPOSED_INFRA',
    tags: ['ip', 'passive-recon'],
    sourceType: 'dns',
    rawData,
    indicators,
  })

  return findings
}