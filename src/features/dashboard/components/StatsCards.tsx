import { Clock, DollarSign, FolderKanban, Users, ListChecks } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import type { DashboardStats } from "../types"

const TONES = {
  blue: { border: "border-l-blue-500", bg: "bg-blue-500/10 dark:bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  emerald: { border: "border-l-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { border: "border-l-amber-500", bg: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-600 dark:text-amber-400" },
  violet: { border: "border-l-violet-500", bg: "bg-violet-500/10 dark:bg-violet-500/15", text: "text-violet-600 dark:text-violet-400" },
  rose: { border: "border-l-rose-500", bg: "bg-rose-500/10 dark:bg-rose-500/15", text: "text-rose-600 dark:text-rose-400" },
} as const

type Tone = keyof typeof TONES

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock
  label: string
  value: string
  tone: Tone
}) {
  const t = TONES[tone]
  return (
    <Card className={cn("border-l-4", t.border)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={cn("flex size-8 items-center justify-center rounded-full", t.bg)}>
          <Icon className={cn("size-4", t.text)} />
        </div>
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
      <StatCard icon={Clock} label="Hours Today" value={`${stats.hoursToday.toFixed(1)}h`} tone="blue" />
      <StatCard icon={Clock} label="Hours This Week" value={`${stats.hoursWeek.toFixed(1)}h`} tone="blue" />
      <StatCard icon={Clock} label="Hours This Month" value={`${stats.hoursMonth.toFixed(1)}h`} tone="blue" />
      <StatCard icon={Clock} label="Hours This Year" value={`${stats.hoursYear.toFixed(1)}h`} tone="blue" />

      <StatCard icon={DollarSign} label="Revenue Today" value={formatCurrency(stats.revenueToday)} tone="emerald" />
      <StatCard icon={DollarSign} label="Revenue This Week" value={formatCurrency(stats.revenueWeek)} tone="emerald" />
      <StatCard icon={DollarSign} label="Revenue This Month" value={formatCurrency(stats.revenueMonth)} tone="emerald" />
      <StatCard icon={DollarSign} label="Revenue This Year" value={formatCurrency(stats.revenueYear)} tone="emerald" />

      <StatCard icon={FolderKanban} label="Active Projects" value={String(stats.activeProjects)} tone="violet" />
      <StatCard icon={Users} label="Total Clients" value={String(stats.totalClients)} tone="amber" />
      <StatCard icon={ListChecks} label="Total Tasks" value={String(stats.totalTasks)} tone="rose" />
    </div>
  )
}
