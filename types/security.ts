// Data types for real-time news monitoring
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