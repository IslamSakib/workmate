export interface DashboardStats {
  hoursToday: number
  hoursWeek: number
  hoursMonth: number
  hoursYear: number
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  revenueYear: number
  activeProjects: number
  totalClients: number
  totalTasks: number
  /** Billable hours / total hours logged this month, 0-100. */
  utilizationRate: number
}

export interface OutstandingInvoices {
  total: number
  count: number
}

export interface UpcomingDeadline {
  id: string
  invoice_number: string
  due_date: string
  total: number
  status: string
  client_name: string | null
  overdue: boolean
}

export interface GrowthDeltas {
  /** % change in revenue, latest tracked month vs the prior month. */
  monthRevenueGrowthPct: number | null
  /** % change in revenue, latest tracked month vs ~11 months prior (approximates YoY using the rolling 12-month trend window). */
  yearRevenueGrowthPct: number | null
}

export interface RetainerUsageRow {
  id: string
  client_name: string
  used_hours: number
  included_hours: number
  overage_amount: number
}

export interface RetainerMetrics {
  activeRetainerCount: number
  totalMonthlyFee: number
  totalOverageRevenue: number
  usage: RetainerUsageRow[]
}

export interface TrendPoint {
  label: string
  hours: number
  revenue: number
  expenses?: number
  profit?: number
}

export interface ProfitMetrics {
  expensesMonth: number
  expensesYear: number
  profitMonth: number
  profitYear: number
  /** null when revenueMonth is 0, to avoid a meaningless divide-by-zero percentage. */
  profitMarginMonth: number | null
}

export interface RecentTaskRow {
  id: string
  task_name: string
  date: string
  duration_seconds: number
  billable: boolean
  project_name: string | null
  client_name: string | null
}

export interface RecentActivityRow {
  id: string
  type: "task" | "invoice" | "client" | "project"
  description: string
  created_at: string
}
