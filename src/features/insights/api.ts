import { addMonths, format, startOfMonth, subDays, subMonths } from "date-fns"
import { supabase } from "@/lib/supabaseClient"
import { getYearTasks, revenueFor } from "@/features/dashboard/api"
import type { TaskWithProject } from "@/features/dashboard/api"
import type { TrendPoint } from "@/features/dashboard/types"
import type { BusinessInsights, ForecastPoint, ProjectProfitabilityRow, TopClientRow } from "./types"

interface ClientHealth {
  client_name: string
  revenue: number
  score: number
}

/**
 * Revenue/activity sub-scores are ranked relative to the top client (so the
 * score is meaningful regardless of business size); payment speed is the
 * average days early/late across that client's paid invoices. There's no
 * email/call/message tracking anywhere in this app, so the "Communication
 * Activity" dimension from the original spec is intentionally dropped —
 * the remaining three are weighted equally instead.
 */
async function getClientHealthScores(tasks: TaskWithProject[]): Promise<Map<string, ClientHealth>> {
  const revenueByClient = new Map<string, number>()
  const nameByClient = new Map<string, string>()
  for (const t of tasks) {
    if (!t.client_id) continue
    revenueByClient.set(t.client_id, (revenueByClient.get(t.client_id) ?? 0) + revenueFor(t))
    if (t.clients?.client_name) nameByClient.set(t.client_id, t.clients.client_name)
  }

  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd")
  const activityByClient = new Map<string, number>()
  for (const t of tasks) {
    if (!t.client_id || t.date < thirtyDaysAgo) continue
    activityByClient.set(t.client_id, (activityByClient.get(t.client_id) ?? 0) + 1)
  }

  const [{ data: invoices, error: invoicesError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("invoices").select("id, client_id, due_date").not("client_id", "is", null),
    supabase.from("invoice_payments").select("invoice_id, paid_date"),
  ])
  if (invoicesError) throw invoicesError
  if (paymentsError) throw paymentsError

  const latestPaidByInvoice = new Map<string, string>()
  for (const p of payments ?? []) {
    const existing = latestPaidByInvoice.get(p.invoice_id)
    if (!existing || p.paid_date > existing) latestPaidByInvoice.set(p.invoice_id, p.paid_date)
  }

  const latenessByClient = new Map<string, number[]>()
  for (const inv of invoices ?? []) {
    if (!inv.client_id || !inv.due_date) continue
    const paidDate = latestPaidByInvoice.get(inv.id)
    if (!paidDate) continue
    const latenessDays = (new Date(paidDate).getTime() - new Date(inv.due_date).getTime()) / 86_400_000
    const list = latenessByClient.get(inv.client_id) ?? []
    list.push(latenessDays)
    latenessByClient.set(inv.client_id, list)
  }

  const maxRevenue = Math.max(0, ...revenueByClient.values())
  const maxActivity = Math.max(0, ...activityByClient.values())

  const result = new Map<string, ClientHealth>()
  for (const [clientId, revenue] of revenueByClient) {
    const revenueScore = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0
    const activityScore = maxActivity > 0 ? ((activityByClient.get(clientId) ?? 0) / maxActivity) * 100 : 0

    const latenessList = latenessByClient.get(clientId)
    const paymentSpeedScore =
      latenessList && latenessList.length > 0
        ? clamp(100 - ((average(latenessList) + 30) / 60) * 100, 0, 100)
        : 70 // neutral — no payment history yet, not penalized for lacking data

    result.set(clientId, {
      client_name: nameByClient.get(clientId) ?? "—",
      revenue,
      score: Math.round((revenueScore + activityScore + paymentSpeedScore) / 3),
    })
  }
  return result
}

