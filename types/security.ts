// Data types for real-time news monitoring
export interface SecurityClassification {
  isRelevant: boolean
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  tags: string[]
  reason: string
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
  security?: SecurityClassification
}

export interface RealtimeUpdate {
  type: 'news'
  clientId: string
  data: NewsItem
  timestamp: number
}

export interface ConnectionState {
  isConnected: boolean
  isReconnecting: boolean
  lastConnectedAt?: number
  error?: string
}
