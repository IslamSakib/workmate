import type { BaseTotal, CurrencyAmounts } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"

export interface DashboardStats {
  hoursToday: number
  hoursWeek: number
  hoursMonth: number
  hoursYear: number
  /** Grouped per currency — a freelancer account can mix currencies across projects. */
  revenueToday: CurrencyAmounts
  revenueWeek: CurrencyAmounts
  revenueMonth: CurrencyAmounts
  revenueYear: CurrencyAmounts
  /** Revenue in the default currency, using agreed project rates where set. */
  revenueBase: { today: BaseTotal; week: BaseTotal; month: BaseTotal; year: BaseTotal }
  activeProjects: number
  totalClients: number
  totalTasks: number
  /** Billable hours / total hours logged this month, 0-100. */
  utilizationRate: number
}

export interface OutstandingInvoices {
  /** Balance owed (total minus payments received), per currency. */
  total: CurrencyAmounts
  count: number
  overdueCount: number
}

export interface UpcomingDeadline {
  id: string
  invoice_number: string
  due_date: string
  total: number
  currency: CurrencyCode
  status: string
  client_name: string | null
  overdue: boolean
}

export interface GrowthDeltas {
  /** % change in revenue, latest tracked month vs the prior month. */
  monthRevenueGrowthPct: number | null
}


export interface TrendPoint {
  label: string
  hours: number
  /** Grouped per currency — see DashboardStats. */
  revenue: CurrencyAmounts
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
