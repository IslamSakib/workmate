import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  subMonths,
  format,
  isWithinInterval,
} from "date-fns"
import { supabase } from "@/lib/supabaseClient"
import { listRetainers, getRetainerUsage } from "@/features/retainers/api"
import type {
  DashboardStats,
  GrowthDeltas,
  OutstandingInvoices,
  ProfitMetrics,
  RecentActivityRow,
  RecentTaskRow,
  RetainerMetrics,
  TrendPoint,
  UpcomingDeadline,
} from "./types"

export interface TaskWithProject {
  id: string
  task_name: string
  date: string
  duration_seconds: number
  billable: boolean
  created_at: string
  project_id: string | null
  client_id: string | null
  projects: { project_name: string; hourly_rate: number | null } | null
  clients: { client_name: string } | null
}

export async function getYearTasks(): Promise<TaskWithProject[]> {
  const yearStart = startOfYear(new Date())
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, task_name, date, duration_seconds, billable, created_at, project_id, client_id, projects(project_name, hourly_rate), clients(client_name)",
    )
    .gte("date", format(yearStart, "yyyy-MM-dd"))
    .order("date", { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as TaskWithProject[]
}

export function revenueFor(task: TaskWithProject) {
  if (!task.billable) return 0
  const rate = task.projects?.hourly_rate ?? 0
  return (task.duration_seconds / 3600) * rate
}

function sumWithin(tasks: TaskWithProject[], from: Date) {
  const now = new Date()
  const filtered = tasks.filter((t) => isWithinInterval(new Date(t.date), { start: from, end: now }))
  const hours = filtered.reduce((acc, t) => acc + t.duration_seconds / 3600, 0)
  const billableHours = filtered
    .filter((t) => t.billable)
    .reduce((acc, t) => acc + t.duration_seconds / 3600, 0)
  const revenue = filtered.reduce((acc, t) => acc + revenueFor(t), 0)
  return { hours, billableHours, revenue }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const tasks = await getYearTasks()
  const now = new Date()

  const today = sumWithin(tasks, startOfDay(now))
  const week = sumWithin(tasks, startOfWeek(now))
  const month = sumWithin(tasks, startOfMonth(now))
  const year = sumWithin(tasks, startOfYear(now))

  const [{ count: activeProjects }, { count: totalClients }, { count: totalTasks }] =
    await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("tasks").select("id", { count: "exact", head: true }),
    ])

  return {
    hoursToday: today.hours,
    hoursWeek: week.hours,
    hoursMonth: month.hours,
    hoursYear: year.hours,
    revenueToday: today.revenue,
    revenueWeek: week.revenue,
    revenueMonth: month.revenue,
    revenueYear: year.revenue,
    activeProjects: activeProjects ?? 0,
    totalClients: totalClients ?? 0,
    totalTasks: totalTasks ?? 0,
    utilizationRate: month.hours > 0 ? (month.billableHours / month.hours) * 100 : 0,
  }
}

export async function getProfitMetrics(stats: DashboardStats): Promise<ProfitMetrics> {
  const yearStart = startOfYear(new Date())
  const monthStart = startOfMonth(new Date())
  const { data, error } = await supabase
    .from("expenses")
    .select("amount, date")
    .gte("date", format(yearStart, "yyyy-MM-dd"))
  if (error) throw error

  const rows = data ?? []
  const expensesYear = rows.reduce((acc, r) => acc + Number(r.amount), 0)
  const expensesMonth = rows
    .filter((r) => new Date(r.date) >= monthStart)
    .reduce((acc, r) => acc + Number(r.amount), 0)

  const profitMonth = stats.revenueMonth - expensesMonth
  const profitYear = stats.revenueYear - expensesYear

  return {
    expensesMonth,
    expensesYear,
    profitMonth,
    profitYear,
    profitMarginMonth: stats.revenueMonth > 0 ? (profitMonth / stats.revenueMonth) * 100 : null,
  }
}

/**
 * Merges expenses into an already-fetched revenue/hours trend (see
 * getMonthlyTrend) rather than re-deriving it, reusing the same label
 * sequence so the two series stay aligned. Implemented standalone rather
 * than folding into getMonthlyTrend to avoid touching its existing,
 * already-relied-upon revenue/hours logic.
 */
export async function getProfitTrend(revenueTrend: TrendPoint[]): Promise<TrendPoint[]> {
  if (revenueTrend.length === 0) return revenueTrend

  const yearAgo = subMonths(new Date(), revenueTrend.length - 1)
  const { data, error } = await supabase
    .from("expenses")
    .select("amount, date")
    .gte("date", format(startOfMonth(yearAgo), "yyyy-MM-dd"))
  if (error) throw error

  const rows = data ?? []
  const now = new Date()

  return revenueTrend.map((point, i) => {
    const monthDate = subMonths(now, revenueTrend.length - 1 - i)
    const expenses = rows
      .filter(
        (r) =>
          new Date(r.date).getMonth() === monthDate.getMonth() &&
          new Date(r.date).getFullYear() === monthDate.getFullYear(),
      )
      .reduce((acc, r) => acc + Number(r.amount), 0)
    return { ...point, expenses: Math.round(expenses), profit: Math.round(point.revenue - expenses) }
  })
}

export async function getOutstandingInvoices(): Promise<OutstandingInvoices> {
  const { data, error } = await supabase
    .from("invoices")
    .select("total")
    .in("status", ["sent", "overdue"])

  if (error) throw error
  const rows = data ?? []
  return {
    total: rows.reduce((acc, r) => acc + Number(r.total), 0),
    count: rows.length,
  }
}

