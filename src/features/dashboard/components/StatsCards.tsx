import { Clock, DollarSign, FolderKanban, Users, ListChecks } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/currency"
import type { DashboardStats } from "../types"

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Clock} label="Hours Today" value={`${stats.hoursToday.toFixed(1)}h`} />
      <StatCard icon={Clock} label="Hours This Week" value={`${stats.hoursWeek.toFixed(1)}h`} />
      <StatCard icon={Clock} label="Hours This Month" value={`${stats.hoursMonth.toFixed(1)}h`} />
      <StatCard icon={Clock} label="Hours This Year" value={`${stats.hoursYear.toFixed(1)}h`} />

      <StatCard icon={DollarSign} label="Revenue Today" value={formatCurrency(stats.revenueToday)} />
      <StatCard icon={DollarSign} label="Revenue This Week" value={formatCurrency(stats.revenueWeek)} />
      <StatCard icon={DollarSign} label="Revenue This Month" value={formatCurrency(stats.revenueMonth)} />
      <StatCard icon={DollarSign} label="Revenue This Year" value={formatCurrency(stats.revenueYear)} />

      <StatCard icon={FolderKanban} label="Active Projects" value={String(stats.activeProjects)} />
      <StatCard icon={Users} label="Total Clients" value={String(stats.totalClients)} />
      <StatCard icon={ListChecks} label="Total Tasks" value={String(stats.totalTasks)} />
    </div>
  )
}
