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
  type: 'metric' | 'alert' | 'compliance'
  clientId: string
  data: SecurityMetric | SecurityAlert | any
  timestamp: number
}

export interface ConnectionState {
  isConnected: boolean
  isReconnecting: boolean
  lastConnectedAt?: number
  error?: string
}
