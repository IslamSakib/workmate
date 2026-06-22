import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getDashboardStats,
  getGrowthDeltas,
  getMonthlyTrend,
  getOutstandingInvoices,
  getPendingApprovalsCount,
  getProfitMetrics,
  getProfitTrend,
  getRecentActivity,
  getRecentTasks,
  getRetainerMetrics,
  getUpcomingDeadlines,
} from "@/features/dashboard/api"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"
import { StatsCards } from "@/features/dashboard/components/StatsCards"
import { RevenueTrendChart } from "@/features/dashboard/components/RevenueTrendChart"
import { HoursTrendChart } from "@/features/dashboard/components/HoursTrendChart"
import { MonthlyPerformanceChart } from "@/features/dashboard/components/MonthlyPerformanceChart"
import { ProfitChart } from "@/features/dashboard/components/ProfitChart"
import { RecentTasks } from "@/features/dashboard/components/RecentTasks"
import { RecentActivity } from "@/features/dashboard/components/RecentActivity"
import { UpcomingDeadlines } from "@/features/dashboard/components/UpcomingDeadlines"
import { RetainerUsageWidget } from "@/features/dashboard/components/RetainerUsageWidget"
import { QuickActions } from "@/features/dashboard/components/QuickActions"
import type {
  DashboardStats,
  OutstandingInvoices,
  ProfitMetrics,
  RecentActivityRow,
  RecentTaskRow,
  RetainerMetrics,
  TrendPoint,
  UpcomingDeadline,
} from "@/features/dashboard/types"

export default function DashboardPage() {
  const role = useAuthStore((s) => s.role)
  const canApprove = hasMinRole(role, "manager")
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [profitTrend, setProfitTrend] = useState<TrendPoint[]>([])
  const [recentTasks, setRecentTasks] = useState<RecentTaskRow[]>([])
  const [activity, setActivity] = useState<RecentActivityRow[]>([])
  const [outstanding, setOutstanding] = useState<OutstandingInvoices | null>(null)
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([])
  const [retainers, setRetainers] = useState<RetainerMetrics | null>(null)
  const [profit, setProfit] = useState<ProfitMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [statsRes, trendRes, tasksRes, activityRes, outstandingRes, deadlinesRes, retainersRes, approvalsRes] =
          await Promise.all([
            getDashboardStats(),
            getMonthlyTrend(),
            getRecentTasks(),
            getRecentActivity(),
            getOutstandingInvoices(),
            getUpcomingDeadlines(),
            getRetainerMetrics(),
            canApprove ? getPendingApprovalsCount() : Promise.resolve(null),
          ])
        if (!active) return
        const [profitRes, profitTrendRes] = await Promise.all([
          getProfitMetrics(statsRes),
          getProfitTrend(trendRes),
        ])
        if (!active) return
        setStats(statsRes)
        setTrend(trendRes)
        setProfitTrend(profitTrendRes)
        setRecentTasks(tasksRes)
        setActivity(activityRes)
        setOutstanding(outstandingRes)
        setDeadlines(deadlinesRes)
        setRetainers(retainersRes)
        setProfit(profitRes)
        setPendingApprovals(approvalsRes)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (loading || !stats || !outstanding || !retainers || !profit) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const growth = getGrowthDeltas(trend)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your freelance business at a glance.</p>
      </div>

      <QuickActions />

      <StatsCards
        stats={stats}
        outstanding={outstanding}
        growth={growth}
        retainers={retainers}
        profit={profit}
        pendingApprovals={pendingApprovals ?? undefined}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <RevenueTrendChart data={trend} />
        <HoursTrendChart data={trend} />
        <ProfitChart data={profitTrend} />
      </div>
      <MonthlyPerformanceChart data={trend} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RecentTasks tasks={recentTasks} />
        <RecentActivity activity={activity} />
        <UpcomingDeadlines deadlines={deadlines} />
        <RetainerUsageWidget retainers={retainers} />
      </div>
    </div>
  )
}