export async function getUpcomingDeadlines(withinDays = 7): Promise<UpcomingDeadline[]> {
  const today = startOfDay(new Date())
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + withinDays)

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, due_date, total, status, clients(client_name)")
    .not("due_date", "is", null)
    .neq("status", "paid")
    .lte("due_date", format(horizon, "yyyy-MM-dd"))
    .order("due_date", { ascending: true })
    .limit(10)

  if (error) throw error
  const rows = (data ?? []) as unknown as {
    id: string
    invoice_number: string
    due_date: string
    total: number
    status: string
    clients: { client_name: string } | null
  }[]

  return rows.map((r) => ({
    id: r.id,
    invoice_number: r.invoice_number,
    due_date: r.due_date,
    total: Number(r.total),
    status: r.status,
    client_name: r.clients?.client_name ?? null,
    overdue: new Date(r.due_date) < today,
  }))
}

export async function getRetainerMetrics(): Promise<RetainerMetrics> {
  const retainers = await listRetainers()
  const active = retainers.filter((r) => r.active)
  const usage = await getRetainerUsage(active)

  let totalOverageRevenue = 0
  const usageRows = active.map((r) => {
    const u = usage.get(r.id)
    totalOverageRevenue += u?.overage_amount ?? 0
    return {
      id: r.id,
      client_name: r.clients?.client_name ?? "—",
      used_hours: u?.used_hours ?? 0,
      included_hours: r.included_hours,
      overage_amount: u?.overage_amount ?? 0,
    }
  })

  return {
    activeRetainerCount: active.length,
    totalMonthlyFee: active.reduce((acc, r) => acc + r.monthly_fee, 0),
    totalOverageRevenue,
    usage: usageRows,
  }
}

/**
 * Derives growth deltas from an already-fetched 12-month trend (see getMonthlyTrend) rather
 * than re-querying, since callers typically already hold this data for the trend charts.
 * yearRevenueGrowthPct compares the latest month against the oldest point in the rolling
 * 12-month window (~11 months prior) as an approximation of YoY growth.
 */
export function getGrowthDeltas(trend: TrendPoint[]): GrowthDeltas {
  if (trend.length < 2) return { monthRevenueGrowthPct: null, yearRevenueGrowthPct: null }

  const latest = trend[trend.length - 1]
  const previous = trend[trend.length - 2]
  const oldest = trend[0]

  const pctChange = (from: number, to: number) => (from > 0 ? ((to - from) / from) * 100 : null)

  return {
    monthRevenueGrowthPct: pctChange(previous.revenue, latest.revenue),
    yearRevenueGrowthPct: pctChange(oldest.revenue, latest.revenue),
  }
}

export async function getMonthlyTrend(): Promise<TrendPoint[]> {
  const tasks = await getYearTasks()
  const months: TrendPoint[] = []

  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i)
    const label = format(monthDate, "MMM")
    const monthTasks = tasks.filter(
      (t) =>
        new Date(t.date).getMonth() === monthDate.getMonth() &&
        new Date(t.date).getFullYear() === monthDate.getFullYear(),
    )
    const hours = monthTasks.reduce((acc, t) => acc + t.duration_seconds / 3600, 0)
    const revenue = monthTasks.reduce((acc, t) => acc + revenueFor(t), 0)
    months.push({ label, hours: Math.round(hours * 10) / 10, revenue: Math.round(revenue) })
  }

  return months
}

export async function getRecentTasks(limit = 5): Promise<RecentTaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, task_name, date, duration_seconds, billable, projects(project_name), clients(client_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  const taskRows = (data ?? []) as unknown as TaskWithProject[]
  return taskRows.map((t) => ({
    id: t.id,
    task_name: t.task_name,
    date: t.date,
    duration_seconds: t.duration_seconds,
    billable: t.billable,
    project_name: t.projects?.project_name ?? null,
    client_name: t.clients?.client_name ?? null,
  }))
}

export async function getPendingApprovalsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "submitted")
  if (error) throw error
  return count ?? 0
}

export async function getRecentActivity(limit = 8): Promise<RecentActivityRow[]> {
  const [tasksRes, invoicesRes, clientsRes] = await Promise.all([
    supabase.from("tasks").select("id, task_name, created_at").order("created_at", { ascending: false }).limit(limit),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("clients").select("id, client_name, created_at").order("created_at", { ascending: false }).limit(limit),
  ])

  const taskRows = (tasksRes.data ?? []) as { id: string; task_name: string; created_at: string }[]
  const invoiceRows = (invoicesRes.data ?? []) as {
    id: string
    invoice_number: string
    status: string
    created_at: string
  }[]
  const clientRows = (clientsRes.data ?? []) as { id: string; client_name: string; created_at: string }[]

  const activity: RecentActivityRow[] = [
    ...taskRows.map((t) => ({
      id: t.id,
      type: "task" as const,
      description: `Logged task "${t.task_name}"`,
      created_at: t.created_at,
    })),
    ...invoiceRows.map((i) => ({
      id: i.id,
      type: "invoice" as const,
      description: `Invoice ${i.invoice_number} marked ${i.status}`,
      created_at: i.created_at,
    })),
    ...clientRows.map((c) => ({
      id: c.id,
      type: "client" as const,
      description: `Added client ${c.client_name}`,
      created_at: c.created_at,
    })),
  ]

  return activity
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}
