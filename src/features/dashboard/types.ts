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
}

export interface TrendPoint {
  label: string
  hours: number
  revenue: number
}

export interface RecentTaskRow {
  id: string
  task_name: string
  date: string
  duration_minutes: number
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
