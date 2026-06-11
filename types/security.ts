// Security-related data types for real-time monitoring
export interface SecurityMetric {
  id: string
  name: string
  value: number
  unit: string
  status: 'healthy' | 'warning' | 'critical'
  timestamp: number
  trend?: 'up' | 'down' | 'stable'
}

export interface SecurityAlert {
  id: string
  type: 'vulnerability' | 'threat' | 'compliance' | 'performance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  resolved?: boolean
  clientId: string
}

export interface NewsItem {
  id: string
  source: 'Kompas' | 'Detik' | 'Liputan6' | 'CNNIndonesia' | 'Kumparan'
  headline: string
  summary: string
  category: string
  status: 'healthy' | 'warning' | 'critical'
  timestamp: number
  url: string
}

export interface ClientSecurityData {
  clientId: string
  clientName: string
  metrics: SecurityMetric[]
  alerts: SecurityAlert[]
  lastUpdated: number
  overallRiskScore: number
  complianceStatus: 'compliant' | 'non-compliant' | 'partial'
}

export interface RealtimeUpdate {
  type: 'metric' | 'alert' | 'compliance' | 'news'
  clientId: string
  data: SecurityMetric | SecurityAlert | NewsItem
  timestamp: number
}

export interface ConnectionState {
  isConnected: boolean
  isReconnecting: boolean
  lastConnectedAt?: number
  error?: string
}
