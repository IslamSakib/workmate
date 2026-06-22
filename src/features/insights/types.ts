export interface TopClientRow {
  id: string
  client_name: string
  revenue: number
  healthScore: number
}

export interface ProjectProfitabilityRow {
  id: string
  project_name: string
  client_name: string | null
  revenue: number
  expenses: number
  profit: number
  /** null when revenue is 0, to avoid a meaningless divide-by-zero percentage. */
  marginPct: number | null
}

export interface ForecastPoint {
  label: string
  revenue: number | null
  forecastRevenue: number | null
}

export interface BusinessInsights {
  burnRateMonthly: number
  /** null when no clients were active last month, to avoid a misleading 0%. */
  retentionRatePct: number | null
}
