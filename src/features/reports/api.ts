import { differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval, format } from "date-fns"
import { supabase } from "@/lib/supabaseClient"
import { listFixedFeeRevenue } from "@/features/invoices/api"
import { sumByCurrency, addCurrencyAmounts, roundAmounts } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"
import type { FixedFeeRevenueRow } from "@/features/invoices/types"
import type { ReportChartPoint, ReportRow, ReportSummary } from "./types"

interface RawTaskRow {
  id: string
  task_name: string
  date: string
  duration_seconds: number
  billable: boolean
  project_id: string | null
  client_id: string | null
  projects: { project_name: string; hourly_rate: number | null; currency: CurrencyCode } | null
  clients: { client_name: string } | null
}

/** A task bills in its own project's currency — defaults to USD for tasks with no project. */
function currencyFor(t: RawTaskRow): CurrencyCode {
  return t.projects?.currency ?? "USD"
}

function revenueFor(t: RawTaskRow): number {
  return t.billable ? (t.duration_seconds / 3600) * (t.projects?.hourly_rate ?? 0) : 0
}

export async function getReportRows(from: Date, to: Date): Promise<RawTaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, task_name, date, duration_seconds, billable, project_id, client_id, projects(project_name, hourly_rate, currency), clients(client_name)",
    )
    .gte("date", format(from, "yyyy-MM-dd"))
    .lte("date", format(to, "yyyy-MM-dd"))
    .order("date", { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as RawTaskRow[]
}

/**
 * A fixed-price project's tasks always price at $0 (see summarize/
 * buildChartSeries) — its revenue is recognized instead when actually
 * invoiced, via the flat-fee item's amount on the invoice's issue_date.
 */
export async function getReportFixedFeeRevenue(from: Date, to: Date): Promise<FixedFeeRevenueRow[]> {
  const rows = await listFixedFeeRevenue(format(from, "yyyy-MM-dd"))
  const toStr = format(to, "yyyy-MM-dd")
  return rows.filter((r) => r.issue_date <= toStr)
}

export function toReportRows(raw: RawTaskRow[]): ReportRow[] {
  return raw.map((t) => ({
    id: t.id,
    date: t.date,
    task_name: t.task_name,
    project_name: t.projects?.project_name ?? null,
    client_name: t.clients?.client_name ?? null,
    duration_seconds: t.duration_seconds,
    billable: t.billable,
  }))
}

export function summarize(raw: RawTaskRow[], flatFees: FixedFeeRevenueRow[] = []): ReportSummary {
  const totalSeconds = raw.reduce((acc, t) => acc + t.duration_seconds, 0)
  const taskRevenue = sumByCurrency(raw, revenueFor, currencyFor)
  const flatFeeRevenue = sumByCurrency(flatFees, (f) => f.amount, (f) => f.currency)
  const projectCount = new Set(raw.map((t) => t.project_id).filter(Boolean)).size
  const clientCount = new Set(raw.map((t) => t.client_id).filter(Boolean)).size
  return {
    totalSeconds,
    totalRevenue: addCurrencyAmounts(taskRevenue, flatFeeRevenue),
    projectCount,
    clientCount,
  }
}

export function buildChartSeries(
  raw: RawTaskRow[],
  from: Date,
  to: Date,
  flatFees: FixedFeeRevenueRow[] = [],
): ReportChartPoint[] {
  const spanDays = differenceInCalendarDays(to, from)

  if (spanDays > 60) {
    const months = eachMonthOfInterval({ start: from, end: to })
    return months.map((month) => {
      const monthKey = format(month, "yyyy-MM")
      const monthTasks = raw.filter((t) => t.date.startsWith(monthKey))
      const hours = monthTasks.reduce((acc, t) => acc + t.duration_seconds / 3600, 0)
      const taskRevenue = sumByCurrency(monthTasks, revenueFor, currencyFor)
      const flatFeeRevenue = sumByCurrency(
        flatFees.filter((f) => f.issue_date.startsWith(monthKey)),
        (f) => f.amount,
        (f) => f.currency,
      )
      return {
        label: format(month, "MMM"),
        hours: Math.round(hours * 10) / 10,
        revenue: roundAmounts(addCurrencyAmounts(taskRevenue, flatFeeRevenue)),
      }
    })
  }

  const days = eachDayOfInterval({ start: from, end: to })
  return days.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd")
    const dayTasks = raw.filter((t) => t.date === dayKey)
    const hours = dayTasks.reduce((acc, t) => acc + t.duration_seconds / 3600, 0)
    const taskRevenue = sumByCurrency(dayTasks, revenueFor, currencyFor)
    const flatFeeRevenue = sumByCurrency(
      flatFees.filter((f) => f.issue_date === dayKey),
      (f) => f.amount,
      (f) => f.currency,
    )
    return {
      label: format(day, "MMM d"),
      hours: Math.round(hours * 10) / 10,
      revenue: roundAmounts(addCurrencyAmounts(taskRevenue, flatFeeRevenue)),
    }
  })
}
