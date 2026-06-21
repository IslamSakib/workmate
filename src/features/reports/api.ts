import { differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval, format } from "date-fns"
import { supabase } from "@/lib/supabaseClient"
import type { ReportChartPoint, ReportRow, ReportSummary } from "./types"

interface RawTaskRow {
  id: string
  task_name: string
  date: string
  duration_minutes: number
  billable: boolean
  project_id: string | null
  client_id: string | null
  projects: { project_name: string; hourly_rate: number | null } | null
  clients: { client_name: string } | null
}

export async function getReportRows(from: Date, to: Date): Promise<RawTaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, task_name, date, duration_minutes, billable, project_id, client_id, projects(project_name, hourly_rate), clients(client_name)",
    )
    .gte("date", format(from, "yyyy-MM-dd"))
    .lte("date", format(to, "yyyy-MM-dd"))
    .order("date", { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as RawTaskRow[]
}

export function toReportRows(raw: RawTaskRow[]): ReportRow[] {
  return raw.map((t) => ({
    id: t.id,
    date: t.date,
    task_name: t.task_name,
    project_name: t.projects?.project_name ?? null,
    client_name: t.clients?.client_name ?? null,
    duration_minutes: t.duration_minutes,
    billable: t.billable,
  }))
}

export function summarize(raw: RawTaskRow[]): ReportSummary {
  const totalHours = raw.reduce((acc, t) => acc + t.duration_minutes / 60, 0)
  const totalRevenue = raw.reduce(
    (acc, t) => acc + (t.billable ? (t.duration_minutes / 60) * (t.projects?.hourly_rate ?? 0) : 0),
    0,
  )
  const projectCount = new Set(raw.map((t) => t.project_id).filter(Boolean)).size
  const clientCount = new Set(raw.map((t) => t.client_id).filter(Boolean)).size
  return { totalHours, totalRevenue, projectCount, clientCount }
}

export function buildChartSeries(raw: RawTaskRow[], from: Date, to: Date): ReportChartPoint[] {
  const spanDays = differenceInCalendarDays(to, from)

  if (spanDays > 60) {
    const months = eachMonthOfInterval({ start: from, end: to })
    return months.map((month) => {
      const monthKey = format(month, "yyyy-MM")
      const monthTasks = raw.filter((t) => t.date.startsWith(monthKey))
      const hours = monthTasks.reduce((acc, t) => acc + t.duration_minutes / 60, 0)
      const revenue = monthTasks.reduce(
        (acc, t) => acc + (t.billable ? (t.duration_minutes / 60) * (t.projects?.hourly_rate ?? 0) : 0),
        0,
      )
      return { label: format(month, "MMM"), hours: Math.round(hours * 10) / 10, revenue: Math.round(revenue) }
    })
  }

  const days = eachDayOfInterval({ start: from, end: to })
  return days.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd")
    const dayTasks = raw.filter((t) => t.date === dayKey)
    const hours = dayTasks.reduce((acc, t) => acc + t.duration_minutes / 60, 0)
    const revenue = dayTasks.reduce(
      (acc, t) => acc + (t.billable ? (t.duration_minutes / 60) * (t.projects?.hourly_rate ?? 0) : 0),
      0,
    )
    return { label: format(day, "MMM d"), hours: Math.round(hours * 10) / 10, revenue: Math.round(revenue) }
  })
}
