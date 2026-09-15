import type { CurrencyAmounts } from "@/lib/currency"

export interface TopClientRow {
  id: string
  client_name: string
  revenue: CurrencyAmounts
  healthScore: number
}

export interface ProjectProfitabilityRow {
  id: string
  project_name: string
  client_name: string | null
  revenue: CurrencyAmounts
  expenses: CurrencyAmounts
  profit: CurrencyAmounts
  /** null when revenue is 0, or more than one currency is in play for this
   * project, to avoid a meaningless divide-by-zero or blended percentage. */
  marginPct: number | null
}

export interface ForecastPoint {
  label: string
  revenue: CurrencyAmounts | null
  forecastRevenue: CurrencyAmounts | null
}

export interface BusinessInsights {
  burnRateMonthly: CurrencyAmounts
  /** null when no clients were active last month, to avoid a misleading 0%. */
  retentionRatePct: number | null
}