function average(values: number[]) {
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export async function getTopClients(limit = 10): Promise<TopClientRow[]> {
  const tasks = await getYearTasks()
  const health = await getClientHealthScores(tasks)

  return Array.from(health.entries())
    .map(([id, h]) => ({ id, client_name: h.client_name, revenue: h.revenue, healthScore: h.score }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export async function getProjectProfitability(limit = 10): Promise<ProjectProfitabilityRow[]> {
  const tasks = await getYearTasks()

  const revenueByProject = new Map<string, number>()
  const nameByProject = new Map<string, { project_name: string; client_name: string | null }>()
  for (const t of tasks) {
    if (!t.project_id) continue
    revenueByProject.set(t.project_id, (revenueByProject.get(t.project_id) ?? 0) + revenueFor(t))
    if (t.projects?.project_name) {
      nameByProject.set(t.project_id, {
        project_name: t.projects.project_name,
        client_name: t.clients?.client_name ?? null,
      })
    }
  }

  const yearStart = format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd")
  const { data: expenseRows, error } = await supabase
    .from("expenses")
    .select("project_id, amount")
    .not("project_id", "is", null)
    .gte("date", yearStart)
  if (error) throw error

  const expensesByProject = new Map<string, number>()
  for (const e of expenseRows ?? []) {
    if (!e.project_id) continue
    expensesByProject.set(e.project_id, (expensesByProject.get(e.project_id) ?? 0) + Number(e.amount))
  }

  return Array.from(revenueByProject.entries())
    .map(([id, revenue]) => {
      const expenses = expensesByProject.get(id) ?? 0
      const profit = revenue - expenses
      const meta = nameByProject.get(id)
      return {
        id,
        project_name: meta?.project_name ?? "—",
        client_name: meta?.client_name ?? null,
        revenue,
        expenses,
        profit,
        marginPct: revenue > 0 ? (profit / revenue) * 100 : null,
      }
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, limit)
}

/**
 * Heuristic baseline, not a real forecasting model: projects forward using
 * the average month-over-month delta of the trailing 3 actual months.
 * Documented as a placeholder so a real model can replace it later without
 * touching callers.
 */
export function getRevenueForecast(trend: TrendPoint[], monthsAhead = 3): ForecastPoint[] {
  const points: ForecastPoint[] = trend.map((t) => ({ label: t.label, revenue: t.revenue, forecastRevenue: null }))
  if (trend.length === 0) return points

  const recent = trend.slice(-3).map((t) => t.revenue)
  const deltas = recent.slice(1).map((v, i) => v - recent[i])
  const avgDelta = deltas.length > 0 ? average(deltas) : 0

  const last = points[points.length - 1]
  last.forecastRevenue = last.revenue

  let projected = last.revenue ?? 0
  for (let i = 1; i <= monthsAhead; i++) {
    projected = Math.max(0, projected + avgDelta)
    points.push({
      label: format(addMonths(new Date(), i), "MMM"),
      revenue: null,
      forecastRevenue: Math.round(projected),
    })
  }
  return points
}

export async function getBusinessInsights(): Promise<BusinessInsights> {
  const threeMonthsAgo = format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd")
  const { data: expenseRows, error: expensesError } = await supabase
    .from("expenses")
    .select("amount, date")
    .gte("date", threeMonthsAgo)
  if (expensesError) throw expensesError

  const burnRateMonthly = average([0, 1, 2].map((i) => {
    const monthDate = subMonths(new Date(), i)
    return (expenseRows ?? [])
      .filter(
        (r) =>
          new Date(r.date).getMonth() === monthDate.getMonth() &&
          new Date(r.date).getFullYear() === monthDate.getFullYear(),
      )
      .reduce((acc, r) => acc + Number(r.amount), 0)
  }))

  const thisMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd")
  const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd")
  const { data: recentTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("client_id, date")
    .eq("billable", true)
    .gte("date", lastMonthStart)
    .not("client_id", "is", null)
  if (tasksError) throw tasksError

  const activeLastMonth = new Set<string>()
  const activeThisMonth = new Set<string>()
  for (const t of recentTasks ?? []) {
    if (!t.client_id) continue
    if (t.date >= thisMonthStart) activeThisMonth.add(t.client_id)
    else activeLastMonth.add(t.client_id)
  }

  const retained = Array.from(activeLastMonth).filter((id) => activeThisMonth.has(id)).length
  const retentionRatePct = activeLastMonth.size > 0 ? (retained / activeLastMonth.size) * 100 : null

  return { burnRateMonthly, retentionRatePct }
}
