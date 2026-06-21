export type ReportPreset = "daily" | "weekly" | "monthly" | "yearly" | "custom"

export interface ReportRow {
  id: string
  date: string
  task_name: string
  project_name: string | null
  client_name: string | null
  duration_seconds: number
  billable: boolean
}

export interface ReportSummary {
  totalSeconds: number
  totalRevenue: number
  projectCount: number
  clientCount: number
}

export interface ReportChartPoint {
  label: string
  hours: number
  revenue: number
}
