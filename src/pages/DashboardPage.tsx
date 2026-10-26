import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { ErrorState, EmptyState } from "@/components/shared/States"
import { Converted, ShowInSelector } from "@/components/shared/Converted"
import { Stat, Status } from "@/components/shared/Status"
import {
  getDashboardStats,
  getMonthlyTrend,
  getOutstandingInvoices,
  getRecentTasks,
  getUpcomingDeadlines,
} from "@/features/dashboard/api"
import { TrendCharts } from "@/features/dashboard/components/TrendCharts"
import { useTimerStore } from "@/store/timerStore"
import { useCurrencySettings } from "@/hooks/useCurrencySettings"
import { useShowIn } from "@/hooks/useShowIn"
import { useElapsedSeconds, formatElapsed } from "@/hooks/useElapsedSeconds"
import { formatDuration } from "@/lib/duration"
import { formatCurrency } from "@/lib/currency"
import type {
  DashboardStats,
  OutstandingInvoices,
  RecentTaskRow,
  TrendPoint,
  UpcomingDeadline,
} from "@/features/dashboard/types"
import { formatDate } from "@/lib/date"

interface DashboardData {
  stats: DashboardStats
  trend: TrendPoint[]
  recentTasks: RecentTaskRow[]
  outstanding: OutstandingInvoices
  deadlines: UpcomingDeadline[]
}

function RunningTimer() {
  const status = useTimerStore((s) => s.status)
  const name = useTimerStore((s) => s.taskName)
  const seconds = useElapsedSeconds()
  return (
    <section aria-label="Timer" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {status === "idle" ? "Timer" : status === "running" ? "Running" : "Paused"}
        </p>
        <p className="font-mono text-2xl tabular-nums">{formatElapsed(seconds)}</p>
        {status !== "idle" && <p className="truncate text-sm text-muted-foreground">{name}</p>}
      </div>
      <Button asChild>
        <Link to="/timer">{status === "idle" ? "Start timer" : "Open timer"}</Link>
      </Button>
    </section>
  )
}

export default function DashboardPage() {
  const { base, rates, loaded } = useCurrencySettings()
  const [showIn, setShowIn] = useShowIn(base)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [stats, trend, recentTasks, outstanding, deadlines] = await Promise.all([
        getDashboardStats({ base, rates }),
        getMonthlyTrend(),
        getRecentTasks(8),
        getOutstandingInvoices(),
        getUpcomingDeadlines(14),
      ])
      setData({ stats, trend, recentTasks, outstanding, deadlines })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
    }
  }, [base, rates])

  useEffect(() => {
    // Wait for the currency settings so conversions use the right base and rates on first paint.
    if (loaded) load()
  }, [load, loaded])

  const header = (
    <PageHeader
      title="Today"
      description="Hours, money owed, and what needs action."
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/tasks?new=1">New task</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/invoices?new=1">New invoice</Link>
          </Button>
        </>
      }
    />
  )

  if (error) {
    return (
      <>
        {header}
        <ErrorState message={error} onRetry={load} />
      </>
    )
  }

  if (!data) {
    return (
      <>
        {header}
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </>
    )
  }

  const { stats, trend, recentTasks, outstanding, deadlines } = data

  return (
    <>
      {header}

      <RunningTimer />

      <ShowInSelector value={showIn} onChange={setShowIn} base={base} rates={rates} />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-3">
        <Stat label="Hours this week" value={`${stats.hoursWeek.toFixed(1)}h`} sub={`${stats.hoursToday.toFixed(1)}h today`} />
        <Stat label="Revenue this month" value={<Converted amounts={stats.revenueMonth} baseTotal={stats.revenueBase.month} mode={showIn} base={base} rates={rates} />} />
        <Stat
          label="Owed to you"
          value={<Converted amounts={outstanding.total} mode={showIn} base={base} rates={rates} />}
          sub={`${outstanding.count} open, ${outstanding.overdueCount} overdue`}
        />
      </section>

      <section aria-label="Needs attention">
        <h2 className="mb-2 text-sm font-semibold">Needs attention</h2>
        {deadlines.length === 0 ? (
          <EmptyState title="Nothing due in the next 14 days." />
        ) : (
          <ul className="divide-y rounded-md border">
            {deadlines.map((d) => (
              <li key={d.id}>
                <Link to="/invoices" className="flex items-center justify-between gap-3 p-3 hover:bg-accent">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {d.invoice_number} <span className="font-normal text-muted-foreground">{d.client_name ?? ""}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(d.due_date)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm tabular-nums">{formatCurrency(d.total, d.currency)}</span>
                    <Status tone={d.overdue ? "bad" : "warn"}>{d.overdue ? "Overdue" : "Due soon"}</Status>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TrendCharts data={trend} />

      <section aria-label="Recent tasks">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent tasks</h2>
          <Link to="/tasks" className="text-sm underline">
            All tasks
          </Link>
        </div>
        {recentTasks.length === 0 ? (
          <EmptyState title="No tasks yet." hint="Start the timer or add a task to begin." />
        ) : (
          <ul className="divide-y rounded-md border">
            {recentTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.task_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[t.client_name, t.project_name].filter(Boolean).join(" / ") || "No project"}
                  </p>
                </div>
                <span className="shrink-0 font-mono tabular-nums">{formatDuration(t.duration_seconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
