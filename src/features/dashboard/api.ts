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
import type {
  DashboardStats,
  RecentActivityRow,
  RecentTaskRow,
  TrendPoint,
} from "./types"

interface TaskWithProject {
  id: string
  task_name: string
  date: string
  duration_minutes: number
  billable: boolean
  created_at: string
  projects: { project_name: string; hourly_rate: number | null } | null
  clients: { client_name: string } | null
}

async function getYearTasks(): Promise<TaskWithProject[]> {
  const yearStart = startOfYear(new Date())
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, task_name, date, duration_minutes, billable, created_at, projects(project_name, hourly_rate), clients(client_name)",
    )
    .gte("date", format(yearStart, "yyyy-MM-dd"))
    .order("date", { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as TaskWithProject[]
}

function revenueFor(task: TaskWithProject) {
  if (!task.billable) return 0
  const rate = task.projects?.hourly_rate ?? 0
  return (task.duration_minutes / 60) * rate
}

function sumWithin(tasks: TaskWithProject[], from: Date) {
  const now = new Date()
  const filtered = tasks.filter((t) => isWithinInterval(new Date(t.date), { start: from, end: now }))
  const hours = filtered.reduce((acc, t) => acc + t.duration_minutes / 60, 0)
  const revenue = filtered.reduce((acc, t) => acc + revenueFor(t), 0)
  return { hours, revenue }
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
    const hours = monthTasks.reduce((acc, t) => acc + t.duration_minutes / 60, 0)
    const revenue = monthTasks.reduce((acc, t) => acc + revenueFor(t), 0)
    months.push({ label, hours: Math.round(hours * 10) / 10, revenue: Math.round(revenue) })
  }

  return months
}

export async function getRecentTasks(limit = 5): Promise<RecentTaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, task_name, date, duration_minutes, billable, projects(project_name), clients(client_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  const taskRows = (data ?? []) as unknown as TaskWithProject[]
  return taskRows.map((t) => ({
    id: t.id,
    task_name: t.task_name,
    date: t.date,
    duration_minutes: t.duration_minutes,
    billable: t.billable,
    project_name: t.projects?.project_name ?? null,
    client_name: t.clients?.client_name ?? null,
  }))
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
