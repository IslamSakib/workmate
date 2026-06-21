import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardStats, getMonthlyTrend, getRecentActivity, getRecentTasks } from "@/features/dashboard/api"
import { StatsCards } from "@/features/dashboard/components/StatsCards"
import { RevenueTrendChart } from "@/features/dashboard/components/RevenueTrendChart"
import { HoursTrendChart } from "@/features/dashboard/components/HoursTrendChart"
import { MonthlyPerformanceChart } from "@/features/dashboard/components/MonthlyPerformanceChart"
import { RecentTasks } from "@/features/dashboard/components/RecentTasks"
import { RecentActivity } from "@/features/dashboard/components/RecentActivity"
import { QuickActions } from "@/features/dashboard/components/QuickActions"
import type { DashboardStats, RecentActivityRow, RecentTaskRow, TrendPoint } from "@/features/dashboard/types"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [recentTasks, setRecentTasks] = useState<RecentTaskRow[]>([])
  const [activity, setActivity] = useState<RecentActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [statsRes, trendRes, tasksRes, activityRes] = await Promise.all([
          getDashboardStats(),
          getMonthlyTrend(),
          getRecentTasks(),
          getRecentActivity(),
        ])
        if (!active) return
        setStats(statsRes)
        setTrend(trendRes)
        setRecentTasks(tasksRes)
        setActivity(activityRes)
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

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your freelance business at a glance.</p>
      </div>

      <StatsCards stats={stats} />

      <QuickActions />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueTrendChart data={trend} />
        <HoursTrendChart data={trend} />
      </div>
      <MonthlyPerformanceChart data={trend} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentTasks tasks={recentTasks} />
        <RecentActivity activity={activity} />
      </div>
    </div>
  )
}
